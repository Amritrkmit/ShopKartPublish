const express = require("express");
const cors = require("cors");
const compression = require("compression");
const cookieParser = require("cookie-parser");
const path = require("path");
const http = require("http");
const { Server } = require("socket.io");
require("dotenv").config({ path: path.join(__dirname, ".env") });

const db = require("./db");

// Routes
const authRoutes = require('./routes/users');
const authOtpRoutes = require('./routes/auth_otp');
const productRoutes = require('./routes/products');
const categoryRoutes = require('./routes/category');
const subcategoryRoutes = require('./routes/subcategory');
const sliderRoutes = require('./routes/slider');
const cartRoutes = require('./routes/cart');
const paymentRoutes = require('./routes/payment');
const orderRoutes = require('./routes/orders');
const reviewRoutes = require('./routes/reviews');
const couponRoutes = require('./routes/coupons');
const dashboardRoutes = require('./routes/dashboard');
const analyticsRoutes = require('./routes/analytics');
const cacheRoutes = require('./routes/cache'); // Added
const systemHealthRoutes = require('./routes/system-health');
const alertRoutes = require('./routes/alerts'); // Added
const chatbotRoutes = require('./routes/chatbot');
const eventsRoutes = require('./routes/events');
const adminchatbotRoutes = require('./routes/adminchatbot');
const popupsRoutes = require('./routes/popups');
const adminRoutes = require("./routes/admin"); // Keep existing admin routes
const adminNotificationsRoutes = require("./routes/admin-notifications"); // Keep existing admin notifications routes
const consentRoutes = require("./routes/consent"); // Keep existing consent routes
const scriptRoutes = require("./routes/scripts"); // Keep existing script routes
const attributeRoutes = require("./routes/attributes"); // Keep existing attribute routes
const brandRoutes = require("./routes/brands"); // Added
const promosRoutes = require("./routes/promos"); // Added
const collectionRoutes = require("./routes/collections"); // Added
const priceHuntRoutes = require("./routes/priceHunt"); // Added
const sellerRoutes = require("./routes/sellers"); // Added
const shopRoutes = require("./routes/shops"); // Added
const sellerDashboardRoutes = require("./routes/seller"); // Added
const videoRoutes = require("./routes/videos"); // Added
const settingsRoutes = require("./routes/settings"); // Added
const groupBuyRoutes = require("./routes/group_buys"); // Added
const bundleRoutes = require("./routes/bundles"); // Added
const sitemapRoutes = require("./routes/sitemap"); // Added
const sitemapService = require("./services/sitemapService"); // Added
const uploadRoutes = require('./routes/uploads');
const hadoopRoutes = require('./routes/hadoop'); // Hadoop management API
const geocodingRoutes = require('./routes/geocoding'); // Geocoding proxy

// JWT middleware
const requireAdminJWT = require("./middlewares/requireAdminJWT");
const blockDirectAccess = require("./middlewares/blockDirectAccess");

const helmet = require("helmet");
const rateLimit = require("express-rate-limit");

const app = express();

// ------------------- Dynamic CORS -------------------
const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, etc)
    if (!origin) return callback(null, true);
    // Allow localhost, Vercel, Netlify, Render, and any configured FRONTEND_URL
    if (
      origin.startsWith("http://localhost") ||
      origin.endsWith(".vercel.app") ||
      origin.endsWith(".netlify.app") ||
      origin.endsWith(".onrender.com") ||
      origin === process.env.FRONTEND_URL
    ) {
      return callback(null, true);
    }
    // Allow all other origins in production
    callback(null, true);
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Accept"],
};

app.use(cors(corsOptions));

// ------------------- Middleware -------------------
// Security Headers
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  crossOriginEmbedderPolicy: false,
}));

// Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 3000, // Limit each IP to 3000 requests per windowMs (increased for dev usage)
  standardHeaders: true,
  legacyHeaders: false,
  message: "Too many requests from this IP, please try again after 15 minutes"
});
app.use(limiter);

