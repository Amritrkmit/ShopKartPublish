require('dotenv').config();
const db = require("./db");

const sql = `SELECT t.id as ticketId, t.user_id, t.subject, t.status, t.created_at as ticket_created,
            u.name as user_name, u.email as user_email,
            m.sender, m.message, m.created_at
     FROM tickets t
     LEFT JOIN users u ON t.user_id = u.id
     LEFT JOIN messages m ON t.id = m.ticket_id
     ORDER BY t.created_at DESC, m.created_at ASC LIMIT 5`; // Added LIMIT for sanity

console.log("Running Query...");
db.query(sql, (err, results) => {
    if (err) {
        console.error(err);
        process.exit(1);
    }
    console.log("Results count:", results.length);
    if (results.length > 0) {
        console.log("First row keys:", Object.keys(results[0]));
        console.log("First row 'ticket_created':", results[0].ticket_created);
        console.log("First row full:", results[0]);
    }
    process.exit(0);
});
