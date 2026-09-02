const express = require("express");
const cors = require("cors");
const compression = require("compression");
const cookieParser = require("cookie-parser");
const path = require("path");
const http = require("http");
const { Server } = require("socket.io");

require("dotenv").config({
  path: path.join(__dirname, ".env")
});

const db = require("./db");

// ============================================================
// ROUTES
// ============================================================

const authRoutes = require("./routes/users");
const authOtpRoutes = require("./routes/auth_otp");
const productRoutes = require("./routes/products");
const categoryRoutes = require("./routes/category");
const subcategoryRoutes = require("./routes/subcategory");
const sliderRoutes = require("./routes/slider");
const cartRoutes = require("./routes/cart");
const paymentRoutes = require("./routes/payment");
const orderRoutes = require("./routes/orders");
const reviewRoutes = require("./routes/reviews");
const couponRoutes = require("./routes/coupons");
const dashboardRoutes = require("./routes/dashboard");
const analyticsRoutes = require("./routes/analytics");
const cacheRoutes = require("./routes/cache");
const systemHealthRoutes = require("./routes/system-health");
const alertRoutes = require("./routes/alerts");
const chatbotRoutes = require("./routes/chatbot");
const eventsRoutes = require("./routes/events");
const adminchatbotRoutes = require("./routes/adminchatbot");
const popupsRoutes = require("./routes/popups");
const adminRoutes = require("./routes/admin");
const adminNotificationsRoutes = require("./routes/admin-notifications");
const consentRoutes = require("./routes/consent");
const scriptRoutes = require("./routes/scripts");
const attributeRoutes = require("./routes/attributes");
const brandRoutes = require("./routes/brands");
const promosRoutes = require("./routes/promos");
const collectionRoutes = require("./routes/collections");
const priceHuntRoutes = require("./routes/priceHunt");
const sellerRoutes = require("./routes/sellers");
const shopRoutes = require("./routes/shops");
const sellerDashboardRoutes = require("./routes/seller");
const videoRoutes = require("./routes/videos");
const settingsRoutes = require("./routes/settings");
const groupBuyRoutes = require("./routes/group_buys");
const bundleRoutes = require("./routes/bundles");
const sitemapRoutes = require("./routes/sitemap");
const sitemapService = require("./services/sitemapService");
const uploadRoutes = require("./routes/uploads");
const hadoopRoutes = require("./routes/hadoop");
const geocodingRoutes = require("./routes/geocoding");

// ============================================================
// JWT / OTHER MIDDLEWARE
// ============================================================

const requireAdminJWT = require("./middlewares/requireAdminJWT");
const blockDirectAccess = require("./middlewares/blockDirectAccess");

const helmet = require("helmet");
const rateLimit = require("express-rate-limit");

// ============================================================
// EXPRESS APP
// ============================================================

const app = express();

// ============================================================
// CORS CONFIGURATION
// ============================================================

const allowedOrigins = [
  // Local development
  "http://localhost:3000",
  "http://localhost:5173",

  // Current Vercel deployments
  "https://frontend-pi-gules-46.vercel.app",
  "https://frontend-git-main-amrit-vidyarthis-projects.vercel.app",
  "https://frontend-2rvsg1y26-amrit-vidyarthis-projects.vercel.app",

  // Previous Vercel deployment
  "https://frontend-5dhtsy2hj-amrit-vidyarthis-projects.vercel.app"
];

// Add FRONTEND_URL from Render environment variable
if (process.env.FRONTEND_URL) {
  const frontendUrl = process.env.FRONTEND_URL.replace(/\/$/, "");

  if (!allowedOrigins.includes(frontendUrl)) {
    allowedOrigins.push(frontendUrl);
  }
}

const corsOptions = {
  origin: function (origin, callback) {

    // Allow requests without Origin
    // Example: Postman, curl, mobile apps, server-to-server
    if (!origin) {
      return callback(null, true);
    }

    // Allow exact configured origins
    if (allowedOrigins.includes(origin)) {
      console.log("✅ CORS allowed:", origin);
      return callback(null, true);
    }

    // Allow Vercel deployment URLs for this frontend project
    if (
      origin.startsWith("https://frontend-") &&
      origin.endsWith("-amrit-vidyarthis-projects.vercel.app")
    ) {
      console.log("✅ Vercel CORS allowed:", origin);
      return callback(null, true);
    }

    console.log("❌ CORS blocked origin:", origin);

    return callback(
      new Error(`CORS policy blocked origin: ${origin}`)
    );
  },

  credentials: true,

  methods: [
    "GET",
    "POST",
    "PUT",
    "PATCH",
    "DELETE",
    "OPTIONS"
  ],

  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "X-Requested-With",
    "Accept"
  ],

  optionsSuccessStatus: 204
};

// IMPORTANT:
// CORS must be registered before routes.
app.use(cors(corsOptions));

// ============================================================
// SECURITY HEADERS
// ============================================================

app.use(
  helmet({
    crossOriginResourcePolicy: {
      policy: "cross-origin"
    },

    crossOriginEmbedderPolicy: false
  })
);

