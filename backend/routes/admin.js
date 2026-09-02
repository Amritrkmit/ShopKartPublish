const express = require("express");
const router = express.Router();
const db = require("../db");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const multer = require("multer"); // for profile picture upload
const requireAdmin = require("../middlewares/requireAdmin");

const { JWT_SECRET, JWT_EXPIRES_IN } = require("../utils/jwt");



// File upload config (profile pictures)
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/admin_profiles/"); // create this folder
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + "-" + file.originalname);
  },
});
const upload = multer({ storage });

// ------------------ AUTH ROUTES ------------------ //

// Admin login
router.post("/login", (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ message: "Email and password required" });

  const query = "SELECT * FROM admins WHERE email = ?";
  db.query(query, [email], async (err, results) => {
    if (err) return res.status(500).json({ message: "Database error", err });
    if (results.length === 0)
      return res.status(401).json({ message: "Invalid credentials" });

    const admin = results[0];

    // STRICT ROLE ISOLATION: Check collision with other tables
    const [userCheck] = await db.promise.execute("SELECT id FROM users WHERE email = ?", [email]);
    const [sellerCheck] = await db.promise.execute("SELECT id FROM sellers WHERE email = ?", [email]);

    if (userCheck.length > 0 || sellerCheck.length > 0) {
      return res.status(403).json({
        message: "This account is registered with a different role. Please log in through the appropriate portal."
      });
    }

    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch)
      return res.status(401).json({ message: "Invalid credentials" });

    // Create JWT
    const token = jwt.sign(
      { id: admin.id, email: admin.email, role: 'admin' },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    // Send JWT in HTTP-only cookie
    res
      .cookie("adminToken", token, {
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000, // 1 day
        sameSite: "Lax",
      })
      .json({
        message: "Login successful",
        token,
        user: {
          id: admin.id,
          email: admin.email,
          name: admin.name,
          role: admin.role,
        },
      });
  });
});

// Admin logout
router.post("/logout", (req, res) => {
  res.clearCookie("adminToken", { httpOnly: true, sameSite: "Lax" });
  res.json({ message: "Logged out successfully" });
});

// ------------------ PROFILE ROUTES ------------------ //

const preventDirectBrowserAccess = require('../middlewares/preventDirectBrowserAccess');

// Get logged-in admin profile
router.get("/profile", requireAdmin, preventDirectBrowserAccess, (req, res) => {
  const sql = "SELECT id, name, email FROM admins WHERE id = ?";
  db.query(sql, [req.admin.id], (err, results) => {
    if (err) return res.status(500).json({ message: "Database fetch error" });
    if (results.length === 0) return res.status(404).json({ message: "Admin not found" });
    res.json(results[0]);
  });
});

// Update profile (name, email) - profile_pic removed as column missing
router.put(
  "/profile",
  requireAdmin,
  upload.single("profile_pic"),
  (req, res) => {
    const { name, email } = req.body;
    // const profilePic = req.file ? req.file.filename : null;

    let sql = "UPDATE admins SET name=?, email=? ";
    const params = [name, email];

    // if (profilePic) {
    //   sql += ", profile_pic=? ";
    //   params.push(profilePic);
    // }
    sql += "WHERE id=?";

    params.push(req.admin.id);

    db.query(sql, params, (err) => {
      if (err) return res.status(500).json({ message: "Profile update failed" });
      res.json({ message: "Profile updated successfully" });
    });
  }
);

// Change password
router.put("/change-password", requireAdmin, (req, res) => {
  const { oldPassword, newPassword } = req.body;

  if (!oldPassword || !newPassword)
    return res.status(400).json({ message: "Both old and new passwords are required" });

  const sql = "SELECT * FROM admins WHERE id=?";
  db.query(sql, [req.admin.id], async (err, results) => {
    if (err) return res.status(500).json({ message: "Database error" });
    if (results.length === 0) return res.status(404).json({ message: "Admin not found" });

    const admin = results[0];
    const isMatch = await bcrypt.compare(oldPassword, admin.password);
    if (!isMatch) return res.status(401).json({ message: "Old password is incorrect" });

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    db.query("UPDATE admins SET password=? WHERE id=?", [hashedPassword, req.admin.id], (err2) => {
      if (err2) return res.status(500).json({ message: "Password update failed" });
      res.json({ message: "Password updated successfully" });
    });
  });
});

// ------------------ STATS ROUTE ------------------ //

const util = require("util");
const query = util.promisify(db.query).bind(db);

