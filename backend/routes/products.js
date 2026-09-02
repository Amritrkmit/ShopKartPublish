const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const db = require("../db");
const cache = require("../utils/cache");
const authMiddleware = require("../middlewares/userJWT");
const { resolveProductId } = require("../utils/productHelpers");
const { esClient, checkConnection } = require("../utils/elasticsearch");
const { ProductDTO } = require('../dtos'); // Import DTO for data cleaning

// Middleware to authorize Admin or Seller
const requireAdminOrSeller = (req, res, next) => {
  authMiddleware(req, res, () => {
    const role = req.user?.role;
    if (role === "admin" || role === "seller") {
      next();
    } else {
      res.status(403).json({ message: "Access denied. Admin or Seller only." });
    }
  });
};
const csv = require("csv-parser");
const multerCsv = multer({ dest: "tmp/csv" });
// const fetch = require("node-fetch");
const HUGGINGFACE_API_KEY = process.env.HUGGINGFACE_API_KEY;
// require("dotenv").config();
const { ulid } = require('ulid');
const crypto = require('crypto');
// const OpenAI = require("openai");
// const openai = new OpenAI({
//   //   apiKey: process.env.OPENAI_API_KEY
//   // });
const uploadFolder = path.join(__dirname, "..", "assets", "products");
if (!fs.existsSync(uploadFolder)) {
  fs.mkdirSync(uploadFolder, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadFolder),
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueName + path.extname(file.originalname));
  },
});

const upload = multer({ storage });

// ================== CSV UPLOAD SETUP ==================
const csvUploadFolder = path.join(__dirname, "..", "uploads", "csv");
if (!fs.existsSync(csvUploadFolder)) {
  fs.mkdirSync(csvUploadFolder, { recursive: true });
}

const csvStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, csvUploadFolder),
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  },
});

const uploadCSV = multer({
  storage: csvStorage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === "text/csv" || file.originalname.endsWith(".csv")) {
      cb(null, true);
    } else {
      cb(new Error("Only CSV files allowed"), false);
    }
  },
});


// Helper to ensure brand exists and is linked to category/subcategory
const ensureBrandExistsAndLinked = async (brandName, categoryId, subcategoryId) => {
  if (!brandName) return null;
  try {
    const promiseDb = db.promise;
    // 1. Find or create brand
    const [brands] = await promiseDb.query('SELECT id FROM brands WHERE name = ?', [brandName]);
    let brandId;
    if (brands.length === 0) {
      const [insertResult] = await promiseDb.query('INSERT INTO brands (name) VALUES (?)', [brandName]);
      brandId = insertResult.insertId;
    } else {
      brandId = brands[0].id;
    }

    // 2. Link to category/subcategory if provided
    if (brandId) {
      if (subcategoryId && categoryId) {
        await promiseDb.query(
          'INSERT IGNORE INTO brand_mappings (brand_id, category_id, subcategory_id) VALUES (?, ?, ?)',
          [brandId, categoryId, subcategoryId]
        );
      } else if (subcategoryId) {
        await promiseDb.query(
          'INSERT IGNORE INTO brand_mappings (brand_id, subcategory_id) VALUES (?, ?)',
          [brandId, subcategoryId]
        );
      } else if (categoryId) {
        await promiseDb.query(
          'INSERT IGNORE INTO brand_mappings (brand_id, category_id) VALUES (?, ?)',
          [brandId, categoryId]
        );
      }
    }
    return brandId;
  } catch (err) {
    console.error('Error in ensureBrandExistsAndLinked:', err);
    return null;
  }
};

