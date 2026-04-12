require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { MessagingResponse } = require('twilio').twiml;
const { OpenAI } = require('openai');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { initDB, getOrders, addOrder } = require('./database');

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.static(path.join(__dirname)));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

initDB();

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

// Emojis mapping
const emojis = {
    'biryani': '🍲', 'paneer': '🥘', 'roti': '🫓', 'paratha': '🥞', 'chicken': '🍗', 'default': '🍱'
};

function getEmoji(itemName) {
    const lowerName = itemName.toLowerCase();
    for (const key in emojis) {
        if (lowerName.includes(key)) return emojis[key];
    }
    return emojis.default;
}

// ------------------------------
// API: Frontend Orders
// ------------------------------
app.get('/api/orders', (req, res) => {
    res.json(getOrders());
});

// ------------------------------
// OpenAI Helper: Parse Order Text
// ------------------------------
async function extractOrderDetails(text) {
    try {
        const response = await openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: [
                {
                    role: "system",
                    content: "Extract the food order details from the text. Return ONLY a valid JSON object with strictly these keys: 'item' (string), 'qty' (number), 'time' (string), 'price' (number). If a price isn't specified, estimate a realistic INR price (e.g., 200). If time is unspecified, default to 'Today 8 PM'."
                },
                {
                    role: "user",
                    content: text
                }
            ],
            temperature: 0.1
        });
        
        const content = response.choices[0].message.content;
        return JSON.parse(content);
    } catch (err) {
        console.error("OpenAI Parse Error:", err);
        return null; // fallback
    }
}

// ------------------------------
// Twilio Helper: Download Media
// ------------------------------
async function downloadMedia(mediaUrl) {
    // Twilio media files require auth using Account SID and Auth Token
    const authHeaders = {
        Authorization: 'Basic ' + Buffer.from(`${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`).toString('base64')
    };

    const response = await axios({
        method: 'get',
        url: mediaUrl,
        responseType: 'stream',
        headers: authHeaders
    });

    const tempFilePath = path.join(__dirname, `temp_audio_${Date.now()}.ogg`);
    return new Promise((resolve, reject) => {
        const writer = fs.createWriteStream(tempFilePath);
        response.data.pipe(writer);
        let error = null;
        writer.on('error', err => {
            error = err;
            writer.close();
            reject(err);
        });
        writer.on('close', () => {
            if (!error) resolve(tempFilePath);
        });
    });
}

// ------------------------------
// API: Twilio WhatsApp Webhook
// ------------------------------
app.post('/webhook', async (req, res) => {
    const twiml = new MessagingResponse();
    const incomingText = req.body.Body || '';
    const numMedia = parseInt(req.body.NumMedia || '0');
    let textToProcess = incomingText;

    console.log(`Received incoming webhook: Text: "${incomingText}", Media count: ${numMedia}`);

    try {
        // If Voice Note (Media) is attached
        if (numMedia > 0) {
            const mediaUrl = req.body.MediaUrl0;
            const contentType = req.body.MediaContentType0;

            console.log(`Downloading audio from: ${mediaUrl} (${contentType})`);
            const audioPath = await downloadMedia(mediaUrl);

            console.log("Transcribing audio via Whisper...");
            const transcriptRes = await openai.audio.transcriptions.create({
                file: fs.createReadStream(audioPath),
                model: "whisper-1",
            });
            textToProcess = transcriptRes.text;
            console.log("Transcribed Audio:", textToProcess);
            
            // Clean up temp file
            fs.unlinkSync(audioPath);
        }

        // Parse order text using GPT
        console.log("Parsing text via ChatGPT:", textToProcess);
        if(!textToProcess) {
            twiml.message(`Didn't catch that context. Please send a valid order format.`);
            return res.type('text/xml').send(twiml.toString());
        }

        const orderData = await extractOrderDetails(textToProcess);

        if (orderData && orderData.item) {
            // Save to DB
            orderData.emoji = getEmoji(orderData.item);
            addOrder(orderData);
            
            console.log("Order saved:", orderData);
            // Reply back to WhatsApp
            twiml.message(`✅ Got it! Added ${orderData.qty}x ${orderData.item} to your orders for ${orderData.time}. Total: ₹${orderData.price}.`);
        } else {
            twiml.message(`Sorry, I couldn't automatically parse an order from that text. Please format like: "2 biryani tomorrow 1 PM".`);
        }

    } catch (err) {
        console.error("Webhook processing error:", err);
        twiml.message("Experiencing technical difficulties with the AI service. Please try again later.");
    }

    res.type('text/xml').send(twiml.toString());
});

if (process.env.NODE_ENV !== 'production' || process.env.LOCAL_SERVER === 'true') {
    app.listen(port, () => {
        console.log(`Server running at http://localhost:${port}`);
        console.log(`Make sure to expose this port via ngrok and configure your webhook to http://YOUR_NGROK_URL/webhook`);
    });
}
module.exports = app;
