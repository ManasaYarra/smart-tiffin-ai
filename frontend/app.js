// --- Config: detect if running on localhost or production ---
const API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:3000'
    : ''; // On Render, API calls are on the same domain

// --- Order Data state ---
let orders = [
    { id: 1, item: "Paneer Butter Masala", qty: 2, price: 250.00, time: "Today 7 PM", status: "pending", emoji: "🥘" },
    { id: 2, item: "Chicken Biryani", qty: 3, price: 350.00, time: "Today 8 PM", status: "preparing", emoji: "🍲" }
];

// Fetch orders from backend server
async function fetchOrders() {
    try {
        const response = await fetch(`${API_BASE}/api/orders`);
        if (response.ok) {
            orders = await response.json();
        }
    } catch (err) {
        console.log("Backend offline. Using local layout mode.");
    }
    renderOrders();
    updateStats();
}

// Poll backend every 5 seconds for new WhatsApp orders
setInterval(() => {
    if (document.getElementById('dashboard-view').classList.contains('active')) {
        fetchOrders();
    }
}, 5000);

// Emojis mapping for fun UI
const emojis = {
    'biryani': '🍲',
    'paneer': '🥘',
    'roti': '🫓',
    'paratha': '🥞',
    'chicken': '🍗',
    'default': '🍱'
};

// --- DOM Elements ---
const views = document.querySelectorAll('.view');
const navItems = document.querySelectorAll('[data-target]');
const loginForm = document.getElementById('login-form');
const addOrderForm = document.getElementById('add-order-form');
const ordersList = document.getElementById('orders-list');
const toast = document.getElementById('toast');

const aiInput = document.getElementById('ai-input');
const aiParseBtn = document.getElementById('ai-parse-btn');
const micBtn = document.getElementById('mic-btn');
const waAudioUpload = document.getElementById('wa-audio-upload');
const waChatContent = document.getElementById('wa-chat-content');

// --- Navigation Logic ---
function switchView(targetId) {
    views.forEach(view => {
        view.classList.remove('active');
    });
    document.getElementById(targetId).classList.add('active');
    window.scrollTo(0, 0);

    navItems.forEach(item => {
        if(item.classList.contains('nav-item') && !item.classList.contains('fab-space')) {
            if(item.getAttribute('data-target') === targetId) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
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
        const target = item.getAttribute('data-target');
        switchView(target);
    });
});

// --- Authentication ---
loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    showToast("Login successful! Welcome Chef.");
    setTimeout(() => {
        switchView('dashboard-view');
    }, 500);
});

function logout() {
    switchView('login-view');
    showToast("Logged out successfully.");
}

// --- Dashboard Logic ---
function getEmoji(itemName) {
    const lowerName = itemName.toLowerCase();
    for (const key in emojis) {
        if (lowerName.includes(key)) return emojis[key];
    }
    return emojis.default;
}

function renderOrders() {
    ordersList.innerHTML = '';
    orders.forEach(order => {
        let statusClass = "status-" + order.status.toLowerCase();
        let statusText = order.status.charAt(0).toUpperCase() + order.status.slice(1);
        
        const orderHtml = `
            <div class="order-card">
                <div class="order-emoji">${order.emoji || getEmoji(order.item)}</div>
                <div class="order-details">
                    <div class="order-title-row">
                        <h4>${order.qty}x ${order.item}</h4>
                        <span class="status-badge ${statusClass}">${statusText}</span>
                    </div>
                    <div class="order-meta">
                        <span class="material-symbols-outlined" style="font-size: 14px;">schedule</span>
                        ${order.time}
                    </div>
                </div>
                <div class="order-price">₹${order.price.toFixed(2)}</div>
            </div>
        `;
        ordersList.insertAdjacentHTML('beforeend', orderHtml);
    });
}

function updateStats() {
    const totalOrdersCount = orders.length;
    const todayOrdersCount = orders.filter(o => o.time.toLowerCase().includes('today')).length;
    
    const statCards = document.querySelectorAll('.stat-info h3');
    if(statCards.length >= 2) {
        statCards[0].innerText = totalOrdersCount;
        statCards[1].innerText = todayOrdersCount;
    }
}

// --- UI Helpers ---
function showToast(msg) {
    toast.innerText = msg;
    toast.classList.add('show');
    setTimeout(() => {
        toast.classList.remove('show');
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

    try {
        const response = await fetch(`${API_BASE}/api/orders`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ item, qty, price, time, emoji })
        });

        if (response.ok) {
            const newOrder = await response.json();
            orders.unshift(newOrder);
        } else {
            // Fallback: add locally if server unreachable
            orders.unshift({ id: Date.now(), item, qty, price, time, emoji, status: 'pending' });
        }
    } catch (err) {
        // Offline fallback
        orders.unshift({ id: Date.now(), item, qty, price, time, emoji, status: 'pending' });
    }

    addOrderForm.reset();
    showToast("Order added successfully!");
    switchView('dashboard-view');
});

