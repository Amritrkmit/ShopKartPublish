require('dotenv').config();
const jwt = require('jsonwebtoken');
const http = require('http');

const SECRET = process.env.JWT_SECRET || "mySuperStrongSecretKey_123456789";
const token = jwt.sign({ id: 1, role: 'admin' }, SECRET, { expiresIn: '1h' });

const options = {
    hostname: 'localhost',
    port: process.env.PORT || 6420,
    path: '/adminchatbot/tickets',
    method: 'GET',
    headers: {
        'Cookie': `adminToken=${token}`,
        'Content-Type': 'application/json'
    }
};

const req = http.request(options, (res) => {
    let data = '';
    res.on('data', (chunk) => {
        data += chunk;
    });
    res.on('end', () => {
        console.log("Status:", res.statusCode);
        try {
            const json = JSON.parse(data);
            // Log first ticket to inspect structure
            if (json.tickets && json.tickets.length > 0) {
                console.log("First Ticket Sample:", JSON.stringify(json.tickets[0], null, 2));
            } else {
                console.log("Response:", data);
            }
        } catch (e) {
            console.log("Raw Body:", data);
        }
    });
});

req.on('error', (e) => {
    console.error(`Problem with request: ${e.message}`);
});

req.end();
