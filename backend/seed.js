const db = require("./db");
require("dotenv").config();

const NUM_USERS = 500;
const NUM_CATEGORIES = 10;
const NUM_SUBCATEGORIES = 50;
const NUM_PRODUCTS = 500;
const NUM_ORDERS = 500;
const NUM_REVIEWS = 500;
const NUM_TICKETS = 100;

function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getRandomElement(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

function generateRandomString(length) {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 ';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

const firstNames = ["James", "Mary", "John", "Patricia", "Robert", "Jennifer", "Michael", "Linda", "William", "Elizabeth", "David", "Barbara", "Richard", "Susan", "Joseph", "Jessica", "Thomas", "Sarah", "Charles", "Karen"];
const lastNames = ["Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis", "Rodriguez", "Martinez", "Hernandez", "Lopez", "Gonzalez", "Wilson", "Anderson", "Thomas", "Taylor", "Moore", "Jackson", "Martin"];

const productAdjectives = ["Awesome", "Incredible", "Fantastic", "Modern", "Classic", "Vintage", "Sleek", "Durable", "Premium", "Exclusive"];
const productNouns = ["Chair", "Table", "Laptop", "Phone", "Headphones", "Watch", "Shoes", "Shirt", "Bag", "Camera", "Lens", "Speaker", "Monitor", "Keyboard", "Mouse"];

function generateName() {
    return getRandomElement(firstNames) + " " + getRandomElement(lastNames);
}

function generateProductName() {
    return getRandomElement(productAdjectives) + " " + getRandomElement(productNouns) + " " + getRandomInt(100, 999);
}

async function runQuery(query, params) {
    return new Promise((resolve, reject) => {
        db.query(query, params, (err, result) => {
            if (err) reject(err);
            else resolve(result);
        });
    });
}

async function seed() {
    console.log("🌱 Starting seed...");

    try {
        // 1. Users
        console.log("Inserting Users...");
        const usersValues = [];
        for (let i = 0; i < NUM_USERS; i++) {
            const name = generateName();
            const email = `user${i}_${Date.now()}@example.com`;
            const pass = '$2a$10$abcdefg123456'; // dummy hash
            usersValues.push([name, email, pass, 'user']);
        }
        await runQuery("INSERT INTO users (name, email, password, role) VALUES ?", [usersValues]);

        // Get User IDs
        const users = await runQuery("SELECT id FROM users");
        const userIds = users.map(u => u.id);

        // 2. Categories
        console.log("Inserting Categories...");
        const catValues = [];
        for (let i = 0; i < NUM_CATEGORIES; i++) {
            const name = `Category ${i}`;
            const slug = `category-${i}-${Date.now()}`;
            catValues.push([name, slug]);
        }
        await runQuery("INSERT INTO categories (name, slug) VALUES ?", [catValues]);

        const categories = await runQuery("SELECT id FROM categories");
        const catIds = categories.map(c => c.id);

        // 3. Subcategories
        console.log("Inserting Subcategories...");
        const subcatValues = [];
        for (let i = 0; i < NUM_SUBCATEGORIES; i++) {
            const name = `Subcategory ${i}`;
            const slug = `subcategory-${i}-${Date.now()}`;
            const catId = getRandomElement(catIds);
            subcatValues.push([name, slug, catId]);
        }
        await runQuery("INSERT INTO subcategories (name, slug, category_id) VALUES ?", [subcatValues]);

        const subcategories = await runQuery("SELECT id FROM subcategories");
        const subcatIds = subcategories.map(s => s.id);

        // 4. Products
        console.log("Inserting Products...");
        const productValues = [];
        for (let i = 0; i < NUM_PRODUCTS; i++) {
            const name = generateProductName();
            const slug = name.replace(/\s+/g, '-').toLowerCase() + `-${i}`;
            const price = getRandomInt(10, 5000);
            const desc = `This is a description for ${name}. It is a very good product.`;
            const catId = getRandomElement(catIds);
            const subcatId = getRandomElement(subcatIds);
            const image = "https://via.placeholder.com/300";
            productValues.push([name, slug, price, desc, stock = 100, image, catId, subcatId]);
        }
        // Assuming your products table has name, slug, price, description, stock, image, category_id, subcategory_id
        await runQuery("INSERT INTO products (name, slug, price, description, stock, image, category_id, subcategory_id) VALUES ?", [productValues]);

        const products = await runQuery("SELECT id FROM products");
        const productIds = products.map(p => p.id);

        // 5. Orders
        console.log("Inserting Orders...");
        const orderValues = [];
        for (let i = 0; i < NUM_ORDERS; i++) {
            const userId = getRandomElement(userIds);
            const total = getRandomInt(100, 10000);
            const status = getRandomElement(['pending', 'processing', 'shipped', 'delivered']);
            const items = JSON.stringify([{ productId: getRandomElement(productIds), quantity: 1 }]);
            orderValues.push([userId, total, status, items]);
        }
        await runQuery("INSERT INTO orders (user_id, total_amount, status, items) VALUES ?", [orderValues]);

        // 6. Reviews
        console.log("Inserting Reviews...");
        const reviewValues = [];
        for (let i = 0; i < NUM_REVIEWS; i++) {
            const userId = getRandomElement(userIds);
            const prodId = getRandomElement(productIds);
            const rating = getRandomInt(1, 5);
            const comment = getRandomElement(["Great!", "Good", "Okay", "Not bad", "Terrible", "Loved it!"]);
            reviewValues.push([userId, prodId, rating, comment]);
        }
        await runQuery("INSERT INTO reviews (user_id, product_id, rating, comment) VALUES ?", [reviewValues]);

        // 7. Tickets
        console.log("Inserting Tickets...");
        const ticketValues = [];
        for (let i = 0; i < NUM_TICKETS; i++) {
            const userId = getRandomElement(userIds);
            const subject = "Issue #" + i;
            const status = getRandomElement(['open', 'closed']);
            ticketValues.push([userId, subject, status]);
        }
        await runQuery("INSERT INTO tickets (user_id, subject, status) VALUES ?", [ticketValues]);

        // 8. Addresses
        console.log("Inserting Addresses...");
        const addrValues = [];
        for (let i = 0; i < 500; i++) {
            const userId = getRandomElement(userIds);
            const addr1 = "123 Random St";
            const city = "Random City";
            const zip = "10001";
            addrValues.push([userId, addr1, city, zip]);
        }
        await runQuery("INSERT INTO user_addresses (user_id, address_line1, city, zip_code) VALUES ?", [addrValues]);


        console.log("✅ Seeding complete!");
        process.exit(0);

    } catch (err) {
        console.error("❌ Seeding failed:", err);
        process.exit(1);
    }
}

seed();
