const fs = require('fs');
const https = require('https');
const path = require('path');

// 1. Read .env manualy
const envPath = path.join(__dirname, '.env');
let apiKey = '';

try {
    const envContent = fs.readFileSync(envPath, 'utf8');
    const match = envContent.match(/VITE_GEMINI_API_KEY=(.+)/);
    if (match && match[1]) {
        apiKey = match[1].trim();
    }
} catch (e) {
    console.error("❌ Could not read .env file:", e.message);
    process.exit(1);
}

if (!apiKey) {
    console.error("❌ VITE_GEMINI_API_KEY not found in .env file.");
    process.exit(1);
}

console.log(`🔑 Key found: ${apiKey.substring(0, 5)}...${apiKey.substring(apiKey.length - 4)} (Length: ${apiKey.length})`);
console.log("📡 Sending test request to Gemini API...");

// 2. Make Request
const data = JSON.stringify({
    contents: [{ parts: [{ text: "Hello" }] }]
});

const options = {
    hostname: 'generativelanguage.googleapis.com',
    path: `/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`,
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
    }
};

const req = https.request(options, (res) => {
    let body = '';
    res.on('data', (chunk) => body += chunk);
    res.on('end', () => {
        if (res.statusCode === 200) {
            console.log("✅ API Test SUCCESS! Status: 200");
            try {
                const json = JSON.parse(body);
                if (json.candidates && json.candidates[0].content) {
                    console.log("💬 Response:", json.candidates[0].content.parts[0].text.trim());
                } else {
                    console.log("⚠️ Response valid but unexpected format:", body.substring(0, 100));
                }
            } catch (e) {
                console.log("⚠️ Response valid but not JSON.");
            }
        } else {
            console.error(`❌ API Test FAILED. Status: ${res.statusCode}`);
            console.error("Error Body:", body);
        }
    });
});

req.on('error', (e) => {
    console.error("❌ Network Error:", e.message);
});

req.write(data);
req.end();
