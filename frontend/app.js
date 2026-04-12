// --- Config: detect if running on localhost or production ---
const API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:3000'
    : ''; // On Render, API calls are on the same domain

// --- Order Data state ---
let orders = [];

// Fetch orders from backend server
async function fetchOrders() {
    try {
        const response = await fetch(`${API_BASE}/api/orders`);
        if (response.ok) {
            orders = await response.json();
            // Hide loading state if it exists
            const loadingState = document.getElementById('loading-state');
            if (loadingState) loadingState.style.display = 'none';
        }
    } catch (err) {
        console.log("Backend offline. Using demo data.");
        if (orders.length === 0) {
            orders = [
                { id: 1, item: "Paneer Butter Masala", qty: 2, price: 250.00, time: "Today 7 PM", status: "pending", emoji: "🥘" },
                { id: 2, item: "Chicken Biryani", qty: 3, price: 350.00, time: "Today 8 PM", status: "preparing", emoji: "🍲" }
            ];
        }
    }
    renderOrders();
    updateStats();
}

// Poll backend every 5 seconds for new WhatsApp orders
setInterval(() => {
    if (document.activeView === 'dashboard-view') {
        fetchOrders();
    }
}, 5000);

// --- DOM Elements ---
const views = document.querySelectorAll('.view');
const navItems = document.querySelectorAll('[data-target]');
const loginForm = document.getElementById('login-form');
const addOrderForm = document.getElementById('add-order-form');
const ordersList = document.getElementById('orders-list');
const toastEl = document.getElementById('toast');

const aiInput = document.getElementById('ai-input');
const aiParseBtn = document.getElementById('ai-parse-btn');
const micBtn = document.getElementById('mic-btn');
const waAudioUpload = document.getElementById('wa-audio-upload');
const waChatContent = document.getElementById('wa-chat-content');

// --- Navigation Logic ---
document.activeView = 'login-view';

function switchView(targetId) {
    views.forEach(view => {
        view.classList.remove('active');
    });
    
    const targetView = document.getElementById(targetId);
    if (targetView) {
        targetView.classList.add('active');
        document.activeView = targetId;
        window.scrollTo(0, 0);
    }

    // Update nav links
    document.querySelectorAll('.nav-link').forEach(link => {
        if (link.getAttribute('data-target') === targetId) {
            link.classList.add('active');
        } else {
            link.classList.remove('active');
        }
    });

    if (targetId === 'dashboard-view') {
        fetchOrders();
    }
}

// Bind navigation clicks
navItems.forEach(item => {
    item.addEventListener('click', (e) => {
        e.preventDefault();
        const target = item.getAttribute('data-target') || item.parentElement.getAttribute('data-target');
        if (target) switchView(target);
    });
});

// Extra: center FAB binding
document.querySelector('.center-fab-btn').addEventListener('click', () => {
    switchView('add-order-view');
});

// Back buttons
document.querySelectorAll('.back-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        switchView('dashboard-view');
    });
});

// --- Authentication ---
loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    showToast("Kitchen Accessed! Welcome Chef. ✨");
    setTimeout(() => {
        switchView('dashboard-view');
    }, 600);
});

function logout() {
    switchView('login-view');
    showToast("Kitchen Closed. See you soon!");
}

// --- Dashboard Logic ---
const emojis = {
    'biryani': '🍲', 'paneer': '🥘', 'roti': '🫓', 'paratha': '🥞', 'chicken': '🍗', 'dal': '🥣', 'default': '🍱'
};

function getEmoji(itemName) {
    const lowerName = itemName.toLowerCase();
    for (const key in emojis) {
        if (lowerName.includes(key)) return emojis[key];
    }
    return emojis.default;
}

function renderOrders() {
    if (!ordersList) return;
    ordersList.innerHTML = '';
    
    if (orders.length === 0) {
        ordersList.innerHTML = `
            <div style="text-align: center; padding: 3rem 0; opacity: 0.5;">
                <span class="material-symbols-outlined" style="font-size: 48px; margin-bottom: 1rem;">restaurant_menu</span>
                <p>No orders yet. They'll show up here!</p>
            </div>
        `;
        return;
    }

    orders.forEach(order => {
        const emoji = order.emoji || getEmoji(order.item);
        const statusClass = order.status.toLowerCase();
        const statusText = order.status.charAt(0).toUpperCase() + order.status.slice(1);
        
        const orderHtml = `
            <div class="order-item-card animate-fade-in">
                <div class="order-image-box">${emoji}</div>
                <div class="order-info">
                    <div class="order-header-row">
                        <h4 class="order-name">${order.qty}x ${order.item}</h4>
                        <span class="status-tag ${statusClass}">${statusText}</span>
                    </div>
                    <div class="order-meta-info">
                        <div class="meta-item">
                            <span class="material-symbols-outlined">schedule</span>
                            ${order.time}
                        </div>
                    </div>
                    <div class="order-price-val">₹${parseFloat(order.price).toFixed(2)}</div>
                </div>
            </div>
        `;
        ordersList.insertAdjacentHTML('beforeend', orderHtml);
    });
}