// Get Dashboard Stats
router.get("/stats", requireAdmin, preventDirectBrowserAccess, async (req, res) => {
  try {
    const userCountQuery = "SELECT COUNT(*) as count FROM users";
    const sellerCountQuery = "SELECT COUNT(*) as count FROM sellers";
    const orderCountQuery = "SELECT COUNT(*) as count FROM orders";
    const salesQuery = "SELECT COALESCE(SUM(total_amount), 0) as total FROM orders WHERE status != 'cancelled'";
    const productCountQuery = "SELECT COUNT(*) as count FROM products";
    const todayOrdersQuery = "SELECT COUNT(*) as count FROM orders WHERE DATE(created_at) = CURDATE()";
    const cancelledOrdersQuery = "SELECT COUNT(*) as count FROM orders WHERE status = 'cancelled'";
    const pendingSellersQuery = "SELECT COUNT(*) as count FROM sellers WHERE status = 'SUBMITTED' OR status = 'PENDING_VERIFICATION'";

    // Get date range from query params (default: last 6 months)
    const range = req.query.range || '6months';
    let dateFilter = '';
    let limit = 6;

    switch (range) {
      case '7days':
        dateFilter = "WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)";
        limit = 7;
        break;
      case '30days':
        dateFilter = "WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)";
        limit = 30;
        break;
      case '6months':
        dateFilter = "WHERE created_at >= DATE_SUB(NOW(), INTERVAL 6 MONTH)";
        limit = 6;
        break;
      case 'year':
        dateFilter = "WHERE created_at >= DATE_SUB(NOW(), INTERVAL 1 YEAR)";
        limit = 12;
        break;
      default:
        dateFilter = "WHERE created_at >= DATE_SUB(NOW(), INTERVAL 6 MONTH)";
        limit = 6;
    }

    // Get sales data with order counts
    const monthlySalesQuery = `
      SELECT 
        DATE_FORMAT(created_at, '%b %Y') as name,
        SUM(total_amount) as sales,
        COUNT(*) as orders
      FROM orders 
      ${dateFilter} AND status != 'cancelled'
      GROUP BY DATE_FORMAT(created_at, '%Y-%m'), DATE_FORMAT(created_at, '%b %Y')
      ORDER BY DATE_FORMAT(created_at, '%Y-%m') ASC
      LIMIT ${limit}
    `;

    const [userRes, sellerRes, orderRes, salesRes, productRes, todayOrdersRes, cancelledRes, pendingRes, graphRes] = await Promise.all([
      query(userCountQuery),
      query(sellerCountQuery),
      query(orderCountQuery),
      query(salesQuery),
      query(productCountQuery),
      query(todayOrdersQuery),
      query(cancelledOrdersQuery),
      query(pendingSellersQuery),
      query(monthlySalesQuery)
    ]);

    res.json({
      users: userRes[0].count,
      sellers: sellerRes[0].count,
      orders: orderRes[0].count,
      sales: parseFloat(salesRes[0].total) || 0,
      products: productRes[0].count,
      todayOrders: todayOrdersRes[0].count,
      cancelledOrders: cancelledRes[0].count,
      pendingSellers: pendingRes[0].count,
      graphData: graphRes
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error fetching stats" });
  }
});

// Get Sales Value Card Data (Daily/Weekly)
router.get("/sales-value", requireAdmin, async (req, res) => {
  try {
    const period = req.query.period || 'week';

    if (period === 'week') {
      // Get daily sales for current week (last 7 days)
      const dailySalesQuery = `
        SELECT 
          DATE_FORMAT(created_at, '%a') as day,
          DATE_FORMAT(created_at, '%W') as fullDay,
          COALESCE(SUM(total_amount), 0) as sales,
          COUNT(*) as orders
        FROM orders 
        WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 6 DAY)
          AND status != 'cancelled'
        GROUP BY DATE(created_at), DATE_FORMAT(created_at, '%a'), DATE_FORMAT(created_at, '%W')
        ORDER BY DATE(created_at) ASC
      `;

      // Get all days and fill missing ones with 0
      const daysOfWeek = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
      const fullDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

      const salesByDay = await query(dailySalesQuery);

      // Create a map of existing sales data
      const salesMap = {};
      salesByDay.forEach(row => {
        salesMap[row.day] = { sales: parseFloat(row.sales) || 0, orders: row.orders };
      });

      // Build complete week data with all days
      const graphData = daysOfWeek.map((day, i) => ({
        day,
        fullDay: fullDays[i],
        sales: salesMap[day]?.sales || 0,
        orders: salesMap[day]?.orders || 0
      }));

      // Calculate total sales for the week
      const totalSales = graphData.reduce((sum, d) => sum + d.sales, 0);

      // Get yesterday's sales vs day before yesterday for comparison
      const yesterdaySalesQuery = `
        SELECT COALESCE(SUM(total_amount), 0) as sales
        FROM orders 
        WHERE DATE(created_at) = DATE_SUB(CURDATE(), INTERVAL 1 DAY)
          AND status != 'cancelled'
      `;
      const dayBeforeQuery = `
        SELECT COALESCE(SUM(total_amount), 0) as sales
        FROM orders 
        WHERE DATE(created_at) = DATE_SUB(CURDATE(), INTERVAL 2 DAY)
          AND status != 'cancelled'
      `;

      const [yesterdayRes, dayBeforeRes] = await Promise.all([
        query(yesterdaySalesQuery),
        query(dayBeforeQuery)
      ]);

      const yesterdaySales = parseFloat(yesterdayRes[0]?.sales) || 0;
      const dayBeforeSales = parseFloat(dayBeforeRes[0]?.sales) || 0;
      const percentageChange = dayBeforeSales > 0
        ? ((yesterdaySales - dayBeforeSales) / dayBeforeSales) * 100
        : (yesterdaySales > 0 ? 100 : 0);

      res.json({
        totalSales,
        percentageChange: parseFloat(percentageChange.toFixed(2)),
        graphData
      });

    } else if (period === 'month') {
      // Get weekly sales for current month (last 4 weeks)
      const weeklySalesQuery = `
        SELECT 
          CONCAT('Week ', FLOOR(DATEDIFF(created_at, DATE_SUB(CURDATE(), INTERVAL 28 DAY)) / 7) + 1) as day,
          CONCAT('Week ', FLOOR(DATEDIFF(created_at, DATE_SUB(CURDATE(), INTERVAL 28 DAY)) / 7) + 1) as fullDay,
          COALESCE(SUM(total_amount), 0) as sales,
          COUNT(*) as orders
        FROM orders 
        WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 28 DAY)
          AND status != 'cancelled'
        GROUP BY FLOOR(DATEDIFF(created_at, DATE_SUB(CURDATE(), INTERVAL 28 DAY)) / 7)
        ORDER BY FLOOR(DATEDIFF(created_at, DATE_SUB(CURDATE(), INTERVAL 28 DAY)) / 7) ASC
      `;

      const salesByWeek = await query(weeklySalesQuery);

      // Ensure we have 4 weeks of data
      const graphData = [1, 2, 3, 4].map(weekNum => {
        const weekLabel = `Week ${weekNum}`;
        const found = salesByWeek.find(w => w.day === weekLabel);
        return {
          day: weekLabel,
          fullDay: weekLabel,
          sales: found ? parseFloat(found.sales) : 0,
          orders: found ? found.orders : 0
        };
      });

      const totalSales = graphData.reduce((sum, d) => sum + d.sales, 0);

      // Get this week vs last week for comparison
      const thisWeekQuery = `
        SELECT COALESCE(SUM(total_amount), 0) as sales
        FROM orders 
        WHERE YEARWEEK(created_at, 1) = YEARWEEK(CURDATE(), 1)
          AND status != 'cancelled'
      `;
      const lastWeekQuery = `
        SELECT COALESCE(SUM(total_amount), 0) as sales
        FROM orders 
        WHERE YEARWEEK(created_at, 1) = YEARWEEK(DATE_SUB(CURDATE(), INTERVAL 1 WEEK), 1)
          AND status != 'cancelled'
      `;

      const [thisWeekRes, lastWeekRes] = await Promise.all([
        query(thisWeekQuery),
        query(lastWeekQuery)
      ]);

      const thisWeekSales = parseFloat(thisWeekRes[0]?.sales) || 0;
      const lastWeekSales = parseFloat(lastWeekRes[0]?.sales) || 0;
      const percentageChange = lastWeekSales > 0
        ? ((thisWeekSales - lastWeekSales) / lastWeekSales) * 100
        : (thisWeekSales > 0 ? 100 : 0);

      res.json({
        totalSales,
        percentageChange: parseFloat(percentageChange.toFixed(2)),
        graphData
      });
    } else {
      res.status(400).json({ message: "Invalid period. Use 'week' or 'month'" });
    }
  } catch (err) {
    console.error("Error fetching sales value data:", err);
    res.status(500).json({ message: "Error fetching sales value data" });
  }
});

// ------------------ ORDERS ROUTE ------------------ //

// Get All Orders (with user details, pagination, and search)
router.get("/orders", requireAdmin, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || '';
    const offset = (page - 1) * limit;

    // Build WHERE clause
    const conditions = [];
    const params = [];
    if (search) {
      conditions.push(`(o.id LIKE ? OR o.order_id LIKE ? OR u.name LIKE ? OR u.email LIKE ? OR o.items LIKE ?)`);
      const searchPattern = `%${search}%`;
      params.push(searchPattern, searchPattern, searchPattern, searchPattern, searchPattern);
    }
    if (req.query.has_customized_items) {
      conditions.push(`o.has_customized_items = ?`);
      params.push(req.query.has_customized_items === 'true' ? 1 : 0);
    }
    if (req.query.status) {
      conditions.push(`o.status = ?`);
      params.push(req.query.status);
    }

    let whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : '';

    // Get total count
    const countSql = `
      SELECT COUNT(*) as total
      FROM orders o
      LEFT JOIN users u ON o.user_id = u.id
      ${whereClause}
    `;
    const countResult = await query(countSql, params);
    const total = countResult[0].total;

    // Get paginated orders
    const sql = `
      SELECT o.id, o.order_id, o.url_token, o.total_amount, o.status, o.payment_status, o.created_at, o.items,
             o.has_customized_items, o.production_status,
             u.name as user_name, u.email as user_email
      FROM orders o
      LEFT JOIN users u ON o.user_id = u.id
      ${whereClause}
      ORDER BY o.created_at DESC
      LIMIT ? OFFSET ?
    `;
    const orders = await query(sql, [...params, limit, offset]);

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
    console.error(err);
    res.status(500).json({ message: "Error fetching orders" });
  }
});

