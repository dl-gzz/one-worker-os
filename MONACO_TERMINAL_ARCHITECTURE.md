# 🎯 智能终端 Shape 架构分析

## 📊 您提出的架构

| 层次 | 技术 | 职责 |
|------|------|------|
| **前端** | Monaco Editor + Tldraw Shape | 图形化终端界面 |
| **后端** | OpenCode + Node.js 微服务 | 安全执行 AI 编码 |
| **通信** | WebSocket | 实时流式传输 |

## ✅ 可行性分析

### 总体评价：**完全可行！而且是最佳实践！**

---

## 🔍 详细分析

### 1️⃣ 前端：Monaco Editor Shape

**可行性：✅ 完全可行**

#### Monaco Editor 优势

```javascript
✅ VS Code 同款编辑器
✅ 完整的代码高亮
✅ 智能补全
✅ 多语言支持
✅ 主题定制
✅ 性能优秀
```

#### 实现示例

```javascript
// MonacoTerminalShape.jsx
import { BaseBoxShapeUtil, HTMLContainer } from 'tldraw';
import { useState, useRef, useEffect } from 'react';
import * as monaco from 'monaco-editor';

export class MonacoTerminalShapeUtil extends BaseBoxShapeUtil {
    static type = 'monaco_terminal';

    getDefaultProps() {
        return {
            w: 800,
            h: 600,
            language: 'javascript',
            theme: 'vs-dark',
            code: '// 输入您的代码...',
            output: '',
            isRunning: false
        };
    }

    component(shape) {
        const editorRef = useRef(null);
        const containerRef = useRef(null);
        const [output, setOutput] = useState(shape.props.output);
        const [isRunning, setIsRunning] = useState(false);
        const wsRef = useRef(null);

        // 初始化 Monaco Editor
        useEffect(() => {
            if (!containerRef.current) return;

            const editor = monaco.editor.create(containerRef.current, {
                value: shape.props.code,
                language: shape.props.language,
                theme: shape.props.theme,
                minimap: { enabled: false },
                fontSize: 14,
                lineNumbers: 'on',
                scrollBeyondLastLine: false,
                automaticLayout: true
            });

            editorRef.current = editor;

            return () => editor.dispose();
        }, []);

        // WebSocket 连接
        useEffect(() => {
            wsRef.current = new WebSocket('ws://localhost:3001');

            wsRef.current.onopen = () => {
                console.log('✅ WebSocket connected');
            };

            wsRef.current.onmessage = (event) => {
                const data = JSON.parse(event.data);
                
                if (data.type === 'output') {
                    // 流式输出
                    setOutput(prev => prev + data.content);
                } else if (data.type === 'complete') {
                    setIsRunning(false);
                } else if (data.type === 'error') {
                    setOutput(prev => prev + '\n❌ Error: ' + data.message);
                    setIsRunning(false);
                }
            };

            wsRef.current.onerror = (error) => {
                console.error('WebSocket error:', error);
                setOutput('❌ Connection error');
            };

            return () => {
                wsRef.current?.close();
            };
        }, []);

        const runCode = () => {
            if (!editorRef.current || !wsRef.current) return;

            const code = editorRef.current.getValue();
            setIsRunning(true);
            setOutput('⏳ Running...\n');

            // 发送到后端
            wsRef.current.send(JSON.stringify({
                type: 'execute',
                code: code,
                language: shape.props.language
            }));
        };

        return (
            <HTMLContainer style={{ pointerEvents: 'all' }}>
                <div style={{
                    width: shape.props.w,
                    height: shape.props.h,
                    background: '#1e1e1e',
                    borderRadius: 8,
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
                }}>
                    {/* 工具栏 */}
                    <div style={{
                        padding: 12,
                        background: '#2d2d2d',
                        borderBottom: '1px solid #3e3e3e',
                        display: 'flex',
                        gap: 8,
                        alignItems: 'center'
                    }}>
                        <span style={{ color: '#fff', fontSize: 14, fontWeight: 600 }}>
                            💻 Smart Terminal
                        </span>
                        <div style={{ flex: 1 }} />
                        <select
                            value={shape.props.language}
                            onChange={(e) => {
                                const lang = e.target.value;
                                editorRef.current?.getModel()?.setLanguage(lang);
                            }}
                            style={{
                                padding: '4px 8px',
                                background: '#3e3e3e',
                                color: '#fff',
                                border: 'none',
                                borderRadius: 4
                            }}
                        >
                            <option value="javascript">JavaScript</option>
                            <option value="python">Python</option>
                            <option value="typescript">TypeScript</option>
                            <option value="html">HTML</option>
                            <option value="css">CSS</option>
                        </select>
                        <button
                            onClick={runCode}
                            disabled={isRunning}
                            style={{
                                padding: '6px 16px',
                                background: isRunning ? '#555' : '#0e639c',
                                color: '#fff',
                                border: 'none',
                                borderRadius: 4,
                                cursor: isRunning ? 'not-allowed' : 'pointer',
                                fontWeight: 600
                            }}
                        >
                            {isRunning ? '⏳ Running...' : '▶️ Run'}
                        </button>
                    </div>

                    {/* Monaco Editor */}
                    <div
                        ref={containerRef}
                        style={{
                            flex: 1,
                            minHeight: 0
                        }}
                    />

                    {/* 输出面板 */}
                    <div style={{
                        height: 200,
                        background: '#1e1e1e',
                        borderTop: '1px solid #3e3e3e',
                        padding: 12,
                        overflow: 'auto',
                        fontFamily: 'monospace',
                        fontSize: 13,
                        color: '#d4d4d4'
                    }}>
                        <div style={{ marginBottom: 8, color: '#888' }}>
                            Output:
                        </div>
                        <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
                            {output}
                        </pre>
                    </div>
                </div>
            </HTMLContainer>
        );
    }

    indicator(shape) {
        return <rect width={shape.props.w} height={shape.props.h} />;
    }
}
```

