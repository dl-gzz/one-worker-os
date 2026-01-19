# 🎯 AI OS 实施路线图 - 基于 PRD 分析

## 📊 当前进度分析

### ✅ 已完成的工作

| PRD 步骤 | 状态 | 我们的实现 |
|---------|------|-----------|
| **步骤 0: 项目初始化** | ✅ 100% | React + Vite + Tldraw 已搭建 |
| **步骤 2: 前端基础** | ✅ 80% | Tldraw 画布已运行，缺少 WorkspaceManager |
| **步骤 4: AI 生成流程** | ✅ 60% | AI Shape Generator 已创建，缺少 WebSocket |
| **步骤 6: 自动保存** | ✅ 40% | localStorage 保存，缺少后端 API |

### ⏳ 待完成的工作

| PRD 步骤 | 状态 | 优先级 |
|---------|------|--------|
| **步骤 1: 后端基础** | ❌ 0% | 🔥 高 |
| **步骤 3: ShapeHost + iFrame** | ❌ 0% | 🔥 高 |
| **步骤 5: 对话式修改** | ❌ 0% | ⭐ 中 |

---

## 🔍 架构对比分析

### PRD 提出的架构 vs 我们当前的架构

#### PRD 架构（iFrame 沙箱方案）

```
┌─────────────────────────────────┐
│  Tldraw Canvas                  │
│                                 │
│  ┌──────────────────────────┐  │
│  │  ShapeHost (Wrapper)     │  │
│  │  ┌────────────────────┐  │  │
│  │  │  <iframe>          │  │  │
│  │  │  - sandbox.js      │  │  │
│  │  │  - 执行 AI 代码    │  │  │
│  │  │  - 渲染组件        │  │  │
│  │  └────────────────────┘  │  │
│  └──────────────────────────┘  │
└─────────────────────────────────┘
```

**优点：**
- ✅ 完全隔离，安全性高
- ✅ 不会污染主应用
- ✅ 可以运行任意代码

**缺点：**
- ⚠️ 实现复杂度高
- ⚠️ 通信开销大
- ⚠️ 调试困难

#### 我们的架构（直接编译方案）

```
┌─────────────────────────────────┐
│  Tldraw Canvas                  │
│                                 │
│  ┌──────────────────────────┐  │
│  │  AI Shape Generator      │  │
│  │  - 生成代码              │  │
│  │  - Sucrase 编译          │  │
│  │  - 直接注册 ShapeUtil    │  │
│  └──────────────────────────┘  │
│                                 │
│  ┌──────────────────────────┐  │
│  │  动态生成的 Shape        │  │
│  │  - 直接渲染              │  │
│  │  - 原生性能              │  │
│  └──────────────────────────┘  │
└─────────────────────────────────┘
```

**优点：**
- ✅ 实现简单
- ✅ 性能优秀
- ✅ 调试方便
- ✅ 原生 Tldraw 体验

**缺点：**
- ⚠️ 安全性较低（需要代码审查）
- ⚠️ 可能污染全局作用域

---

## 💡 建议的实施方案

### 方案 A：混合方案（推荐）

**结合两种架构的优点**

```
阶段 1（MVP）：使用我们的直接编译方案
- 快速验证核心价值
- 降低开发复杂度
- 加快迭代速度

阶段 2（生产）：引入 iFrame 沙箱
- 提高安全性
- 支持更复杂的场景
- 企业级部署
```

### 方案 B：完全按照 PRD（标准方案）

**严格按照 PRD 实施**

优点：
- 架构完整
- 安全性高
- 可扩展性强

缺点：
- 开发周期长（30+ 小时）
- 复杂度高
- 调试困难

---

## 🚀 推荐的实施路线图

### 阶段 1：MVP（1-2 周）

**使用我们当前的架构 + PRD 的后端**

#### Week 1: 核心功能

**Day 1-2: 后端基础**
```
✅ 搭建 Express + Socket.io 服务器
✅ 连接 MongoDB
✅ 实现 Workspace API
✅ 实现 WebSocket 事件处理
```

**Day 3-4: AI 生成优化**
```
✅ 将当前的 HTTP 改为 WebSocket
✅ 实现流式生成
✅ 优化 AI Prompt
✅ 添加代码验证
```

**Day 5-7: 动态热插拔**
```
✅ 实现 Shape 动态注册
✅ 生成后立即可用
✅ 无需刷新页面
✅ 添加到 Dock
```

#### Week 2: 完善功能

**Day 8-10: 持久化**
```
✅ WorkspaceManager 实现
✅ 自动保存到后端
✅ 加载工作区
✅ 版本管理
```

**Day 11-12: 对话式修改**
```
✅ Shape 选中时显示对话框
✅ 发送修改请求
✅ 热更新 Shape
✅ 保持状态
```

**Day 13-14: 测试和优化**
```
✅ Bug 修复
✅ 性能优化
✅ 用户体验优化
✅ 文档完善
```

---

### 阶段 2：生产级（2-3 周）

**引入 iFrame 沙箱 + 完整功能**

#### Week 3: iFrame 沙箱

```
✅ 实现 ShapeHost
✅ 创建 sandbox.html
✅ postMessage 通信
✅ 代码隔离执行
```

#### Week 4: 高级功能

```
✅ Shape 市场
✅ 分享和下载
✅ 协作编辑
✅ 权限管理
```

#### Week 5: 部署和发布

```
✅ Vercel 部署前端
✅ Render 部署后端
✅ MongoDB Atlas
✅ 性能监控
```

