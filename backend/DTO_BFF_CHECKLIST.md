# DTO/BFF Implementation Checklist

## Phase 1: Setup ✅ (COMPLETED)

- [x] Create DTO classes (`backend/dtos/index.js`)
- [x] Create BFF Service (`backend/services/bff.js`)
- [x] Create implementation guide
- [x] Create example implementations

## Phase 2: Route Migration (TODO)

### High Priority Routes (Public-Facing)

#### Products Routes (`backend/routes/products.js`)
- [ ] GET `/api/products` - List all products
- [ ] GET `/api/products/:id` - Get single product
- [ ] GET `/api/products/slug/:slug` - Get product by slug
- [ ] GET `/api/products/category/:categoryId` - Get products by category
- [ ] GET `/api/products/search` - Search products
- [ ] GET `/api/products/featured` - Get featured products
- [ ] GET `/api/products/:id/related` - Get related products

#### Orders Routes (`backend/routes/orders.js`)
- [ ] GET `/api/orders` - Get user orders
- [ ] GET `/api/orders/:id` - Get single order
- [ ] POST `/api/orders/create` - Create order (clean response)
- [ ] GET `/api/orders/seller` - Get seller orders
- [ ] GET `/api/orders/seller/:id` - Get seller order details
- [ ] PUT `/api/orders/:id/status` - Update order status
- [ ] POST `/api/orders/:id/cancel` - Cancel order

#### Users Routes (`backend/routes/users.js`)
- [ ] POST `/users/login` - User login
- [ ] POST `/users/register` - User registration
- [ ] GET `/users/me` - Get user profile
- [ ] PUT `/users/me` - Update user profile
- [ ] GET `/users/wishlist` - Get wishlist
- [ ] POST `/users/wishlist/:productId` - Add to wishlist
- [ ] DELETE `/users/wishlist/:productId` - Remove from wishlist
- [ ] GET `/users/addresses` - Get addresses
- [ ] POST `/users/addresses` - Add address
- [ ] PUT `/users/addresses/:id` - Update address
- [ ] DELETE `/users/addresses/:id` - Delete address

#### Reviews Routes (`backend/routes/reviews.js`)
- [ ] GET `/reviews/product/:productId` - Get product reviews
- [ ] POST `/reviews` - Create review
- [ ] GET `/reviews/user` - Get user's reviews

### Medium Priority Routes (Seller-Facing)

#### Seller Routes (`backend/routes/sellers.js`)
- [ ] POST `/api/sellers/register` - Seller registration
- [ ] POST `/api/sellers/login` - Seller login
- [ ] GET `/api/sellers/me` - Get seller profile
- [ ] GET `/api/sellers/profile` - Get shop profile
- [ ] PUT `/api/sellers/profile` - Update shop profile

#### Seller Dashboard Routes (`backend/routes/seller.js`)
- [ ] GET `/api/seller/products` - Get seller's products
- [ ] POST `/api/seller/products` - Create product
- [ ] PUT `/api/seller/products/:id` - Update product
- [ ] DELETE `/api/seller/products/:id` - Delete product
- [ ] GET `/api/seller/analytics` - Get seller analytics

#### Shop Routes (`backend/routes/shops.js`)
- [ ] GET `/api/shops` - Get all shops
- [ ] GET `/api/shops/:id` - Get shop by ID
- [ ] GET `/api/shops/slug/:slug` - Get shop by slug

### Lower Priority Routes

#### Category Routes (`backend/routes/category.js`)
- [ ] GET `/api/category` - Get all categories
- [ ] GET `/api/category/:id` - Get category by ID
- [ ] GET `/api/category/slug/:slug` - Get category by slug

#### Subcategory Routes (`backend/routes/subcategory.js`)
- [ ] GET `/api/subcategory` - Get all subcategories
- [ ] GET `/api/subcategory/:id` - Get subcategory by ID
- [ ] GET `/api/subcategory/category/:categoryId` - Get subcategories by category

#### Coupon Routes (`backend/routes/coupons.js`)
- [ ] GET `/api/coupons` - Get available coupons
- [ ] POST `/api/coupons/validate` - Validate coupon code
- [ ] POST `/api/coupons/apply` - Apply coupon

#### Brand Routes (`backend/routes/brands.js`)
- [ ] GET `/api/brands` - Get all brands
- [ ] GET `/api/brands/:id` - Get brand by ID

#### Collection Routes (`backend/routes/collections.js`)
- [ ] GET `/api/collections` - Get all collections
- [ ] GET `/api/collections/:id` - Get collection by ID

#### Video Routes (`backend/routes/videos.js`)
- [ ] GET `/api/videos` - Get all videos
- [ ] GET `/api/videos/:id` - Get video by ID

## Phase 3: Testing

### Unit Tests
- [ ] Test each DTO class
  - [ ] UserDTO
  - [ ] ProductDTO
  - [ ] OrderDTO
  - [ ] SellerDTO
  - [ ] ShopDTO
  - [ ] ReviewDTO
  - [ ] CategoryDTO
  - [ ] CouponDTO

