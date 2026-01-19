# 🔍 VSCode 插件与 Claude Code 通信机制详解

## 🎯 核心原理

**VSCode 插件不是网页，是 Node.js 程序！**

```
网页应用（浏览器沙箱）
❌ 无法访问文件系统
❌ 无法读取本地文件
❌ 受安全限制

VSCode 插件（Node.js 进程）
✅ 完整的文件系统权限
✅ 可以读取任何本地文件
✅ 可以执行系统命令
```

---

## 📊 通信方式对比

### 方式 1：文件系统通信（最常见）

**Claude Code 的工作方式：**

```
1. Claude Desktop 启动时：
   ↓
2. 在用户目录创建配置文件：
   ~/.claude/
   ├── auth.json          ← 认证 Token
   ├── config.json        ← 配置信息
   └── socket.lock        ← 进程锁文件
   ↓
3. 启动本地服务器：
   - HTTP: localhost:52698
   - WebSocket: localhost:52699
   ↓
4. 将端口信息写入配置文件
```

**VSCode 插件读取配置：**

```javascript
// VSCode 插件代码（Node.js）
const fs = require('fs');
const path = require('path');
const os = require('os');

// 1. 读取 Claude 配置文件
const claudeConfigPath = path.join(
    os.homedir(),
    '.claude',
    'auth.json'
);

const config = JSON.parse(
    fs.readFileSync(claudeConfigPath, 'utf8')
);

// 2. 获取 Token 和端口
const token = config.token;
const port = config.port || 52699;

// 3. 建立连接
const ws = new WebSocket(`ws://localhost:${port}`);

ws.on('open', () => {
    // 发送认证
    ws.send(JSON.stringify({
        type: 'auth',
        token: token
    }));
});
```

---

### 方式 2：Unix Socket 通信（高级）

**更高效的本地通信：**

```javascript
// Claude Code 创建 Unix Socket
const net = require('net');
const socketPath = '/tmp/claude-code.sock';

const server = net.createServer((socket) => {
    socket.on('data', (data) => {
        const request = JSON.parse(data);
        // 处理请求
    });
});

server.listen(socketPath);
```

```javascript
// VSCode 插件连接 Unix Socket
const net = require('net');
const socketPath = '/tmp/claude-code.sock';

const client = net.connect(socketPath, () => {
    console.log('已连接到 Claude Code');
    
    client.write(JSON.stringify({
        type: 'generate',
        prompt: 'Create a function...'
    }));
});

client.on('data', (data) => {
    const response = JSON.parse(data);
    console.log('收到响应:', response);
});
```

---

### 方式 3：命名管道（Windows）

**Windows 上的等效方式：**

```javascript
// Claude Code 创建命名管道
const net = require('net');
const pipePath = '\\\\.\\pipe\\claude-code';

const server = net.createServer((socket) => {
    // 处理连接
});

server.listen(pipePath);
```

---

## 🔍 实际案例分析

### Claude Desktop 的真实实现

**1. 启动时创建配置文件**

```javascript
// Claude Desktop 启动代码（简化版）
const fs = require('fs');
const path = require('path');
const os = require('os');

class ClaudeDesktop {
    async start() {
        // 1. 创建配置目录
        const configDir = path.join(os.homedir(), '.claude');
        if (!fs.existsSync(configDir)) {
            fs.mkdirSync(configDir, { recursive: true });
        }

        // 2. 生成认证 Token
        const token = this.generateToken();

        // 3. 启动 WebSocket 服务器
        const port = await this.startWebSocketServer();

        // 4. 写入配置文件
        const config = {
            token: token,
            port: port,
            pid: process.pid,
            timestamp: Date.now()
        };

        fs.writeFileSync(
            path.join(configDir, 'auth.json'),
            JSON.stringify(config, null, 2)
        );

        console.log(`✅ Claude Desktop 已启动`);
        console.log(`   Token: ${token}`);
        console.log(`   Port: ${port}`);
    }

    generateToken() {
        const crypto = require('crypto');
        return crypto.randomBytes(32).toString('hex');
    }

    async startWebSocketServer() {
        const WebSocket = require('ws');
        const wss = new WebSocket.Server({ port: 0 }); // 随机端口

        wss.on('connection', (ws) => {
            console.log('新连接');

            ws.on('message', (message) => {
                const data = JSON.parse(message);
                
                if (data.type === 'auth') {
                    // 验证 Token
                    if (data.token === this.token) {
                        ws.authenticated = true;
                        ws.send(JSON.stringify({ type: 'auth_success' }));
                    }
                } else if (data.type === 'generate' && ws.authenticated) {
                    // 处理生成请求
                    this.handleGenerate(data, ws);
                }
            });
        });

        return wss.address().port;
    }

    async handleGenerate(data, ws) {
        // 调用 Claude API
        const response = await this.callClaudeAPI(data.prompt);
        
        ws.send(JSON.stringify({
            type: 'complete',
            code: response
        }));
    }
}
```

---

**2. VSCode 插件读取并连接**

```javascript
// VSCode 插件代码
const vscode = require('vscode');
const fs = require('fs');
const path = require('path');
const os = require('os');
const WebSocket = require('ws');

class ClaudeCodeProvider {
    constructor() {
        this.ws = null;
        this.token = null;
        this.port = null;
    }

    async activate() {
        // 1. 读取 Claude 配置
        try {
            const configPath = path.join(
                os.homedir(),
                '.claude',
                'auth.json'
            );

            const config = JSON.parse(
                fs.readFileSync(configPath, 'utf8')
            );

            this.token = config.token;
            this.port = config.port;

            // 2. 连接到 Claude Desktop
            await this.connect();

        } catch (error) {
            vscode.window.showErrorMessage(
                'Claude Desktop 未运行。请先启动 Claude Desktop。'
            );
        }
    }

