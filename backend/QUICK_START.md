# DTO & BFF Pattern - Quick Start Guide

## 🚀 What You Just Got

Your project now has a **complete DTO (Data Transfer Object) and BFF (Backend-for-Frontend) implementation** that automatically filters sensitive data before it reaches the frontend.

## 📁 Files Created

```
backend/
├── dtos/
│   └── index.js                          # DTO classes for all entities
├── services/
│   └── bff.js                            # BFF service layer
├── examples/
│   ├── products-with-bff.js              # Example: Products route
│   ├── orders-with-bff.js                # Example: Orders route
│   └── users-with-bff.js                 # Example: Users route
├── scripts/
│   └── verify-dto-compliance.js          # Automated verification tool
├── DTO_BFF_IMPLEMENTATION_GUIDE.md       # Full implementation guide
└── DTO_BFF_CHECKLIST.md                  # Migration checklist
```

## ⚡ Quick Start (5 Minutes)

### Step 1: Test the DTOs

```bash
cd backend
node -e "const { ProductDTO } = require('./dtos'); const product = { id: 1, name: 'Test', price: 100, uid: 'SECRET', commission_rate: 15 }; console.log('Before:', product); console.log('After:', ProductDTO.toPublic(product));"
```

You should see that `uid` and `commission_rate` are removed!

### Step 2: Update Your First Route

Open `backend/routes/products.js` and replace a simple route:

**Before:**
```javascript
router.get('/:id', async (req, res) => {
  const [rows] = await db.promise.query('SELECT * FROM products WHERE id = ?', [req.params.id]);
  res.json(rows[0]); // ❌ Exposes ALL fields including sensitive ones
});
```

**After:**
```javascript
const BFFService = require('../services/bff');

router.get('/:id', async (req, res) => {
  const product = await BFFService.getProductById(req.params.id);
  res.json(product); // ✅ Only safe fields
});
```

### Step 3: Test It

```bash
# Start your server
npm start

# In another terminal, test the endpoint
curl http://localhost:6376/api/products/1 | jq
```

Check the response - you should NOT see fields like `uid`, `commission_rate`, `cost_price`, etc.

### Step 4: Run Verification

```bash
# Install axios if not already installed
npm install axios

# Run the verification script
node scripts/verify-dto-compliance.js
```

This will check all your public endpoints and tell you if any sensitive data is leaking.

## 🎯 What Gets Filtered?

### Products
❌ `uid`, `commission_rate`, `cost_price`, `profit_margin`, `supplier_id`, `internal_notes`

### Users
❌ `password`, `otp`, `reset_token`, `internal_notes`, `admin_flags`

### Orders
❌ `commission_amount`, `seller_payout`, `payment_gateway_fee`, `fraud_score`

### Sellers
❌ `password`, `tax_id`, `bank_account`, `ifsc_code`, `commission_rate`, `payout_details`

### Shops
❌ `seller_id`, `commission_rate`, `payout_account`, `internal_notes`

## 📖 Usage Patterns

### Pattern 1: Use BFF Service (Easiest)

```javascript
const BFFService = require('../services/bff');

// Get single product
const product = await BFFService.getProductById(productId);

// Get user orders
const orders = await BFFService.getUserOrders(userId, { limit: 10 });

// Search products
const results = await BFFService.searchProducts('laptop', { limit: 20 });
```

### Pattern 2: Use DTOs Directly

```javascript
const { ProductDTO } = require('../dtos');

const [rows] = await db.promise.query('SELECT * FROM products WHERE featured = 1');
const cleanProducts = ProductDTO.toList(rows);
res.json(cleanProducts);
```

### Pattern 3: Use BFF Query Helper

```javascript
const BFFService = require('../services/bff');
const { ProductDTO } = require('../dtos');

const query = 'SELECT * FROM products WHERE category_id = ?';
const products = await BFFService.queryAndClean(query, [categoryId], ProductDTO.toPublic);
```

## 🔧 Available BFF Methods

### Products
- `getProductById(id)` - Single product
- `getProductBySlug(slug)` - Product by slug
- `getProductsByCategory(categoryId, options)` - Category products
- `searchProducts(term, options)` - Search

### Orders
- `getUserOrders(userId, options)` - User's orders
- `getOrderById(orderId, userId)` - Single order
- `getSellerOrders(sellerId, options)` - Seller's orders