const { sendOrderStatusEmail } = require('../utils/email'); // Import

// ...

// Update Order Status
router.put("/orders/:id", requireAdmin, async (req, res) => {
  const { status, payment_status, production_status } = req.body;
  const orderId = req.params.id;

  if (!status && !payment_status && !production_status) {
    return res.status(400).json({ message: "No status provided to update" });
  }

  try {
    const updates = [];
    const params = [];
    if (status) {
      updates.push("status = ?");
      params.push(status);
    }
    if (payment_status) {
      updates.push("payment_status = ?");
      params.push(payment_status);
    }
    if (production_status) {
      updates.push("production_status = ?");
      params.push(production_status);
    }

    const isNumericId = /^\d+$/.test(orderId);
    let whereClause = "(order_id = ? OR url_token = ?)";
    let whereParams = [orderId, orderId];

    if (isNumericId) {
      whereClause = "(id = ? OR order_id = ? OR url_token = ?)";
      whereParams = [orderId, orderId, orderId];
    }

    let sql = `UPDATE orders SET ${updates.join(", ")} WHERE ${whereClause}`;
    await query(sql, [...params, ...whereParams]);

    // Send Status Email if Cancelled or Delivered
    if (status && (status === 'cancelled' || status === 'delivered')) {
      try {
        // Fetch User Email
        const [orderData] = await query(`
                SELECT o.id, o.status, u.name, u.email 
                FROM orders o
                JOIN users u ON o.user_id = u.id
                WHERE ${whereClause}
            `, whereParams);

        if (orderData) {
          const user = { name: orderData.name, email: orderData.email };
          const order = { id: orderData.id, status: status }; // Use new status
          sendOrderStatusEmail(order, user, status);
        }
      } catch (emailErr) {
        console.error("Failed to send status email:", emailErr);
      }
    }

    res.json({ message: "Order updated successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error updating order" });
  }
});



