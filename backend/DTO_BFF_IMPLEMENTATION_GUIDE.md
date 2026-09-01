# DTO and BFF Pattern Implementation Guide

## Overview

This project now implements a **DTO (Data Transfer Object)** pattern combined with a **Backend-for-Frontend (BFF)** layer to ensure that sensitive data never reaches the frontend.

## Architecture

```
┌─────────────┐
│  Frontend   │
└──────┬──────┘
       │
       ▼
┌─────────────────┐
│   API Routes    │ ← Express routes (products.js, users.js, etc.)
└──────┬──────────┘
       │
       ▼
┌─────────────────┐
│   BFF Service   │ ← Backend-for-Frontend layer (services/bff.js)
└──────┬──────────┘
       │
       ▼
┌─────────────────┐
│   DTOs          │ ← Data cleaning layer (dtos/index.js)
└──────┬──────────┘
       │
       ▼
┌─────────────────┐
│   Database      │ ← Raw data with sensitive fields
└─────────────────┘
```

## What Gets Filtered?

### Products
- ❌ `uid` (internal unique identifier)
- ❌ `commission_rate`
- ❌ `cost_price`
- ❌ `supplier_id`
- ❌ `internal_notes`
- ❌ `admin_notes`
- ❌ `profit_margin`

### Users
- ❌ `password`
- ❌ `otp`
- ❌ `reset_token`
- ❌ `reset_token_expires`
- ❌ `internal_notes`
- ❌ `admin_flags`

### Orders
- ❌ `internal_id` (database auto-increment)
- ❌ `commission_amount`
- ❌ `seller_payout`
- ❌ `payment_gateway_fee`
- ❌ `internal_notes`
- ❌ `fraud_score`

### Sellers
- ❌ `password`
- ❌ `tax_id`
- ❌ `bank_account`
- ❌ `bank_name`
- ❌ `ifsc_code`
- ❌ `account_holder_name`
- ❌ `commission_rate`
- ❌ `payout_details`
- ❌ `verification_documents`

### Shops
- ❌ `seller_id` (internal reference)
- ❌ `commission_rate`
- ❌ `payout_account`
- ❌ `internal_notes`

## How to Use

### Method 1: Using BFF Service (Recommended)

The BFF service provides pre-built methods for common queries:

```javascript
const BFFService = require('../services/bff');

// In your route handler
router.get('/products/:id', async (req, res) => {
  try {
    const product = await BFFService.getProductById(req.params.id);
    
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    
    res.json(product); // Already cleaned!
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});
```

### Method 2: Using DTOs Directly

For custom queries, use DTOs to clean the data:

```javascript
const { ProductDTO } = require('../dtos');
const db = require('../db');

router.get('/custom-products', async (req, res) => {
  try {
    const [rows] = await db.promise.query('SELECT * FROM products WHERE featured = 1');
    
    // Clean the data before sending
    const cleanedProducts = ProductDTO.toList(rows);
    
    res.json(cleanedProducts);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});
```

### Method 3: Using BFF Query Helpers

For complex custom queries:

```javascript
const BFFService = require('../services/bff');
const { ProductDTO } = require('../dtos');

router.get('/trending-products', async (req, res) => {
  try {
    const query = `
      SELECT p.*, COUNT(o.id) as order_count
      FROM products p
      LEFT JOIN orders o ON JSON_CONTAINS(o.items, JSON_OBJECT('id', p.id))
      WHERE p.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
      GROUP BY p.id
      ORDER BY order_count DESC
      LIMIT 10
    `;
    
    const products = await BFFService.queryAndClean(query, [], ProductDTO.toPublic);
    
    res.json(products);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});
```

## Available BFF Methods

### User Methods
- `BFFService.getUserProfile(userId)` - Get user profile
- `BFFService.getUserByEmail(email)` - Get user by email

### Product Methods
- `BFFService.getProductById(productId)` - Get single product
- `BFFService.getProductBySlug(slug)` - Get product by slug
- `BFFService.getProductsByCategory(categoryId, options)` - Get category products
- `BFFService.searchProducts(searchTerm, options)` - Search products

### Order Methods
- `BFFService.getUserOrders(userId, options)` - Get user's orders
- `BFFService.getOrderById(orderId, userId)` - Get single order

### Seller Methods
- `BFFService.getSellerProfile(sellerId)` - Get seller profile
- `BFFService.getSellerOrders(sellerId, options)` - Get seller's orders

### Shop Methods
- `BFFService.getShopById(shopId)` - Get shop by ID
- `BFFService.getShopBySlug(slug)` - Get shop by slug
- `BFFService.getActiveShops(options)` - Get active shops

### Review Methods
- `BFFService.getProductReviews(productId, options)` - Get product reviews

### Category Methods
- `BFFService.getAllCategories()` - Get all categories
- `BFFService.getCategoryBySlug(slug)` - Get category by slug

### Coupon Methods
- `BFFService.getActiveCouponsForUser(userId)` - Get user's available coupons
- `BFFService.validateCoupon(code, userId)` - Validate coupon code

## Available DTOs

Each DTO has multiple methods for different use cases:

### ProductDTO
- `ProductDTO.toPublic(product)` - Full product details (removes sensitive fields)
- `ProductDTO.toCard(product)` - Minimal product info for cards/lists
- `ProductDTO.toList(products)` - Clean array of products
- `ProductDTO.toCardList(products)` - Clean array for cards

