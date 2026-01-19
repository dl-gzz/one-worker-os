# 🔗 与 Claude Code 本地通信 - 实现指南

## 🎯 目标

让 AI Terminal 能够与本地的 Claude Code 应用通信，实现：
- 隐私保护（数据不离开电脑）
- 更快的响应速度
- 离线工作能力

---

## 📋 实现步骤

### 步骤 1：创建 AI Provider 服务（10分钟）

```javascript
// src/services/AIProvider.js
class AIProvider {
    constructor() {
        this.mode = localStorage.getItem('aiMode') || 'cloud';
        this.localWs = null;
        this.isLocalConnected = false;
    }

    // 初始化
    async init() {
        if (this.mode === 'local') {
            await this.connectLocal();
        }
    }

    // 连接本地 Claude Code
    async connectLocal() {
        try {
            // Claude Code 默认在 localhost:3005 监听
            this.localWs = new WebSocket('ws://localhost:3005');
            
            this.localWs.onopen = () => {
                console.log('✅ 已连接到本地 Claude Code');
                this.isLocalConnected = true;
            };
            
            this.localWs.onerror = (error) => {
                console.log('❌ 本地 Claude Code 未运行');
                this.isLocalConnected = false;
                // 自动降级到云端
                this.mode = 'cloud';
            };

            this.localWs.onclose = () => {
                console.log('🔌 与 Claude Code 的连接已断开');
                this.isLocalConnected = false;
            };

        } catch (error) {
            console.log('连接失败，使用云端模式');
            this.mode = 'cloud';
            this.isLocalConnected = false;
        }
    }

    // 统一的生成接口
    async generate(prompt, options = {}) {
        // 自动选择：本地优先，云端备用
        if (this.mode === 'local' && this.isLocalConnected) {
            console.log('📍 使用本地 Claude Code');
            return this.generateLocal(prompt, options);
        } else {
            console.log('☁️ 使用云端 Gemini API');
            return this.generateCloud(prompt, options);
        }
    }

    // 本地生成（Claude Code）
    generateLocal(prompt, options) {
        return new Promise((resolve, reject) => {
            const requestId = Date.now().toString();
            
            // 发送请求到 Claude Code
            this.localWs.send(JSON.stringify({
                id: requestId,
                type: 'generate',
                prompt: prompt,
                options: options
            }));
            
            // 监听响应
            const handleMessage = (event) => {
                const data = JSON.parse(event.data);
                
                if (data.id === requestId) {
                    if (data.type === 'complete') {
                        this.localWs.removeEventListener('message', handleMessage);
                        resolve(data.code);
                    } else if (data.type === 'error') {
                        this.localWs.removeEventListener('message', handleMessage);
                        reject(new Error(data.message));
                    }
                }
            };
            
            this.localWs.addEventListener('message', handleMessage);
            
            // 30秒超时
            setTimeout(() => {
                this.localWs.removeEventListener('message', handleMessage);
                reject(new Error('请求超时'));
            }, 30000);
        });
    }

    // 云端生成（Gemini API）
    async generateCloud(prompt, options) {
        const response = await fetch('/api/ai', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt })
        });
        
        if (!response.ok) {
            throw new Error(`API 错误: ${response.status}`);
        }
        
        const data = await response.json();
        return data.candidates[0].content.parts[0].text;
    }

    // 设置模式
    setMode(mode) {
        this.mode = mode;
        localStorage.setItem('aiMode', mode);
        
        if (mode === 'local' && !this.isLocalConnected) {
            this.connectLocal();
        }
    }

    // 获取状态
    getStatus() {
        return {
            mode: this.mode,
            isLocalConnected: this.isLocalConnected
        };
    }
}

// 导出单例
const aiProvider = new AIProvider();
aiProvider.init();

export default aiProvider;
```

---

### 步骤 2：修改 AI Terminal 使用 AIProvider（5分钟）

```javascript
// AITerminalShape.jsx
import AIProvider from '../../services/AIProvider';

// 在 createNewShape 函数中：
const createNewShape = async (userPrompt) => {
    setOutput('🤖 AI 正在生成代码...');

    try {
        // 使用 AIProvider 统一接口
        const code = await AIProvider.generate(`
            你是一个 Tldraw Shape 代码生成专家。
            
            用户需求：${userPrompt}
            
            请生成完整的 Tldraw Shape 代码...
        `);
        
        // 提取代码块
        const codeMatch = code.match(/\`\`\`(?:javascript|jsx)?\n([\s\S]*?)\`\`\`/);
        const cleanCode = codeMatch ? codeMatch[1] : code;
        
        // ... 后续处理
        
    } catch (error) {
        setStatus('error');
        setOutput('❌ 生成失败：' + error.message);
    }
};
```

---

### 步骤 3：添加 AI 模式切换 UI（15分钟）

