// In-memory database - works perfectly on cloud platforms like Render
// Orders persist as long as the server is running (ideal for demos)

const defaultData = [
    { id: 1, item: "Paneer Butter Masala", qty: 2, price: 250.00, time: "Today 7 PM", status: "pending", emoji: "🥘" },
    { id: 2, item: "Chicken Biryani", qty: 3, price: 350.00, time: "Today 8 PM", status: "preparing", emoji: "🍲" }
];

// In-memory store
let orders = [...defaultData];

function initDB() {
    // Nothing to initialize - using in-memory store
    console.log("DB initialized with", orders.length, "default orders.");
}

function getOrders() {
    return orders;
}

function addOrder(order) {
    const newOrder = {
        id: Date.now(),
        ...order,
        status: "pending"
    };
    orders.unshift(newOrder); // add to top
    return newOrder;
}

module.exports = {
    initDB,
    getOrders,
    addOrder
};