// Get Single Order
router.get("/orders/:id", requireAdmin, async (req, res) => {
  try {
    const orderId = req.params.id;
    const isNumericId = /^\d+$/.test(orderId);
    let whereClause = "(o.order_id = ? OR o.url_token = ?)";
    let whereParams = [orderId, orderId];
    if (isNumericId) {
      whereClause = "(o.id = ? OR o.order_id = ? OR o.url_token = ?)";
      whereParams = [orderId, orderId, orderId];
    }

    const sql = `
      SELECT o.*, u.name as user_name, u.email as user_email
      FROM orders o
      LEFT JOIN users u ON o.user_id = u.id
      WHERE ${whereClause}
    `;
    const rows = await query(sql, whereParams);
    if (rows.length === 0) return res.status(404).json({ message: "Order not found" });

    const order = rows[0];
    res.json({ order });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error fetching order" });
  }
});

// ------------------ USERS ROUTE ------------------ //

// Get All Users
router.get("/users", requireAdmin, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || "";
    const offset = (page - 1) * limit;

    let sql = "SELECT id, name, email, role, created_at FROM users";
    let countSql = "SELECT COUNT(*) as total FROM users";
    const params = [];
    const countParams = [];

    if (search) {
      sql += " WHERE name LIKE ? OR email LIKE ?";
      countSql += " WHERE name LIKE ? OR email LIKE ?";
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm);
      countParams.push(searchTerm, searchTerm);
    }

    sql += " ORDER BY created_at DESC LIMIT ? OFFSET ?";
    params.push(limit, offset);

    const [users, countResult] = await Promise.all([
      query(sql, params),
      query(countSql, countParams)
    ]);

    const total = countResult[0].total;
    const totalPages = Math.ceil(total / limit);

    res.json({
      users,
      pagination: {
        page,
        limit,
        total,
        totalPages
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error fetching users" });
  }
});

