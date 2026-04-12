const fs = require('fs');
const path = require('path');

const DB_FILE = path.join(__dirname, 'orders.json');

// Initialize with some mock data if empty
const defaultData = [
    { id: 1, item: "Paneer Butter Masala", qty: 2, price: 250.00, time: "Today 7 PM", status: "pending", emoji: "🥘" },
    { id: 2, item: "Chicken Biryani", qty: 3, price: 350.00, time: "Today 8 PM", status: "preparing", emoji: "🍲" }
];

function initDB() {
    if (!fs.existsSync(DB_FILE)) {
        fs.writeFileSync(DB_FILE, JSON.stringify(defaultData, null, 2));
    }
}

function getOrders() {
    try {
        const data = fs.readFileSync(DB_FILE, 'utf8');
        return JSON.parse(data);
    } catch (err) {
        return [];
    }
}

function addOrder(order) {
    const orders = getOrders();
    // Prepend new order
    const newOrder = {
        id: Date.now(),
        ...order,
        status: "pending"
    };
    orders.unshift(newOrder);
    fs.writeFileSync(DB_FILE, JSON.stringify(orders, null, 2));
    return newOrder;
}

module.exports = {
    initDB,
    getOrders,
    addOrder
};
