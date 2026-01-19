# 🎯 最简单的方案 - OpenCode

## 💡 核心发现

**OpenCode 自带 HTTP 服务器！**

不需要任何桥接服务器，直接通信！

---

## 🚀 3 步开始

### 步骤 1：安装 OpenCode

```bash
npm install -g opencode
```

### 步骤 2：启动 OpenCode 服务器

```bash
opencode serve --cors http://localhost:5173
```

### 步骤 3：设置前端

浏览器控制台（F12）：

```javascript
localStorage.setItem('aiMode', 'local');
location.reload();
```

**完成！** 🎉

---

## 📝 需要修改的代码

### AIProvider.js 中的 generateLocal 方法

```javascript
async generateLocal(prompt) {
    // 直接调用 OpenCode HTTP API
    const response = await fetch('http://localhost:4096/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            prompt: prompt,
            model: 'gpt-4'
        })
    });

    const data = await response.json();
    return data.code;
}
```

**就这么简单！**

---

## 🎯 对比

### ❌ 之前（Claude Desktop + 桥接服务器）

```
1. 安装 Claude Desktop
2. 登录
3. 创建桥接服务器（150+ 行代码）
4. 启动桥接服务器
5. WebSocket 通信
6. 配置文件读取
7. Token 管理
```

### ✅ 现在（OpenCode）

```
1. opencode serve --cors http://localhost:5173
2. fetch('http://localhost:4096/api/generate')
```

**从 7 步到 2 步！**

---

## 💡 为什么选择 OpenCode？

1. **官方 HTTP 服务器** - 不需要自己写
2. **CORS 支持** - 一个参数搞定
3. **标准 HTTP** - 简单可靠
4. **完整文档** - 官方支持
5. **零配置** - 开箱即用

---

## 🎉 结论

**OpenCode 是最佳选择！**

- 简单
- 可靠
- 官方支持
- 零额外代码

**立即采用！** 🚀
