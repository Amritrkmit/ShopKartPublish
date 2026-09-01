const express = require("express");
const router = express.Router();
const db = require("../db");
const requireAdminJWT = require("../middlewares/requireAdminJWT");

// 1️⃣ Get all tickets/messages for admin
router.get("/tickets", requireAdminJWT, (req, res) => {
  db.query(
    `SELECT t.id as ticketId, t.user_id, t.subject, t.status, t.created_at as ticket_created,
            u.name as user_name, u.email as user_email,
            m.sender, m.message, m.created_at
     FROM tickets t
     LEFT JOIN users u ON t.user_id = u.id
     LEFT JOIN messages m ON t.id = m.ticket_id
     ORDER BY t.id DESC, m.created_at ASC`,
    (err, results) => {
      if (err) return res.status(500).json({ message: "DB error", error: err });

      console.log("DEBUG: Tickets Query Results Sample:", results.length > 0 ? results[0] : "No results");

      const ticketsMap = {};
      results.forEach((item) => {
        if (!ticketsMap[item.ticketId]) {
          ticketsMap[item.ticketId] = {
            id: item.ticketId,
            user_id: item.user_id,
            user_name: item.user_name || `User ${item.user_id}`,
            user_email: item.user_email,
            subject: item.subject,
            status: item.status || 'open',
            created_at: item.ticket_created,
            _debug_row: item, // DEBUG INFO
            messages: [],
          };
        }
        if (item.message) {
          ticketsMap[item.ticketId].messages.push({
            sender: item.sender,
            message: item.message,
            created_at: item.created_at,
          });
        }
      });

      // Convert map to array and sort by latest activity or creation
      const ticketsArray = Object.values(ticketsMap).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

      res.json({ tickets: ticketsArray });
    }
  );
});

// 2️⃣ Get messages of a specific ticket
router.get("/ticket/:ticketId", requireAdminJWT, (req, res) => {
  const { ticketId } = req.params;
  db.query(
    "SELECT sender, message, created_at, ticket_id FROM messages WHERE ticket_id = ? ORDER BY created_at ASC",
    [ticketId],
    (err, results) => {
      if (err) return res.status(500).json({ message: "DB error" });
      res.json({ messages: results });
    }
  );
});

// 3️⃣ Close a ticket
router.post("/close-ticket/:id", (req, res) => {
  const ticketId = req.params.id;
  console.log("Closing ticket:", ticketId);

  db.query(
    "UPDATE tickets SET status = ?, closed_at = NOW() WHERE id = ?",
    ["closed", ticketId],
    (err, result) => {
      if (err) {
        console.error("Error closing ticket:", err);
        return res.status(500).json({ success: false, error: err.message });
      }

      console.log("Ticket closed result:", result);

      // Emit ticketClosed via Socket.IO
      if (req.io) {
        req.io.to(`ticket_${ticketId}`).emit("ticketClosed", {
          ticketId,
          message: "This ticket has been closed by admin.",
        });
      }

      res.json({ success: true, ticketId, status: "closed" });
    }
  );
});

module.exports = router;
