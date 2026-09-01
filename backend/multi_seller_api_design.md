# Multi-Seller E-commerce API Design

## 1. Seller Onboarding & Management

### Register as Seller
- **Endpoint**: `POST /api/sellers/register`
- **Auth**: Required (User role)
- **Body**: `{ business_name, business_type, tax_id }`
- **Action**: Creates seller entry with status `DRAFT`.

### Submit Onboarding Details
- **Endpoint**: `POST /api/sellers/onboarding`
- **Auth**: Required (Seller)
- **Body**: 
  ```json
  {
    "bank_details": { "account_holder", "account_number", "bank_name", "ifsc" },
    "shop_details": { "name", "description", "city", "pincode", "latitude", "longitude" },
    "documents": [ { "type": "identity_proof", "url": "..." }, ... ]
  }
  ```
- **Action**: Updates seller status to `SUBMITTED`.

### Upload Files (Logo/Documents)
- **Endpoint**: `POST /api/uploads/seller`
- **Auth**: Required (Seller)
- **Body**: `FormData` containing files
- **Action**: Uploads to S3/Cloudinary and returns URLs.

---

## 2. Location-Based Shop Discovery

### Explore Nearby Shops
- **Endpoint**: `GET /api/shops/explore`
- **Params**: `lat`, `lng`, `radius` (optional), `city` (fallback), `pincode` (fallback)
- **Logic**:
  1. If `lat` and `lng` provided: Use Haversine formula to find shops within X km.
  2. If geo unavailable: Filter by `pincode` then `city`.
  3. Final fallback: Global most popular shops.

### Global Search
- **Endpoint**: `GET /api/search`
- **Params**: `q` (query), `lat`, `lng`, `category`
- **Logic**:
  - Search `products.name` MATCHING `q`.
  - Search `shops.name` MATCHING `q`.
  - Sort results by distance if `lat`/`lng` provided.

---

## 3. Shop & Product Interaction

### Get Shop Detail
- **Endpoint**: `GET /api/shops/:slug`
- **Response**: Shop profile + List of products belonging to this shop.

### Seller Product Management
- **Endpoint**: `POST /api/products` (Seller context)
- **Logic**: Automatically assigns `shop_id` from the authenticated seller's shop.
- **Visibility**: Product only appears in public API if `shop.is_active = 1` and `seller.status = 'APPROVED'`.

---

## 4. Admin Workflow

### List Pending Verifications
- **Endpoint**: `GET /api/admin/verifications`
- **Response**: List of sellers with status `SUBMITTED` or `PENDING_VERIFICATION`.

### Process Verification
- **Endpoint**: `POST /api/admin/verifications/:sellerId`
- **Body**: `{ action: 'APPROVE' | 'REJECT' | 'CHANGES_REQUIRED', remarks: '...' }`
- **Action**:
  - If `APPROVE`: `seller.status = 'APPROVED'`, `shop.is_active = 1`.
  - If `REJECT`: `seller.status = 'REJECTED'`, `shop.is_active = 0`.
  - Logs action in `admin_audit_logs`.

---

## 5. Security & Best Practices

- **RBAC**: Middleware to check `req.user.role` (Admin, Seller, User).
- **Ownership Check**: Sellers can only modify products where `product.shop_id` belongs to them.
- **Input Validation**: Joi/Zod schemas for geo-coordinates and bank details.
- **Large Dataset Optimization**: 
  - Index on `city`, `pincode`.
  - Spatial indexes if using specialized GIS plugins.
  - Pagination for all listing endpoints.