### UserDTO
- `UserDTO.toPublic(user)` - Public user info
- `UserDTO.toProfile(user)` - User profile (minimal fields)
- `UserDTO.toList(users)` - Clean array of users

### OrderDTO
- `OrderDTO.toPublic(order)` - Full order details
- `OrderDTO.toSummary(order)` - Order summary (minimal fields)
- `OrderDTO.toList(orders)` - Clean array of orders

### SellerDTO
- `SellerDTO.toPublic(seller)` - Public seller info
- `SellerDTO.toProfile(seller)` - Seller profile
- `SellerDTO.toList(sellers)` - Clean array of sellers

### ShopDTO
- `ShopDTO.toPublic(shop)` - Full shop details
- `ShopDTO.toCard(shop)` - Minimal shop info for cards
- `ShopDTO.toList(shops)` - Clean array of shops

### ReviewDTO
- `ReviewDTO.toPublic(review)` - Public review (hides user_id, IP, etc.)
- `ReviewDTO.toList(reviews)` - Clean array of reviews

### CategoryDTO
- `CategoryDTO.toPublic(category)` - Public category
- `CategoryDTO.toList(categories)` - Clean array of categories

### CouponDTO
- `CouponDTO.toPublic(coupon)` - Full coupon details
- `CouponDTO.toUserView(coupon)` - User-facing coupon (minimal fields)
- `CouponDTO.toList(coupons)` - Clean array of coupons

## Migration Guide

### Step 1: Identify Routes to Update

Look for routes that return database data directly:

```javascript
// ❌ BAD - Exposes all fields
router.get('/products/:id', async (req, res) => {
  const [rows] = await db.promise.query('SELECT * FROM products WHERE id = ?', [req.params.id]);
  res.json(rows[0]); // Contains sensitive fields!
});
```

### Step 2: Use BFF Service

```javascript
// ✅ GOOD - Uses BFF service
const BFFService = require('../services/bff');

router.get('/products/:id', async (req, res) => {
  const product = await BFFService.getProductById(req.params.id);
  res.json(product); // Cleaned data!
});
```

### Step 3: Or Use DTOs Directly

```javascript
// ✅ GOOD - Uses DTO directly
const { ProductDTO } = require('../dtos');

router.get('/products/:id', async (req, res) => {
  const [rows] = await db.promise.query('SELECT * FROM products WHERE id = ?', [req.params.id]);
  const cleanProduct = ProductDTO.toPublic(rows[0]);
  res.json(cleanProduct); // Cleaned data!
});
```

## Testing

### Before (Sensitive Data Exposed)
```json
{
  "id": 1,
  "name": "Product Name",
  "price": 999,
  "uid": "PROD-01JBXYZ123",
  "commission_rate": 15,
  "cost_price": 500,
  "profit_margin": 499,
  "supplier_id": 42,
  "internal_notes": "High margin item"
}
```

### After (Clean Data)
```json
{
  "id": 1,
  "name": "Product Name",
  "price": 999,
  "product_uid": "PROD-01JBXYZ123",
  "description": "...",
  "image": "/assets/products/...",
  "category_name": "Electronics"
}
```

## Priority Routes to Update

1. **High Priority** (Public-facing):
   - `/api/products/*` - Product routes
   - `/api/orders/*` - Order routes (user-facing)
   - `/users/*` - User profile routes
   - `/reviews/*` - Review routes

2. **Medium Priority** (Seller-facing):
   - `/api/seller/*` - Seller dashboard routes
   - `/api/sellers/*` - Seller auth routes
   - `/api/shops/*` - Shop routes

3. **Low Priority** (Admin-facing):
   - `/admin/*` - Admin routes (already protected by auth)

## Best Practices

1. **Always use DTOs** when returning database data to frontend
2. **Use BFF service** for common queries to avoid code duplication
3. **Never expose internal IDs** like `uid`, `seller_id`, etc.
4. **Parse JSON fields** in DTOs (attributes, product_features, etc.)
5. **Test your responses** to ensure no sensitive data leaks

## Custom DTOs

If you need to create custom DTOs for new entities:

```javascript
const { BaseDTO } = require('../dtos');

class CustomDTO extends BaseDTO {
  static toPublic(item) {
    if (!item) return null;
    
    return this.omit(item, [
      'sensitive_field_1',
      'sensitive_field_2'
    ]);
  }
  
  static toList(items) {
    return this.cleanArray(items, this.toPublic.bind(this));
  }
}

module.exports = CustomDTO;
```

## Security Benefits

✅ **Prevents data leaks** - Sensitive fields never reach the browser
✅ **Consistent data format** - All responses follow the same structure
✅ **Easier to maintain** - Centralized data cleaning logic
✅ **Better performance** - Smaller response payloads
✅ **Audit trail** - Easy to track what data is exposed

## Next Steps

1. Review all API routes in `/backend/routes/`
2. Replace direct database responses with BFF/DTO calls
3. Test each endpoint to verify data is cleaned
4. Update frontend to handle new response format (if needed)
5. Monitor logs for any DTO errors

## Support

If you encounter issues:
- Check that DTOs are imported correctly
- Verify database queries return expected fields
- Use `console.log()` to debug DTO output
- Ensure JSON fields are parsed correctly
