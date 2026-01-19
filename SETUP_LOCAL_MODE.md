# 🎯 设置本地模式 - 一键脚本

## 当前状态

```
✅ AIProvider 已初始化
⚠️ 模式: cloud（云端）
⚠️ Token: 未配对
```

需要切换到本地模式！

---

## 🚀 立即设置（复制粘贴）

### 在浏览器控制台（F12）执行：

```javascript
// 设置本地模式
localStorage.setItem('aiMode', 'local');
localStorage.setItem('claudeToken', 'local-bridge');

// 刷新页面
location.reload();
```

---

## ✅ 设置后应该看到

刷新后，控制台应该显示：

```
🚀 AIProvider 初始化
   模式: local          ← 已改为 local
   Token: 已配对        ← 已配对
🔗 正在连接本地 Claude Code...
```

---

## 🔧 如果桥接服务器还没启动

### 打开新终端，执行：

```bash
cd "/Users/baiyang/Desktop/桌面 - 白阳的Mac mini/react组件/one worker白板/local-ai-bridge"
npm start
```

---

## 📋 完整流程

### 1. 启动 Claude Desktop
- 打开 Claude Desktop 应用
- 保持运行

### 2. 启动桥接服务器
```bash
cd local-ai-bridge
npm start
```

### 3. 设置浏览器为本地模式
```javascript
localStorage.setItem('aiMode', 'local');
localStorage.setItem('claudeToken', 'local-bridge');
location.reload();
```

### 4. 测试
- 拖出 💬 AI Terminal
- 输入："创建一个计数器"
- 点击运行

---

## 🎉 完成！

设置完成后就可以使用本地 Claude AI 了！
