/**
 * Data Transfer Objects (DTOs)
 * 
 * DTOs clean and sanitize data before sending to the frontend.
 * They remove sensitive fields like internal IDs, commission rates, etc.
 */

class BaseDTO {
  /**
   * Remove specified fields from an object
   * @param {Object} obj - Source object
   * @param {Array<string>} fields - Fields to remove
   * @returns {Object} Cleaned object
   */
  static omit(obj, fields = []) {
    if (!obj) return null;
    const cleaned = { ...obj };
    fields.forEach(field => delete cleaned[field]);
    return cleaned;
  }

  /**
   * Pick only specified fields from an object
   * @param {Object} obj - Source object
   * @param {Array<string>} fields - Fields to keep
   * @returns {Object} Cleaned object
   */
  static pick(obj, fields = []) {
    if (!obj) return null;
    const cleaned = {};
    fields.forEach(field => {
      if (obj.hasOwnProperty(field)) {
        cleaned[field] = obj[field];
      }
    });
    return cleaned;
  }

  /**
   * Clean an array of objects
   * @param {Array} arr - Array of objects
   * @param {Function} cleanFn - Cleaning function
   * @returns {Array} Cleaned array
   */
  static cleanArray(arr, cleanFn) {
    if (!Array.isArray(arr)) return [];
    return arr.map(item => cleanFn(item)).filter(Boolean);
  }
}

/**
 * User DTO - Removes sensitive user data
 */
class UserDTO extends BaseDTO {
  static toPublic(user) {
    if (!user) return null;

    return this.omit(user, [
      'password',
      'otp',
      'reset_token',
      'reset_token_expires',
      'internal_notes',
      'admin_flags'
    ]);
  }

  static toProfile(user) {
    if (!user) return null;

    return this.pick(user, [
      'id',
      'name',
      'email',
      'phone',
      'role',
      'created_at',
      'updated_at'
    ]);
  }

  static toList(users) {
    return this.cleanArray(users, this.toPublic.bind(this));
  }
}

/**
 * Product DTO - Removes internal product data
 */
class ProductDTO extends BaseDTO {
  static toPublic(product) {
    if (!product) return null;

    const cleaned = this.omit(product, [
      'uid', // Internal unique identifier
      'commission_rate',
      'cost_price',
      'supplier_id',
      'internal_notes',
      'admin_notes',
      'profit_margin'
    ]);

    // Parse JSON fields if they're strings
    if (typeof cleaned.attributes === 'string') {
      try {
        cleaned.attributes = JSON.parse(cleaned.attributes);
      } catch (e) {
        cleaned.attributes = null;
      }
    }

    if (typeof cleaned.product_features === 'string') {
      try {
        cleaned.product_features = JSON.parse(cleaned.product_features);
      } catch (e) {
        cleaned.product_features = [];
      }
    }

    if (typeof cleaned.available_sizes === 'string') {
      try {
        cleaned.available_sizes = JSON.parse(cleaned.available_sizes);
      } catch (e) {
        cleaned.available_sizes = [];
      }
    }

    return cleaned;
  }

  static toCard(product) {
    if (!product) return null;

    return this.pick(product, [
      'id',
      'product_uid',
      'url_token',
      'name',
      'slug',
      'image',
      'price',
      'sale_price',
      'rating',
      'reviews_count',
      'stock_status',
      'category_id',
      'subcategory_id',
      'brand_id',
      'is_assured',
      'tags'
    ]);
  }

  static toList(products) {
    return this.cleanArray(products, this.toPublic.bind(this));
  }

  static toCardList(products) {
    return this.cleanArray(products, this.toCard.bind(this));
  }
}

/**
 * Order DTO - Removes sensitive order data
 */
class OrderDTO extends BaseDTO {
  static toPublic(order) {
    if (!order) return null;

    const cleaned = this.omit(order, [
      'internal_id', // Database auto-increment ID
      'commission_amount',
      'seller_payout',
      'payment_gateway_fee',
      'internal_notes',
      'fraud_score'
    ]);

    // Parse items if string
    if (typeof cleaned.items === 'string') {
      try {
        cleaned.items = JSON.parse(cleaned.items);
      } catch (e) {
        cleaned.items = [];
      }
    }

    // Clean each item in the order
    if (Array.isArray(cleaned.items)) {
      cleaned.items = cleaned.items.map(item => ProductDTO.toPublic(item));
    }

    // Parse shipping address if string
    if (typeof cleaned.shipping_address === 'string') {
      try {
        cleaned.shipping_address = JSON.parse(cleaned.shipping_address);
      } catch (e) {
        cleaned.shipping_address = null;
      }
    }

    return cleaned;
  }

  static toList(orders) {
    return this.cleanArray(orders, this.toPublic.bind(this));
  }

  static toSummary(order) {
    if (!order) return null;

    return this.pick(order, [
      'order_id',
      'url_token',
      'total_amount',
      'status',
      'payment_status',
      'created_at',
      'updated_at'
    ]);
  }
}

/**
 * Seller DTO - Removes sensitive seller data
 */
