const fs = require('fs');

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

const firstNames = ["James", "Mary", "John", "Patricia", "Robert", "Jennifer", "Michael", "Linda", "William", "Elizabeth", "David", "Barbara", "Richard", "Susan", "Joseph", "Jessica", "Thomas", "Sarah", "Charles", "Karen"];
const lastNames = ["Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis", "Rodriguez", "Martinez", "Hernandez", "Lopez", "Gonzalez", "Wilson", "Anderson", "Thomas", "Taylor", "Moore", "Jackson", "Martin"];
const productAdjectives = ["Awesome", "Incredible", "Fantastic", "Modern", "Classic", "Vintage", "Sleek", "Durable", "Premium", "Exclusive"];
const productNouns = ["Chair", "Table", "Laptop", "Phone", "Headphones", "Watch", "Shoes", "Shirt", "Bag", "Camera", "Lens", "Speaker", "Monitor", "Keyboard", "Mouse"];

function generateName() { return getRandomElement(firstNames) + " " + getRandomElement(lastNames); }
function generateProductName() { return getRandomElement(productAdjectives) + " " + getRandomElement(productNouns) + " " + getRandomInt(100, 999); }
function escapeSql(str) { return str.replace(/'/g, "''"); }

let sqlContent = "-- Dummy Data SQL Dump\n\n";

// 1. Users
sqlContent += "-- Users\n";
sqlContent += "INSERT INTO users (name, email, password, role) VALUES \n";
const users = [];
for (let i = 0; i < NUM_USERS; i++) {
    const name = generateName();
    const email = `user${i}_${Date.now()}@example.com`;
    const pass = '$2a$10$abcdefg123456';
    users.push(`('${escapeSql(name)}', '${email}', '${pass}', 'user')`);
}
sqlContent += users.join(",\n") + ";\n\n";

// 2. Categories
sqlContent += "-- Categories\n";
sqlContent += "INSERT INTO categories (name, slug) VALUES \n";
const categories = [];
for (let i = 1; i <= NUM_CATEGORIES; i++) {
    categories.push(`('Category ${i}', 'category-${i}-${Date.now()}')`);
}
sqlContent += categories.join(",\n") + ";\n\n";

// 3. Subcategories
sqlContent += "-- Subcategories\n";
sqlContent += "INSERT INTO subcategories (name, slug, category_id) VALUES \n";
const subcategories = [];
for (let i = 1; i <= NUM_SUBCATEGORIES; i++) {
    const catId = getRandomInt(1, NUM_CATEGORIES);
    subcategories.push(`('Subcategory ${i}', 'subcategory-${i}-${Date.now()}', ${catId})`);
}
sqlContent += subcategories.join(",\n") + ";\n\n";

// 4. Products
sqlContent += "-- Products\n";
sqlContent += "INSERT INTO products (name, slug, price, description, stock, image, category_id, subcategory_id) VALUES \n";
const products = [];
for (let i = 1; i <= NUM_PRODUCTS; i++) {
    const name = generateProductName();
    const slug = name.replace(/\s+/g, '-').toLowerCase() + `-${i}`;
    const price = getRandomInt(10, 5000);
    const desc = `This is a description for ${name}.`;
    const catId = getRandomInt(1, NUM_CATEGORIES);
    const subcatId = getRandomInt(1, NUM_SUBCATEGORIES);
    const image = "https://via.placeholder.com/300";
    products.push(`('${escapeSql(name)}', '${escapeSql(slug)}', ${price}, '${escapeSql(desc)}', 100, '${image}', ${catId}, ${subcatId})`);
}
sqlContent += products.join(",\n") + ";\n\n";

// 5. Orders
sqlContent += "-- Orders\n";
sqlContent += "INSERT INTO orders (user_id, total_amount, status, items) VALUES \n";
const orders = [];
for (let i = 0; i < NUM_ORDERS; i++) {
    const userId = getRandomInt(1, NUM_USERS);
    const total = getRandomInt(100, 10000);
    const status = getRandomElement(['pending', 'processing', 'shipped', 'delivered']);
    const items = JSON.stringify([{ productId: getRandomInt(1, NUM_PRODUCTS), quantity: 1 }]);
    orders.push(`(${userId}, ${total}, '${status}', '${escapeSql(items)}')`);
}
sqlContent += orders.join(",\n") + ";\n\n";

// 6. Reviews
sqlContent += "-- Reviews\n";
sqlContent += "INSERT INTO reviews (user_id, product_id, rating, comment) VALUES \n";
const reviews = [];
for (let i = 0; i < NUM_REVIEWS; i++) {
    const userId = getRandomInt(1, NUM_USERS);
    const prodId = getRandomInt(1, NUM_PRODUCTS);
    const rating = getRandomInt(1, 5);
    const comment = getRandomElement(["Great!", "Good", "Okay", "Not bad", "Terrible", "Loved it!"]);
    reviews.push(`(${userId}, ${prodId}, ${rating}, '${comment}')`);
}
sqlContent += reviews.join(",\n") + ";\n\n";

// 7. Tickets
sqlContent += "-- Tickets\n";
sqlContent += "INSERT INTO tickets (user_id, subject, status) VALUES \n";
const tickets = [];
for (let i = 0; i < NUM_TICKETS; i++) {
    const userId = getRandomInt(1, NUM_USERS);
    const subject = "Issue #" + i;
    const status = getRandomElement(['open', 'closed']);
    tickets.push(`(${userId}, '${subject}', '${status}')`);
}
sqlContent += tickets.join(",\n") + ";\n\n";

// 8. Addresses
sqlContent += "-- Addresses\n";
sqlContent += "INSERT INTO user_addresses (user_id, address_line1, city, zip_code) VALUES \n";
const addresses = [];
for (let i = 0; i < 500; i++) {
    const userId = getRandomInt(1, NUM_USERS);
    const addr1 = "123 Random St";
    const city = "Random City";
    const zip = "10001";
    addresses.push(`(${userId}, '${addr1}', '${city}', '${zip}')`);
}
sqlContent += addresses.join(",\n") + ";\n\n";

fs.writeFileSync('dummy_data.sql', sqlContent);
console.log('✅ dummy_data.sql generated!');
