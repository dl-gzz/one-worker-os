# 🔄 并发问题分析与解决方案

## 📊 当前架构的并发场景

### 场景 1：多个 AI Agent 同时运行

```
用户操作：
┌─────────┐  ┌─────────┐  ┌─────────┐
│ Agent 1 │  │ Agent 2 │  │ Agent 3 │
│  运行   │  │  运行   │  │  运行   │
└────┬────┘  └────┬────┘  └────┬────┘
     │            │            │
     └────────────┴────────────┘
              同时调用 API
                  ↓
         会发生什么？
```

**潜在问题：**
1. **API 速率限制** - Gemini API 可能有请求频率限制
2. **内存占用** - 多个请求同时进行，内存压力
3. **状态冲突** - 多个 Agent 同时更新画布
4. **用户体验** - 浏览器可能卡顿

---

## 🚨 具体的并发问题

### 问题 1：API 调用竞争

**当前代码：**
```javascript
// TldrawBoard.jsx - runAgentTask
const runAgentTask = async (editor, agentId) => {
    // ❌ 没有并发控制
    const res = await fetch(`${API_ENDPOINT}?key=${API_KEY}`, {
        method: "POST",
        body: JSON.stringify(body)
    });
};
```

**问题：**
- 如果同时点击 10 个 Agent
- 会同时发送 10 个 API 请求
- 可能触发 API 速率限制（429 错误）
- 可能导致 API Key 被封禁

---

### 问题 2：状态更新冲突

**当前代码：**
```javascript
// 多个 Agent 同时创建结果 Shape
editor.createShape({
    id: newId,
    type: 'ai_result',
    x: outX,  // ❌ 可能重叠
    y: outY   // ❌ 可能重叠
});
```

**问题：**
- 多个结果可能在同一位置
- 用户看不到所有结果
- 需要手动移动

---

### 问题 3：数据流水线竞争

**场景：**
```
Note → Agent 1 → Agent 2 → Agent 3
```

**问题：**
- Agent 1 还没完成
- Agent 2 就开始读取数据
- 读到的是旧数据或空数据

---

## ✅ 解决方案

### 方案 1：请求队列（推荐）

**实现请求排队，一个一个执行**

```javascript
// 创建请求队列管理器
class RequestQueue {
    constructor(maxConcurrent = 2) {
        this.queue = [];
        this.running = 0;
        this.maxConcurrent = maxConcurrent;
    }

    async add(task) {
        return new Promise((resolve, reject) => {
            this.queue.push({ task, resolve, reject });
            this.process();
        });
    }

    async process() {
        if (this.running >= this.maxConcurrent || this.queue.length === 0) {
            return;
        }

        this.running++;
        const { task, resolve, reject } = this.queue.shift();

        try {
            const result = await task();
            resolve(result);
        } catch (error) {
            reject(error);
        } finally {
            this.running--;
            this.process();
        }
    }
}

// 全局队列实例
const apiQueue = new RequestQueue(2); // 最多同时 2 个请求

// 修改后的 runAgentTask
const runAgentTask = async (editor, agentId) => {
    // 添加到队列
    return apiQueue.add(async () => {
        // 原来的 API 调用逻辑
        const res = await fetch(`${API_ENDPOINT}?key=${API_KEY}`, {
            method: "POST",
            body: JSON.stringify(body)
        });
        return res.json();
    });
};
```

**优点：**
- ✅ 控制并发数量
- ✅ 避免 API 速率限制
- ✅ 更好的资源管理

---

### 方案 2：防抖与节流

**防止用户快速点击**

```javascript
// 防抖：用户停止点击后才执行
const debounce = (func, wait) => {
    let timeout;
    return function(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
};

// 节流：限制执行频率
const throttle = (func, limit) => {
    let inThrottle;
    return function(...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
};

// 应用到 Agent 按钮
const handleAgentClick = throttle((agentId) => {
    runAgentTask(editor, agentId);
}, 1000); // 1秒内只能点击一次
```

---

### 方案 3：状态锁定

**防止同一个 Agent 被重复触发**

