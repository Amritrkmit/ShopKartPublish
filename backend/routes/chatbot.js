const express = require("express");
const router = express.Router();
const db = require("../db"); // your MySQL connection
const authMiddleware = require("../middlewares/userJWT");

// ----------------- CHATBOT LOGIN -----------------
router.post("/login", (req, res) => {
  const { emailOrMobile } = req.body;
  if (!emailOrMobile) return res.status(400).json({ message: "Email or Mobile is required" });

  db.query(
    "SELECT id, name, email FROM users WHERE email = ?",
    [emailOrMobile],
    (err, results) => {
      if (err) {
        console.error("Users query error:", err); // 🔹 log full error
        return res.status(500).json({ message: "Database error (users query)" });
      }
      if (results.length === 0) return res.status(404).json({ message: "User not found" });

      const user = results[0];

      db.query(
        "SELECT id, items FROM orders WHERE user_id = ?",
        [user.id],
        (err2, orders) => {
          if (err2) {
            console.error("Orders query error:", err2); // 🔹 log full error
            return res.status(500).json({ message: "Database error (orders query)" });
          }

          res.json({
            user: { id: user.id, name: user.name, email: user.email },
            orders,
          });
        }
      );
    }
  );
});

router.post("/verify-user", (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: "Email required" });

  db.query("SELECT id, name FROM users WHERE email = ?", [email], (err, result) => {
    if (err) return res.status(500).json({ error: "DB error" });
    if (result.length) {
      res.json({ exists: true, userId: result[0].id, name: result[0].name });
    } else {
      res.json({ exists: false });
    }
  });
});

// 2️⃣ Send user query and create ticket if not exists
router.post("/send-query", (req, res) => {
  const { userId, message, subject } = req.body;
  if (!userId || !message) return res.status(400).json({ error: "Missing data" });

  // check if open ticket exists
  db.query("SELECT id FROM tickets WHERE user_id = ? AND status = 'open' ORDER BY created_at DESC LIMIT 1", [userId], (err, tickets) => {
    if (err) return res.status(500).json({ error: "DB error" });

    const ticketId = tickets.length ? tickets[0].id : null;

    if (ticketId) {
      // insert message to existing ticket
      db.query("INSERT INTO messages (ticket_id, user_id, sender, message) VALUES (?, ?, 'user', ?)", [ticketId, userId, message], (err) => {
        if (err) return res.status(500).json({ error: "DB error" });
        res.json({ ticketId });
      });
    } else {
      // create new ticket ONLY if subject is provided (or use explicit subject from body if available, otherwise default if not strictly enforcing yet, but frontend will enforce)
      const ticketSubject = subject || "General Inquiry";

      db.query("INSERT INTO tickets (user_id, subject, status) VALUES (?, ?, 'open')", [userId, ticketSubject], (err, result) => {
        if (err) return res.status(500).json({ error: "DB error" });
        const newTicketId = result.insertId;
        db.query("INSERT INTO messages (ticket_id, user_id, sender, message) VALUES (?, ?, 'user', ?)", [newTicketId, userId, message], (err) => {
          if (err) return res.status(500).json({ error: "DB error" });
          res.json({ ticketId: newTicketId });
        });
      });
    }
  });
});

// 3️⃣ Get active ticket for user
router.get("/active-ticket/:userId", (req, res) => {
  const { userId } = req.params;
  db.query(
    "SELECT id FROM tickets WHERE user_id = ? AND status = 'open' ORDER BY created_at DESC LIMIT 1",
    [userId],
    (err, results) => {
      if (err) return res.status(500).json({ message: "DB error" });

      if (results.length > 0) {
        res.json({ ticketId: results[0].id });
      } else {
        res.json({ ticketId: null });
      }
    }
  );
});
// Optional: test route
router.get("/", (req, res) => {
  res.json({ message: "Chatbot API working 🚀" });
});


router.get("/messages/:ticketId", async (req, res) => {
  const ticketId = req.params.ticketId;
  db.query(
    "SELECT sender, message FROM messages WHERE ticket_id = ? ORDER BY created_at ASC",
    [ticketId],
    (err, results) => {
      if (err) return res.status(500).json({ error: "Database error" });
      res.json({ messages: results.map(r => ({ from: r.sender, message: r.message })) });
    }
  );
});


module.exports = router;