---

### 2️⃣ 后端：OpenCode 微服务

**可行性：✅ 完全可行**

#### 架构设计

```javascript
// backend/opencode-service.js
const express = require('express');
const WebSocket = require('ws');
const { OpenCode } = require('opencode'); // 假设的 OpenCode 包

const app = express();
const wss = new WebSocket.Server({ port: 3001 });

// OpenCode 实例池
const opencodePool = new Map();

wss.on('connection', (ws) => {
    console.log('✅ Client connected');
    
    // 为每个连接创建 OpenCode 实例
    const sessionId = generateSessionId();
    const opencode = new OpenCode({
        apiKey: process.env.OPENAI_API_KEY,
        model: 'gpt-4',
        streaming: true
    });
    
    opencodePool.set(sessionId, opencode);

    ws.on('message', async (message) => {
        const data = JSON.parse(message);

        if (data.type === 'execute') {
            try {
                // 执行代码
                const stream = await opencode.execute({
                    code: data.code,
                    language: data.language,
                    streaming: true
                });

                // 流式传输结果
                for await (const chunk of stream) {
                    ws.send(JSON.stringify({
                        type: 'output',
                        content: chunk.output
                    }));
                }

                // 完成
                ws.send(JSON.stringify({
                    type: 'complete'
                }));

            } catch (error) {
                ws.send(JSON.stringify({
                    type: 'error',
                    message: error.message
                }));
            }
        }
    });

    ws.on('close', () => {
        console.log('❌ Client disconnected');
        opencodePool.delete(sessionId);
    });
});

function generateSessionId() {
    return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

console.log('🚀 OpenCode service running on ws://localhost:3001');
```

---

### 3️⃣ WebSocket 实时通信

**可行性：✅ 完全可行**

#### 通信协议设计

