require('dotenv').config();
const db = require("./db");

async function runDebug() {
    console.log("--- Debugging User 501 ---");
    db.query("SELECT id, name, email FROM users WHERE id = 501", (err, users) => {
        if (err) console.error(err);
        console.log("User 501:", users);

        console.log("\n--- Debugging Tickets for User 501 ---");
        db.query("SELECT id, user_id, subject, status, created_at FROM tickets WHERE user_id = 501 ORDER BY id DESC LIMIT 5", (err, tickets) => {
            if (err) console.error(err);
            console.log("Tickets:", tickets);

            if (tickets.length > 0) {
                console.log("\n--- Debugging Messages for Ticket " + tickets[0].id + " ---");
                db.query("SELECT * FROM messages WHERE ticket_id = ?", [tickets[0].id], (err, msgs) => {
                    console.log("Messages:", msgs);
                    process.exit();
                });
            } else {
                process.exit();
            }
        });
    });
}

runDebug();