// ============================================================
// RATE LIMITING
// ============================================================

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,

  max: 3000,

  standardHeaders: true,

  legacyHeaders: false,

  message:
    "Too many requests from this IP, please try again after 15 minutes"
});

app.use(limiter);

// ============================================================
// GENERAL MIDDLEWARE
// ============================================================

app.use(compression());

app.use(express.json());

app.use(
  express.urlencoded({
    extended: true
  })
);

// Request logger
app.use((req, res, next) => {
  console.log(
    `[${new Date().toISOString()}] ${req.method} ${req.url}`
  );

  next();
});

app.use(cookieParser());

// ============================================================
// STATIC FILES
// ============================================================

app.use(
  "/assets",
  express.static(path.join(__dirname, "assets"))
);

app.use(
  "/assets/videos",
  express.static(path.join(__dirname, "assets/videos"))
);

app.use(
  "/uploads/sellers",
  express.static(path.join(__dirname, "uploads/sellers"))
);

app.use(
  "/uploads/reviews",
  express.static(path.join(__dirname, "uploads/reviews"))
);

app.use(
  "/assets/customizations",
  express.static(
    path.join(__dirname, "assets/customizations")
  )
);

// ============================================================
// HEALTH CHECK
// ============================================================

app.get("/", (req, res) => {
  res.status(200).json({
    status: "online",
    message: "ShopKart Backend API is live and healthy",
    timestamp: new Date().toISOString()
  });
});

app.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok"
  });
});

// ============================================================
// ROUTES
// ============================================================

// Authentication
app.use("/users", authRoutes);
app.use("/api/auth", authOtpRoutes);

// Orders
app.use("/orders", orderRoutes);
app.use("/api/orders", orderRoutes);

// Slider
app.use("/slider", sliderRoutes);
app.use("/api/slider", sliderRoutes);

// Category
app.use("/category", categoryRoutes);
app.use("/api/category", categoryRoutes);

// Subcategory
app.use("/subcategory", subcategoryRoutes);
app.use("/api/subcategory", subcategoryRoutes);

// Products
app.use("/api/products", productRoutes);
app.use("/products", productRoutes);

// Payment
app.use("/api/payment", paymentRoutes);

// Chatbot
app.use("/chatbot", chatbotRoutes);
app.use("/adminchatbot", adminchatbotRoutes);

// Cart
app.use("/cart", cartRoutes);

// Reviews
app.use("/reviews", reviewRoutes);

// Consent
app.use("/api/consent", consentRoutes);

// Scripts
app.use("/api/scripts", scriptRoutes);

// Events
app.use("/api/events", eventsRoutes);

// Price Hunt
app.use("/api/hunt", priceHuntRoutes);

// Popups
app.use("/api/popups", popupsRoutes);

// Coupons
app.use("/api/coupons", couponRoutes);

// Analytics
app.use("/api/analytics", analyticsRoutes);

// Cache
app.use("/api/cache", cacheRoutes);

// Group Buys
app.use("/api/group-buys", groupBuyRoutes);

// System Health
app.use("/api/system-health", systemHealthRoutes);

// Alerts
app.use("/api/alerts", alertRoutes);

// Brands
app.use("/api/brands", brandRoutes);

// Promos
app.use("/api/promos", promosRoutes);

// Collections
app.use("/api/collections", collectionRoutes);

// Attributes
app.use("/api/attributes", attributeRoutes);

// ============================================================
// SELLER / MERCHANT ROUTES
// ============================================================

app.use("/api/sellers", sellerRoutes);

app.use("/api/seller", sellerDashboardRoutes);

app.use("/api/shops", shopRoutes);

// Compatibility routes
app.use("/sellers", sellerRoutes);

app.use("/seller", sellerDashboardRoutes);

app.use("/shops", shopRoutes);

// ============================================================
// OTHER API ROUTES
// ============================================================

app.use("/api/settings", settingsRoutes);

app.use("/api/videos", videoRoutes);

app.use("/api/bundles", bundleRoutes);

// Sitemap
app.use("/sitemap", sitemapRoutes);
app.use("/api/sitemap", sitemapRoutes);

// Uploads
app.use("/api/uploads", uploadRoutes);

// Geocoding
app.use("/api/geocoding", geocodingRoutes);

// ============================================================
// ADMIN ROUTES
// ============================================================

app.use("/admin", adminRoutes);

app.use("/admin", adminNotificationsRoutes);

// Hadoop management
app.use("/api/hadoop", hadoopRoutes);

// ============================================================
// SITEMAP SCHEDULER
// ============================================================

const SITEMAP_INTERVAL = 15 * 60 * 1000;

setInterval(() => {
  console.log(
    "⏰ Running scheduled sitemap generation..."
  );

  sitemapService.generateXML();

}, SITEMAP_INTERVAL);

// Initial sitemap generation
setTimeout(() => {
  sitemapService.generateXML();
}, 5000);

// ============================================================
// SOCKET.IO
// ============================================================

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,

    methods: [
      "GET",
      "POST"
    ],

    credentials: true
  }
});

