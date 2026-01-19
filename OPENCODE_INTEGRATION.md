# 🚀 OpenCode 直接集成 - 超简化方案

## 💡 重大发现

**OpenCode 自带 HTTP 服务器！**

```bash
# 只需一条命令
opencode serve --cors http://localhost:5173
```

**不需要任何桥接服务器！** ✨

---

## 📊 架构对比

### ❌ 之前的复杂方案

```
浏览器 → 桥接服务器 → Claude Desktop → Claude AI
        (我们写的)
```

### ✅ OpenCode 的简单方案

```
浏览器 → OpenCode HTTP Server
        (官方提供)
```

**直接通信！零中间层！**

---

## 🚀 超简单实现

### 步骤 1：安装 OpenCode

```bash
# 安装 OpenCode
npm install -g opencode

# 或者
brew install opencode
```

### 步骤 2：启动 OpenCode 服务器

```bash
# 在项目目录运行
opencode serve --cors http://localhost:5173
```

**就这么简单！**

服务器会运行在 `http://localhost:4096`

---

## 💻 前端代码（超简单）

### 修改 AIProvider.js

```javascript
// src/services/AIProvider.js

class AIProvider {
    constructor() {
        this.mode = localStorage.getItem('aiMode') || 'cloud';
    }

    async generate(prompt) {
        if (this.mode === 'local') {
            return this.generateLocal(prompt);
        } else {
            return this.generateCloud(prompt);
        }
    }

    // 本地生成（OpenCode）
    async generateLocal(prompt) {
        try {
            // 直接调用 OpenCode HTTP API
            const response = await fetch('http://localhost:4096/api/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    prompt: prompt,
                    model: 'gpt-4' // 或其他模型
                })
            });

            if (!response.ok) {
                throw new Error(`OpenCode API 错误: ${response.status}`);
            }

            const data = await response.json();
            return data.code;

        } catch (error) {
            console.error('OpenCode 调用失败:', error);
            throw new Error('OpenCode 未运行。请先启动: opencode serve --cors http://localhost:5173');
        }
    }

    // 云端生成（Gemini API）
    async generateCloud(prompt) {
        const response = await fetch('/api/ai', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt })
        });

        const data = await response.json();
        return data.candidates[0].content.parts[0].text;
    }
}

export default new AIProvider();
```

**就这么多！不需要 WebSocket，不需要桥接服务器！**

---

## 🎯 完整使用流程

### 1. 安装 OpenCode

```bash
npm install -g opencode
```

### 2. 启动 OpenCode 服务器

```bash
opencode serve --cors http://localhost:5173
```

**看到：**
```
✅ OpenCode Server running on http://localhost:4096
✅ CORS enabled for: http://localhost:5173
```

### 3. 设置前端为本地模式

浏览器控制台（F12）：

```javascript
localStorage.setItem('aiMode', 'local');
location.reload();
```

### 4. 使用 AI Terminal

- 拖出 💬 AI Terminal
- 输入："创建一个时钟"
- 点击运行
- OpenCode 生成代码！

---

## 💡 为什么 OpenCode 更好？

### vs Claude Desktop

| 特性 | Claude Desktop | OpenCode |
|------|---------------|----------|
| 通信方式 | 需要读取配置文件 | ✅ 直接 HTTP API |
| CORS 支持 | ❌ 需要桥接 | ✅ 内置支持 |
| 配置复杂度 | 高 | ✅ 一条命令 |
| 官方支持 | 无 | ✅ 完整文档 |

### vs Ollama

| 特性 | Ollama | OpenCode |
|------|--------|----------|
| 模型质量 | 本地模型 | ✅ GPT-4 等 |
| 代码生成 | 一般 | ✅ 专业 |
| 配置 | 需要下载模型 | ✅ 开箱即用 |

---

## 🔧 OpenCode API 示例

### 基础调用

```javascript
// 生成代码
const response = await fetch('http://localhost:4096/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        prompt: '创建一个 React 计数器组件',
        model: 'gpt-4'
    })
});

const data = await response.json();
console.log(data.code);
```

### 流式输出

```javascript
// 流式生成
const response = await fetch('http://localhost:4096/api/generate/stream', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        prompt: '创建一个 React 计数器组件',
        stream: true
    })
});

const reader = response.body.getReader();
while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    
    const chunk = new TextDecoder().decode(value);
    console.log('收到:', chunk);
}
```

---

## 📋 完整实现清单

### 需要修改的文件

1. **AIProvider.js** ✅
   - 添加 `generateLocal()` 方法
   - 直接调用 OpenCode HTTP API

2. **不需要桥接服务器** ✅
   - 删除 `local-ai-bridge/` 目录
   - OpenCode 自带服务器

3. **不需要配对** ✅
   - 不需要读取配置文件
   - 不需要 Token
   - 只需要 OpenCode 运行

---

## 🎉 优势总结

### 开发者体验

```
❌ 之前：
1. 安装 Claude Desktop
2. 登录
3. 启动桥接服务器
4. 配对
5. 使用

✅ 现在：
1. opencode serve --cors http://localhost:5173
2. 使用
```

### 代码复杂度

```
❌ 之前：
- 桥接服务器: 150+ 行
- WebSocket 通信
- 配置文件读取
- Token 管理

✅ 现在：
- 直接 fetch: 10 行
- 标准 HTTP
- 零配置
- 零管理
```

### 可靠性

```
❌ 之前：
- 依赖我们的桥接服务器
- 可能有 bug
- 需要维护

✅ 现在：
- 官方服务器
- 经过测试
- 官方维护
```

---

## 🚀 立即开始

### 1. 安装 OpenCode

```bash
npm install -g opencode
```

### 2. 启动服务器

```bash
opencode serve --cors http://localhost:5173
```

### 3. 修改 AIProvider

只需要添加 `generateLocal()` 方法！

### 4. 测试

```javascript
localStorage.setItem('aiMode', 'local');
location.reload();
```

---

## 🎯 结论

**OpenCode 是完美的选择！**

- ✅ 官方支持
- ✅ 零配置
- ✅ 直接通信
- ✅ 标准 HTTP
- ✅ CORS 支持
- ✅ 完整文档

**立即采用 OpenCode！** 🚀

---

## 📚 参考资料

- OpenCode 官网: https://opencode.ai
- OpenCode 文档: https://opencode.ai/docs/
- OpenCode Server: https://opencode.ai/docs/server/
- OpenCode SDK: https://opencode.ai/docs/sdk/
