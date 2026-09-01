# Troubleshooting "No Products Found" Error

## Issue
Getting "No products found" error when accessing product URLs with UTM parameters.

## Root Cause Analysis

### What's NOT the problem:
❌ **UTM parameters** - These are query strings (`?utm_source=...`) and don't affect product lookup
❌ **The `itm` parameter** - This is also a query string used only for tracking

### What IS the problem:
✅ **The product slug** - The ProductDetails page fetches products by slug only
✅ **Backend database** - The product might not exist with that slug

## How ProductDetails Works

```javascript
// ProductDetails.js line 192
const fetchUrl = `${API_BASE_URL}/products?slug=${slug}`;

axios.get(fetchUrl)
  .then(async (res) => {
    const products = res.data.products || [];
    if (products.length > 0) {
      const p = products[0];
      setProduct(p);
      // ... rest of the code
    } else {
      // "No products found" is shown here
    }
  })
```

**Key Point:** The page only uses the `slug` from the URL path (`/poco-dock-station/`), and completely ignores all query parameters including UTM and `itm`.

## Debugging Steps

### Step 1: Test Without UTM Parameters
Try accessing the product with just the slug:
```
http://localhost:3002/poco-dock-station/
```

**If this works:** The UTM implementation is fine, and the issue was just a coincidence.
**If this fails:** The product doesn't exist in the database with that slug.

### Step 2: Check Backend Response
Open browser DevTools (F12) → Network tab → Refresh the page → Look for the request to:
```
http://localhost:3001/products?slug=poco-dock-station
```

Check the response:
- **200 OK with empty array `{products: []}`** → Product doesn't exist with that slug
- **404 or 500 error** → Backend issue
- **200 OK with product data** → Frontend rendering issue

### Step 3: Verify Database
Check if the product exists in your database:
```sql
SELECT id, name, slug FROM products WHERE slug = 'poco-dock-station';
```

### Step 4: Check for Slug Mismatch
Common issues:
- Slug in database: `poco-dock-station-2024`
- Slug in URL: `poco-dock-station`
- **Solution:** Use the exact slug from the database

## Fix for Long `itm` Values

I've already fixed this issue. The `itm` parameter was using `url_token` first, which can be a very long hash. 

**Before:**
```javascript
// Used url_token first (could be 128+ characters)
const productId = (product.url_token || product.product_uid || product.id).toString();
```

**After:**
```javascript
// Uses product.id first (typically a short integer like 123)
const productId = (product.id || product.product_uid || product.url_token).toString();
```

**Result:** URLs will now look like:
```
/poco-dock-station/?utm_source=homepage&utm_campaign=interested_in&itm=123
```
Instead of:
```
/poco-dock-station/?utm_source=homepage&utm_campaign=interested_in&itm=b34e9cccf3c0c767...
```

## Expected Behavior

### Correct URL Format
```
http://localhost:3002/{product-slug}/?utm_source={source}&utm_campaign={campaign}&itm={id}
```

### Examples
```
✅ http://localhost:3002/poco-dock-station/?utm_source=homepage&utm_campaign=best_sellers&itm=123
✅ http://localhost:3002/wireless-earbuds/?utm_source=homepage&utm_campaign=trending&itm=456
✅ http://localhost:3002/gaming-laptop/?utm_source=homepage&utm_campaign=featured&itm=789
```

## Common Mistakes

### 1. Wrong Slug
```
❌ /poco-dock-station-v2/  (if database has 'poco-dock-station')
✅ /poco-dock-station/
```

### 2. Missing Trailing Slash
Both should work, but for consistency:
```
⚠️ /poco-dock-station  (might work)
✅ /poco-dock-station/ (recommended)
```

### 3. Case Sensitivity
Slugs are usually lowercase:
```
❌ /Poco-Dock-Station/
✅ /poco-dock-station/
```

## Quick Test

1. **Open browser console** (F12)
2. **Navigate to homepage**
3. **Click on any product**
4. **Check the URL** - should have UTM parameters
5. **Check if product loads** - should show product details

If the product loads, UTM tracking is working correctly! ✅

## Summary

- ✅ **UTM parameters don't cause "No products found"**
- ✅ **The issue is with the product slug or database**
- ✅ **Fixed long `itm` values** by prioritizing `product.id`
- ✅ **Test without UTM parameters** to isolate the issue

---

**Next Steps:**
1. Test the product URL without UTM parameters
2. Check backend response in Network tab
3. Verify product exists in database
4. Ensure slug matches exactly