```javascript
// 消息格式
{
    // 客户端 → 服务器
    "execute": {
        type: "execute",
        code: "console.log('Hello')",
        language: "javascript",
        sessionId: "xxx"
    },

    // 服务器 → 客户端（流式输出）
    "output": {
        type: "output",
        content: "Hello\n",
        timestamp: 1234567890
    },

    // 服务器 → 客户端（完成）
    "complete": {
        type: "complete",
        duration: 1234,
        exitCode: 0
    },

    // 服务器 → 客户端（错误）
    "error": {
        type: "error",
        message: "Syntax error",
        stack: "..."
    }
}
```

---

## 🏗️ 完整架构图

```
┌─────────────────────────────────────────────┐
│           前端 (Tldraw Shape)                │
│                                             │
│  ┌────────────────────────────────────┐    │
│  │    Monaco Editor                   │    │
│  │  - 代码编辑                         │    │
│  │  - 语法高亮                         │    │
│  │  - 智能补全                         │    │
│  └────────────────────────────────────┘    │
│                                             │
│  ┌────────────────────────────────────┐    │
│  │    WebSocket Client                │    │
│  │  - 发送代码                         │    │
│  │  - 接收流式输出                     │    │
│  └────────────────────────────────────┘    │
│                                             │
│  ┌────────────────────────────────────┐    │
│  │    Output Panel                    │    │
│  │  - 显示执行结果                     │    │
│  │  - 实时更新                         │    │
│  └────────────────────────────────────┘    │
└─────────────────────────────────────────────┘
                    ↕️ WebSocket
┌─────────────────────────────────────────────┐
│         后端 (Node.js 微服务)                │
│                                             │
│  ┌────────────────────────────────────┐    │
│  │    WebSocket Server                │    │
│  │  - 接收请求                         │    │
│  │  - 管理会话                         │    │
│  └────────────────────────────────────┘    │
│                                             │
│  ┌────────────────────────────────────┐    │
│  │    OpenCode Engine                 │    │
│  │  - 执行代码                         │    │
│  │  - AI 辅助                          │    │
│  │  - 安全沙箱                         │    │
│  └────────────────────────────────────┘    │
│                                             │
│  ┌────────────────────────────────────┐    │
│  │    Session Manager                 │    │
│  │  - 会话隔离                         │    │
│  │  - 资源管理                         │    │
│  └────────────────────────────────────┘    │
└─────────────────────────────────────────────┘
```

---

## ✅ 优势分析

### 1. Monaco Editor

| 优势 | 说明 |
|------|------|
| **专业性** | VS Code 同款，用户熟悉 |
| **功能丰富** | 代码补全、错误提示、格式化 |
| **性能优秀** | 处理大文件无压力 |
| **可定制** | 主题、快捷键、扩展 |

### 2. WebSocket

| 优势 | 说明 |
|------|------|
| **实时性** | 毫秒级延迟 |
| **双向通信** | 服务器可主动推送 |
| **流式传输** | 适合 AI 生成场景 |
| **连接复用** | 减少开销 |

### 3. 微服务架构

| 优势 | 说明 |
|------|------|
| **安全隔离** | 代码执行在服务器 |
| **资源控制** | 限制 CPU、内存 |
| **可扩展** | 独立部署和扩展 |
| **易维护** | 单一职责 |

---

## ⚠️ 挑战和解决方案

### 挑战 1：Monaco Editor 体积大

**问题：**
```
Monaco Editor 完整包 ~3MB
可能影响加载速度
```

**解决方案：**
```javascript
// 按需加载
import * as monaco from 'monaco-editor/esm/vs/editor/editor.api';

// 只加载需要的语言
import 'monaco-editor/esm/vs/basic-languages/javascript/javascript.contribution';
import 'monaco-editor/esm/vs/basic-languages/python/python.contribution';

// 使用 CDN
<script src="https://cdn.jsdelivr.net/npm/monaco-editor@0.45.0/min/vs/loader.js"></script>
```

### 挑战 2：WebSocket 连接管理

