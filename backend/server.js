// 简单的 Express 后端服务器
// 用于处理数据库查询请求

const express = require('express');
const cors = require('cors');
const { Pool } = require('pg'); // PostgreSQL
// const mysql = require('mysql2/promise'); // MySQL
// const { MongoClient } = require('mongodb'); // MongoDB

const app = express();
const PORT = 3001;

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
