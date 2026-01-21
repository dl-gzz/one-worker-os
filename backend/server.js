// 简单的 Express 后端服务器
// 用于处理数据库查询请求

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg'); // PostgreSQL
// const mysql = require('mysql2/promise'); // MySQL
// const { MongoClient } = require('mongodb'); // MongoDB

const app = express();
const PORT = 3008;

// 中间件
app.use(cors());
app.use(express.json());

// 数据库连接池（示例：PostgreSQL）
const pools = {};

// 获取或创建数据库连接
function getPool(config) {
    const key = `${config.host}:${config.port}:${config.dbname}`;

    if (!pools[key]) {
        pools[key] = new Pool({
            host: config.host,
            port: config.port,
            database: config.dbname,
            user: config.username,
            password: config.password,
            max: 10, // 最大连接数
            idleTimeoutMillis: 30000
        });
    }

    return pools[key];
}

// API 路由：执行数据库查询
app.post('/api/database/query', async (req, res) => {
    try {
        const { database, host, port, dbname, username, password, query } = req.body;

        // 验证输入
        if (!query || !dbname) {
            return res.status(400).json({
                error: 'Missing required fields: query, dbname'
            });
        }

        // 安全检查：防止危险操作
        const dangerousKeywords = ['DROP', 'DELETE', 'TRUNCATE', 'ALTER'];
        const upperQuery = query.toUpperCase();

        for (const keyword of dangerousKeywords) {
            if (upperQuery.includes(keyword)) {
                return res.status(403).json({
                    error: `Dangerous operation detected: ${keyword} is not allowed`
                });
            }
        }

        // 执行查询
        const pool = getPool({ host, port, dbname, username, password });
        const result = await pool.query(query);

        res.json({
            success: true,
            results: result.rows,
            rowCount: result.rowCount,
            fields: result.fields?.map(f => f.name) || []
        });

    } catch (error) {
        console.error('Database query error:', error);
        res.status(500).json({
            error: error.message,
            code: error.code
        });
    }
});

