# 🚀 高级 Shape 开发指南

## 📋 目录

1. [概述](#概述)
2. [数据库查询 Shape](#数据库查询-shape)
3. [其他高级 Shape 示例](#其他高级-shape-示例)
4. [后端服务器设置](#后端服务器设置)
5. [安全考虑](#安全考虑)
6. [最佳实践](#最佳实践)

---

## 🎯 概述

您可以创建各种强大的 Shape 来与后端、数据库、API 等交互。每个 Shape 都是一个独立的"智能体"，可以执行复杂的任务。

### 可以创建的 Shape 类型

| Shape 类型 | 功能 | 后端需求 |
|-----------|------|---------|
| 🗄️ Database Query | SQL 查询 | 数据库 + API |
| 📡 API Call | REST API 调用 | API 服务器 |
| 📤 File Upload | 文件上传 | 文件服务器 |
| 💬 WebSocket | 实时通信 | WebSocket 服务器 |
| 📊 Data Visualization | 数据可视化 | 数据源 API |
| 🔐 Auth | 用户认证 | 认证服务器 |

---

## 🗄️ 数据库查询 Shape

### 已创建的文件

1. **前端 Shape**：`src/components/shapes/DatabaseQueryShape.jsx`
2. **后端服务器**：`backend/server.js`

### 设置步骤

#### 1. 安装后端依赖

```bash
cd backend
npm init -y
npm install express cors pg
```

#### 2. 配置数据库

编辑 `backend/server.js`，修改数据库连接信息：

```javascript
const pool = new Pool({
    host: 'localhost',
    port: 5432,
    database: 'your_database',
    user: 'your_username',
    password: 'your_password'
});
```

#### 3. 启动后端服务器

```bash
cd backend
node server.js
```

应该看到：
```
🚀 Backend server running on http://localhost:3001
```

#### 4. 注册 Shape 到 Tldraw

在 `TldrawBoard.jsx` 中添加：

```javascript
import { DatabaseQueryShapeUtil } from './shapes/DatabaseQueryShape';

const customShapeUtils = [
    AIAgentShapeUtil,
    CodeRunnerShapeUtil,
    BrowserShapeUtil,
    DatabaseQueryShapeUtil, // 添加这一行
    // ... 其他 Shape
];
```

#### 5. 添加到 Dock

在 `AppLauncherDock` 中添加：

```javascript
const builtInApps = [
    // ... 其他应用
    { 
        id: 'database', 
        icon: '🗄️', 
        label: 'Database', 
        type: 'database_query', 
        props: {}, 
        builtin: true 
    },
];
```

### 使用方法

1. 点击 Dock 中的 🗄️ 图标
2. 输入 SQL 查询（例如：`SELECT * FROM users LIMIT 10`）
3. 点击 "Execute Query"
4. 查看结果

---

## 🎨 其他高级 Shape 示例

### 1️⃣ API 调用 Shape

```javascript
// APICallShape.jsx
export class APICallShapeUtil extends BaseBoxShapeUtil {
    static type = 'api_call';

    getDefaultProps() {
        return {
            url: 'https://api.example.com/data',
            method: 'GET',
            headers: {},
            body: '',
            response: null,
            status: 'idle'
        };
    }

    component(shape) {
        const [response, setResponse] = useState(null);

        const callAPI = async () => {
            const res = await fetch(shape.props.url, {
                method: shape.props.method,
                headers: shape.props.headers,
                body: shape.props.body
            });
            const data = await res.json();
            setResponse(data);
        };

        return (
            <div>
                <input value={shape.props.url} />
                <button onClick={callAPI}>Call API</button>
                <pre>{JSON.stringify(response, null, 2)}</pre>
            </div>
        );
    }
}
```

### 2️⃣ 文件上传 Shape

```javascript
// FileUploadShape.jsx
export class FileUploadShapeUtil extends BaseBoxShapeUtil {
    static type = 'file_upload';

    component(shape) {
        const [file, setFile] = useState(null);
        const [progress, setProgress] = useState(0);

        const uploadFile = async () => {
            const formData = new FormData();
            formData.append('file', file);

            const xhr = new XMLHttpRequest();
            
            xhr.upload.onprogress = (e) => {
                setProgress((e.loaded / e.total) * 100);
            };

            xhr.open('POST', 'http://localhost:3001/api/upload');
            xhr.send(formData);
        };

        return (
            <div>
                <input 
                    type="file" 
                    onChange={(e) => setFile(e.target.files[0])} 
                />
                <button onClick={uploadFile}>Upload</button>
                <progress value={progress} max="100" />
            </div>
        );
    }
}
```

### 3️⃣ WebSocket 实时数据 Shape

```javascript
// RealtimeDataShape.jsx
export class RealtimeDataShapeUtil extends BaseBoxShapeUtil {
    static type = 'realtime_data';

    component(shape) {
        const [data, setData] = useState([]);
        const ws = useRef(null);

        useEffect(() => {
            ws.current = new WebSocket('ws://localhost:3001');
            
            ws.current.onmessage = (event) => {
                const newData = JSON.parse(event.data);
                setData(prev => [...prev, newData]);
            };

            return () => ws.current?.close();
        }, []);

        return (
            <div>
                <h3>Real-time Data Stream</h3>
                {data.map((item, i) => (
                    <div key={i}>{JSON.stringify(item)}</div>
                ))}
            </div>
        );
    }
}
```

---

## 🖥️ 后端服务器设置

### 完整的后端架构

```
backend/
├── server.js           # 主服务器
├── routes/
│   ├── database.js     # 数据库路由
│   ├── files.js        # 文件上传路由
│   └── websocket.js    # WebSocket 路由
├── middleware/
│   ├── auth.js         # 认证中间件
│   └── security.js     # 安全检查
└── package.json
```

### 启动多个服务

```bash
# 终端 1：前端
npm run dev

# 终端 2：后端
cd backend
node server.js
```

---

## 🔒 安全考虑

### ⚠️ 重要安全措施

#### 1. SQL 注入防护

```javascript
// ❌ 危险
const query = `SELECT * FROM users WHERE id = ${userId}`;

// ✅ 安全
const query = 'SELECT * FROM users WHERE id = $1';
await pool.query(query, [userId]);
```

#### 2. 限制危险操作

```javascript
const dangerousKeywords = ['DROP', 'DELETE', 'TRUNCATE', 'ALTER'];
if (dangerousKeywords.some(k => query.toUpperCase().includes(k))) {
    throw new Error('Dangerous operation not allowed');
}
```

#### 3. 认证和授权

```javascript
// 添加 JWT 认证
app.use('/api', authenticateToken);

function authenticateToken(req, res, next) {
    const token = req.headers['authorization'];
    if (!token) return res.sendStatus(401);
    
    jwt.verify(token, SECRET_KEY, (err, user) => {
        if (err) return res.sendStatus(403);
        req.user = user;
        next();
    });
}
```

#### 4. 速率限制

```javascript
const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 分钟
    max: 100 // 最多 100 个请求
});

app.use('/api/', limiter);
```

---

## 💡 最佳实践

### 1. 错误处理

```javascript
try {
    const result = await pool.query(query);
    setResults(result.rows);
    setStatus('success');
} catch (error) {
    console.error('Query error:', error);
    setError(error.message);
    setStatus('error');
    
    // 显示用户友好的错误消息
    alert(`查询失败：${error.message}`);
}
```

### 2. 加载状态

```javascript
const [status, setStatus] = useState('idle');

// idle → loading → success/error
```

### 3. 缓存结果

```javascript
const cache = new Map();

async function queryWithCache(query) {
    if (cache.has(query)) {
        return cache.get(query);
    }
    
    const result = await executeQuery(query);
    cache.set(query, result);
    return result;
}
```

### 4. 连接池管理

```javascript
const pool = new Pool({
    max: 20,                    // 最大连接数
    idleTimeoutMillis: 30000,   // 空闲超时
    connectionTimeoutMillis: 2000 // 连接超时
});
```

---

## 🚀 快速开始

### 最小可行示例

1. **创建 Shape**：
```bash
cp src/components/shapes/DatabaseQueryShape.jsx src/components/shapes/MyCustomShape.jsx
```

2. **修改 Shape 类型**：
```javascript
static type = 'my_custom_shape';
```

3. **添加自定义逻辑**：
```javascript
const myCustomFunction = async () => {
    const response = await fetch('http://localhost:3001/api/my-endpoint');
    const data = await response.json();
    // 处理数据
};
```

4. **注册到 Tldraw**：
```javascript
import { MyCustomShapeUtil } from './shapes/MyCustomShape';
const customShapeUtils = [..., MyCustomShapeUtil];
```

5. **添加到 Dock**：
```javascript
{ id: 'my_custom', icon: '⭐', label: 'My Shape', type: 'my_custom_shape' }
```

---

## 📚 更多资源

- [Tldraw 文档](https://tldraw.dev)
- [Express.js 文档](https://expressjs.com)
- [PostgreSQL Node.js](https://node-postgres.com)
- [WebSocket API](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket)

---

**现在您可以创建任何您想要的智能 Shape 了！** 🎉