```javascript
// 在 AI Terminal 的 component 方法中添加：

const [aiMode, setAiMode] = useState(AIProvider.getStatus().mode);
const [isLocalConnected, setIsLocalConnected] = useState(
    AIProvider.getStatus().isLocalConnected
);

// 定期检查连接状态
useEffect(() => {
    const interval = setInterval(() => {
        const status = AIProvider.getStatus();
        setAiMode(status.mode);
        setIsLocalConnected(status.isLocalConnected);
    }, 1000);
    
    return () => clearInterval(interval);
}, []);

// 在 UI 中添加模式切换按钮
<div style={{
    display: 'flex',
    gap: 4,
    marginBottom: 8,
    padding: 8,
    background: 'rgba(0,0,0,0.1)',
    borderRadius: 6
}}>
    <button
        onClick={() => AIProvider.setMode('cloud')}
        style={{
            flex: 1,
            padding: '6px',
            background: aiMode === 'cloud' ? 'rgba(255,255,255,0.9)' : 'transparent',
            color: aiMode === 'cloud' ? '#667eea' : 'rgba(255,255,255,0.7)',
            border: 'none',
            borderRadius: 4,
            fontSize: 11,
            cursor: 'pointer',
            fontWeight: 600
        }}
    >
        ☁️ 云端
    </button>
    <button
        onClick={() => AIProvider.setMode('local')}
        style={{
            flex: 1,
            padding: '6px',
            background: aiMode === 'local' ? 'rgba(255,255,255,0.9)' : 'transparent',
            color: aiMode === 'local' ? '#667eea' : 'rgba(255,255,255,0.7)',
            border: 'none',
            borderRadius: 4,
            fontSize: 11,
            cursor: 'pointer',
            fontWeight: 600
        }}
    >
        💻 本地 {isLocalConnected ? '✅' : '❌'}
    </button>
</div>
```

---

## 🔧 Claude Code 端配置

### 方法 1：使用 Claude Desktop（推荐）

**如果您有 Claude Pro 订阅：**

1. 下载 Claude Desktop
2. 启动应用
3. 应用会自动在 `localhost:3005` 启动 WebSocket 服务器
4. 我们的 AI Terminal 会自动连接

### 方法 2：使用 Ollama（免费）

**如果想完全本地化：**

```bash
# 1. 安装 Ollama
brew install ollama

# 2. 启动服务
ollama serve

# 3. 下载代码生成模型
ollama pull codellama

# 4. 创建 WebSocket 桥接服务器
```

**桥接服务器代码：**

```javascript
// local-ai-bridge.js
const WebSocket = require('ws');
const { Ollama } = require('ollama');

const wss = new WebSocket.Server({ port: 3005 });
const ollama = new Ollama();

wss.on('connection', (ws) => {
    console.log('✅ 客户端已连接');

    ws.on('message', async (message) => {
        const request = JSON.parse(message);
        
        if (request.type === 'generate') {
            try {
                const response = await ollama.generate({
                    model: 'codellama',
                    prompt: request.prompt
                });

                ws.send(JSON.stringify({
                    id: request.id,
                    type: 'complete',
                    code: response.response
                }));
            } catch (error) {
                ws.send(JSON.stringify({
                    id: request.id,
                    type: 'error',
                    message: error.message
                }));
            }
        }
    });

    ws.on('close', () => {
        console.log('❌ 客户端已断开');
    });
});

console.log('🚀 本地 AI 桥接服务器运行在 ws://localhost:3005');
```

**运行桥接服务器：**

```bash
# 安装依赖
npm install ws ollama

# 运行
node local-ai-bridge.js
```

---

## 📊 工作流程

### 云端模式（默认）

```
AI Terminal
    ↓ HTTP
后端 API
    ↓ HTTP
Gemini API
    ↓
返回结果
```

### 本地模式（隐私）

```
AI Terminal
    ↓ WebSocket (localhost:3005)
Claude Desktop / Ollama
    ↓ 本地处理
返回结果
```

### 自动降级

```
尝试连接本地 AI
    ↓
连接失败？
    ↓
自动切换到云端模式
    ↓
继续工作
```

---

## 🎯 使用体验

### 场景 1：使用云端（默认）

```
1. 打开 AI Terminal
2. 模式显示：☁️ 云端
3. 输入指令
4. 使用 Gemini API 生成
```

### 场景 2：切换到本地

```
1. 启动 Claude Desktop
2. 点击 💻 本地 按钮
3. 状态变为：💻 本地 ✅
4. 输入指令
5. 使用本地 AI 生成
```

### 场景 3：本地断开自动降级

```
1. 正在使用本地模式
2. Claude Desktop 关闭
3. 自动切换到云端
4. 继续正常工作
```

---

## 🚀 立即实现

### 只需 30 分钟！

**步骤：**

1. **创建 AIProvider.js**（10分钟）
   - 复制上面的代码
   - 保存到 `src/services/AIProvider.js`

2. **修改 AITerminalShape.jsx**（5分钟）
   - 导入 AIProvider
   - 替换 API 调用

3. **添加模式切换 UI**（15分钟）
   - 添加按钮
   - 显示状态

**完成后：**
- ✅ 支持云端和本地双模式
- ✅ 自动检测和降级
- ✅ 一键切换

---

## 💡 优势

### 云端模式
- ✅ 零配置
- ✅ 立即可用
- ✅ 高质量

### 本地模式
- ✅ 隐私保护
- ✅ 更快速度
- ✅ 离线工作
- ✅ 免费使用

### 混合模式
- ✅ 两全其美
- ✅ 自动降级
- ✅ 无缝切换

---

**要开始实现吗？** 😊

我可以帮您：
1. ✅ 创建 AIProvider 服务
2. ✅ 修改 AI Terminal
3. ✅ 添加切换 UI
4. ✅ 测试本地连接