// API 路由：测试数据库连接
app.post('/api/database/test', async (req, res) => {
    try {
        const { host, port, dbname, username, password } = req.body;

        const pool = getPool({ host, port, dbname, username, password });
        await pool.query('SELECT 1');

        res.json({
            success: true,
            message: 'Connection successful'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// API 路由：获取表列表
app.post('/api/database/tables', async (req, res) => {
    try {
        const { host, port, dbname, username, password } = req.body;

        const pool = getPool({ host, port, dbname, username, password });
        const result = await pool.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
            ORDER BY table_name
        `);

        res.json({
            success: true,
            tables: result.rows.map(row => row.table_name)
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// 健康检查
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// OpenCode Proxy Configuration
const OPENCODE_URL = 'http://127.0.0.1:4096';

// Proxy: Create Session
app.post('/api/opencode/session', async (req, res) => {
    try {
        console.log('🔌 Proxying Create Session to OpenCode...');
        const response = await fetch(`${OPENCODE_URL}/session`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(req.body)
        });

        if (!response.ok) {
            throw new Error(`OpenCode Error: ${await response.text()}`);
        }

        const data = await response.json();
        res.json(data);
    } catch (error) {
        console.error('OpenCode Session Proxy Error:', error.message);
        res.status(502).json({ error: 'Failed to connect to OpenCode service' });
    }
});

// Proxy: Send Message
app.post('/api/opencode/session/:id/message', async (req, res) => {
    try {
        const { id } = req.params;
        console.log(`🔌 Proxying Message to OpenCode Session ${id}...`);

        const response = await fetch(`${OPENCODE_URL}/session/${id}/message`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(req.body)
        });

        if (!response.ok) {
            throw new Error(`OpenCode Error: ${await response.text()}`);
        }

        const data = await response.json();
        res.json(data);
    } catch (error) {
        console.error('OpenCode Message Proxy Error:', error.message);
        res.status(502).json({ error: 'Failed to communicate with OpenCode service' });
    }
});

// Serve AI Instructions
const fs = require('fs');
const path = require('path');

app.get('/instructions', (req, res) => {
    try {
        const filePath = path.join(__dirname, '../AI_INSTRUCTIONS.md');
        if (fs.existsSync(filePath)) {
            const content = fs.readFileSync(filePath, 'utf8');
            res.json({ content });
        } else {
            console.error('AI_INSTRUCTIONS.md not found at:', filePath);
            res.status(404).json({ error: 'Instructions file not found' });
        }
    } catch (error) {
        console.error('Error reading instructions:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// 🗑️ DELETE SHAPE COMPONENT
app.post('/api/shapes/delete', (req, res) => {
    try {
        const { shapeType } = req.body;
        if (!shapeType) {
            return res.status(400).json({ error: 'Missing shapeType' });
        }

        const projectRoot = path.join(__dirname, '..');
        const shapeDir = path.join(projectRoot, 'src/components/shapes');
        const registryPath = path.join(shapeDir, 'registry.js');

        // 1. 查找并删除 .jsx 文件
        const files = fs.readdirSync(shapeDir);
        const targetFile = files.find(f => {
            const content = fs.readFileSync(path.join(shapeDir, f), 'utf8');
            return content.includes(`static type = '${shapeType}'`);
        });

        if (targetFile && targetFile.endsWith('.jsx')) {
            const filePath = path.join(shapeDir, targetFile);
            fs.unlinkSync(filePath);
            console.log(`🗑️ Deleted file: ${targetFile}`);
        }

        // 2. 更新 registry.js
        let registryContent = fs.readFileSync(registryPath, 'utf8');

        // 移除 import 语句（匹配任何包含该文件名的 import）
        if (targetFile) {
            const importPattern = new RegExp(`import.*from\\s+['"]\\.\\/${targetFile.replace('.jsx', '')}['"];?\\n`, 'g');
            registryContent = registryContent.replace(importPattern, '');
        }

        // 移除数组中的注册项（通过匹配 ShapeUtil 类名）
        const utilClassName = targetFile ? targetFile.replace('.jsx', 'Util') : null;
        if (utilClassName) {
            const arrayPattern = new RegExp(`\\s*${utilClassName},?\\n`, 'g');
            registryContent = registryContent.replace(arrayPattern, '');
        }

        fs.writeFileSync(registryPath, registryContent, 'utf8');
        console.log(`📝 Updated registry.js`);

        res.json({ success: true, message: `Deleted ${shapeType}`, file: targetFile });

    } catch (error) {
        console.error('Delete shape error:', error);
        res.status(500).json({ error: error.message });
    }
});

// 💬 QUOTE API - 随机名言
app.get('/api/quote', async (req, res) => {
    try {
        console.log('📖 Fetching random quote...');

        // 调用 Quotable API（免费，无需 API Key）
        const response = await fetch('https://dummyjson.com/quotes/random');

        if (!response.ok) {
            throw new Error(`Quotable API returned ${response.status}`);
        }

        const data = await response.json();

        // 返回格式化的数据
        res.json({
            content: data.quote,
            author: data.author,
            tags: data.tags,
            length: data.length
        });

        console.log(`✅ Quote fetched: "${data.quote.substring(0, 50)}..." - ${data.author}`);

    } catch (error) {
        console.error('❌ Quote API Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// 📈 STOCK API - 股票行情（演示如何添加需要外部服务的 API）
app.get('/api/stock/:symbol', async (req, res) => {
    try {
        const { symbol } = req.params;
        const { range = '1d', interval = '1d' } = req.query;

        console.log(`📊 Fetching stock data for ${symbol}...`);

        // 调用 Yahoo Finance API（免费，无需 API Key）
        const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?range=${range}&interval=${interval}`;

        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`Yahoo Finance API returned ${response.status}`);
        }

        const data = await response.json();

        if (data.chart && data.chart.result && data.chart.result.length > 0) {
            const result = data.chart.result[0];
            const meta = result.meta;

            // 提取关键数据
            const stockData = {
                symbol: meta.symbol,
                price: meta.regularMarketPrice,
                currency: meta.currency,
                previousClose: meta.previousClose,
                change: meta.regularMarketPrice - meta.previousClose,
                changePercent: ((meta.regularMarketPrice - meta.previousClose) / meta.previousClose * 100).toFixed(2),
                high: meta.regularMarketDayHigh,
                low: meta.regularMarketDayLow,
                volume: meta.regularMarketVolume,
            };

            console.log(`✅ Stock data fetched: ${symbol} = $${stockData.price}`);
            res.json(stockData);
        } else {
            res.status(404).json({ error: 'Stock not found' });
        }
    } catch (error) {
        console.error('❌ Stock API Error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// 📰 WECHAT ARTICLE API - 微信公众号文章解析
app.post('/api/wechat/article', async (req, res) => {
    try {
        const { url } = req.body;

        // 验证参数
        if (!url) {
            return res.status(400).json({ error: 'Missing required parameter: url' });
        }

        console.log(`📰 Parsing WeChat article: ${url.substring(0, 50)}...`);

        // 从环境变量读取 API Key
        const API_KEY = process.env.DAJIALA_API_KEY;

        if (!API_KEY) {
            console.warn('⚠️ DAJIALA_API_KEY not configured in backend/.env');
            return res.status(500).json({
                error: 'API Key not configured',
                message: 'Please add DAJIALA_API_KEY to backend/.env'
            });
        }

        // 调用 dajiala API
        const response = await fetch('https://www.dajiala.com/fbmain/monitor/v3/article_detail', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                url: url,
                key: API_KEY,
                verifycode: ""
            })
        });

        if (!response.ok) {
            throw new Error(`Dajiala API returned ${response.status}`);
        }

        const data = await response.json();

        console.log(`✅ Article parsed successfully`);

        // 返回解析结果
        res.json(data);

    } catch (error) {
        console.error('❌ WeChat Article API Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// 启动服务器
app.listen(PORT, () => {
    console.log(`🚀 Backend server running on http://localhost:${PORT}`);
    console.log(`📊 Database API endpoints:`);
    console.log(`   POST /api/database/query - Execute SQL query`);
    console.log(`   POST /api/database/test - Test connection`);
    console.log(`   POST /api/database/tables - List tables`);
});

// 优雅关闭
process.on('SIGTERM', async () => {
    console.log('SIGTERM received, closing database connections...');
    for (const pool of Object.values(pools)) {
        await pool.end();
    }
    process.exit(0);
});

// 测试自动重启
app.get('/api/test-auto-restart', (req, res) => {
    res.json({ message: 'Auto restart works!' });
});