function updateStats() {
    const totalEl = document.getElementById('stat-total');
    const todayEl = document.getElementById('stat-today');
    
    if (totalEl) totalEl.innerText = orders.length;
    if (todayEl) {
        const todayCount = orders.filter(o => o.time.toLowerCase().includes('today')).length;
        todayEl.innerText = todayCount;
    }
}

// --- UI Helpers ---
function showToast(msg) {
    if (!toastEl) return;
    toastEl.innerText = msg;
    toastEl.classList.add('active');
    setTimeout(() => {
        toastEl.classList.remove('active');
    }, 3000);
}

// --- Add Order Logic ---
addOrderForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const item = document.getElementById('order-item').value;
    const qty = parseInt(document.getElementById('order-qty').value);
    const price = parseFloat(document.getElementById('order-price').value);
    const time = document.getElementById('order-time').value;
    const emoji = getEmoji(item);

    const submitBtn = addOrderForm.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerText;
    submitBtn.innerText = "Confirming...";
    submitBtn.disabled = true;

    try {
        const response = await fetch(`${API_BASE}/api/orders`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ item, qty, price, time, emoji })
        });

        if (response.ok) {
            const newOrder = await response.json();
            orders.unshift(newOrder);
            showToast("Order Confirmed! 🥂");
        } else {
            throw new Error("Server error");
        }
    } catch (err) {
        // Fallback for demo
        orders.unshift({ id: Date.now(), item, qty, price, time, emoji, status: 'pending' });
        showToast("Order saved locally! ✨");
    }

    submitBtn.innerText = originalText;
    submitBtn.disabled = false;
    addOrderForm.reset();
    switchView('dashboard-view');
});

// --- WhatsApp Simulation ---
function addBubble(text, type) {
    if (!waChatContent) return;
    const bubble = document.createElement('div');
    bubble.className = `msg-bubble ${type === 'user' ? 'usr' : 'sys'}`;
    bubble.innerText = text;
    waChatContent.appendChild(bubble);
    waChatContent.scrollTop = waChatContent.scrollHeight;
}

if (waAudioUpload) {
    waAudioUpload.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            addBubble(`🎤 Voice note: ${file.name}`, 'user');
            addBubble("Decoding audio via Whisper AI...", 'system');
            
            setTimeout(() => {
                aiInput.value = "2 paneer butter masala tonight 9 PM";
                aiParseBtn.click();
            }, 1500);
            
            waAudioUpload.value = '';
        }
    });
}

// AI Parse Logic
aiParseBtn.addEventListener('click', () => {
    const text = aiInput.value.trim();
    if (!text) return;

    addBubble(text, 'user');
    aiParseBtn.innerHTML = '<span class="material-symbols-outlined spinning">sync</span>';
    aiParseBtn.disabled = true;
    
    addBubble("Extracting order details...", 'system');

    setTimeout(() => {
        // Simple regex fallback for the simulation
        const qtyMatch = text.match(/\d+/);
        let qty = qtyMatch ? parseInt(qtyMatch[0]) : 1;
        let itemStr = text.toLowerCase()
            .replace(/\b\d+\b/g, '')
            .replace(/(tonight|today|tomorrow|at|pm|am|order|prepare|for|and)/g, '')
            .replace(/\s+/g, ' ')
            .trim();
        
        itemStr = itemStr.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

        document.getElementById('order-item').value = itemStr || "Special Dish";
        document.getElementById('order-qty').value = qty;
        document.getElementById('order-price').value = (qty * 150).toFixed(2);
        
        let time = "Tonight 8 PM";
        if (text.toLowerCase().includes('tomorrow')) time = "Tomorrow 1 PM";
        document.getElementById('order-time').value = time;

        aiInput.value = '';
        showToast("AI extraction complete! ✨");
        addBubble("Details populated below. Ready to confirm?", 'system');
        
        aiParseBtn.innerHTML = '<span class="material-symbols-outlined">send</span>';
        aiParseBtn.disabled = false;
    }, 1200);
});

// Mic binding
if (micBtn) {
    micBtn.addEventListener('click', () => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (SpeechRecognition) {
            const recognition = new SpeechRecognition();
            recognition.lang = 'en-IN';
            micBtn.classList.add('listening');
            aiInput.placeholder = "Listening to your voice...";
            
            recognition.onresult = (e) => {
                const text = e.results[0][0].transcript;
                aiInput.value = text;
                showToast("Voice captured! 🎙️");
                setTimeout(() => aiParseBtn.click(), 500);
            };
            
            recognition.onend = () => {
                micBtn.classList.remove('listening');
                aiInput.placeholder = "Type message...";
            };
            
            recognition.start();
        } else {
            showToast("Voice recognition not supported here.");
        }
    });
}

// --- App Initialization & Splash ---
window.addEventListener('DOMContentLoaded', () => {
    // Show splash for 2 seconds, then go to login
    setTimeout(() => {
        const splash = document.getElementById('splash-view');
        if (splash) {
            splash.style.opacity = '0';
            splash.style.transition = 'opacity 0.5s ease';
            setTimeout(() => {
                splash.classList.remove('active');
                splash.style.display = 'none';
                switchView('login-view');
            }, 500);
        } else {
            switchView('login-view');
        }
    }, 2000);
});

// Start fetching data in background
fetchOrders();
