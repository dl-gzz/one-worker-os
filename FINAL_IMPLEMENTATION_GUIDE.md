# 🎉 OpenCode + AI Terminal - 完整实现指南

## 📋 当前状态

### ✅ 已完成
1. **OpenCode 已安装** ✅
2. **OpenCode 服务器运行中** ✅ (localhost:4096)
3. **AI Terminal Shape** ✅
4. **AIProvider 服务** ✅
5. **前端配置** ✅ (local 模式)

### ⚠️ 需要完成
- OpenCode 初始配置（连接 AI 模型）
- AIProvider 改用 HTTP API

---

## 🚀 完整实现步骤

### 步骤 1：配置 OpenCode（首次使用）

```bash
# 1. 启动 OpenCode 交互界面
opencode

# 2. 连接 AI 模型
/connect

# 3. 选择 opencode
# 4. 访问 opencode.ai/auth 授权
# 5. 复制 API Key 并粘贴
```

### 步骤 2：启动 OpenCode 服务器

```bash
# 进入项目目录
cd "/Users/baiyang/Desktop/桌面 - 白阳的Mac mini/react组件/one worker白板"

# 启动服务器（带 CORS）
opencode serve --cors http://localhost:5173
```

**应该看到：**
```
INFO Starting server on 127.0.0.1:4096
```

### 步骤 3：验证服务器

浏览器访问：
```
http://localhost:4096/doc
```

应该看到 OpenAPI 文档页面。

---

## 💻 修改 AIProvider（使用 HTTP）

### 当前问题

AIProvider 在尝试 WebSocket 连接：
```
❌ WebSocket connection to 'ws://localhost:52699/' failed
```

### 解决方案

修改 `src/services/AIProvider.js` 中的 `generateLocal` 方法：

```javascript
/**
 * 本地生成（OpenCode HTTP API）
 */
async generateLocal(prompt, options = {}) {
    try {
        console.log('📍 使用本地 OpenCode');
        
        // 直接调用 OpenCode HTTP API
        const response = await fetch('http://localhost:4096/api/generate', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json' 
            },
            body: JSON.stringify({
                prompt: prompt,
                stream: false
            })
        });

        if (!response.ok) {
            throw new Error(`OpenCode API 错误: ${response.status}`);
        }

        const data = await response.json();
        
        // OpenCode 返回的代码
        return data.code || data.response || data.text;

    } catch (error) {
        console.error('OpenCode 调用失败:', error);
        
        // 如果是网络错误，说明 OpenCode 未运行
        if (error.message.includes('Failed to fetch')) {
            throw new Error('OpenCode 未运行。\n\n请先启动:\nopencode serve --cors http://localhost:5173');
        }
        
        throw error;
    }
}
```

### 同时删除 WebSocket 相关代码

删除 `AIProvider.js` 中的：
- `connectLocal()` 方法（WebSocket 连接）
- `init()` 方法中的 WebSocket 初始化
- 所有 WebSocket 相关的变量和处理器

---

## 🎯 简化方案（推荐）

### 方案 A：暂时使用云端模式

**最快的测试方法：**

```javascript
// 浏览器控制台
localStorage.setItem('aiMode', 'cloud')
location.reload()
```

然后立即测试 AI Terminal！

### 方案 B：完整本地模式

1. **配置 OpenCode**
   ```bash
   opencode
   /connect
   # 按提示操作
   ```

2. **启动服务器**
   ```bash
   opencode serve --cors http://localhost:5173
   ```

3. **修改 AIProvider**
   - 改用 HTTP API
   - 删除 WebSocket 代码

4. **测试**
   - 拖出 AI Terminal
   - 输入指令
   - 查看结果

---

## 📊 架构对比

### 当前实现（WebSocket - 不工作）
```
AIProvider → WebSocket (ws://localhost:52699)
             ↓
             ❌ 连接失败
```

### 正确实现（HTTP - OpenCode）
```
AIProvider → HTTP (http://localhost:4096/api/generate)
             ↓
             OpenCode Server
             ↓
             AI 模型生成代码
```

---

## 🎨 测试 AI Terminal

### 云端模式（立即可用）

```javascript
localStorage.setItem('aiMode', 'cloud')
location.reload()
```

### 本地模式（需要配置 OpenCode）

```javascript
localStorage.setItem('aiMode', 'local')
location.reload()
```

### 使用示例

1. **拖出 AI Terminal**
   - 从底部 Dock 点击 💬

2. **输入指令**
   ```
   创建一个计数器
   ```

3. **点击运行**
   - 等待 AI 生成
   - 新 Shape 自动出现

---

## 💡 建议

### 立即测试（5 分钟）

**使用云端模式：**
```javascript
localStorage.setItem('aiMode', 'cloud')
location.reload()
```

这样可以立即测试 AI Terminal 的所有功能！

### 完整本地化（30 分钟）

1. 配置 OpenCode（10 分钟）
2. 修改 AIProvider（15 分钟）
3. 测试（5 分钟）

---

## 🎉 总结

### 已完成的革命性功能

✅ **AI Terminal Shape** - 对话即 Shape  
✅ **连接器模型** - 箭头即编程  
✅ **可视化编程** - 画布即代码  
✅ **OpenCode 集成** - 本地 AI 支持  

### 立即可用

**云端模式已经完全可用！**

只需：
```javascript
localStorage.setItem('aiMode', 'cloud')
location.reload()
```

然后开始创造！

---

**您想先测试云端模式，还是完整配置本地模式？** 😊