```javascript
// 添加运行状态跟踪
const runningAgents = new Set();

const runAgentTask = async (editor, agentId) => {
    // 检查是否已在运行
    if (runningAgents.has(agentId)) {
        console.warn(`Agent ${agentId} is already running`);
        return;
    }

    // 加锁
    runningAgents.add(agentId);
    
    try {
        // 执行任务
        await performTask(editor, agentId);
    } finally {
        // 解锁
        runningAgents.delete(agentId);
    }
};
```

---

### 方案 4：智能位置分配

**避免结果 Shape 重叠**

```javascript
// 位置管理器
class PositionManager {
    constructor() {
        this.usedPositions = new Map();
    }

    getNextPosition(baseX, baseY) {
        const key = `${Math.floor(baseX / 100)}_${Math.floor(baseY / 100)}`;
        const count = this.usedPositions.get(key) || 0;
        
        // 计算偏移
        const offsetX = (count % 3) * 120;
        const offsetY = Math.floor(count / 3) * 120;
        
        this.usedPositions.set(key, count + 1);
        
        return {
            x: baseX + offsetX,
            y: baseY + offsetY
        };
    }
}

const positionManager = new PositionManager();

// 使用
const { x, y } = positionManager.getNextPosition(outX, outY);
editor.createShape({
    id: newId,
    type: 'ai_result',
    x: x,
    y: y,
    props: { text: outputText }
});
```

---

### 方案 5：流水线依赖管理

**确保流水线按顺序执行**

```javascript
// 流水线执行器
class PipelineExecutor {
    constructor(editor) {
        this.editor = editor;
        this.dependencies = new Map();
    }

    // 注册依赖关系
    registerDependency(agentId, upstreamAgentIds) {
        this.dependencies.set(agentId, upstreamAgentIds);
    }

    // 等待上游完成
    async waitForUpstream(agentId) {
        const upstreamIds = this.dependencies.get(agentId) || [];
        
        for (const upstreamId of upstreamIds) {
            while (runningAgents.has(upstreamId)) {
                await new Promise(resolve => setTimeout(resolve, 100));
            }
        }
    }

    // 执行 Agent
    async execute(agentId) {
        // 等待上游完成
        await this.waitForUpstream(agentId);
        
        // 执行当前 Agent
        await runAgentTask(this.editor, agentId);
    }
}
```

---

## 🎯 推荐的完整解决方案

### 综合方案：队列 + 锁定 + 智能位置

```javascript
// 1. 请求队列
const apiQueue = new RequestQueue(2);

// 2. 运行状态跟踪
const runningAgents = new Set();

// 3. 位置管理
const positionManager = new PositionManager();

// 4. 改进的 runAgentTask
const runAgentTask = async (editor, agentId) => {
    const agentShape = editor.getShape(agentId);
    if (!agentShape || agentShape.type !== 'ai_agent') return;

    // 检查是否已在运行
    if (runningAgents.has(agentId)) {
        alert('⏳ This agent is already running. Please wait...');
        return;
    }

    // 加锁
    runningAgents.add(agentId);
    
    // 设置状态
    editor.updateShape({ 
        id: agentId, 
        type: 'ai_agent', 
        props: { status: 'thinking' } 
    });

    try {
        // 收集输入数据
        const linkedInputs = getUpstreamData(editor, agentId);
        let inputText = linkedInputs.map(i => i.text).join('\n\n');

        // 添加到 API 队列
        const data = await apiQueue.add(async () => {
            const res = await fetch(`${API_ENDPOINT}?key=${API_KEY}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    contents: [{
                        parts: [{ text: inputText }]
                    }]
                })
            });
            
            if (!res.ok) {
                throw new Error(`HTTP ${res.status}`);
            }
            
            return res.json();
        });

        // 提取结果
        const outputText = data.candidates?.[0]?.content?.parts?.[0]?.text || 'No response';

        // 智能位置分配
        const baseX = agentShape.x + agentShape.props.w + 100;
        const baseY = agentShape.y;
        const { x, y } = positionManager.getNextPosition(baseX, baseY);

        // 创建结果
        const newId = createShapeId();
        editor.createShape({
            id: newId,
            type: 'ai_result',
            x: x,
            y: y,
            props: {
                text: outputText,
                w: 300,
                h: 200
            }
        });

        // 创建连接箭头
        editor.createShape({
            id: createShapeId(),
            type: 'arrow',
            props: {
                start: { 
                    type: 'point', 
                    x: agentShape.x + agentShape.props.w, 
                    y: agentShape.y + agentShape.props.h / 2 
                },
                end: { 
                    type: 'point', 
                    x: x, 
                    y: y + 100 
                }
            }
        });

        console.log('✅ Agent completed:', agentId);

    } catch (error) {
        console.error('❌ Agent error:', error);
        alert(`Agent failed: ${error.message}`);
    } finally {
        // 解锁
        runningAgents.delete(agentId);
        
        // 重置状态
        editor.updateShape({ 
            id: agentId, 
            type: 'ai_agent', 
            props: { status: 'idle' } 
        });
    }
};
```

---

## 📊 性能对比

### 优化前
```
10 个 Agent 同时运行：
- API 请求：10 个并发 ❌
- 可能触发速率限制 ❌
- 结果重叠 ❌
- 浏览器卡顿 ❌
```

### 优化后
```
10 个 Agent 同时运行：
- API 请求：最多 2 个并发 ✅
- 自动排队等待 ✅
- 智能位置分配 ✅
- 流畅体验 ✅
```

---

## 🛡️ 其他并发考虑

### 1. 数据库并发（如果使用后端）

```javascript
// 使用连接池
const pool = new Pool({
    max: 20,  // 最大连接数
    idleTimeoutMillis: 30000
});