// ------------------ SELLER VERIFICATION ROUTES ------------------ //

// Get all sellers for verification
router.get("/verifications", requireAdmin, async (req, res) => {
  try {
    const sql = `
      SELECT s.*, s.name as owner_name, s.email as owner_email, sh.city, sh.name as shop_name
      FROM sellers s
      LEFT JOIN shops sh ON s.id = sh.seller_id
      ORDER BY s.created_at DESC
    `;
    const sellers = await query(sql);
    res.json(sellers);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error fetching verifications" });
  }
});

// Get specific seller details for verification
router.get("/verifications/:id", requireAdmin, async (req, res) => {
  const sellerId = req.params.id;
  try {
    const sellerSql = `
      SELECT s.*, s.name as owner_name, s.email as owner_email, s.phone as owner_phone, 
             sh.name as shop_name, sh.slug as shop_slug, sh.city, sh.pincode, sh.address_line1, sh.state
      FROM sellers s
      LEFT JOIN shops sh ON s.id = sh.seller_id
      WHERE s.id = ?
    `;
    const sellers = await query(sellerSql, [sellerId]);
    if (sellers.length === 0) return res.status(404).json({ message: "Seller not found" });

    const seller = sellers[0];

    // Fetch documents
    const documents = await query("SELECT * FROM seller_documents WHERE seller_id = ?", [sellerId]);

    // Fetch bank details
    const bankDetailsRows = await query("SELECT * FROM seller_bank_details WHERE seller_id = ?", [sellerId]);

    res.json({
      ...seller,
      documents: documents || [],
      bankDetails: bankDetailsRows.length > 0 ? bankDetailsRows[0] : null
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error fetching seller details" });
  }
});

// Approve/Reject Seller
router.post("/verifications/:id", requireAdmin, async (req, res) => {
  const { action, remarks } = req.body;
  const sellerId = req.params.id;

  const statusMap = {
    'APPROVE': 'APPROVED',
    'REJECT': 'REJECTED',
    'REQUIRE_CHANGES': 'CHANGES_REQUIRED'
  };

  const status = statusMap[action];
  if (!status) return res.status(400).json({ message: "Invalid action" });

  try {
    // Start transaction
    await query("START TRANSACTION");

    // Update status and remarks
    await query("UPDATE sellers SET status = ?, admin_remarks = ? WHERE id = ?", [status, remarks, sellerId]);

    // If approved, activate shop
    if (status === 'APPROVED') {
      await query("UPDATE shops SET is_active = 1 WHERE seller_id = ?", [sellerId]);

      // Initialize wallet if not exists
      await query("INSERT IGNORE INTO seller_wallets (seller_id) VALUES (?)", [sellerId]);
    } else {
      await query("UPDATE shops SET is_active = 0 WHERE seller_id = ?", [sellerId]);
    }

    // Audit log
    const auditSql = "INSERT INTO admin_audit_logs (admin_id, action_type, target_id, remarks) VALUES (?, ?, ?, ?)";
    await query(auditSql, [req.admin.id, `SELLER_${action}`, sellerId, remarks]);

    await query("COMMIT");
    res.json({ message: `Seller ${status} successfully` });

  } catch (err) {
    await query("ROLLBACK");
    console.error(err);
    res.status(500).json({ message: "Error processing verification" });
  }
});

module.exports = router;