app.use(compression());
app.use(express.json());
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});
app.use(cookieParser());
app.use("/assets", express.static(path.join(__dirname, "assets")));
app.use("/assets/videos", express.static(path.join(__dirname, "assets/videos")));
app.use("/uploads/sellers", express.static(path.join(__dirname, "uploads/sellers")));
app.use("/uploads/reviews", express.static(path.join(__dirname, "uploads/reviews")));
app.use("/assets/customizations", express.static(path.join(__dirname, "assets/customizations")));

// Explicitly handle preflight OPTIONS requests for all routes (path-to-regexp compatible).
// This is critical for cross-origin POST/PUT/DELETE with JSON body.
app.use((req, res, next) => {
  if (req.method === 'OPTIONS') {
    res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
    res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,PATCH,OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type,Authorization,X-Requested-With,Accept');
    res.header('Access-Control-Allow-Credentials', 'true');
    return res.sendStatus(204);
  }
  next();
});

// Health Check & Root Route
app.get("/", (req, res) => {
  res.status(200).json({
    status: "online",
    message: "ShopKart Backend API is live and healthy",
    timestamp: new Date().toISOString()
  });
});

app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok" });
});

// ------------------- Routes -------------------
app.use("/users", authRoutes);
app.use("/api/auth", authOtpRoutes);
app.use("/orders", orderRoutes);
app.use("/api/orders", orderRoutes);
app.use("/slider", sliderRoutes);
app.use("/api/slider", sliderRoutes);
app.use("/category", categoryRoutes);
app.use("/api/category", categoryRoutes);
app.use("/subcategory", subcategoryRoutes);
app.use("/api/subcategory", subcategoryRoutes);
app.use("/api/attributes", attributeRoutes);
app.use("/api/products", productRoutes);
app.use("/products", productRoutes);
app.use("/api/payment", paymentRoutes);
app.use("/chatbot", chatbotRoutes);
app.use("/adminchatbot", adminchatbotRoutes);
app.use("/cart", cartRoutes);
app.use("/reviews", reviewRoutes);
app.use("/api/consent", consentRoutes);
app.use("/api/scripts", scriptRoutes);
app.use("/api/events", eventsRoutes);
app.use("/api/hunt", priceHuntRoutes);
app.use("/api/popups", popupsRoutes);
app.use("/api/coupons", couponRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/cache", cacheRoutes);
app.use("/api/group-buys", groupBuyRoutes);
app.use("/api/system-health", systemHealthRoutes); // Added
app.use("/api/alerts", alertRoutes); // Added
app.use("/api/brands", brandRoutes); // Added
app.use("/api/promos", promosRoutes); // Added
app.use("/api/collections", collectionRoutes); // Added

// Seller & Merchant Routes
app.use("/api/sellers", sellerRoutes);    // Onboarding / Auth
app.use("/api/seller", sellerDashboardRoutes);  // Dashboard APIs
app.use("/api/shops", shopRoutes);

// Compatibility fallback for non-API prefixed routes (deprecated but kept for stability)
app.use("/sellers", sellerRoutes);
app.use("/seller", sellerDashboardRoutes);
app.use("/shops", shopRoutes);
app.use("/api/settings", settingsRoutes);
app.use("/api/videos", videoRoutes);
app.use("/api/bundles", bundleRoutes);
app.use("/sitemap", sitemapRoutes); // Public access
app.use("/api/sitemap", sitemapRoutes); // Admin access (generate)
app.use("/api/uploads", uploadRoutes);
app.use("/api/geocoding", geocodingRoutes); // Geocoding proxy (public)

// Admin Routes (Kept existing structure)
app.use("/admin", adminRoutes);
app.use("/admin", adminNotificationsRoutes);
app.use("/api/hadoop", hadoopRoutes); // Hadoop management API (admin only)

// ------------------- Scheduler -------------------
// Auto-generate Sitemap every 15 minutes (only in standalone Node mode)
if (!process.env.VERCEL) {
  const SITEMAP_INTERVAL = 15 * 60 * 1000; // 15 minutes
  setInterval(() => {
    console.log('⏰ Running scheduled sitemap generation...');
    sitemapService.generateXML();
  }, SITEMAP_INTERVAL);

  setTimeout(() => {
    sitemapService.generateXML();
  }, 5000);
}

// ------------------- Socket.IO -------------------
// ------------------- Socket.IO -------------------
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: corsOptions.origin,
    methods: ["GET", "POST"],
    credentials: true,
  },
});