### Users
- `getUserProfile(userId)` - User profile
- `getUserByEmail(email)` - User by email

### Sellers
- `getSellerProfile(sellerId)` - Seller profile
- `getSellerOrders(sellerId, options)` - Seller orders

### Shops
- `getShopById(shopId)` - Shop by ID
- `getShopBySlug(slug)` - Shop by slug
- `getActiveShops(options)` - Active shops

### Others
- `getProductReviews(productId, options)` - Product reviews
- `getAllCategories()` - All categories
- `getCategoryBySlug(slug)` - Category by slug
- `getActiveCouponsForUser(userId)` - User coupons
- `validateCoupon(code, userId)` - Validate coupon

## 🧪 Testing

### Manual Test

```bash
# Test a specific endpoint
curl http://localhost:6376/api/products/1 | jq

# Check for sensitive fields
curl http://localhost:6376/api/products/1 | grep -i "commission_rate\|uid\|cost_price"
# Should return nothing!
```

### Automated Test

```bash
# Run verification on all endpoints
node scripts/verify-dto-compliance.js

# Test specific endpoints
node scripts/verify-dto-compliance.js /api/products /api/orders
```

## 📝 Migration Checklist

Use the detailed checklist in `DTO_BFF_CHECKLIST.md`:

```bash
cat backend/DTO_BFF_CHECKLIST.md
```

## 🎓 Learn More

### Full Documentation
- `DTO_BFF_IMPLEMENTATION_GUIDE.md` - Complete guide with examples
- `DTO_BFF_CHECKLIST.md` - Step-by-step migration plan

### Example Implementations
- `examples/products-with-bff.js` - Product routes
- `examples/orders-with-bff.js` - Order routes
- `examples/users-with-bff.js` - User routes

## 🚨 Common Issues

### Issue: "Cannot find module '../dtos'"
**Solution:** Make sure you're requiring from the correct path:
```javascript
const { ProductDTO } = require('../dtos'); // If in routes/
const { ProductDTO } = require('./dtos');  // If in backend/
```

### Issue: JSON fields not parsing
**Solution:** DTOs automatically parse JSON strings. If you see issues:
```javascript
// The DTO handles this automatically
const product = ProductDTO.toPublic(rawProduct);
// product.attributes is now an object, not a string
```

### Issue: Related data missing
**Solution:** Use JOIN queries in BFF service:
```javascript
const query = `
  SELECT p.*, c.name as category_name, b.name as brand_name
  FROM products p
  LEFT JOIN categories c ON p.category_id = c.id
  LEFT JOIN brands b ON p.brand_id = b.id
  WHERE p.id = ?
`;
```

## 🎯 Next Steps

1. **Start Small**: Update one route at a time
2. **Test Each Change**: Use the verification script
3. **Check Frontend**: Ensure frontend still works
4. **Monitor Logs**: Watch for DTO errors
5. **Iterate**: Refine DTOs as needed

## 💡 Pro Tips

1. **Use BFF for common queries** - Avoid code duplication
2. **Create custom DTOs** for new entities
3. **Add caching** in BFF service for performance
4. **Use TypeScript** for better type safety (optional)
5. **Document changes** for your team

## 🔒 Security Benefits

✅ **No accidental data leaks** - Sensitive fields automatically removed
✅ **Consistent responses** - All data follows same structure
✅ **Easy audits** - Centralized data cleaning
✅ **Better compliance** - GDPR, PCI-DSS ready
✅ **Smaller payloads** - Better performance

## 📞 Need Help?

1. Check the implementation guide: `DTO_BFF_IMPLEMENTATION_GUIDE.md`
2. Look at examples in `examples/` folder
3. Run verification: `node scripts/verify-dto-compliance.js`
4. Review the checklist: `DTO_BFF_CHECKLIST.md`

## 🎉 Success Criteria

You'll know it's working when:
- ✅ Verification script shows all green
- ✅ No sensitive fields in browser DevTools
- ✅ Frontend works without changes
- ✅ API responses are smaller
- ✅ Code is cleaner and more maintainable

---

**Ready to start?** Pick one route from `routes/products.js` and apply the BFF pattern. Test it, verify it, and move to the next one!

Good luck! 🚀
