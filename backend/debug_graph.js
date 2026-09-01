require("dotenv").config();
const db = require("./db");
const util = require("util");
const query = util.promisify(db.query).bind(db);

async function checkGraph() {
    try {
        const sql = `
      SELECT DATE_FORMAT(created_at, '%b') as name, SUM(total_amount) as sales 
      FROM orders 
      WHERE status != 'cancelled' 
      GROUP BY DATE_FORMAT(created_at, '%Y-%m'), DATE_FORMAT(created_at, '%b')
      ORDER BY DATE_FORMAT(created_at, '%Y-%m') ASC
      LIMIT 6
    `;
        const rows = await query(sql);
        console.log("Graph Data:", rows);
        process.exit();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

checkGraph();