app.use((req, res, next) => {
  req.io = io;
  next();
});

io.on("connection", (socket) => {
  console.log("A user connected:", socket.id);

  // Join a ticket room
  socket.on("joinRoom", (room) => {
    socket.join(room);
    console.log(`${socket.id} joined room: ${room}`);

    // Optionally: send previous messages from DB for that ticket
    const ticketId = room.split("_")[1];
    db.query(
      "SELECT sender, message, user_id FROM messages WHERE ticket_id = ? ORDER BY created_at ASC",
      [ticketId],
      (err, results) => {
        if (err) return console.error(err);
        results.forEach((msg) => {
          socket.emit("receiveMessage", {
            sender: msg.sender,
            message: msg.message,
            userId: msg.user_id,
          });
        });
      }
    );
  });

  // User or admin sending a message
  socket.on("sendMessage", ({ sender, ticketId, message }) => {
    // fetch user_id of ticket
    db.query("SELECT user_id FROM tickets WHERE id = ?", [ticketId], (err, results) => {
      if (err) return console.error(err);
      const userId = results[0]?.user_id; // ticket owner's ID
      const room = `ticket_${ticketId}`;

      // Get user name for notification
      db.query("SELECT name FROM users WHERE id = ?", [userId], (err2, userResults) => {
        const userName = userResults?.[0]?.name || "User";

        db.query(
          "INSERT INTO messages (user_id, ticket_id, sender, message) VALUES (?, ?, ?, ?)",
          [userId, ticketId, sender, message],
          (err) => {
            if (err) return console.error(err);

            // Emit to room for chat display
            io.to(room).emit("receiveMessage", { sender, message, userId, ticketId });

            // Emit notification to admin if message is from user
            if (sender === "user") {
              io.emit("newMessage", {
                userName: userName,
                message: message,
                ticketId: ticketId,
              });
            }
          }
        );
      });
    });
  });

  // Handle message from User (sent via API first, then socket for notify)
  socket.on("userMessage", ({ ticketId, message, sender }) => {
    const room = `ticket_${ticketId}`;
    // Broadcast to room (Admin) but exclude sender (User) to avoid duplication since User adds optimistically
    socket.to(room).emit("receiveMessage", { sender, message, ticketId });
  });

  // Typing indicators
  socket.on("typing", ({ room, sender }) => {
    socket.to(room).emit("typing", { sender });
  });

  socket.on("stopTyping", ({ room, sender }) => {
    socket.to(room).emit("stopTyping", { sender });
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
});


// Global Error Handler
app.use((err, req, res, next) => {
  console.error("❌ Global Error Stack:", err.stack);
  console.error("❌ Global Error Message:", err.message);
  res.status(err.status || 500).json({
    message: err.message || "Internal Server Error",
    error: err.message, // Return the message for debugging
    details: err.stack
  });
});

// ------------------- Start Server -------------------
if (!process.env.VERCEL || require.main === module) {
  const PORT = parseInt(process.env.PORT || 6376, 10);
  server.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 Server running on port ${PORT}`);
  }).on("error", (err) => {
    if (err.code === "EADDRINUSE") {
      console.error(`❌ Port ${PORT} is already in use. Please kill the process running on this port.`);
      process.exit(1);
    } else {
      console.error("❌ Server Error:", err);
      throw err;
    }
  });
}

module.exports = { app, server, io };