**问题：**
```
连接断开、重连、心跳
```

**解决方案：**
```javascript
class WebSocketManager {
    constructor(url) {
        this.url = url;
        this.ws = null;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.connect();
    }

    connect() {
        this.ws = new WebSocket(this.url);

        this.ws.onopen = () => {
            console.log('✅ Connected');
            this.reconnectAttempts = 0;
            this.startHeartbeat();
        };

        this.ws.onclose = () => {
            console.log('❌ Disconnected');
            this.reconnect();
        };

        this.ws.onerror = (error) => {
            console.error('WebSocket error:', error);
        };
    }

    reconnect() {
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            setTimeout(() => this.connect(), 1000 * this.reconnectAttempts);
        }
    }

    startHeartbeat() {
        this.heartbeatInterval = setInterval(() => {
            if (this.ws.readyState === WebSocket.OPEN) {
                this.ws.send(JSON.stringify({ type: 'ping' }));
            }
        }, 30000); // 30秒心跳
    }
}
```

### 挑战 3：代码执行安全

**问题：**
```
用户代码可能包含恶意操作
需要沙箱隔离
```

**解决方案：**
```javascript
// 使用 Docker 容器隔离
const Docker = require('dockerode');
const docker = new Docker();

async function executeInSandbox(code, language) {
    const container = await docker.createContainer({
        Image: `sandbox-${language}:latest`,
        Cmd: ['node', '-e', code],
        HostConfig: {
            Memory: 512 * 1024 * 1024, // 512MB
            CpuQuota: 50000, // 50% CPU
            NetworkMode: 'none' // 禁用网络
        }
    });

    await container.start();
    const output = await container.logs({ stdout: true, stderr: true });
    await container.remove();

    return output.toString();
}
```

---

## 💰 成本估算

### 开发成本

| 项目 | 时间 | 难度 |
|------|------|------|
| Monaco Editor Shape | 2-3 天 | ⭐⭐⭐ |
| WebSocket 通信 | 1-2 天 | ⭐⭐ |
| OpenCode 集成 | 3-5 天 | ⭐⭐⭐⭐ |
| 安全沙箱 | 2-3 天 | ⭐⭐⭐⭐ |
| **总计** | **8-13 天** | |

### 运行成本

| 项目 | 成本/月 |
|------|---------|
| 服务器（2核4G）| ¥200 |
| OpenAI API | ¥500-2000 |
| Docker 资源 | ¥100 |
| **总计** | **¥800-2300** |

---

## 🎯 实施建议

### 阶段 1：MVP（1周）

```
✅ 基础 Monaco Editor Shape
✅ 简单的 WebSocket 通信
✅ 本地代码执行（无 OpenCode）
✅ 基础输出显示
```

### 阶段 2：AI 集成（2周）

```
✅ 集成 OpenCode
✅ 流式输出
✅ AI 代码补全
✅ 错误处理
```

### 阶段 3：生产就绪（2周）

```
✅ Docker 沙箱
✅ 会话管理
✅ 性能优化
✅ 监控告警
```

---

## 📝 总结

### 您的架构评价

| 方面 | 评分 | 评价 |
|------|------|------|
| **可行性** | ⭐⭐⭐⭐⭐ | 完全可行 |
| **技术选型** | ⭐⭐⭐⭐⭐ | 最佳实践 |
| **扩展性** | ⭐⭐⭐⭐⭐ | 易于扩展 |
| **安全性** | ⭐⭐⭐⭐ | 需加强沙箱 |
| **性能** | ⭐⭐⭐⭐ | 优秀 |

### 建议

✅ **立即可以开始**
✅ **技术栈成熟**
✅ **社区支持好**
✅ **适合生产环境**

---

**需要我帮您：**
1. ✅ 创建 Monaco Terminal Shape
2. ✅ 实现 WebSocket 服务器
3. ✅ 集成 OpenCode
4. ✅ 部署和测试

**现在开始吗？** 🚀