class SellerDTO extends BaseDTO {
  static toPublic(seller) {
    if (!seller) return null;

    return this.omit(seller, [
      'password',
      'tax_id',
      'bank_account',
      'bank_name',
      'ifsc_code',
      'account_holder_name',
      'commission_rate',
      'payout_details',
      'internal_notes',
      'admin_flags',
      'verification_documents'
    ]);
  }

  static toProfile(seller) {
    if (!seller) return null;

    return this.pick(seller, [
      'id',
      'name',
      'email',
      'business_name',
      'business_type',
      'status',
      'shop_id',
      'shop_name',
      'shop_slug',
      'shop_active',
      'logo_url',
      'created_at'
    ]);
  }

  static toList(sellers) {
    return this.cleanArray(sellers, this.toPublic.bind(this));
  }
}

/**
 * Shop DTO - Removes sensitive shop data
 */
class ShopDTO extends BaseDTO {
  static toPublic(shop) {
    if (!shop) return null;

    return this.omit(shop, [
      'seller_id', // Internal reference
      'commission_rate',
      'payout_account',
      'internal_notes',
      'admin_flags',
      'verification_status_internal'
    ]);
  }

  static toCard(shop) {
    if (!shop) return null;

    return this.pick(shop, [
      'id',
      'name',
      'slug',
      'logo_url',
      'description',
      'city',
      'rating',
      'is_active'
    ]);
  }

  static toList(shops) {
    return this.cleanArray(shops, this.toPublic.bind(this));
  }
}

/**
 * Review DTO - Removes sensitive review data
 */
class ReviewDTO extends BaseDTO {
  static toPublic(review) {
    if (!review) return null;

    const cleaned = this.omit(review, [
      'user_id', // Don't expose internal user ID
      'ip_address',
      'user_agent',
      'internal_notes',
      'moderation_notes',
      'fraud_score'
    ]);

    // Add only public user info
    if (review.user_name) {
      cleaned.user = {
        name: review.user_name,
        verified: review.verified_purchase || false
      };
    }

    return cleaned;
  }

  static toList(reviews) {
    return this.cleanArray(reviews, this.toPublic.bind(this));
  }
}

/**
 * Category DTO - Removes sensitive category data
 */
class CategoryDTO extends BaseDTO {
  static toPublic(category) {
    if (!category) return null;

    return this.omit(category, [
      'uid',              // Internal unique identifier
      'url_token',        // Internal security token
      'commission_rate',  // Business data
      'internal_notes',
      'admin_flags',
      'seo_score'
    ]);
  }

  static toList(categories) {
    return this.cleanArray(categories, this.toPublic.bind(this));
  }
}

/**
 * Coupon DTO - Removes sensitive coupon data
 */
class CouponDTO extends BaseDTO {
  static toPublic(coupon) {
    if (!coupon) return null;

    return this.omit(coupon, [
      'internal_notes',
      'admin_notes',
      'cost_to_business',
      'usage_limit_per_user_internal'
    ]);
  }

  static toList(coupons) {
    return this.cleanArray(coupons, this.toPublic.bind(this));
  }

  static toUserView(coupon) {
    if (!coupon) return null;

    return this.pick(coupon, [
      'code',
      'description',
      'discount_type',
      'discount_value',
      'min_order_value',
      'max_discount',
      'valid_from',
      'valid_until',
      'is_active'
    ]);
  }
}

/**
 * Analytics DTO - Removes sensitive analytics data
 */
class AnalyticsDTO extends BaseDTO {
  static toPublic(analytics) {
    if (!analytics) return null;

    return this.omit(analytics, [
      'user_id',
      'session_id',
      'ip_address',
      'user_agent',
      'internal_tracking_id',
      'ab_test_group'
    ]);
  }

  static toList(analytics) {
    return this.cleanArray(analytics, this.toPublic.bind(this));
  }
}

/**
 * Brand DTO - Removes sensitive brand data
 */
class BrandDTO extends BaseDTO {
  static toPublic(brand) {
    if (!brand) return null;

    return this.omit(brand, [
      'uid',              // Internal unique identifier
      'url_token',        // Internal security token
      'commission_rate',  // Business data
      'internal_notes',
      'admin_flags'
    ]);
  }


  static toList(brands) {
    return this.cleanArray(brands, this.toPublic.bind(this));
  }
}

/**
 * Popup DTO - Cleans popup data and parses JSON
 */
class PopupDTO extends BaseDTO {
  static toPublic(popup) {
    if (!popup) return null;

    const cleaned = { ...popup };

    // Parse content JSON if it's a string
    if (typeof cleaned.content === 'string') {
      try {
        cleaned.content = JSON.parse(cleaned.content);
      } catch (e) {
        cleaned.content = null;
      }
    }

    return cleaned;
  }

  static toList(popups) {
    return this.cleanArray(popups, this.toPublic.bind(this));
  }
}

module.exports = {
  BaseDTO,
  UserDTO,
  ProductDTO,
  OrderDTO,
  SellerDTO,
  ShopDTO,
  ReviewDTO,
  CategoryDTO,
  CouponDTO,
  AnalyticsDTO,
  BrandDTO,
  PopupDTO
};
