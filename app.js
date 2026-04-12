// --- Order Data state ---
let orders = [
    { id: 1, item: "Paneer Butter Masala", qty: 2, price: 250.00, time: "Today 7 PM", status: "pending", emoji: "🥘" },
    { id: 2, item: "Chicken Biryani", qty: 3, price: 350.00, time: "Today 8 PM", status: "preparing", emoji: "🍲" }
];

// Fetch generic orders from our new backend server
async function fetchOrders() {
    try {
        const response = await fetch('http://localhost:3000/api/orders');
        if (response.ok) {
            orders = await response.json();
        }
    } catch (err) {
        console.log("Backend offline. Using local layout mode.");
    }
    // Always render so optimistic/local updates stay visible!
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

    // Update bottom nav active state if it's a main nav item
    navItems.forEach(item => {
        if(item.classList.contains('nav-item') && !item.classList.contains('fab-space')) {
            if(item.getAttribute('data-target') === targetId) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        }
    });

    // Initial fetch on navigation
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
    const totalOrdersCount = orders.length; // Count of all orders
    
    // Simple naive today filter based on our mock data string containing "Today"
    const todayOrdersCount = orders.filter(o => o.time.toLowerCase().includes('today')).length;
    
    // Update the DOM elements
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
addOrderForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const item = document.getElementById('order-item').value;
    const qty = parseInt(document.getElementById('order-qty').value);
    const price = parseFloat(document.getElementById('order-price').value);
    const time = document.getElementById('order-time').value;

    const newOrder = {
        item,
        qty,
        price,
        time,
        status: "pending",
        emoji: getEmoji(item)
    };

    // Normally we would POST this to our backend. 
    // To keep the demo fast, we optimistically push it and let the poll sync later.
    orders.unshift({ id: Date.now(), ...newOrder });

    addOrderForm.reset();
    showToast("Order added successfully!");
    switchView('dashboard-view');
});

// --- WhatsApp Simulation Additions ---
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
            
            // Mock processing
            setTimeout(() => {
                aiInput.value = "2 chicken curry tomorrow 8 PM"; // hardcoded mock for audio demo
                aiParseBtn.click();
            }, 1500);
            
            // Reset input so they can upload same file again
            waAudioUpload.value = '';
        }
    });
}

// --- AI Mock Parser Logic ---
// We will fake a simple natural language extraction for demonstration purposes.
aiParseBtn.addEventListener('click', () => {
    const text = aiInput.value.toLowerCase().trim();
    if (!text) {
        showToast("Please type something first!");
        return;
    }

    addBubble(text, 'user');
    
    // Add a little delay to simulate "AI processing"
    aiParseBtn.innerHTML = '<span class="material-symbols-outlined spinning" style="animation: spin 1s linear infinite;">sync</span>';
    aiParseBtn.disabled = true;
    addBubble("Extracting details...", 'system');

    // Example inputs: 
    // "2 biryani tomorrow 1 PM"
    // "I need 5 chicken curry for tonight"

    setTimeout(() => {
        // Find quantity (first number in string)
        const qtyMatch = text.match(/\d+/);
        let qty = qtyMatch ? parseInt(qtyMatch[0]) : 1;

        // Find time (keywords: tomorrow, tonight, today, pm, am)
        let time = "Today 8 PM"; // default fallback
        const timeRegex = /(tomorrow|tonight|today|[\d]+ (am|pm))/g;
        const timeMatches = text.match(timeRegex);
        if (timeMatches) {
            // Uniquely gather the time parts
            let timeParts = [...new Set(timeMatches)].join(" ");
            // capitalize each word
            time = timeParts.replace(/\b\w/g, l => l.toUpperCase());
        }

        // Extremely rough item extraction by eliminating known generic words
        let itemStr = text
            .replace(/\b\d+\b/g, '') // remove numbers
            .replace(/(tomorrow|tonight|today|am|pm|pm|for|i|need|want|please|order)/g, '')
            .replace(/\s{2,}/g, ' ')
            .trim();
        
        // Uppercase first letter
        if (itemStr) {
            itemStr = itemStr.charAt(0).toUpperCase() + itemStr.slice(1);
        } else {
            itemStr = "Unknown Item";
        }

        // Mock price based on random guess for demo
        let price = 100.00;
        if(itemStr.toLowerCase().includes('biryani')) price = 350.00;
        if(itemStr.toLowerCase().includes('chicken')) price = 250.00;

        // Auto-fill the form
        document.getElementById('order-item').value = itemStr;
        document.getElementById('order-qty').value = qty;
        document.getElementById('order-price').value = price.toFixed(2);
        document.getElementById('order-time').value = time;

        aiInput.value = '';
        showToast("✨ Details extracted from text!");
        addBubble("Done! I've populated the form below.", 'system');
        
        // Reset button
        aiParseBtn.innerHTML = '<span class="material-symbols-outlined">send</span>';
        aiParseBtn.disabled = false;

        // Animate the form gently to draw attention
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
