# 🚀 100人体验版快速方案

## 🎯 目标

让 100 人体验您的功能，**最快、最省钱**的方式。

---

## ✅ 推荐方案：简化版多用户

### 核心思路

**不做完整的多用户系统，只做最小改动**

```
保留：前端功能（不变）
添加：简单的后端代理
目的：保护 API Key + 基础控制
```

---

## 🏗️ 最小架构

```
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│  用户 1-100  │  │  用户 1-100  │  │  用户 1-100  │
│   浏览器     │  │   浏览器     │  │   浏览器     │
└──────┬───────┘  └──────┬───────┘  └──────┬───────┘
       │                 │                 │
       └─────────────────┴─────────────────┘
                         ↓
              ┌──────────────────────┐
              │   简单的后端代理      │
              │  - 隐藏 API Key      │
              │  - 基础速率限制      │
              │  - 请求日志          │
              └──────────┬───────────┘
                         ↓
              ┌──────────────────────┐
              │    Gemini API        │
              └──────────────────────┘

不需要：
❌ 用户注册/登录
❌ 数据库
❌ 复杂的权限系统
```

---

## 💻 实现步骤（1-2天完成）

### 步骤 1：创建简单后端（30分钟）

```javascript
// simple-proxy.js
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

const app = express();
app.use(cors());
app.use(express.json());

// API Key（只在服务器）
const GEMINI_API_KEY = 'YOUR_API_KEY_HERE';
const GEMINI_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent';

// 简单的速率限制
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15分钟
    max: 10, // 每个IP最多10个请求
    message: '请求太频繁，请稍后再试'
});

// 代理端点
app.post('/api/ai', limiter, async (req, res) => {
    try {
        const { prompt, images } = req.body;
        
        // 构建请求
        const parts = [{ text: prompt }];
        if (images) {
            images.forEach(img => {
                parts.push({
                    inline_data: {
                        mime_type: img.mimeType,
                        data: img.data
                    }
                });
            });
        }
        
        // 调用 Gemini API
        const response = await fetch(`${GEMINI_ENDPOINT}?key=${GEMINI_API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts }]
            })
        });
        
        const data = await response.json();
        
        // 记录日志（可选）
        console.log(`[${new Date().toISOString()}] Request from ${req.ip}`);
        
        res.json(data);
        
    } catch (error) {
        console.error('Proxy error:', error);
        res.status(500).json({ error: error.message });
    }
});

// 健康检查
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`🚀 Proxy server running on port ${PORT}`);
});
```

### 步骤 2：修改前端（10分钟）

```javascript
// TldrawBoard.jsx
// 修改 API 调用部分

// 原来：直接调用 Gemini
const API_ENDPOINT = "https://generativelanguage.googleapis.com/...";

// 改为：调用自己的代理
const API_ENDPOINT = "https://your-domain.com/api/ai"; // 或 http://localhost:3001/api/ai

// 修改 runAgentTask 函数
const runAgentTask = async (editor, agentId) => {
    // ... 前面的代码不变
    
    // 调用代理而不是直接调用 Gemini
    const res = await fetch(API_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            prompt: taskPrompt,
            images: inputImages
        })
    });
    
    // ... 后面的代码不变
};
```

### 步骤 3：部署（1小时）

**选项 A：使用 Vercel（最简单，免费）**

```bash
# 1. 安装 Vercel CLI
npm install -g vercel

# 2. 部署后端
cd backend
vercel

# 3. 部署前端
cd ..
vercel

