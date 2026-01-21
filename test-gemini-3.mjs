// Test Gemini 3 Pro Preview API
import * as dotenv from 'dotenv';
import * as fs from 'fs';

// Load .env
const envConfig = dotenv.parse(fs.readFileSync('.env'));
const API_KEY = envConfig.VITE_GEMINI_API_KEY;

console.log('🔑 Testing Gemini 3 Pro Preview API...');
console.log('API Key:', API_KEY ? `${API_KEY.substring(0, 10)}...` : 'NOT FOUND');

const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-preview:generateContent?key=${API_KEY}`;

const testPrompt = "你好！请用中文回复一句简单的问候，并用JSON格式返回：{\"message\": \"你的问候语\"}";

try {
    const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            contents: [{
                parts: [{ text: testPrompt }]
            }]
        })
    });

    console.log('📡 Response Status:', response.status, response.statusText);

    const data = await response.json();

    if (response.ok) {
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
        console.log('✅ Gemini 3 Pro Preview API Call Successful!');
        console.log('📨 Response:', text);
    } else {
        console.log('❌ API Error:');
        console.log(JSON.stringify(data, null, 2));
    }
} catch (error) {
    console.error('❌ Test Failed:', error.message);
}
