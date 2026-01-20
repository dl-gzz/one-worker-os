const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

// (Reverted) No Chat Endpoint
// The AI communicates directly with OpenCode (Port 4096), sends JSON to frontend,
// and frontend calls /create-shape-file here.

// -----------------------------------------------------------------------------
// Endpoint: Get AI Instructions (The Constitution)
// -----------------------------------------------------------------------------
app.get('/instructions', (req, res) => {
    // ... existing code ...
    const instructionsPath = path.join(__dirname, '../AI_INSTRUCTIONS.md');
    if (fs.existsSync(instructionsPath)) {
        res.json({ content: fs.readFileSync(instructionsPath, 'utf-8') });
    } else {
        res.status(404).json({ error: 'Instructions file not found' });
    }
});

// -----------------------------------------------------------------------------
// PROXY: Forward requests to OpenCode (4096) using System CURL (Nuclear Option)
// This bypasses Node.js fetch idiosyncrasies
const { exec } = require('child_process');

// Helper to run curl
function runCurlProxy(url, body) {
    return new Promise((resolve, reject) => {
        // Construct curl command
        // Safe because body is JSON stringified by us locally
        const jsonBody = JSON.stringify(body).replace(/'/g, "'\\''");
        const cmd = `curl -s -X POST "${url}" -H "Content-Type: application/json" -d '${jsonBody}'`;

        console.log(`Command: ${cmd.substring(0, 100)}...`);

        exec(cmd, { maxBuffer: 1024 * 1024 * 10 }, (error, stdout, stderr) => {
            if (error) {
                console.error('Curl Exec Error:', error);
                return reject(error);
            }
            try {
                // Try to parse JSON output
                const json = JSON.parse(stdout);
                resolve(json);
            } catch (e) {
                console.error('JSON Parse Error:', e, stdout);
                reject(new Error('Invalid JSON from upstream'));
            }
        });
    });
}

const OPENCODE_BASE = 'http://127.0.0.1:4096';

// Proxy Create Session
app.post('/proxy/session', async (req, res) => {
    try {
        console.log('🔄 Curl Proxying Session Create...');
        const data = await runCurlProxy(`${OPENCODE_BASE}/session`, req.body);
        res.json(data);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Proxy Send Message
// Proxy Send Message
app.post('/proxy/session/:id/message', async (req, res) => {
    try {
        console.log(`🔄 Curl Proxying Message to ${req.params.id}...`);
        const data = await runCurlProxy(`${OPENCODE_BASE}/session/${req.params.id}/message`, req.body);
        res.json(data);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Target directory for generated shapes
const SHAPES_DIR = path.join(__dirname, '../src/components/shapes');
const REGISTRY_FILE = path.join(SHAPES_DIR, 'registry.js');

// Ensure directory exists
if (!fs.existsSync(SHAPES_DIR)) {
    console.error(`❌ Shapes directory not found: ${SHAPES_DIR}`);
    process.exit(1);
}

// -----------------------------------------------------------------------------
// Endpoint: Create New Source File Shape
// -----------------------------------------------------------------------------
app.post('/create-shape-file', (req, res) => {
    const { shapeName, code } = req.body;

    if (!shapeName || !code) {
        return res.status(400).json({ error: 'Missing shapeName or code' });
    }

    // Security: Sanitize shapeName to be alphanumeric only
    const safeName = shapeName.replace(/[^a-zA-Z0-9]/g, '');
    const fileName = `${safeName}Shape.jsx`; // e.g. StockTickerShape.jsx
    const filePath = path.join(SHAPES_DIR, fileName);

    console.log(`🔨 Request received for: ${shapeName}`);

    // SIMPLE WRITE, NO REGEX MAGIC FOR NOW
    const content = code;

    try {
        // 1. Write the Component File
        console.log(`   📂 Writing to: ${filePath}`);
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`   ✅ File written successfully!`);

        // 2. Update Registry
        let registryContent = fs.readFileSync(REGISTRY_FILE, 'utf8');

        // Helper to check if already imported
        if (!registryContent.includes(fileName)) {
            console.log(`📝 Registering ${safeName} in registry.js...`);

            // Add Import at top
            const importStatement = `import { ${safeName}ShapeUtil } from './${safeName}Shape';\n`;
            registryContent = importStatement + registryContent;

            // Add to Array (Look for the AI_INSERT_POINT marker or end of array)
            const insertMarker = '// AI_INSERT_POINT';
            if (registryContent.includes(insertMarker)) {
                registryContent = registryContent.replace(
                    insertMarker,
                    `${safeName}ShapeUtil,\n    ${insertMarker}`
                );
            } else {
                // Fallback: simple replace of closing bracket
                // registryContent = registryContent.replace('];', `    ${safeName}ShapeUtil,\n];`);
                console.warn("⚠️ Could not find AI_INSERT_POINT in registry.js");
            }

            fs.writeFileSync(REGISTRY_FILE, registryContent, 'utf8');
        }

        console.log(`✅ Shape ${safeName} created and registered successfully.`);
        res.json({ success: true, message: `Shape ${safeName} created. Vite HMR should trigger update.` });

    } catch (e) {
        console.error("❌ Error creating shape:", e);
        res.status(500).json({ error: e.message });
    }
});

app.listen(PORT, () => {
    console.log(`
🚀 Shape Factory Server running on http://localhost:${PORT}
📂 Target Directory: ${SHAPES_DIR}
-------------------------------------------------------
Ready to accept 'createSourceComponent' requests from AI.
    `);
});