// 使用事务
await pool.query('BEGIN');
try {
    await pool.query('INSERT ...');
    await pool.query('UPDATE ...');
    await pool.query('COMMIT');
} catch (e) {
    await pool.query('ROLLBACK');
    throw e;
}
```

### 2. WebSocket 并发

```javascript
// 消息队列
const messageQueue = [];
let isProcessing = false;

ws.onmessage = (event) => {
    messageQueue.push(event.data);
    processQueue();
};

async function processQueue() {
    if (isProcessing || messageQueue.length === 0) return;
    
    isProcessing = true;
    while (messageQueue.length > 0) {
        const message = messageQueue.shift();
        await handleMessage(message);
    }
    isProcessing = false;
}
```

### 3. 文件上传并发

```javascript
// 限制同时上传数量
const uploadQueue = new RequestQueue(3); // 最多 3 个同时上传

files.forEach(file => {
    uploadQueue.add(() => uploadFile(file));
});
```

---

## 🎯 最佳实践

### 1. 设置合理的并发限制
```javascript
const LIMITS = {
    MAX_CONCURRENT_API: 2,      // API 请求
    MAX_CONCURRENT_UPLOAD: 3,   // 文件上传
    MAX_CONCURRENT_DB: 10       // 数据库查询
};
```

### 2. 添加超时机制
```javascript
const timeout = (promise, ms) => {
    return Promise.race([
        promise,
        new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Timeout')), ms)
        )
    ]);
};

// 使用
await timeout(apiCall(), 30000); // 30秒超时
```

### 3. 错误重试
```javascript
async function retryWithBackoff(fn, maxRetries = 3) {
    for (let i = 0; i < maxRetries; i++) {
        try {
            return await fn();
        } catch (error) {
            if (i === maxRetries - 1) throw error;
            await new Promise(r => setTimeout(r, 1000 * Math.pow(2, i)));
        }
    }
}
```

---

## 📝 总结

### 主要并发问题：
1. ❌ API 速率限制
2. ❌ 状态冲突
3. ❌ 位置重叠
4. ❌ 流水线依赖

### 解决方案：
1. ✅ 请求队列
2. ✅ 状态锁定
3. ✅ 智能位置
4. ✅ 依赖管理

### 建议实现优先级：
1. **高优先级**：请求队列 + 状态锁定
2. **中优先级**：智能位置分配
3. **低优先级**：流水线依赖管理

---

**需要我帮您实现这些并发控制吗？** 🚀