// --- WhatsApp Simulation ---
function addBubble(text, type) {
    if (!waChatContent) return;
    const bubble = document.createElement('div');
    bubble.className = `wa-bubble ${type}`;
    bubble.innerText = text;
    waChatContent.appendChild(bubble);
    waChatContent.scrollTop = waChatContent.scrollHeight;
}

if (waAudioUpload) {
    waAudioUpload.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            addBubble(`🎤 Voice note uploaded: ${file.name}`, 'user');
            addBubble("Listening and processing audio...", 'system');
            
            setTimeout(() => {
                aiInput.value = "2 chicken curry tomorrow 8 PM";
                aiParseBtn.click();
            }, 1500);
            
            waAudioUpload.value = '';
        }
    });
}

// --- AI Mock Parser Logic ---
aiParseBtn.addEventListener('click', () => {
    const text = aiInput.value.toLowerCase().trim();
    if (!text) {
        showToast("Please type something first!");
        return;
    }

    addBubble(text, 'user');
    
    aiParseBtn.innerHTML = '<span class="material-symbols-outlined spinning" style="animation: spin 1s linear infinite;">sync</span>';
    aiParseBtn.disabled = true;
    addBubble("Extracting details...", 'system');

    setTimeout(() => {
        const qtyMatch = text.match(/\d+/);
        let qty = qtyMatch ? parseInt(qtyMatch[0]) : 1;

        let time = "Today 8 PM";
        const timeRegex = /(tomorrow|tonight|today|[\d]+ (am|pm))/g;
        const timeMatches = text.match(timeRegex);
        if (timeMatches) {
            let timeParts = [...new Set(timeMatches)].join(" ");
            time = timeParts.replace(/\b\w/g, l => l.toUpperCase());
        }

        let itemStr = text
            .replace(/\b\d+\b/g, '')
            .replace(/(tomorrow|tonight|today|am|pm|pm|for|i|need|want|please|order)/g, '')
            .replace(/\s{2,}/g, ' ')
            .trim();
        
        if (itemStr) {
            itemStr = itemStr.charAt(0).toUpperCase() + itemStr.slice(1);
        } else {
            itemStr = "Unknown Item";
        }

        let price = 100.00;
        if(itemStr.toLowerCase().includes('biryani')) price = 350.00;
        if(itemStr.toLowerCase().includes('chicken')) price = 250.00;

        document.getElementById('order-item').value = itemStr;
        document.getElementById('order-qty').value = qty;
        document.getElementById('order-price').value = price.toFixed(2);
        document.getElementById('order-time').value = time;

        aiInput.value = '';
        showToast("✨ Details extracted from text!");
        addBubble("Done! I've populated the form below.", 'system');
        
        aiParseBtn.innerHTML = '<span class="material-symbols-outlined">send</span>';
        aiParseBtn.disabled = false;

        addOrderForm.style.transform = 'scale(1.02)';
        addOrderForm.style.transition = 'transform 0.3s ease';
        setTimeout(() => addOrderForm.style.transform = 'scale(1)', 300);

    }, 800);
});

// Inline animation for spinner
const style = document.createElement('style');
style.innerHTML = `@keyframes spin { 100% { transform: rotate(360deg); } }`;
document.head.appendChild(style);

// --- Speech Recognition Logic ---
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
if (SpeechRecognition) {
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    micBtn.addEventListener('click', () => {
        micBtn.classList.add('listening');
        aiInput.placeholder = "Listening...";
        recognition.start();
    });

    recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        aiInput.value = transcript;
        showToast("Voice captured! Parsing...");
        setTimeout(() => {
            aiParseBtn.click();
        }, 400);
    };

    recognition.onspeechend = () => {
        recognition.stop();
    };

    recognition.onend = () => {
        micBtn.classList.remove('listening');
        aiInput.placeholder = 'e.g. "2 biryani tomorrow 1 PM"';
    };

    recognition.onerror = (event) => {
        micBtn.classList.remove('listening');
        aiInput.placeholder = 'e.g. "2 biryani tomorrow 1 PM"';
        showToast("Microphone error or not allowed. Please check permissions.");
    };
} else {
    micBtn.addEventListener('click', () => {
        showToast("Voice recognition not supported in this browser.");
    });
}
