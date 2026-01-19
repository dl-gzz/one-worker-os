# 🚀 连接 Claude Code - 快速开始

## 🎯 目标

直接连接本地的 Claude Desktop，使用 Claude AI 进行代码生成！

---

## 📋 准备工作

### 1. 安装 Claude Desktop

从官网下载并安装：
https://claude.ai/download

### 2. 登录 Claude Desktop

启动 Claude Desktop 并使用您的账号登录

**重要：保持 Claude Desktop 运行！**

---

## 🚀 启动桥接服务器

### 步骤 1：安装依赖

```bash
cd local-ai-bridge
npm install
```

### 步骤 2：启动服务器

```bash
npm start
```

**成功的输出：**

```
🚀 Claude Code 桥接服务器启动中...
✅ 成功读取 Claude Desktop 配置
   Token: 已获取
   Port: 52698
🔗 正在连接到 Claude Desktop: ws://localhost:52698
✅ 已连接到 Claude Desktop
✅ Claude Desktop 认证成功

✅ Claude Code 桥接服务器运行在:
   HTTP: http://localhost:52699
   WebSocket: ws://localhost:52699

📝 使用说明:
   1. 确保 Claude Desktop 正在运行
   2. 在浏览器中打开应用
   3. AI Terminal 会自动连接

🔗 Claude Desktop 状态:
   配置文件: /Users/你的用户名/.claude/auth.json
   Token: ✅ 已获取
   Port: 52698
```

---

## 🎨 使用 AI Terminal

### 步骤 1：设置本地模式

打开浏览器控制台（F12），输入：

```javascript
localStorage.setItem('aiMode', 'local');
localStorage.setItem('claudeToken', 'local-bridge');
location.reload();
```

### 步骤 2：拖出 AI Terminal

从底部 Dock 拖出 💬 AI Terminal

### 步骤 3：查看连接状态

**浏览器控制台应该显示：**
```
🚀 AIProvider 初始化
   模式: local
   Token: 已配对
🔗 正在连接本地 Claude Code...
✅ WebSocket 连接已建立
✅ 认证成功，已连接到本地 Claude Code
```

### 步骤 4：开始使用

输入指令，例如：
```
创建一个时钟
```

点击运行，AI 会使用 Claude Desktop 生成代码！

---

## 📊 完整架构

```
浏览器 (AI Terminal)
    ↓ WebSocket (ws://localhost:52699)
桥接服务器
    ↓ 读取配置 (~/.claude/auth.json)
    ↓ WebSocket (ws://localhost:52698)
Claude Desktop
    ↓
Claude AI（云端）
```

**优势：**
- ✅ 使用 Claude 的强大能力
- ✅ 无需自己管理 API Key
- ✅ 通过桥接服务器简化连接

---

## 🔧 故障排除

### 问题 1：配置文件不存在

**错误信息：**
```
❌ Claude Desktop 配置文件不存在
   路径: /Users/xxx/.claude/auth.json
```

**解决方案：**
1. 确保 Claude Desktop 已安装
2. 启动 Claude Desktop
3. 登录您的账号
4. 重启桥接服务器

### 问题 2：无法连接到 Claude Desktop

**错误信息：**
```
❌ Claude Desktop 连接错误
```

**解决方案：**
1. 确保 Claude Desktop 正在运行
2. 检查 Claude Desktop 是否在后台运行
3. 重启 Claude Desktop
4. 重启桥接服务器

### 问题 3：前端无法连接

**检查桥接服务器是否运行：**
```bash
lsof -i :52699
```

**检查前端配置：**
```javascript
// 浏览器控制台
localStorage.getItem('aiMode')  // 应该是 'local'
localStorage.getItem('claudeToken')  // 应该有值
```

**重新设置：**
```javascript
localStorage.setItem('aiMode', 'local');
localStorage.setItem('claudeToken', 'local-bridge');
location.reload();
```

---

## 🎯 完整测试流程

### 终端 1：Claude Desktop

```
启动 Claude Desktop 应用
保持运行
```

### 终端 2：桥接服务器

```bash
cd local-ai-bridge
npm start

# 应该看到：
# ✅ 成功读取 Claude Desktop 配置
# ✅ 已连接到 Claude Desktop
# ✅ Claude Desktop 认证成功
```

### 终端 3：前端（应该已经在运行）

```bash
npm run dev
```

### 浏览器

```
1. 打开 http://localhost:5173
2. F12 打开控制台
3. 设置本地模式（见上面）
4. 刷新页面
5. 拖出 AI Terminal
6. 输入："创建一个计数器"
7. 点击运行
8. 查看 Claude 生成的代码！
```

---

## 💡 工作原理

### 为什么需要桥接服务器？

```
问题：浏览器无法直接读取本地文件
    ↓
解决：桥接服务器（Node.js）可以读取
    ↓
桥接服务器读取 ~/.claude/auth.json
    ↓
获取 Token 和端口
    ↓
连接到 Claude Desktop
    ↓
转发前端请求
```

### 数据流

```
1. 前端发送请求
   → ws://localhost:52699

2. 桥接服务器接收
   → 转发到 Claude Desktop
   → ws://localhost:52698

3. Claude Desktop 处理
   → 调用 Claude AI
   → 返回结果

4. 桥接服务器转发
   → 返回给前端

5. 前端显示结果
```

---

## 🔄 切换模式

### 切换到云端模式

```javascript
// 浏览器控制台
localStorage.setItem('aiMode', 'cloud');
location.reload();
```

### 切换回本地模式

```javascript
// 浏览器控制台
localStorage.setItem('aiMode', 'local');
localStorage.setItem('claudeToken', 'local-bridge');
location.reload();
```

---

## 📝 注意事项

### Claude Desktop 必须运行

桥接服务器需要 Claude Desktop 在后台运行。

**检查 Claude Desktop 是否运行：**
```bash
ps aux | grep Claude
```

### 配置文件位置

```bash
# macOS/Linux
~/.claude/auth.json

# Windows
%USERPROFILE%\.claude\auth.json
```

### 端口

- 桥接服务器：52699（前端连接）
- Claude Desktop：52698（桥接服务器连接）

---

## 🎉 完成！

**现在您有了：**

✅ 直接连接 Claude Desktop
✅ 使用 Claude AI 的强大能力
✅ 简化的本地连接方案
✅ 无需管理 API Key

**开始创造吧！** 🚀

---

## 🔗 相关链接

- Claude Desktop: https://claude.ai/download
- Claude AI: https://claude.ai

---

**需要帮助？**

查看：
1. 桥接服务器日志
2. 浏览器控制台
3. Claude Desktop 是否运行