### Integration Tests
- [ ] Test BFF Service methods
  - [ ] User methods
  - [ ] Product methods
  - [ ] Order methods
  - [ ] Seller methods
  - [ ] Shop methods

### API Tests
- [ ] Test each migrated route
- [ ] Verify no sensitive data in responses
- [ ] Check response format consistency
- [ ] Test error handling

## Phase 4: Verification

### Manual Verification Checklist

For each route, verify:
- [ ] No `password` fields in response
- [ ] No `uid` or internal IDs exposed
- [ ] No `commission_rate` or financial data
- [ ] No `internal_notes` or admin fields
- [ ] No `ip_address` or tracking data
- [ ] JSON fields are properly parsed
- [ ] Response structure is consistent

### Automated Verification

Create a script to check all API responses:

```javascript
// backend/scripts/verify-dto-compliance.js
const axios = require('axios');

const SENSITIVE_FIELDS = [
  'password',
  'uid',
  'commission_rate',
  'cost_price',
  'profit_margin',
  'supplier_id',
  'internal_notes',
  'admin_notes',
  'admin_flags',
  'tax_id',
  'bank_account',
  'ifsc_code',
  'ip_address',
  'user_agent',
  'fraud_score',
  'seller_id' // Internal reference
];

async function checkEndpoint(url, method = 'GET', headers = {}) {
  try {
    const response = await axios({ method, url, headers });
    const data = response.data;
    
    // Check for sensitive fields
    const found = findSensitiveFields(data, SENSITIVE_FIELDS);
    
    if (found.length > 0) {
      console.error(`❌ ${url} exposes sensitive fields:`, found);
      return false;
    }
    
    console.log(`✅ ${url} is clean`);
    return true;
  } catch (error) {
    console.error(`⚠️  ${url} error:`, error.message);
    return null;
  }
}

function findSensitiveFields(obj, fields, path = '') {
  const found = [];
  
  if (Array.isArray(obj)) {
    obj.forEach((item, index) => {
      found.push(...findSensitiveFields(item, fields, `${path}[${index}]`));
    });
  } else if (typeof obj === 'object' && obj !== null) {
    for (const [key, value] of Object.entries(obj)) {
      const currentPath = path ? `${path}.${key}` : key;
      
      if (fields.includes(key)) {
        found.push(currentPath);
      }
      
      if (typeof value === 'object') {
        found.push(...findSensitiveFields(value, fields, currentPath));
      }
    }
  }
  
  return found;
}

// Run checks
async function runChecks() {
  const baseURL = 'http://localhost:6376';
  
  const endpoints = [
    '/api/products',
    '/api/products/1',
    '/api/category',
    '/users/me', // Requires auth
    '/api/orders', // Requires auth
  ];
  
  for (const endpoint of endpoints) {
    await checkEndpoint(`${baseURL}${endpoint}`);
  }
}

runChecks();
```

## Phase 5: Documentation

- [ ] Update API documentation with new response formats
- [ ] Document which fields are removed for each entity
- [ ] Create migration guide for frontend team
- [ ] Update Postman/API testing collections

## Phase 6: Deployment

### Pre-Deployment
- [ ] Run all tests
- [ ] Verify no breaking changes for frontend
- [ ] Create database backup
- [ ] Review all changes

### Deployment
- [ ] Deploy to staging environment
- [ ] Run smoke tests
- [ ] Monitor error logs
- [ ] Check frontend compatibility

### Post-Deployment
- [ ] Monitor API response times
- [ ] Check for any DTO errors in logs
- [ ] Verify frontend still works correctly
- [ ] Gather feedback from team

## Notes

### Common Issues and Solutions

**Issue**: JSON fields not parsing correctly
**Solution**: Ensure DTOs handle both string and object formats

**Issue**: Related data not included
**Solution**: Use JOIN queries in BFF service to fetch related data

**Issue**: Performance degradation
**Solution**: Add database indexes, use caching for frequently accessed data

**Issue**: Frontend breaking changes
**Solution**: Maintain backward compatibility by keeping old field names as aliases

### Performance Considerations

- DTOs add minimal overhead (< 1ms per request)
- BFF service can cache frequently accessed data
- Consider using database views for complex queries
- Use pagination for large datasets

### Security Benefits

✅ Prevents accidental data leaks
✅ Centralizes data sanitization
✅ Makes security audits easier
✅ Reduces attack surface
✅ Improves compliance (GDPR, PCI-DSS)

## Timeline Estimate

- **Phase 1** (Setup): ✅ Complete
- **Phase 2** (Migration): 2-3 days
- **Phase 3** (Testing): 1-2 days
- **Phase 4** (Verification): 1 day
- **Phase 5** (Documentation): 1 day
- **Phase 6** (Deployment): 1 day

**Total**: ~7-10 days for complete implementation

## Success Criteria

- [ ] All public routes use DTOs
- [ ] No sensitive data in API responses
- [ ] All tests passing
- [ ] Frontend working without issues
- [ ] Performance within acceptable range
- [ ] Documentation complete
- [ ] Team trained on new pattern