// POST: Upload a new product
router.post("/", requireAdminOrSeller, upload.fields([
  { name: "image", maxCount: 1 },
  { name: "gallery_images", maxCount: 10 },
  { name: "feature_images", maxCount: 20 }
]), async (req, res) => {
  const {
    name, slug, price, sale_price, description, category_id, subcategory_id,
    available_sizes, size_chart, sku, barcode, track_inventory, stock,
    stock_status, weight, dimensions, shipping_class, tags, attributes,
    meta_title, meta_description, meta_keywords, brand, similar_products,
    highlights, offers, payment_options, specifications, payment_details,
    is_customizable, customization_fields, product_features,
    exchange_available, exchange_discount, warranty, warranty_details,
    status
  } = req.body;

  if (brand && (category_id || subcategory_id)) {
    await ensureBrandExistsAndLinked(brand, category_id, subcategory_id);
  }

  // Validate Customization Fields JSON
  if (is_customizable === 'true' || is_customizable === '1' || is_customizable === 1 || is_customizable === true) {
    if (customization_fields && typeof customization_fields === 'string') {
      try {
        JSON.parse(customization_fields);
      } catch (e) {
        return res.status(400).json({ error: "Invalid JSON format for customization_fields" });
      }
    }
  }

  const imageFile = req.files['image'] ? req.files['image'][0] : null;
  const galleryFiles = req.files['gallery_images'] || [];

  const image = imageFile ? `/assets/products/${imageFile.filename}` : null;

  if (!name || !slug || !price || !category_id) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const product_uid = `PROD-${ulid()}`;
  const url_token = crypto.randomBytes(32).toString('hex');

  const sql = `
    INSERT INTO products (
      product_uid, url_token,
      name, slug, price, sale_price, description, image, category_id, subcategory_id, shop_id,
      available_sizes, size_chart, sku, barcode, track_inventory, stock, stock_status, 
      weight, dimensions, shipping_class, tags, attributes,
      meta_title, meta_description, meta_keywords, brand, similar_products,
      highlights, offers, payment_options, specifications, payment_details,
      is_customizable, customization_fields,
      cancellation_duration, is_cancellable, product_features,
      exchange_available, exchange_discount, warranty, warranty_details,
      status, is_assured
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  try {
    const promiseDb = db.promise;
    const [result] = await promiseDb.query(sql, [
      product_uid, url_token,
      name, slug, price, sale_price || null, description, image, category_id, subcategory_id || null,
      (req.body.shop_id && req.body.shop_id !== 'undefined' && req.body.shop_id !== 'null') ? parseInt(req.body.shop_id) : null,
      available_sizes || null, size_chart || null, sku || null, barcode || null,
      track_inventory === 'true' || track_inventory === true, stock || 0, stock_status || 'in_stock',
      weight || null, dimensions || null, shipping_class || 'standard', tags || null, attributes || null,
      meta_title || null, meta_description || null, meta_keywords || null, brand || null, similar_products || null,
      req.body.highlights || null, req.body.offers || null, req.body.payment_options || null, req.body.specifications || null, req.body.payment_details || null,
      is_customizable === 'true' || is_customizable === '1' || is_customizable === 1 || is_customizable === true ? 1 : 0,
      customization_fields || null,
      parseInt(req.body.cancellation_duration) || 7,
      req.body.is_cancellable === 'false' || req.body.is_cancellable === '0' || req.body.is_cancellable === 0 || req.body.is_cancellable === false ? 0 : 1,
      (() => {
        try {
          let features = req.body.product_features ? (typeof req.body.product_features === 'string' ? JSON.parse(req.body.product_features) : req.body.product_features) : [];
          const featureFiles = req.files['feature_images'] || [];
          let fileIdx = 0;
          features = features.map(f => {
            if (f.image === '__NEW_IMAGE__' && featureFiles[fileIdx]) {
              f.image = `/assets/products/${featureFiles[fileIdx].filename}`;
              fileIdx++;
            }
            return f;
          });
          return JSON.stringify(features);
        } catch (e) { return "[]"; }
      })(),
      exchange_available === 'true' || exchange_available === '1' || exchange_available === 1 || exchange_available === true ? 1 : 0,
      exchange_discount || 0,
      warranty || null,
      warranty_details || null,
      status || 'published',
      req.body.is_assured === 'true' || req.body.is_assured === '1' || req.body.is_assured === 1 || req.body.is_assured === true ? 1 : 0
    ]);

    const productId = result.insertId;

    // Track initial price
    try {
      await promiseDb.query("INSERT INTO price_history (product_id, price) VALUES (?, ?)", [productId, sale_price || price]);
    } catch (phErr) {
      console.error("❌ Error inserting initial price history:", phErr.message);
    }

    // Invalidate Cache
    cache.flush();

    // Gallery Images
    if (galleryFiles.length > 0) {
      const gallerySql = "INSERT INTO product_images (product_id, image_url) VALUES ?";
      const galleryValues = galleryFiles.map(file => [productId, `/assets/products/${file.filename}`]);
      try {
        await promiseDb.query(gallerySql, [galleryValues]);
      } catch (gErr) {
        console.error("❌ Error inserting gallery images:", gErr.message);
      }
    }

    res.json({ message: "✅ Product uploaded successfully", productId });

  } catch (err) {
    console.error("❌ Error inserting product:", err);
    return res.status(500).json({
      error: "Database error during product creation",
      details: err.message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }
});

// POST: Bulk upload products via CSV
router.post("/upload-csv", uploadCSV.single("csvFile"), async (req, res) => {

  if (!req.file) return res.status(400).json({ error: "CSV file is required" });

  const results = [];

  fs.createReadStream(req.file.path)
    .pipe(csv())
    .on("data", (data) => results.push(data))
    .on("end", () => {
      const sql =
        "INSERT INTO products (name, slug, price, description, image, category_id, subcategory_id, product_uid, url_token) VALUES ?";
      const values = results.map((row) => [
        row.name,
        row.slug,
        row.price,
        row.description || null,
        row.image,
        row.category_id,
        row.subcategory_id || null,
        `PROD-${ulid()}`,
        crypto.randomBytes(64).toString('hex')
      ]);

      db.query(sql, [values], (err, result) => {
        if (err) {
          console.error("❌ Error inserting CSV products:", err);
          return res.status(500).json({ error: "Database error" });
        }
        res.json({ message: `✅ ${results.length} products uploaded successfully` });
      });

      // Remove temp CSV file
      fs.unlinkSync(req.file.path);
    });
});

// GET: Search Suggestions for auto-complete
router.get("/search/suggestions", async (req, res) => {
  const { q } = req.query;
  if (!q || q.length < 2) return res.json([]);

  try {
    const isEsConnected = await checkConnection();
    const normalized = q.replace(/[()[\],.\-_]/g, ' ').replace(/\s+/g, ' ').trim();

    if (isEsConnected) {
      // 1. Fetch suggestions from ES
      const esResults = await esClient.search({
        index: 'products',
        body: {
          size: 5,
          query: {
            bool: {
              must: [
                { match: { name: { query: normalized, operator: 'and', fuzziness: 'AUTO' } } },
                { term: { status: 'published' } }
              ]
            }
          }
        }
      });

      const esSuggestions = esResults.hits.hits.map(hit => ({
        text: hit._source.name,
        type: 'product',
        image: hit._source.image,
        ref_id: hit._source.id,
        slug: hit._source.slug
      }));

      // 2. Combine with MySQL Categories/Brands (since they might not be fully indexed)
      const searchTerm = `%${normalized}%`;
      const [sqlResults] = await db.promise.query(`
        (SELECT name as text, 'category' as type, image, id as ref_id, slug FROM categories WHERE name LIKE ? LIMIT 3)
        UNION
        (SELECT name as text, 'brand' as type, NULL as image, id as ref_id, name as slug FROM brands WHERE name LIKE ? LIMIT 3)
      `, [searchTerm, searchTerm]);

      return res.json([...esSuggestions, ...sqlResults]);
    }

    // MySQL Fallback
    const searchTerm = `%${normalized}%`;
    const sql = `
      (SELECT name as text, 'product' as type, image, id as ref_id, slug FROM products WHERE name LIKE ? AND status = 'published' LIMIT 5)
      UNION
      (SELECT name as text, 'category' as type, image, id as ref_id, slug FROM categories WHERE name LIKE ? LIMIT 3)
      UNION
      (SELECT name as text, 'brand' as type, NULL as image, id as ref_id, name as slug FROM brands WHERE name LIKE ? LIMIT 3)
    `;
    const results = await db.promise.query(sql, [searchTerm, searchTerm, searchTerm]);
    res.json(results[0]);
  } catch (err) {
    console.error("❌ Suggestions Error:", err);
    res.status(500).json({ error: "Failed to fetch suggestions" });
  }
});

// GET: Fetch products with optional pagination & filtering
router.get("/", async (req, res) => { // Async handler
  try {
    // 1. Construct Cache Key based on all query params
    const cacheKey = `products:list:${JSON.stringify(req.query)}`;

    // 2. Check Cache
    const cachedData = await cache.get(cacheKey);
    if (cachedData) {
      return res.json(cachedData);
    }

    // 3. Fallback to DB Logic (Original)
    let { page, limit, category, subcategory, slug, tags, include_drafts, search, category_id, subcategory_id, brand, ids, lat, lng } = req.query;
    let shop_id = (req.query.shop_id === 'null' || req.query.shop_id === 'undefined' || !req.query.shop_id) ? null : parseInt(req.query.shop_id);
    let seller_id = (req.query.seller_id === 'null' || req.query.seller_id === 'undefined' || !req.query.seller_id) ? null : parseInt(req.query.seller_id);

    console.log('📦 Products API Request:', {
      shop_id_raw: req.query.shop_id,
      shop_id_parsed: shop_id,
      include_drafts,
      search,
      page
    });

    // --- ELASTICSEARCH SEARCH INTEGRATION ---
    let esIds = null;
    let esTotal = null;
    if (search) {
      try {
        const isEsConnected = await checkConnection();
        if (isEsConnected) {
          const esResults = await esClient.search({
            index: 'products',
            body: {
              _source: ['id'],
              size: 500, // Return more to allow further SQL filtering if needed
              query: {
                bool: {
                  must: [
                    { multi_match: { query: search, fields: ['name^3', 'tags^2', 'brand^2', 'description', 'category_name', 'subcategory_name'], fuzziness: 'AUTO' } },
                    { term: { status: 'published' } }
                  ]
                }
              }
            }
          });

          if (esResults.hits.total.value > 0) {
            esIds = esResults.hits.hits.map(hit => hit._source.id);
            esTotal = esResults.hits.total.value;
            // If we have ES results, we'll use these IDs and skip the SQL 'LIKE' search
            console.log(`🔍 ES found ${esIds.length} results for: ${search}`);
          }
        }
      } catch (err) {
        console.warn('⚠️ ES Search Error, falling back to MySQL:', err.message);
      }
    }

    // Base Query with Shop & Seller Details
    let sql =
      `SELECT p.*, c.name AS category_name, c.slug AS category_slug, 
    s.name AS subcategory_name, s.slug AS subcategory_slug, 
    parent_s.name AS parent_subcategory_name,
    sh.name AS shop_name, sh.logo_url AS shop_logo, sh.slug AS shop_slug,
    (SELECT GROUP_CONCAT(pi.image_url) FROM product_images pi WHERE pi.product_id = p.id) as images,
    (SELECT AVG(rating) FROM reviews WHERE product_id = p.id) as avg_rating,
    (SELECT COUNT(*) FROM reviews WHERE product_id = p.id) as rating_count,
    (SELECT COUNT(*) FROM reviews WHERE product_id = p.id AND comment IS NOT NULL AND comment != '') as review_count`;

    // Distance calculation if lat/lng provided
    if (lat && lng) {
      sql += `, (6371 * acos(
                cos(radians(?)) * cos(radians(sh.latitude)) * 
                cos(radians(sh.longitude) - radians(?)) + 
                sin(radians(?)) * sin(radians(sh.latitude))
            )) AS distance`;
    }

    sql += ` FROM products p 
    LEFT JOIN categories c ON p.category_id = c.id 
    LEFT JOIN subcategories s ON p.subcategory_id = s.id
    LEFT JOIN subcategories parent_s ON s.parent_id = parent_s.id
    LEFT JOIN shops sh ON p.shop_id = sh.id
    LEFT JOIN sellers sel ON sh.seller_id = sel.id`;

    const params = [];
    if (lat && lng) {
      params.push(lat, lng, lat);
    }

    const startConditions = [];

    // Default: Show only products from ACTIVE shops and APPROVED sellers
    // OR products directly uploaded by Admin (shop_id IS NULL)
    if (include_drafts !== 'true') {
      startConditions.push("p.status = 'published'");
      startConditions.push("(p.shop_id IS NULL OR (sh.is_active = 1 AND sel.status = 'APPROVED'))");
    }

    if (search) {
      if (esIds && esIds.length > 0) {
        // Use Elasticsearch Results
        startConditions.push(`p.id IN (${esIds.map(() => '?').join(',')})`);
        params.push(...esIds);
      } else {
        // Fallback to MySQL LIKE Search
        const originalSearch = search;
        const normalizedSearch = search.replace(/[()[\],.\-_]/g, ' ').replace(/\s+/g, ' ').trim();
        const tokens = normalizedSearch.split(' ').filter(t => t.length > 1);

        if (tokens.length > 1) {
          const tokenConditions = [];
          tokens.forEach(token => {
            const t = `%${token}%`;
            tokenConditions.push("(p.name LIKE ? OR p.sku LIKE ? OR p.tags LIKE ? OR p.brand LIKE ? OR c.name LIKE ? OR s.name LIKE ?)");
            params.push(t, t, t, t, t, t);
          });
          startConditions.push(`(${tokenConditions.join(" AND ")})`);
        } else {
          startConditions.push("(p.name LIKE ? OR p.sku LIKE ? OR p.slug LIKE ? OR sh.name LIKE ? OR p.tags LIKE ? OR p.brand LIKE ? OR p.meta_keywords LIKE ? OR p.meta_title LIKE ? OR p.meta_description LIKE ? OR c.name LIKE ? OR s.name LIKE ? OR parent_s.name LIKE ?)");
          const term = normalizedSearch || search;
          const searchTerm = `%${term}%`;
          params.push(searchTerm, searchTerm, searchTerm, searchTerm, searchTerm, searchTerm, searchTerm, searchTerm, searchTerm, searchTerm, searchTerm, searchTerm);
        }
      }
    }

    // Filters
    if (ids) {
      const idList = String(ids).split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id) && id > 0);
      if (idList.length > 0) {
        startConditions.push(`p.id IN (${idList.map(() => '?').join(',')})`);
        params.push(...idList);
      } else {
        startConditions.push("1 = 0"); // No valid IDs -> no results
      }
    } else if (slug) {
      startConditions.push("p.slug = ?");
      params.push(slug);
    } else if (req.query.url_token) {
      startConditions.push("p.url_token = ?");
      params.push(req.query.url_token);
    } else if (req.query.product_uid) {
      startConditions.push("p.product_uid = ?");
      params.push(req.query.product_uid);
    } else {
      if (category) {
        startConditions.push("c.slug = ?");
        params.push(category);
      }
      if (category_id) {
        startConditions.push("p.category_id = ?");
        params.push(category_id);
      }
      if (subcategory_id) {
        startConditions.push("p.subcategory_id = ?");
        params.push(subcategory_id);
      }
      if (req.query.is_customizable) {
        startConditions.push("p.is_customizable = ?");
        params.push(req.query.is_customizable === 'true' ? 1 : 0);
      }

      // Improved Subcategory Filter (supports Parent Group -> Children)
      if (subcategory) {
        try {
          // 1. Find ID of the requested subcategory
          const [subRows] = await db.promise.query("SELECT id FROM subcategories WHERE slug = ?", [subcategory]);

          if (subRows.length > 0) {
            const parentId = subRows[0].id;

            // 2. Find all children of this subcategory
            const [childRows] = await db.promise.query("SELECT id FROM subcategories WHERE parent_id = ?", [parentId]);

            // 3. Combine IDs
            const allSubIds = [parentId, ...childRows.map(c => c.id)];

            // 4. Add IN clause
            startConditions.push(`p.subcategory_id IN (${allSubIds.map(() => '?').join(',')})`);
            params.push(...allSubIds);
          } else {
            // Subcategory slug not found -> return no results
            startConditions.push("1 = 0");
          }
        } catch (err) {
          console.error("❌ Error fetching subcategories:", err);
          return res.status(500).json({ error: "Database error during subcategory lookup" });
        }
      }

      if (brand) {
        startConditions.push("p.brand = ?");
        params.push(brand);
      }

      if (tags) {
        // Use FIND_IN_SET to match exact tag in comma-separated list
        startConditions.push("FIND_IN_SET(?, p.tags)");
        params.push(tags);
      }

      if (shop_id) {
        startConditions.push("p.shop_id = ?");
        params.push(shop_id);
      } else if (include_drafts === 'true') {
        // Security Check: If include_drafts=true but NO shop_id, 
        // we must verify this is an ADMIN request.
        let isAdmin = false;
        const adminToken = req.cookies?.adminToken || (req.headers.authorization?.startsWith("Bearer ") ? req.headers.authorization.split(" ")[1] : null);

        if (adminToken) {
          try {
            const { JWT_SECRET } = require("../utils/jwt");
            jwt.verify(adminToken, JWT_SECRET);
            isAdmin = true;
          } catch (e) {
            console.error("JWT Verify Error in Products Admin Route:", e.message);
          }
        }

        if (!isAdmin) {
          console.warn('⚠️ Dashboard request without shop_id and no valid admin token - returning no results for security');
          startConditions.push("1 = 0"); // No results for unauthorized draft viewing
        } else {
          console.log('👑 Admin verified for full draft access');
        }
      }
    }

    // Always apply shop_id or seller_id if provided, even if ids/slug is present
    if ((ids || slug) && (shop_id || seller_id)) {
      if (shop_id) {
        startConditions.push("p.shop_id = ?");
        params.push(shop_id);
      }
      if (seller_id) {
        startConditions.push("sh.seller_id = ?");
        params.push(seller_id);
      }
    }

    if (startConditions.length > 0) {
      sql += " WHERE " + startConditions.join(" AND ");
    }

    // Sorting
    if (lat && lng) {
      sql += " ORDER BY distance ASC";
    } else {
      sql += " ORDER BY p.id DESC"; // Default sort
    }

    // Pagination
    if (page && limit) {
      const offset = (parseInt(page) - 1) * parseInt(limit);
      sql += " LIMIT ? OFFSET ?";
      params.push(parseInt(limit), offset);
    }

    // Get Total Count for Pagination
    const countSql = `SELECT COUNT(*) AS total FROM products p 
      LEFT JOIN categories c ON p.category_id = c.id 
      LEFT JOIN subcategories s ON p.subcategory_id = s.id
      LEFT JOIN subcategories parent_s ON s.parent_id = parent_s.id
      LEFT JOIN shops sh ON p.shop_id = sh.id
      LEFT JOIN sellers sel ON sh.seller_id = sel.id` + (startConditions.length > 0 ? " WHERE " + startConditions.join(" AND ") : "");

    // Use the params corresponding to the where clause (exclude LIMIT/OFFSET)
    // Params are: [distance_params..., search_params..., filter_params...]
    const countParams = params.slice(0, params.length - (page && limit ? 2 : 0));

    db.query(countSql, countParams, (err, countResult) => {
      if (err) {
        console.error("❌ Error counting products:", err);
        return res.status(500).json({ error: "Database error" });
      }

      const total = countResult[0].total;
      const totalPages = limit ? Math.ceil(total / parseInt(limit)) : 1;

      console.log("📝 Product Fetch SQL:", sql);
      console.log("📝 Product Fetch Params:", params);
      db.query(sql, params, async (err, results) => {
        if (err) {
          console.error("❌ Error fetching products:", err);
          return res.status(500).json({ error: "Database error" });
        }

        // Clean the products data before sending to frontend
        const cleanedProducts = ProductDTO.toList(results);

        // Return standard paginated response
        const responseData = {
          products: cleanedProducts, // Use cleaned data
          pagination: {
            total,
            totalPages,
            currentPage: page ? parseInt(page) : 1,
            limit: limit ? parseInt(limit) : total
          }
        };

        // If no results, try to find a suggestion
        if (total === 0 && search && req.query.nosuggest !== 'true') {
          try {
            // Improved suggestion: Check if query contains a category/brand name or vice versa
            const [suggestions] = await db.promise.query(
              "(SELECT name FROM categories WHERE ? LIKE CONCAT('%', name, '%') OR name LIKE ? LIMIT 1) UNION (SELECT name FROM brands WHERE ? LIKE CONCAT('%', name, '%') OR name LIKE ? LIMIT 1) LIMIT 1",
              [search, `%${search}%`, search, `%${search}%`]
            );
            if (suggestions.length > 0) {
              responseData.suggestedQuery = suggestions[0].name;
            }
          } catch (suggestErr) {
            console.warn("⚠️ Failed to fetch search suggestion:", suggestErr.message);
          }
        }

        // 4. Set Cache (e.g., 30 minutes)
        // Only cache if there were no errors and we have results
        cache.set(cacheKey, responseData, 1800);

        res.json(responseData);
      });
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server Error" });
  }
});

// router.post("/generate-description", async (req, res) => {
//   const { title } = req.body;
//   if (!title) return res.status(400).json({ message: "Title required" });

//   try {
//     const response = await openai.chat.completions.create({
//       model: "gpt-3.5-turbo-1106",
//       messages: [
//         { role: "system", content: "You are a product description generator." },
//         { role: "user", content: `Generate a creative product description for: "${title}"` },
//       ],
//       max_tokens: 150,
//     });

//     const description = response.choices[0].message.content;
//     res.json({ description });
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ message: "Failed to generate description" });
//   }
// });




// DELETE: Delete a product
router.delete("/:id", requireAdminOrSeller, (req, res) => {
  const { id } = req.params;
  let sql = "DELETE FROM products";

  // Determine which column to use for the WHERE clause
  if (!isNaN(id)) {
    sql += " WHERE id = ?";
    db.query(sql, [id], (err, result) => {
      if (err) {
        console.error("❌ Error deleting product:", err);
        return res.status(500).json({ error: "Database error" });
      }
      // Invalidate products cache
      cache.flush();
      res.json({ message: "✅ Product deleted successfully" });
    });
  } else {
    sql += " WHERE url_token = ? OR product_uid = ?";
    db.query(sql, [id, id], (err, result) => {
      if (err) {
        console.error("❌ Error deleting product:", err);
        return res.status(500).json({ error: "Database error" });
      }
      // Invalidate products cache
      cache.flush();
      res.json({ message: "✅ Product deleted successfully" });
    });
  }
});

// PUT: Update a product
router.put("/:id", requireAdminOrSeller, upload.fields([
  { name: "image", maxCount: 1 },
  { name: "gallery_images", maxCount: 10 },
  { name: "feature_images", maxCount: 20 }
]), async (req, res) => {
  const identifier = req.params.id;
  const numericProductId = await resolveProductId(identifier);

  console.log(`📝 Update Product Request for ID: ${identifier} -> Numeric: ${numericProductId}`);
  console.log(`📦 Request Body Keys:`, Object.keys(req.body));

  if (!numericProductId) {
    return res.status(404).json({ error: "Product not found" });
  }

  const {
    name, slug, price, sale_price, description, category_id, subcategory_id,
    available_sizes, size_chart, sku, barcode, track_inventory, stock,
    stock_status, weight, dimensions, shipping_class, tags, attributes,
    meta_title, meta_description, meta_keywords, brand,
    is_customizable, customization_fields,
    exchange_available, exchange_discount, warranty, warranty_details,
    status
  } = req.body;

  // Handle Brand Linking
  if (brand && (category_id || subcategory_id)) {
    await ensureBrandExistsAndLinked(brand, category_id, subcategory_id);
  }

  // Validate Customization Fields JSON
  if (is_customizable === 'true' || is_customizable === '1' || is_customizable === 1 || is_customizable === true) {
    if (customization_fields && typeof customization_fields === 'string') {
      try {
        JSON.parse(customization_fields);
      } catch (e) {
        return res.status(400).json({ error: "Invalid JSON format for customization_fields" });
      }
    }
  }



  const imageFile = req.files['image'] ? req.files['image'][0] : null;
  const galleryFiles = req.files['gallery_images'] || [];
  const featureFiles = req.files['feature_images'] || [];

  let delete_image_ids = [];
  if (req.body.delete_image_ids) {
    try {
      delete_image_ids = JSON.parse(req.body.delete_image_ids);
    } catch (e) {
      console.error("⚠️ Failed to parse delete_image_ids:", req.body.delete_image_ids);
    }
  }

  // 1. Handle Gallery Deletions
  if (delete_image_ids && delete_image_ids.length > 0) {
    try {
      const [results] = await db.promise.query("SELECT image_url FROM product_images WHERE id IN (?)", [delete_image_ids]);
      if (results.length > 0) {
        results.forEach(row => {
          const filePath = path.join(__dirname, "..", row.image_url);
          try {
            if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
          } catch (fErr) {
            console.warn(`⚠️ Failed to delete file ${filePath}:`, fErr.message);
          }
        });
      }
      await db.promise.query("DELETE FROM product_images WHERE id IN (?)", [delete_image_ids]);
    } catch (err) {
      console.error("❌ Error deleting gallery images:", err.message);
    }
  }

  // Sanitization
  const validSubCatId = (subcategory_id === "null" || subcategory_id === "undefined" || !subcategory_id || subcategory_id === "") ? null : subcategory_id;
  const validCatId = (category_id === "null" || category_id === "undefined" || !category_id || category_id === "") ? null : category_id;
  const validSalePrice = (sale_price === "null" || sale_price === "undefined" || !sale_price || sale_price === "") ? null : sale_price;
  const validShopId = (req.body.shop_id && req.body.shop_id !== 'undefined' && req.body.shop_id !== 'null') ? parseInt(req.body.shop_id) : null;

  let sql = `UPDATE products SET 
      name=?, slug=?, status=?, price=?, sale_price=?, description=?, category_id=?, subcategory_id=?, 
      stock=?, available_sizes=?, size_chart=?, sku=?, barcode=?, track_inventory=?, 
      stock_status=?, weight=?, dimensions=?, shipping_class=?, tags=?, attributes=?,
      meta_title=?, meta_description=?, meta_keywords=?, brand=?, similar_products=?,
      highlights=?, offers=?, payment_options=?, specifications=?, payment_details=?,
      is_customizable=?, customization_fields=?,
      cancellation_duration=?, is_cancellable=?, product_features=?,
      exchange_available=?, exchange_discount=?, warranty=?, warranty_details=?, is_assured=?`;

  const fullParams = [
    name, slug, status || 'published', price, validSalePrice, description || null, validCatId, validSubCatId,
    stock || 0, available_sizes || null, size_chart || null, sku || null, barcode || null,
    track_inventory === 'true' || track_inventory === true ? 1 : 0, stock_status || 'in_stock',
    weight || null, dimensions || null, shipping_class || 'standard', tags || null, attributes || null,
    meta_title || null, meta_description || null, meta_keywords || null, brand || null, req.body.similar_products || null,
    req.body.highlights || null, req.body.offers || null, req.body.payment_options || null, req.body.specifications || null, req.body.payment_details || null,
    is_customizable === 'true' || is_customizable === '1' || is_customizable === 1 || is_customizable === true ? 1 : 0,
    customization_fields || null,
    parseInt(req.body.cancellation_duration) || 7,
    req.body.is_cancellable === 'false' || req.body.is_cancellable === '0' || req.body.is_cancellable === 0 || req.body.is_cancellable === false ? 0 : 1,
    (() => {
      try {
        let features = req.body.product_features ? (typeof req.body.product_features === 'string' ? JSON.parse(req.body.product_features) : req.body.product_features) : [];
        let fileIdx = 0;
        features = features.map(f => {
          if (f.image === '__NEW_IMAGE__' && featureFiles[fileIdx]) {
            f.image = `/assets/products/${featureFiles[fileIdx].filename}`;
            fileIdx++;
          }
          return f;
        });
        return JSON.stringify(features);
      } catch (e) { return "[]"; }
    })(),
    exchange_available === 'true' || exchange_available === '1' || exchange_available === 1 || exchange_available === true ? 1 : 0,
    exchange_discount || 0,
    warranty || null,
    warranty_details || null,
    req.body.is_assured === 'true' || req.body.is_assured === '1' || req.body.is_assured === 1 || req.body.is_assured === true ? 1 : 0
  ];

  if (validShopId) {
    sql += ", shop_id=?";
    fullParams.push(validShopId);
  }

  if (imageFile) {
    sql += ", image=?";
    fullParams.push(`/assets/products/${imageFile.filename}`);
  } else if (req.body.delete_main_image === 'true') {
    sql += ", image=NULL";
  }

  sql += " WHERE id=?";
  fullParams.push(numericProductId);

  try {
    const promiseDb = db.promise;

    // Perform Primary Update
    const [result] = await promiseDb.query(sql, fullParams);

    if (result.affectedRows === 0) {
      console.warn(`⚠️ No rows updated for numericProductId: ${numericProductId}`);
    }

    // Secondary: Price History
    if (sale_price || price) {
      try {
        await promiseDb.query("INSERT INTO price_history (product_id, price) VALUES (?, ?)", [numericProductId, sale_price || price]);
      } catch (phErr) {
        console.error("❌ Error inserting price history:", phErr.message);
      }
    }

    // Invalidate Cache
    cache.flush().catch(err => console.warn("⚠️ Cache flush failed:", err.message));

    // Secondary: Gallery Images
    if (galleryFiles.length > 0) {
      const gallerySql = "INSERT INTO product_images (product_id, image_url) VALUES ?";
      const galleryValues = galleryFiles.map(file => [numericProductId, `/assets/products/${file.filename}`]);
      try {
        await promiseDb.query(gallerySql, [galleryValues]);
      } catch (gErr) {
        console.error("❌ Error inserting gallery images:", gErr.message);
      }
    }

    res.json({ message: "✅ Product updated successfully" });

  } catch (err) {
    console.error("❌ Error updating product:", err);
    return res.status(500).json({
      error: "Database error during update",
      details: err.message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }
});

router.patch("/:id/status", (req, res) => {
  const { id } = req.params;
  const { status } = req.body; // 'published' or 'draft'

  if (!['published', 'draft'].includes(status)) {
    return res.status(400).json({ error: "Invalid status" });
  }

  let sql = "UPDATE products SET status = ?";
  const params = [status];

  if (!isNaN(id)) {
    sql += " WHERE id = ?";
    params.push(id);
  } else {
    sql += " WHERE url_token = ? OR product_uid = ?";
    params.push(id, id);
  }

  db.query(sql, params, (err, result) => {
    if (err) {
      console.error("❌ Error updating status:", err);
      return res.status(500).json({ error: "Database error" });
    }
    // Invalidate products cache
    cache.flush();
    res.json({ message: `✅ Product status updated to ${status}` });
  });
});

// DELETE: Delete a specific gallery image
router.delete("/images/:id", (req, res) => {
  const { id } = req.params;

  // First get the image path
  const selectSql = "SELECT image_url FROM product_images WHERE id = ?";
  db.query(selectSql, [id], (err, results) => {
    if (err) {
      console.error("❌ Error fetching image path:", err);
      return res.status(500).json({ error: "Database error" });
    }

    if (results.length === 0) {
      return res.status(404).json({ error: "Image not found" });
    }

    const imageUrl = results[0].image_url;
    // Assuming imageUrl is relative like /assets/products/filename.jpg
    // Construct full path. __dirname is routes/, so go up one level
    const filePath = path.join(__dirname, "..", imageUrl);

    // Delete from DB
    const deleteSql = "DELETE FROM product_images WHERE id = ?";
    db.query(deleteSql, [id], (dErr) => {
      if (dErr) {
        console.error("❌ Error deleting image record:", dErr);
        return res.status(500).json({ error: "Database error" });
      }

      // Try deleting file from FS (fire and forget, or log error)
      fs.unlink(filePath, (fsErr) => {
        if (fsErr) console.warn(`⚠️ Failed to delete file ${filePath}:`, fsErr);
        else console.log(`🗑️ Deleted file: ${filePath}`);
      });

      res.json({ message: "✅ Image deleted successfully" });
    });
  });
});

// GET: Fetch product images
router.get("/:id/images", async (req, res) => {
  const { id } = req.params;
  const productId = await resolveProductId(id);

  if (!productId) {
    return res.status(404).json({ message: "Product not found" });
  }

  const sql = "SELECT * FROM product_images WHERE product_id = ?";
  db.query(sql, [productId], (err, results) => {
    if (err) {
      console.error("❌ Error fetching product images:", err);
      return res.status(500).json({ error: "Database error" });
    }
    res.json({ images: results });
  });
});

router.post("/generate-description", async (req, res) => {
  const { title } = req.body;
  if (!title) return res.status(400).json({ message: "Title is required" });

  try {
    const response = await fetch("https://router.huggingface.co/models/gpt2", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${HUGGINGFACE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ inputs: `Generate a product description for: ${title}` }),
    });

    const data = await response.json();

    // Hugging Face returns generated text in data[0].generated_text
    const description = data[0]?.generated_text || "No description generated";

    res.json({ description });
  } catch (err) {
    console.error("Error generating description:", err);
    res.status(500).json({ message: "Failed to generate description" });
  }
});

// ================== PRODUCT VARIANTS (Variable Products) ==================

// Get variants for a product
router.get("/:id/variants", async (req, res) => {
  const identifier = req.params.id;
  const productId = await resolveProductId(identifier);

  if (!productId) {
    return res.status(404).json({ message: "Product not found" });
  }

  const sql = `
    SELECT p.* 
    FROM products p
    INNER JOIN product_relations pr ON p.id = pr.child_id
    WHERE pr.parent_id = ?
  `;

  db.query(sql, [productId], (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ message: "DB Error" });
    }
    res.json({ variants: results });
  });
});

// Add a variant to a product
router.post("/:id/variants", requireAdminOrSeller, async (req, res) => {
  const identifier = req.params.id;
  const { child_id } = req.body;

  if (!child_id) {
    return res.status(400).json({ message: "child_id required" });
  }

  const parentId = await resolveProductId(identifier);
  if (!parentId) {
    return res.status(404).json({ message: "Parent product not found" });
  }

  // Check if relation already exists
  const checkSql = "SELECT id FROM product_relations WHERE parent_id = ? AND child_id = ?";
  db.query(checkSql, [parentId, child_id], (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ message: "DB Error" });
    }

    if (results.length > 0) {
      return res.status(400).json({ message: "Variant already linked" });
    }

    // Insert new relation
    const insertSql = "INSERT INTO product_relations (parent_id, child_id) VALUES (?, ?)";
    db.query(insertSql, [parentId, child_id], (err) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ message: "DB Error" });
      }
      res.json({ message: "Variant added successfully" });
    });
  });
});

// Remove a variant from a product
router.delete("/:id/variants/:variantId", requireAdminOrSeller, async (req, res) => {
  const identifier = req.params.id;
  const variantId = req.params.variantId;

  const parentId = await resolveProductId(identifier);
  if (!parentId) {
    return res.status(404).json({ message: "Parent product not found" });
  }

  const sql = "DELETE FROM product_relations WHERE parent_id = ? AND child_id = ?";
  db.query(sql, [parentId, variantId], (err) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ message: "DB Error" });
    }
    res.json({ message: "Variant removed successfully" });
  });
});

// Search products by name (for variant selection in Admin)
router.get("/search/by-name", (req, res) => {
  const { q, exclude_id } = req.query;

  if (!q || q.trim().length < 2) {
    return res.json({ products: [] });
  }

  let sql = "SELECT id, name, slug, image, price FROM products WHERE name LIKE ?";
  const params = [`%${q}%`];

  if (exclude_id) {
    sql += " AND id != ?";
    params.push(exclude_id);
  }

  sql += " LIMIT 10";

  db.query(sql, params, (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ message: "DB Error" });
    }
    res.json({ products: results });
  });
});

// GET: Price history for a product
router.get("/:id/price-history", async (req, res) => {
  const { id } = req.params;
  const productId = await resolveProductId(id);

  if (!productId) {
    return res.status(404).json({ message: "Product not found" });
  }

  const sql = "SELECT price, recorded_at FROM price_history WHERE product_id = ? ORDER BY recorded_at ASC LIMIT 30";
  db.query(sql, [productId], (err, results) => {
    if (err) {
      console.error("❌ Error fetching price history:", err);
      return res.status(500).json({ error: "Database error" });
    }
    res.json(results);
  });
});

module.exports = router;
