const express = require("express");
const router = express.Router();
const db = require("../db"); // your MySQL db connection
const authMiddleware = require("../middlewares/userJWT");
const requireSeller = require("../middlewares/requireSeller");
require("dotenv").config();
const Stripe = require("stripe");
const stripe = Stripe(process.env.STRIPE_SECRET_KEY); // Use secret key here
const { sendOrderConfirmationEmail, sendOrderStatusEmail } = require('../utils/email'); // Import
const { ulid } = require('ulid');
const crypto = require('crypto');
const { queueForHadoop } = require('../services/hadoopQueue'); // Hadoop queue integration

// Create Stripe PaymentIntent
router.post("/create-payment-intent", async (req, res) => {
  try {
    const { amount } = req.body;
    if (!amount) return res.status(400).json({ message: "Amount is required" });

    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: "inr",
    });

    res.json({ clientSecret: paymentIntent.client_secret });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "PaymentIntent creation failed" });
  }
});

// Create Order after successful payment
router.post("/create", authMiddleware, async (req, res) => {
  console.log("Create Order Body:", req.body);
  const { products, total, paymentId, shipping_address, coupon_code, coupon_discount, redeemed_points } = req.body;

  if (!products || !total || !paymentId) {
    return res.status(400).json({ message: "Missing order details" });
  }

  try {
    // 1. Verify all products belong to active/approved shops
    const productIds = products.map(p => p.id);
    const [suspendedShops] = await db.promise.query(`
      SELECT p.id, p.name, sh.name as shop_name, sh.is_active, sel.status as seller_status
      FROM products p
      LEFT JOIN shops sh ON p.shop_id = sh.id
      LEFT JOIN sellers sel ON sh.seller_id = sel.id
      WHERE p.id IN (?) AND (sh.is_active = 0 OR sel.status != 'APPROVED')
    `, [productIds]);

    if (suspendedShops.length > 0) {
      const suspendedItemNames = suspendedShops.map(s => s.name).join(', ');
      return res.status(400).json({
        message: `Your order contains items from shops that are currently suspended: ${suspendedItemNames}. Please remove them to continue.`,
        suspended_items: suspendedShops
      });
    }

    // 1.5 Verify and Apply Group Buy Discounts
    // This ensures that even if total is calculated on frontend, the backend validates it
    let totalWithGroupBuys = total;
    const processedProducts = await Promise.all(products.map(async (product) => {
      // 1.5.1 Fetch current product state from DB for snapshot
      const [pRows] = await db.promise.query(
        `SELECT p.cancellation_duration, p.is_cancellable, p.is_customizable, p.customization_fields, p.shop_id,
         sh.name as shop_name, sh.slug as shop_slug
         FROM products p
         LEFT JOIN shops sh ON p.shop_id = sh.id
         WHERE p.id = ?`,
        [product.product_id || product.id]
      );

      const cancellation_duration = pRows.length > 0 ? pRows[0].cancellation_duration : 7;
      const is_cancellable = pRows.length > 0 ? pRows[0].is_cancellable : 1;
      const is_customizable = pRows.length > 0 ? pRows[0].is_customizable : 0;
      const shop_id = pRows.length > 0 ? pRows[0].shop_id : product.shop_id;
      const shop_name = pRows.length > 0 ? pRows[0].shop_name : product.shop_name;
      const shop_slug = pRows.length > 0 ? pRows[0].shop_slug : product.shop_slug;

      const [gbRows] = await db.promise.query(`
        SELECT gb.discount_percentage, gb.status
        FROM group_buys gb
        JOIN group_buy_participants gbp ON gb.id = gbp.group_buy_id
        WHERE gb.product_id = ? AND gbp.user_id = ? AND gb.status = 'completed'
        LIMIT 1
      `, [product.product_id || product.id, req.user.id]);

      let updatedProduct = {
        ...product,
        shop_id, // Ensure correct shop_id from DB
        shop_name,
        shop_slug,
        cancellation_duration,
        is_cancellable,
        is_customizable,
        customization_details: product.customization_details || null // Captured from frontend
      };

      if (gbRows.length > 0) {
        const discountPercentage = gbRows[0].discount_percentage;
        const discountAmount = Math.round(((product.sale_price || product.price) * discountPercentage) / 100);
        console.log(`[DEBUG] Applying Group Buy discount of ${discountPercentage}% for product ${product.product_id || product.id}`);
        // Adjust the price to reflect the group buy discount
        updatedProduct = {
          ...updatedProduct,
          gb_discount_percentage: discountPercentage,
          sale_price: (product.sale_price || product.price) - discountAmount
        };
      }
      return updatedProduct;
    }));


    // Generate Secure Identifiers
    const ulidStr = ulid();
    const order_id = `ORD-${ulidStr}`;
    const url_token = crypto.randomBytes(64).toString('hex'); // 512 bits

    const hasCustomized = processedProducts.some(p => p.customization_details || p.is_customizable);

    let orderId;

    // 2. Handle Point Redemption (Deduct before order creation to ensure balance)
    if (redeemed_points && redeemed_points > 0) {
      const [streakRows] = await db.promise.query("SELECT total_points FROM user_streaks WHERE user_id = ?", [req.user.id]);
      const currentPoints = streakRows[0]?.total_points || 0;

      // Also check transactions for actual current balance (legacy + new earned)
      const [transactions] = await db.promise.query("SELECT amount FROM supercoin_transactions WHERE user_id = ?", [req.user.id]);
      const netTransactionPoints = transactions.reduce((acc, t) => acc + t.amount, 0);
      const totalBalance = currentPoints + netTransactionPoints;

      if (totalBalance < redeemed_points) {
        return res.status(400).json({ message: "Insufficient SuperCoins balance" });
      }

      console.log(`[DEBUG] Validated redemption of ${redeemed_points} points for user_id: ${req.user.id}`);
    }

    // 3. Create Order
    // Try with coupon and redeemed_points columns first, fall back if they don't exist
    try {
      const queryWithRedemption = `
        INSERT INTO orders (
            user_id, items, total_amount, payment_id, shipping_address, 
            coupon_code, coupon_discount, redeemed_points, order_id, url_token, 
            has_customized_items, production_status, created_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', NOW())`;

      const shippingAddressValue = typeof shipping_address === 'object' ? JSON.stringify(shipping_address) : shipping_address;

      const [result] = await db.promise.query(queryWithRedemption, [
        req.user.id,
        JSON.stringify(processedProducts),
        total,
        paymentId,
        shippingAddressValue || null,
        coupon_code || null,
        coupon_discount || 0,
        redeemed_points || 0,
        order_id,
        url_token,
        hasCustomized ? 1 : 0
      ]);
      orderId = result.insertId;
    } catch (colErr) {
      // Fallback 1: Try with coupons but without redeemed_points
      try {
        console.log("redeemed_points column not found, attempting fallback with coupons only");
        const queryWithCoupon = `
          INSERT INTO orders (user_id, items, total_amount, payment_id, shipping_address, coupon_code, coupon_discount, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`;

        const shippingAddressValue = typeof shipping_address === 'object' ? JSON.stringify(shipping_address) : shipping_address;

        const [result] = await db.promise.query(queryWithCoupon, [
          req.user.id,
          JSON.stringify(processedProducts),
          total,
          paymentId,
          shippingAddressValue || null,
          coupon_code || null,
          coupon_discount || 0,
        ]);
        orderId = result.insertId;
      } catch (colErr2) {
        // Fallback 2: Original query
        if (colErr2.code === 'ER_BAD_FIELD_ERROR') {
          console.log("Coupon columns not found, using original fallback query");
          const queryWithoutCoupon = `
            INSERT INTO orders (user_id, items, total_amount, payment_id, shipping_address, created_at)
            VALUES (?, ?, ?, ?, ?, NOW())`;

          const shippingAddressValue = typeof shipping_address === 'object' ? JSON.stringify(shipping_address) : shipping_address;

          const [result] = await db.promise.query(queryWithoutCoupon, [
            req.user.id,
            JSON.stringify(processedProducts),
            total,
            paymentId,
            shippingAddressValue || null,
          ]);
          orderId = result.insertId;
        } else {
          throw colErr2;
        }
      }
    }

    // Record the redemption as a transaction if points were used
    if (orderId && redeemed_points && redeemed_points > 0) {
      try {
        await db.promise.query(
          `INSERT INTO supercoin_transactions (user_id, amount, type, description, order_id) 
           VALUES (?, ?, 'REDEEMED', 'Order Redemption', ?)`,
          [req.user.id, -redeemed_points, orderId]
        );
      } catch (transErr) {
        console.error("Failed to record redemption transaction:", transErr);
        // Don't fail the order if transaction recording fails
      }
    }

    // Generate Scratch Card Reward for the order
    try {
      // Reward value: random between 10 and 50 SuperCoins
      const rewardValue = Math.floor(Math.random() * 41) + 10;
      await db.promise.query(
        "INSERT INTO user_rewards (user_id, order_id, reward_value, status) VALUES (?, ?, ?, 'PENDING')",
        [req.user.id, orderId, rewardValue]
      );
      console.log(`🎁 Reward generated for order ${orderId}: ${rewardValue} coins`);
    } catch (rewardErr) {
      console.error("Failed to generate reward:", rewardErr);
      // Don't fail the order if reward generation fails
    }

    // Clear user's cart after successful order
    console.log(`[DEBUG] Clearing cart for user_id: ${req.user.id}`);
    const [deleteResult] = await db.promise.query("DELETE FROM cart_items WHERE user_id = ?", [req.user.id]);
    console.log(`[DEBUG] Cart cleared. Items removed: ${deleteResult.affectedRows}`);

    // Send Confirmation Email
    try {
      // We need user email. req.user has id, need to fetch email or assume it was passed in token (check middleware)
      // authMiddleware usually attaches 'user' to req, let's see if it has email.
      // If not, fetch it.
      // Assuming req.user from 'userJWT.js' might just have ID. Let's fetch to be safe.
      const [users] = await db.promise.query("SELECT name, email FROM users WHERE id = ?", [req.user.id]);
      if (users.length > 0) {
        const user = users[0];
        const orderData = { id: orderId, total_amount: total, payment_id: paymentId };
        // products is already the array of items
        sendOrderConfirmationEmail(orderData, user, products);
      }
    } catch (emailErr) {
      console.error("Failed to send order email:", emailErr);
      // Don't fail the request just because email failed
    }

    // Queue order data for Hadoop ingestion (fire-and-forget, non-blocking)
    queueForHadoop('orders', {
      order_id: order_id,
      user_id: req.user.id,
      total: total,
      status: 'pending',
      payment_method: paymentId.startsWith('COD_') ? 'COD' : 'online',
      shipping_address: typeof shipping_address === 'object' ? shipping_address : null,
      items: processedProducts.map(item => ({
        product_id: item.product_id || item.id,
        product_name: item.name,
        quantity: item.quantity,
        price: item.sale_price || item.price,
        category_id: item.category_id,
        shop_id: item.shop_id
      })),
      created_at: new Date().toISOString()
    }).then(() => {
      console.log(`📤 Order ${order_id} queued for Hadoop ingestion`);
    }).catch(hadoopErr => {
      console.error('⚠️  Failed to queue order for Hadoop:', hadoopErr.message);
      // Don't fail the order if Hadoop queue fails
    });

    res.status(201).json({
      success: true,
      message: "Order placed successfully",
      orderId
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to create order" });

  }
});

// Get orders for logged-in user
router.get("/", authMiddleware, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || "";
    const offset = (page - 1) * limit;

    console.log(`Fetching orders for user_id: ${req.user.id}, Page: ${page}, Limit: ${limit}, Search: ${search}`);

    let query = "SELECT COUNT(*) as total FROM orders WHERE user_id = ?";
    let params = [req.user.id];

    if (search) {
      query += " AND (order_id LIKE ? OR items LIKE ?)";
      params.push(`%${search}%`, `%${search}%`);
    }

    // Get total count
    const [countRows] = await db.promise.query(query, params);
    const total = countRows[0].total;

    // Get paginated orders
    let ordersQuery = "SELECT * FROM orders WHERE user_id = ?";
    let ordersParams = [req.user.id];

    if (search) {
      ordersQuery += " AND (order_id LIKE ? OR items LIKE ?)";
      ordersParams.push(`%${search}%`, `%${search}%`);
    }

    ordersQuery += " ORDER BY created_at DESC LIMIT ? OFFSET ?";
    ordersParams.push(limit, offset);

    const [rows] = await db.promise.query(ordersQuery, ordersParams);

    const orders = rows.map(order => ({
      orderId: order.order_id || order.id, // Prefer ULID
      internalId: order.id,
      urlToken: order.url_token,
      items: typeof order.items === 'string' ? JSON.parse(order.items) : order.items,
      total: order.total_amount,
      paymentId: order.payment_id,
      status: order.status,
      shipping_address: order.shipping_address,
      coupon_code: order.coupon_code,
      coupon_discount: order.coupon_discount,
      redeemed_points: order.redeemed_points,
      created_at: order.created_at
    }));

    res.json({
      orders,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (err) {
    console.error("Error fetching orders:", err);
    res.status(500).json({ message: "Failed to fetch orders" });
  }
});

// Get orders for a specific seller's shop
router.get("/seller", requireSeller, async (req, res) => {
  try {
    console.log("🔍 [SELLER ORDERS] Request from seller ID:", req.seller.id);

    // 1. Get Seller's Shop ID directly using seller ID from token
    const [shops] = await db.promise.execute(`
      SELECT id FROM shops WHERE seller_id = ?
    `, [req.seller.id]);

    console.log("🏪 [SELLER ORDERS] Found shops:", shops);

    if (shops.length === 0) {
      console.log("❌ [SELLER ORDERS] No shop found for seller");
      return res.status(404).json({ message: "Seller shop not found" });
    }

    const shopId = shops[0].id;
    console.log("✅ [SELLER ORDERS] Using shop_id:", shopId);

    // 2. Fetch orders containing items from this shop
    // Using LIKE for more reliable matching since JSON_CONTAINS doesn't work well with nested objects
    let sql = `
      SELECT o.*, u.name as customer_name, u.email as customer_email, u.phone as customer_phone
      FROM orders o
      JOIN users u ON o.user_id = u.id
      WHERE (o.items LIKE ? OR o.items LIKE ? OR o.items LIKE ? OR o.items LIKE ?)
      ORDER BY o.created_at DESC
    `;

    // Create LIKE patterns for varying JSON formats (number vs string, spacing)
    const params = [
      `%"shop_id":${shopId}%`,
      `%"shop_id": ${shopId}%`,
      `%"shop_id":"${shopId}"%`,
      `%"shop_id": "${shopId}"%`
    ];

    console.log("🔎 [SELLER ORDERS] LIKE patterns:", params);

    // Apply filters
    if (req.query.has_customized_items) {
      sql = sql.replace('WHERE', `WHERE o.has_customized_items = ? AND`);
      params.unshift(req.query.has_customized_items === 'true' ? 1 : 0);
    }

    if (req.query.status) {
      sql = sql.replace('WHERE', `WHERE o.status = ? AND`);
      params.unshift(req.query.status);
    }

    if (req.query.limit) {
      sql += ` LIMIT ?`;
      params.push(parseInt(req.query.limit));
    }

    console.log("📝 [SELLER ORDERS] SQL Query:", sql);
    console.log("📝 [SELLER ORDERS] Params:", params);

    const [orders] = await db.promise.execute(sql, params);

    console.log(`📦 [SELLER ORDERS] Found ${orders.length} orders matching shop_id ${shopId}`);

    // 3. Filter items within each order to only show what belongs to this seller
    const sellerOrders = orders.map(order => {
      let allItems = [];
      try {
        let rawItems = order.items;
        let attempts = 0;
        while (typeof rawItems === 'string' && attempts < 5) {
          rawItems = JSON.parse(rawItems);
          attempts++;
        }
        allItems = Array.isArray(rawItems) ? rawItems : [];
      } catch (e) {
        console.error("Order items parse error", e);
        allItems = [];
      }

      // owner verification in JS with type safety
      const shopItems = allItems.filter(item => String(item.shop_id) === String(shopId));

      if (shopItems.length === 0) return null;

      // Calculate seller's portion of total
      const shopTotal = shopItems.reduce((sum, item) => sum + (parseFloat(item.sale_price || item.price || 0) * (parseInt(item.quantity) || 1)), 0);

      return {
        ...order,
        items: shopItems,
        shopTotal,
        customer: {
          name: order.customer_name,
          email: order.customer_email,
          phone: order.customer_phone
        }
      };
    }).filter(Boolean);

    console.log(`✅ [SELLER ORDERS] Returning ${sellerOrders.length} orders to frontend`);
    res.json({ success: true, orders: sellerOrders });
  } catch (err) {
    console.error("❌ [SELLER ORDERS] Error:", err);
    res.status(500).json({ message: "Failed to fetch seller orders" });
  }
});

// Get single order for logged-in user
router.get("/:id", authMiddleware, async (req, res) => {
  try {
    const orderId = req.params.id;
    const isNumericId = /^\d+$/.test(orderId);
    let whereClause = "(order_id = ? OR url_token = ?)";
    let whereParams = [orderId, orderId];
    if (isNumericId) {
      whereClause = "(id = ? OR order_id = ? OR url_token = ?)";
      whereParams = [orderId, orderId, orderId];
    }

    // Support fetching by internal ID, Public ULID, or Encrypted Token
    const [rows] = await db.promise.query(
      `SELECT * FROM orders WHERE ${whereClause} AND user_id = ?`,
      [...whereParams, req.user.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: "Order not found or access denied" });
    }

    const order = rows[0];
    const formattedOrder = {
      orderId: order.order_id || order.id, // Prefer ULID, fallback to ID (legacy)
      internalId: order.id,
      url_token: order.url_token,
      items: typeof order.items === 'string' ? JSON.parse(order.items) : order.items,
      total: order.total_amount,
      paymentId: order.payment_id,
      payment_status: order.payment_status,
      status: order.status,
      shipping_address: order.shipping_address,
      coupon_code: order.coupon_code,
      coupon_discount: order.coupon_discount,
      redeemed_points: order.redeemed_points,
      created_at: order.created_at,
      cancellation_reason: order.cancellation_reason,
      cancelled_at: order.cancelled_at
    };

    res.json({ order: formattedOrder });
  } catch (err) {
    console.error("Error fetching order details:", err);
    res.status(500).json({ message: "Failed to fetch order details" });
  }
});





// Update order status (Restricted to Seller)
router.put("/:id/status", requireSeller, async (req, res) => {
  const { status } = req.body;
  const { id } = req.params;

  try {
    const sellerId = req.seller.id;

    // 2. Verify Order contains items from this Seller's Shop
    // First get shop_id
    const [shops] = await db.promise.execute("SELECT id FROM shops WHERE seller_id = ?", [sellerId]);
    if (shops.length === 0) return res.status(404).json({ message: "Shop not found" });
    const shopId = shops[0].id;

    // Check if order exists and belongs to shop (via JSON search)
    const isNumericId = /^\d+$/.test(id);
    let whereClause = "(order_id = ? OR url_token = ?)";
    let whereParams = [id, id];
    if (isNumericId) {
      whereClause = "(id = ? OR order_id = ? OR url_token = ?)";
      whereParams = [id, id, id];
    }

    const [orders] = await db.promise.execute(`
            SELECT id, items FROM orders
            WHERE ${whereClause}
      `, whereParams);

    if (orders.length === 0) {
      return res.status(404).json({ message: "Order not found or access denied" });
    }

    // Verify ownership in JS
    let orderItems = [];
    try { orderItems = typeof orders[0].items === 'string' ? JSON.parse(orders[0].items) : orders[0].items; } catch (e) { }

    if (!Array.isArray(orderItems) || !orderItems.some(item => String(item.shop_id) === String(shopId))) {
      return res.status(404).json({ message: "Order not found or access denied" });
    }


    // 3. Update Status
    const { status, payment_status, production_status } = req.body;
    let updates = [];
    let updateParams = [];

    if (status) {
      updates.push("status = ?");
      updateParams.push(status);
    }

    if (payment_status) {
      updates.push("payment_status = ?");
      updateParams.push(payment_status);
    }

    if (production_status) {
      updates.push("production_status = ?");
      updateParams.push(production_status);
    }

    if (updates.length === 0) {
      return res.status(400).json({ message: "No status provided to update" });
    }

    let updateSql = `UPDATE orders SET ${updates.join(", ")} WHERE ${whereClause}`;
    await db.promise.execute(updateSql, [...updateParams, ...whereParams]);

    res.json({ message: "Order status updated", status: status || orders[0].status });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to update status" });
  }
});

// Get Single Order for Seller
router.get("/seller/:id", requireSeller, async (req, res) => {
  try {
    const { id } = req.params;

    // 1. Get Seller's Shop ID
    const [shops] = await db.promise.execute(`
            SELECT id FROM shops WHERE seller_id = ?
      `, [req.seller.id]);

    if (shops.length === 0) return res.status(404).json({ message: "Seller shop not found" });
    const shopId = shops[0].id;

    const isNumericId = /^\d+$/.test(id);
    let whereClause = "(o.id = ? OR o.order_id = ? OR o.url_token = ?)";
    let whereParams = [id, id, id];
    if (!isNumericId) {
      whereClause = "(o.order_id = ? OR o.url_token = ?)";
      whereParams = [id, id];
    }

    // 2. Fetch Single Order with Customer Details
    const sql = `
            SELECT o.*, u.name as customer_name, u.email as customer_email, u.phone as customer_phone
            FROM orders o
            JOIN users u ON o.user_id = u.id
            WHERE ${whereClause}
      `;

    const [orders] = await db.promise.execute(sql, whereParams);

    if (orders.length === 0) {
      return res.status(404).json({ message: "Order not found or access denied" });
    }

    const order = orders[0];

    // 3. Filter Items to show ONLY this shop's items
    let allItems = [];
    try {
      allItems = typeof order.items === 'string' ? JSON.parse(order.items) : order.items;
    } catch (e) {
      console.error("Order items parse error", e);
    }

    const shopItems = allItems.filter(item => String(item.shop_id) === String(shopId));

    if (shopItems.length === 0) {
      return res.status(404).json({ message: "Order not found or access denied" });
    }

    // Calculate totals for this shop
    const shopTotal = shopItems.reduce((sum, item) => sum + (parseFloat(item.sale_price || item.price || 0) * (item.quantity || 1)), 0);

    const responseOrder = {
      ...order,
      items: shopItems, // Override global items with shop specific items
      shop_total: shopTotal,
      user_name: order.customer_name,
      user_email: order.customer_email,
      user_phone: order.customer_phone
    };

    res.json({ order: responseOrder });

  } catch (err) {
    console.error("Seller single order error:", err);
    res.status(500).json({ message: "Failed to fetch order details" });
  }
});

// Cancel Order by User
router.post("/:id/cancel", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { reason } = req.body;

    if (!reason) {
      return res.status(400).json({ message: "Cancellation reason is required" });
    }

    const isNumericId = /^\d+$/.test(id);
    let whereClause = "(order_id = ? OR url_token = ?)";
    let whereParams = [id, id];
    if (isNumericId) {
      whereClause = "(id = ? OR order_id = ? OR url_token = ?)";
      whereParams = [id, id, id];
    }

    // Check if order exists and belongs to user
    const [orders] = await db.promise.execute(
      `SELECT * FROM orders WHERE ${whereClause} AND user_id = ?`,
      [...whereParams, userId]
    );

    if (orders.length === 0) {
      return res.status(404).json({ message: "Order not found" });
    }

    const order = orders[0];
    if (order.status === "cancelled") {
      return res.status(400).json({ message: "Order is already cancelled" });
    }

    if (order.status === "delivered" || order.status === "shipped") {
      return res.status(400).json({ message: `Cannot cancel an order that is already ${order.status}` });
    }

    // Validate Cancellation Policy
    const items = typeof order.items === 'string' ? JSON.parse(order.items) : order.items;
    const orderCreatedAt = new Date(order.created_at);
    const now = new Date();

    for (const item of items) {
      if (item.is_cancellable === 0 || item.is_cancellable === false) {
        return res.status(400).json({
          message: `Order cannot be cancelled because it contains a non-cancellable item: "${item.name}".`
        });
      }

      const duration = parseInt(item.cancellation_duration) || 7;
      const deadline = new Date(orderCreatedAt);
      deadline.setDate(deadline.getDate() + duration);

      if (now > deadline) {
        return res.status(400).json({
          message: `The cancellation period for "${item.name}" has expired (Allowed window: ${duration} days).`
        });
      }
    }

    // Update status to 'cancelled'
    await db.promise.execute(
      "UPDATE orders SET status = 'cancelled', cancellation_reason = ?, cancelled_at = NOW() WHERE id = ?",
      [reason, order.id]
    );

    // Fetch user for email notification
    const [users] = await db.promise.execute("SELECT name, email FROM users WHERE id = ?", [userId]);
    const user = users[0];

    // Attempt to send email notification (optional/soft failure)
    try {
      if (typeof sendOrderStatusEmail === 'function' && user) {
        await sendOrderStatusEmail({ ...order, status: 'cancelled', cancellation_reason: reason }, user, 'cancelled');
      }
    } catch (e) {
      console.warn("Email notification failed", e.message);
    }

    res.json({ message: "Order cancelled successfully", status: "cancelled", cancellation_reason: reason });

  } catch (err) {
    console.error("Order cancellation error:", err);
    res.status(500).json({ message: "Failed to cancel order" });
  }
});

module.exports = router;
