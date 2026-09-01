# UTM Tracking Implementation Guide

## Overview
This application implements comprehensive UTM (Urchin Tracking Module) parameter tracking for all product URLs. This allows you to track user behavior, measure campaign effectiveness, and understand how users navigate through your e-commerce platform.

## URL Structure

### Standard Product URL Format
```
https://www.yourstore.com/{product-slug}/?utm_source={source}&utm_campaign={campaign}&itm={product_id}
```

### Example URLs

#### Homepage - Best Sellers Section
```
https://www.yourstore.com/mivi-fort-h30-bluetooth-speaker/?utm_source=homepage&utm_campaign=best_sellers&itm=123
```

#### Homepage - New Arrivals Section
```
https://www.yourstore.com/mivi-fort-h30-bluetooth-speaker/?utm_source=homepage&utm_campaign=new_arrivals&itm=123
```

#### Homepage - Trending Section
```
https://www.yourstore.com/mivi-fort-h30-bluetooth-speaker/?utm_source=homepage&utm_campaign=trending&itm=123
```

#### Homepage - Featured Brands Section
```
https://www.yourstore.com/mivi-fort-h30-bluetooth-speaker/?utm_source=homepage&utm_campaign=featured&itm=123
```

#### Homepage - Top Rated Section
```
https://www.yourstore.com/mivi-fort-h30-bluetooth-speaker/?utm_source=homepage&utm_campaign=top_rated&itm=123
```

#### Homepage - Recently Viewed Section
```
https://www.yourstore.com/mivi-fort-h30-bluetooth-speaker/?utm_source=homepage&utm_campaign=recently_viewed&itm=123
```

#### Homepage - Explore More Section
```
https://www.yourstore.com/mivi-fort-h30-bluetooth-speaker/?utm_source=homepage&utm_campaign=explore_more&itm=123
```

#### Product Details - Similar Products
```
https://www.yourstore.com/mivi-fort-h30-bluetooth-speaker/?utm_source=homepage&utm_campaign=similar_products&itm=123
```

#### Product Details - You Might Be Interested In
```
https://www.yourstore.com/mivi-fort-h30-bluetooth-speaker/?utm_source=homepage&utm_campaign=interested_in&itm=123
```

#### Category Browse
```
https://www.yourstore.com/mivi-fort-h30-bluetooth-speaker/?utm_source=homepage&utm_campaign=category_browse&itm=123
```

## UTM Parameters Explained

### 1. `utm_source`
Identifies where the traffic is coming from.

**Current Implementation:**
- `homepage` - All product clicks from the homepage

**Future Extensions:**
You can extend this to include:
- `email` - Email campaigns
- `social` - Social media
- `search` - Search results
- `category` - Category pages
- `cart` - Cart page
- `wishlist` - Wishlist page

### 2. `utm_campaign`
Identifies the specific campaign or section within the source.

**Current Implementation:**
- `best_sellers` - Best Sellers section
- `new_arrivals` - New Arrivals section
- `trending` - Trending Now section
- `featured` - Featured Brands section
- `top_rated` - Top Rated section
- `recently_viewed` - Recently Viewed Products
- `explore_more` - Explore More section
- `similar_products` - Similar Products on product details
- `interested_in` - You might also be interested in
- `category_browse` - Category filtering/browsing

### 3. `itm` (Internal Tracking Parameter)
A custom parameter for internal product tracking.

**Format:** Product ID (e.g., `123`, `a6bb7ef8d6167`)

**Purpose:**
- Track individual product performance
- Link clicks to specific products in analytics
- Enable product-level conversion tracking

## Implementation Details

### Core Utility Functions

Located in: `/frontend/src/utils/productUrl.js`

#### Main Function: `generateProductUrl()`
```javascript
generateProductUrl(product, source, campaign, options)
```

**Parameters:**
- `product` - Product object (must contain `slug` and `id`)
- `source` - UTM source (e.g., 'homepage')
- `campaign` - UTM campaign (e.g., 'best_sellers')
- `options` - Additional custom parameters (optional)

**Returns:** Complete product URL with UTM parameters

#### Helper Functions

1. **`generateHomepageProductUrl(product, section)`**
   - Generates URLs for homepage sections
   - Automatically sets `utm_source=homepage`
   - Uses `section` parameter for `utm_campaign`

2. **`generateCategoryProductUrl(product, categorySlug)`**
   - For category page links
   - Sets `utm_source=category`
   - Uses category slug for campaign

3. **`generateSearchProductUrl(product, searchTerm)`**
   - For search results
   - Sets `utm_source=search`
   - Uses search term for campaign

4. **`generateCartProductUrl(product)`**
   - For cart page links
   - Sets `utm_source=cart`