    async connect() {
        this.ws = new WebSocket(`ws://localhost:${this.port}`);

        this.ws.on('open', () => {
            console.log('✅ 已连接到 Claude Desktop');
            
            // 发送认证
            this.ws.send(JSON.stringify({
                type: 'auth',
                token: this.token
            }));
        });

        this.ws.on('message', (data) => {
            const response = JSON.parse(data);
            this.handleResponse(response);
        });

        this.ws.on('error', (error) => {
            console.error('连接错误:', error);
        });
    }

    async generateCode(prompt) {
        return new Promise((resolve, reject) => {
            const requestId = Date.now().toString();

            this.ws.send(JSON.stringify({
                id: requestId,
                type: 'generate',
                prompt: prompt
            }));

            const handler = (data) => {
                const response = JSON.parse(data);
                if (response.id === requestId) {
                    this.ws.removeListener('message', handler);
                    resolve(response.code);
                }
            };

            this.ws.on('message', handler);

            setTimeout(() => {
                this.ws.removeListener('message', handler);
                reject(new Error('超时'));
            }, 30000);
        });
    }
}

// 激活插件
function activate(context) {
    const provider = new ClaudeCodeProvider();
    provider.activate();

    // 注册命令
    const disposable = vscode.commands.registerCommand(
        'claude.generateCode',
        async () => {
            const editor = vscode.window.activeTextEditor;
            const selection = editor.selection;
            const text = editor.document.getText(selection);

            const code = await provider.generateCode(
                `Improve this code: ${text}`
            );

            editor.edit(editBuilder => {
                editBuilder.replace(selection, code);
            });
        }
    );

    context.subscriptions.push(disposable);
}

module.exports = { activate };
```

---

## 🔑 关键技术点

### 1. 文件系统权限

```javascript
// VSCode 插件可以：
✅ 读取任何文件
✅ 写入任何文件
✅ 执行系统命令
✅ 访问环境变量

// 网页应用不能：
❌ 读取本地文件
❌ 写入本地文件
❌ 执行系统命令
❌ 访问文件系统
```

### 2. 进程间通信（IPC）

```javascript
// VSCode 插件可以使用：
✅ WebSocket (localhost)
✅ Unix Socket
✅ 命名管道
✅ 共享内存
✅ 文件监听

// 网页应用只能：
✅ WebSocket (需要 CORS)
❌ 其他方式都不行
```

### 3. 配置文件位置

```bash
# macOS/Linux
~/.claude/auth.json
~/.claude/config.json

# Windows
%USERPROFILE%\.claude\auth.json
%USERPROFILE%\.claude\config.json
```

---

## 🌐 网页应用的限制

### 为什么网页不能直接读取配置文件？

```javascript
// 浏览器安全沙箱
const fs = require('fs'); // ❌ 浏览器中不存在

// 即使使用 File API
const file = await window.showOpenFilePicker(); // ✅ 可以
// 但是：
// 1. 需要用户手动选择文件
// 2. 无法自动读取 ~/.claude/auth.json
// 3. 每次都要重新选择
```

---

## 💡 解决方案对比

### 方案 1：VSCode 插件方式（原生）

```
✅ 直接读取配置文件
✅ 自动连接
✅ 无需用户操作
❌ 只能在 VSCode 中使用
```

### 方案 2：一次性配对 CLI（我们的方案）

```
✅ 可以在网页中使用
✅ 一次配对，永久使用
✅ 保持 Web 应用纯粹性
⚠️ 需要用户运行一次 CLI
```

### 方案 3：浏览器扩展（中间方案）

```
✅ 可以读取本地文件
✅ 自动连接
⚠️ 需要安装浏览器扩展
⚠️ 每个浏览器都要装
```

---

## 🎯 总结

### VSCode 插件的优势

```
1. Node.js 环境
   ↓
2. 完整的文件系统权限
   ↓
3. 可以读取 ~/.claude/auth.json
   ↓
4. 自动获取 Token 和端口
   ↓
5. 直接连接 Claude Desktop
```

### 我们的网页应用

```
1. 浏览器沙箱
   ↓
2. 无法读取本地文件
   ↓
3. 需要用户提供 Token
   ↓
4. 使用一次性配对 CLI
   ↓
5. Token 存入 localStorage
   ↓
6. 后续自动连接
```

---

## 🚀 实际通信协议

### Claude Desktop WebSocket 协议

```javascript
// 1. 客户端连接
ws://localhost:52699

// 2. 认证
→ {
    "type": "auth",
    "token": "abc123..."
}

← {
    "type": "auth_success"
}

// 3. 生成请求
→ {
    "id": "req_001",
    "type": "generate",
    "prompt": "Create a function...",
    "language": "javascript"
}

// 4. 流式响应
← {
    "id": "req_001",
    "type": "chunk",
    "content": "function"
}

← {
    "id": "req_001",
    "type": "chunk",
    "content": " hello"
}

← {
    "id": "req_001",
    "type": "complete",
    "code": "function hello() { ... }"
}
```

---

**现在明白了吗？** 😊

**关键区别：**
- VSCode 插件 = Node.js 程序 = 完整权限
- 网页应用 = 浏览器沙箱 = 受限权限

**我们的解决方案：**
- 使用一次性 CLI 工具
- 获取 Token 后存入 localStorage
- 后续自动连接

**这是最优雅的 Web 方案！** 🚀