# 完成！获得两个 URL
```

**选项 B：使用 Railway（也很简单，免费）**

```bash
# 1. 访问 railway.app
# 2. 连接 GitHub 仓库
# 3. 自动部署
# 完成！
```

---

## 💰 成本估算（100人体验）

### 方案 A：完全免费（推荐）

| 项目 | 成本 | 说明 |
|------|------|------|
| 前端托管 | ¥0 | Vercel 免费版 |
| 后端托管 | ¥0 | Vercel/Railway 免费版 |
| API 费用 | ¥50-200 | Gemini API（按使用量）|
| **总计** | **¥50-200/月** | |

**限制：**
- Vercel 免费版：100GB 带宽/月
- 足够 100 人轻度使用

### 方案 B：稳定版

| 项目 | 成本 | 说明 |
|------|------|------|
| 服务器 | ¥50 | 阿里云轻量服务器 |
| API 费用 | ¥100-300 | Gemini API |
| **总计** | **¥150-350/月** | |

---

## 🎯 具体实施计划

### Day 1：开发（2-3小时）

**上午：**
```
✅ 创建 simple-proxy.js
✅ 测试本地运行
✅ 添加速率限制
```

**下午：**
```
✅ 修改前端 API 调用
✅ 本地测试整个流程
✅ 确保功能正常
```

### Day 2：部署（1-2小时）

**上午：**
```
✅ 注册 Vercel 账号
✅ 部署后端
✅ 获取后端 URL
```

**下午：**
```
✅ 更新前端配置
✅ 部署前端
✅ 测试线上环境
```

### Day 3：分享（随时）

```
✅ 获得前端 URL
✅ 分享给 100 人
✅ 收集反馈
```

---

## 📝 完整的部署代码

### 1. 后端 package.json

```json
{
  "name": "ai-proxy",
  "version": "1.0.0",
  "main": "simple-proxy.js",
  "scripts": {
    "start": "node simple-proxy.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "express-rate-limit": "^7.1.5"
  }
}
```

### 2. 环境变量（.env）

```bash
# .env
GEMINI_API_KEY=your_api_key_here
PORT=3001
```

### 3. Vercel 配置（vercel.json）

```json
{
  "version": 2,
  "builds": [
    {
      "src": "simple-proxy.js",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "simple-proxy.js"
    }
  ]
}
```

---

## 🔒 安全措施（简化版）

### 1. 基础速率限制

```javascript
// 每个 IP 每 15 分钟最多 10 个请求
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10
});
```

### 2. 请求大小限制

```javascript
app.use(express.json({ limit: '1mb' }));
```

### 3. 简单的访问密钥（可选）

```javascript
// 前端
const response = await fetch(API_ENDPOINT, {
    headers: {
        'X-Access-Key': 'your-simple-key-123'
    }
});

// 后端
app.post('/api/ai', (req, res, next) => {
    if (req.headers['x-access-key'] !== 'your-simple-key-123') {
        return res.status(403).json({ error: 'Invalid access key' });
    }
    next();
});
```

---

## 📊 监控和管理

### 简单的使用统计

```javascript
// 添加到 simple-proxy.js
let requestCount = 0;
let dailyCount = 0;

app.post('/api/ai', limiter, async (req, res) => {
    requestCount++;
    dailyCount++;
    
    console.log(`Total: ${requestCount}, Today: ${dailyCount}`);
    
    // ... 原来的代码
});

// 每天重置
setInterval(() => {
    dailyCount = 0;
}, 24 * 60 * 60 * 1000);

// 查看统计
app.get('/admin/stats', (req, res) => {
    res.json({
        total: requestCount,
        today: dailyCount
    });
});
```

---

## ⚠️ 注意事项

### 1. API 费用控制

**Gemini API 定价：**
- 免费额度：每天 1500 次请求
- 超出后：约 $0.001/请求

**100人使用估算：**
- 每人每天 5 次请求 = 500 次/天
- 在免费额度内 ✅

**如果超出：**
```javascript
// 添加每日限制
let dailyRequests = 0;
const DAILY_LIMIT = 1000;

app.post('/api/ai', async (req, res) => {
    if (dailyRequests >= DAILY_LIMIT) {
        return res.status(429).json({ 
            error: '今日请求已达上限，请明天再试' 
        });
    }
    
    dailyRequests++;
    // ... 处理请求
});
```

### 2. 数据不持久化

**当前方案：**
- 数据仍在浏览器 localStorage
- 换电脑/清除缓存会丢失

**如果需要持久化：**
- 需要添加数据库（成本增加）
- 或使用浏览器的 IndexedDB

### 3. 无用户隔离

**当前方案：**
- 所有人共享速率限制
- 无法区分用户

**如果需要：**
- 添加简单的用户 ID
- 基于 ID 的速率限制

---

## 🎉 总结

### 100人体验版方案

**优点：**
- ✅ 快速（1-2天完成）
- ✅ 便宜（¥50-200/月）
- ✅ 简单（不需要复杂系统）
- ✅ 安全（API Key 受保护）

**缺点：**
- ⚠️ 无用户系统
- ⚠️ 数据不持久化
- ⚠️ 基础的速率限制

**适合：**
- ✅ 功能演示
- ✅ 收集反馈
- ✅ 概念验证
- ✅ 小规模测试

**不适合：**
- ❌ 正式商业产品
- ❌ 大规模使用
- ❌ 需要数据持久化

---

## 🚀 下一步

**我可以帮您：**

1. ✅ 创建完整的 simple-proxy.js
2. ✅ 修改前端代码
3. ✅ 提供部署指南
4. ✅ 设置监控和限制

**需要我现在就帮您实现吗？** 😊

---

**预计时间：2天**
**预计成本：¥50-200/月**
**技术难度：⭐⭐（简单）**