---

## 📋 立即可以开始的任务

### 任务 1：搭建后端服务器（4 小时）

**创建基础后端**

```javascript
// backend/server.js
const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = socketIO(server, {
    cors: {
        origin: "http://localhost:5173",
        methods: ["GET", "POST"]
    }
});

// 中间件
app.use(cors());
app.use(express.json());

// MongoDB 连接
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ai-os', {
    useNewUrlParser: true,
    useUnifiedTopology: true
});

// Workspace Schema
const WorkspaceSchema = new mongoose.Schema({
    _id: String,
    name: String,
    version: { type: Number, default: 1 },
    shapes: [{
        id: String,
        type: String,
        x: Number,
        y: Number,
        props: mongoose.Schema.Types.Mixed,
        code: String
    }],
    camera: {
        x: Number,
        y: Number,
        z: Number
    }
}, { timestamps: true });

const Workspace = mongoose.model('Workspace', WorkspaceSchema);

// REST API
app.get('/api/workspace/:id', async (req, res) => {
    try {
        const workspace = await Workspace.findById(req.params.id);
        res.json(workspace || { shapes: [] });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/workspace/:id', async (req, res) => {
    try {
        const workspace = await Workspace.findByIdAndUpdate(
            req.params.id,
            req.body,
            { upsert: true, new: true }
        );
        res.json(workspace);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// WebSocket
io.on('connection', (socket) => {
    console.log('Client connected');

    // AI 生成 Shape
    socket.on('generate-shape', async (data) => {
        const { prompt } = data;
        
        try {
            // 调用 OpenAI API（流式）
            const stream = await generateShapeCode(prompt);
            
            let fullCode = '';
            for await (const chunk of stream) {
                fullCode += chunk;
                socket.emit('shape-chunk', { chunk });
            }
            
            socket.emit('shape-generated', { 
                fullCode,
                shapeName: extractShapeName(fullCode),
                shapeType: extractShapeType(fullCode)
            });
            
        } catch (error) {
            socket.emit('error', { message: error.message });
        }
    });

    // 修改 Shape
    socket.on('refactor-shape', async (data) => {
        const { shapeId, currentCode, userPrompt } = data;
        
        try {
            const newCode = await refactorShapeCode(currentCode, userPrompt);
            socket.emit('shape-refactored', { shapeId, newCode });
        } catch (error) {
            socket.emit('error', { message: error.message });
        }
    });

    socket.on('disconnect', () => {
        console.log('Client disconnected');
    });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});
```

---

### 任务 2：实现 WebSocket 通信（3 小时）

**前端集成**

```javascript
// src/services/WebSocketService.js
import io from 'socket.io-client';

class WebSocketService {
    constructor() {
        this.socket = null;
        this.listeners = new Map();
    }

    connect(url = 'http://localhost:3001') {
        this.socket = io(url);

        this.socket.on('connect', () => {
            console.log('✅ WebSocket connected');
        });

        this.socket.on('shape-chunk', (data) => {
            this.emit('shape-chunk', data);
        });

        this.socket.on('shape-generated', (data) => {
            this.emit('shape-generated', data);
        });

        this.socket.on('shape-refactored', (data) => {
            this.emit('shape-refactored', data);
        });
    }

    generateShape(prompt) {
        this.socket.emit('generate-shape', { prompt });
    }

    refactorShape(shapeId, currentCode, userPrompt) {
        this.socket.emit('refactor-shape', { 
            shapeId, 
            currentCode, 
            userPrompt 
        });
    }

    on(event, callback) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, []);
        }
        this.listeners.get(event).push(callback);
    }

    emit(event, data) {
        const callbacks = this.listeners.get(event) || [];
        callbacks.forEach(cb => cb(data));
    }
}

export default new WebSocketService();
```

---

## 🎯 我的建议

### 立即开始（推荐）

**使用混合方案：**

1. **保留我们的前端架构**
   - AI Shape Generator（已完成）
   - 动态编译和注册
   - 直接渲染 Shape

2. **添加 PRD 的后端**
   - Express + Socket.io
   - MongoDB 持久化
   - WebSocket 实时通信

3. **实现核心功能**
   - 流式 AI 生成
   - 工作区保存/加载
   - 对话式修改

**优势：**
- ✅ 快速（1-2 周完成 MVP）
- ✅ 简单（降低复杂度）
- ✅ 可用（立即验证价值）
- ✅ 可扩展（后续可加 iFrame）

---

## 📊 时间估算对比

| 方案 | 开发时间 | 复杂度 | 风险 |
|------|---------|--------|------|
| **混合方案（推荐）** | 1-2 周 | ⭐⭐⭐ | 低 |
| **完全 PRD 方案** | 3-4 周 | ⭐⭐⭐⭐⭐ | 中 |
| **仅前端方案** | 3-5 天 | ⭐⭐ | 高（无持久化）|

---

## 🚀 下一步行动

**我建议：**

1. **现在：搭建后端服务器**
   - 创建 Express + Socket.io
   - 连接 MongoDB
   - 实现基础 API

2. **然后：集成 WebSocket**
   - 修改 AI Shape Generator
   - 使用 WebSocket 替代 HTTP
   - 实现流式生成

3. **最后：完善功能**
   - 工作区持久化
   - 对话式修改
   - 优化体验

**要开始吗？** 😊

我可以帮您：
1. ✅ 创建完整的后端代码
2. ✅ 修改前端集成 WebSocket
3. ✅ 实现工作区管理
4. ✅ 测试完整流程