// Make Socket.IO available to routes
app.use((req, res, next) => {
  req.io = io;
  next();
});

// ============================================================
// SOCKET.IO CONNECTION
// ============================================================

io.on("connection", (socket) => {

  console.log(
    "A user connected:",
    socket.id
  );

  // ==========================================================
  // JOIN TICKET ROOM
  // ==========================================================

  socket.on("joinRoom", (room) => {

    socket.join(room);

    console.log(
      `${socket.id} joined room: ${room}`
    );

    const ticketId = room.split("_")[1];

    db.query(
      `
      SELECT
        sender,
        message,
        user_id
      FROM messages
      WHERE ticket_id = ?
      ORDER BY created_at ASC
      `,
      [ticketId],
      (err, results) => {

        if (err) {
          return console.error(err);
        }

        results.forEach((msg) => {

          socket.emit(
            "receiveMessage",
            {
              sender: msg.sender,
              message: msg.message,
              userId: msg.user_id
            }
          );

        });
      }
    );
  });

  // ==========================================================
  // SEND MESSAGE
  // ==========================================================

  socket.on(
    "sendMessage",
    ({ sender, ticketId, message }) => {

      db.query(
        "SELECT user_id FROM tickets WHERE id = ?",
        [ticketId],
        (err, results) => {

          if (err) {
            return console.error(err);
          }

          const userId =
            results[0]?.user_id;

          const room =
            `ticket_${ticketId}`;

          // Get user name
          db.query(
            "SELECT name FROM users WHERE id = ?",
            [userId],
            (err2, userResults) => {

              if (err2) {
                console.error(err2);
              }

              const userName =
                userResults?.[0]?.name ||
                "User";

              // Insert message
              db.query(
                `
                INSERT INTO messages
                (
                  user_id,
                  ticket_id,
                  sender,
                  message
                )
                VALUES (?, ?, ?, ?)
                `,
                [
                  userId,
                  ticketId,
                  sender,
                  message
                ],
                (err) => {

                  if (err) {
                    return console.error(err);
                  }

                  // Send message to room
                  io.to(room).emit(
                    "receiveMessage",
                    {
                      sender,
                      message,
                      userId,
                      ticketId
                    }
                  );

                  // Notify admins
                  if (sender === "user") {

                    io.emit(
                      "newMessage",
                      {
                        userName,
                        message,
                        ticketId
                      }
                    );

                  }
                }
              );
            }
          );
        }
      );
    }
  );

  // ==========================================================
  // USER MESSAGE
  // ==========================================================

  socket.on(
    "userMessage",
    ({ ticketId, message, sender }) => {

      const room =
        `ticket_${ticketId}`;

      socket
        .to(room)
        .emit(
          "receiveMessage",
          {
            sender,
            message,
            ticketId
          }
        );
    }
  );

  // ==========================================================
  // TYPING
  // ==========================================================

  socket.on(
    "typing",
    ({ room, sender }) => {

      socket
        .to(room)
        .emit(
          "typing",
          {
            sender
          }
        );
    }
  );

  // ==========================================================
  // STOP TYPING
  // ==========================================================

  socket.on(
    "stopTyping",
    ({ room, sender }) => {

      socket
        .to(room)
        .emit(
          "stopTyping",
          {
            sender
          }
        );
    }
  );

  // ==========================================================
  // DISCONNECT
  // ==========================================================

  socket.on("disconnect", () => {

    console.log(
      "User disconnected:",
      socket.id
    );

  });

});

// ============================================================
// GLOBAL ERROR HANDLER
// ============================================================

app.use(
  (err, req, res, next) => {

    console.error(
      "❌ Global Error Stack:",
      err.stack
    );

    console.error(
      "❌ Global Error Message:",
      err.message
    );

    // CORS error
    if (
      err.message &&
      err.message.includes("CORS policy")
    ) {

      return res.status(403).json({
        message: "CORS error",
        error: err.message
      });

    }

    res.status(
      err.status || 500
    ).json({

      message:
        err.message ||
        "Internal Server Error",

      error:
        err.message,

      details:
        process.env.NODE_ENV === "production"
          ? undefined
          : err.stack

    });

  }
);

// ============================================================
// START SERVER
// ============================================================

const PORT = parseInt(
  process.env.PORT || "10000",
  10
);

server
  .listen(
    PORT,
    "0.0.0.0",
    () => {

      console.log(
        `🚀 Server running on port ${PORT}`
      );

      console.log(
        "🌐 Allowed CORS origins:"
      );

      allowedOrigins.forEach(
        (origin) => {

          console.log(
            `   ✓ ${origin}`
          );

        }
      );

    }
  )
  .on("error", (err) => {

    if (err.code === "EADDRINUSE") {

      console.error(
        `❌ Port ${PORT} is already in use.`
      );

      process.exit(1);

    } else {

      console.error(
        "❌ Server Error:",
        err
      );

      throw err;

    }

  });

// ============================================================
// EXPORTS
// ============================================================

module.exports = {
  app,
  server,
  io
};
