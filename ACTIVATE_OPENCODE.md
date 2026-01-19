# 🎉 OpenCode 已安装！

## ✅ 安装成功

OpenCode 已添加到 PATH！

---

## 🔄 激活 OpenCode

### 重新加载 shell 配置

```bash
source ~/.zshrc
```

### 验证安装

```bash
opencode --version
```

应该显示版本号！

---

## 🚀 启动 OpenCode 服务器

### 进入项目目录

```bash
cd "/Users/baiyang/Desktop/桌面 - 白阳的Mac mini/react组件/one worker白板"
```

### 启动服务器

```bash
opencode serve --cors http://localhost:5173
```

**看到：**
```
✅ OpenCode Server running on http://localhost:4096
✅ CORS enabled for: http://localhost:5173
```

---

## 🎯 设置前端

### 浏览器控制台（F12）

```javascript
localStorage.setItem('aiMode', 'local');
location.reload();
```

---

## 🎨 测试

1. 拖出 💬 AI Terminal
2. 输入："创建一个计数器"
3. 点击运行
4. OpenCode 生成代码！

---

## 💡 如果 opencode 命令还是找不到

### 手动重启终端

关闭当前终端窗口，打开新的终端

### 或者使用完整路径

```bash
# 查找 opencode 安装位置
which opencode

# 或者
find /usr/local -name opencode 2>/dev/null
```

---

**现在执行：**

```bash
source ~/.zshrc
opencode --version
```

**然后启动服务器！** 🚀