5. **`generateWishlistProductUrl(product)`**
   - For wishlist links
   - Sets `utm_source=wishlist`

6. **`generateRecommendationProductUrl(product)`**
   - For product recommendations
   - Sets `utm_source=product`

### Component Integration

#### ProductRow Component
```javascript
<ProductRow 
  title="Best Sellers" 
  products={bestSellers} 
  linkTo="/search?tags=best_seller" 
  section="best_sellers" 
/>
```

The `section` prop is passed to each ProductCard, which uses it to generate the correct UTM campaign parameter.

#### ProductCard Component
```javascript
<ProductCard 
  product={product} 
  section="best_sellers" 
/>
```

The ProductCard uses the section prop when generating the product URL:
```javascript
const url = generateHomepageProductUrl(product, section);
navigate(url);
```

## Analytics Tracking

### What You Can Track

With this implementation, you can analyze:

1. **Section Performance**
   - Which homepage sections drive the most clicks?
   - Which sections have the highest conversion rates?
   - Which products perform best in each section?

2. **User Journey**
   - How do users navigate through your site?
   - What's the typical path to purchase?
   - Which sections lead to cart additions?

3. **Product Performance**
   - Which products get the most clicks?
   - Which products convert best from specific sections?
   - Product-level ROI analysis

4. **Campaign Effectiveness**
   - Compare performance across different sections
   - A/B test section layouts
   - Optimize product placement

### Integration with Analytics Tools

#### Google Analytics 4 (GA4)
The UTM parameters will automatically be captured in GA4:
- View in: **Reports > Acquisition > Traffic acquisition**
- Custom reports can be created to analyze by campaign

#### Google Tag Manager (GTM)
Create custom events to track:
```javascript
dataLayer.push({
  'event': 'product_click',
  'utm_source': 'homepage',
  'utm_campaign': 'best_sellers',
  'product_id': '123',
  'product_name': 'Product Name'
});
```

## Best Practices

### 1. Consistent Naming
- Use lowercase with underscores for campaign names
- Keep names descriptive but concise
- Maintain a naming convention document

### 2. URL Cleanliness
- UTM parameters are appended as query strings
- They don't affect SEO (search engines ignore them)
- The base URL remains clean: `/{product-slug}/`

### 3. Tracking Accuracy
- Always pass the `section` prop to ProductCard
- Ensure product objects have valid `id` and `slug`
- Test URLs in development before deploying

### 4. Data Privacy
- UTM parameters don't contain personal information
- They're safe for GDPR/privacy compliance
- They help improve user experience through data-driven decisions

## Testing

### Manual Testing
1. Click on a product from any section
2. Check the URL in the browser address bar
3. Verify the UTM parameters are correct

### Example Test Cases
```
Homepage > Best Sellers > Product Click
Expected: ?utm_source=homepage&utm_campaign=best_sellers&itm={id}

Homepage > Trending > Product Click
Expected: ?utm_source=homepage&utm_campaign=trending&itm={id}

Product Details > Similar Products > Product Click
Expected: ?utm_source=homepage&utm_campaign=similar_products&itm={id}
```

## Future Enhancements

### 1. Additional UTM Parameters
Consider adding:
- `utm_medium` - Marketing medium (e.g., 'banner', 'carousel', 'grid')
- `utm_content` - For A/B testing (e.g., 'variant_a', 'variant_b')
- `utm_term` - For paid search keywords

### 2. Dynamic Source Detection
Automatically detect the source based on the current page:
```javascript
const source = getCurrentPageType(); // 'homepage', 'category', 'search', etc.
```

### 3. Cross-Device Tracking
Implement user ID tracking to follow users across devices:
```javascript
params.append('uid', getUserId());
```

### 4. Referral Tracking
Track external referrals:
```javascript
if (document.referrer) {
  params.append('ref', getDomain(document.referrer));
}
```

## Troubleshooting

### Issue: UTM parameters not appearing
**Solution:** Ensure the `section` prop is passed to ProductCard

### Issue: Wrong campaign name
**Solution:** Check the `section` prop value in ProductRow

### Issue: Product ID missing
**Solution:** Verify product object has `id`, `product_uid`, or `url_token`

### Issue: URLs too long
**Solution:** The `itm` parameter uses the product ID directly. If needed, you can hash or shorten it.

## Summary

This UTM tracking implementation provides:
- ✅ Comprehensive tracking across all product sections
- ✅ Clean, SEO-friendly URLs
- ✅ Easy integration with analytics tools
- ✅ Flexible and extensible architecture
- ✅ Privacy-compliant tracking
- ✅ Product-level performance insights

For questions or support, refer to the codebase or contact the development team.
