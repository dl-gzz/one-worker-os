# 🚀 Claude Code 集成 - 完成指南

## ✅ 已完成

1. **AIProvider 服务** ✅
   - 位置：`src/services/AIProvider.js`
   - 功能：统一管理云端和本地 AI
   - 自动降级机制

2. **配对页面** ✅
   - 位置：`src/pages/PairPage.jsx`
   - 功能：接收 CLI 工具的 Token
   - 自动跳转

3. **AI Terminal Shape** ✅
   - 位置：`src/components/shapes/AITerminalShape.jsx`
   - 需要：添加 AIProvider 导入

---

## 🔧 需要手动完成的步骤

### 步骤 1：修改 AITerminalShape.jsx

**在文件顶部添加导入：**

```javascript
// 在第 4 行添加
import AIProvider from '../../services/AIProvider';
```

**修改 createNewShape 函数（第 80-141 行）：**

将：
```javascript
const response = await fetch('/api/ai', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        prompt: `你是一个...`
    })
});

const data = await response.json();
const code = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
```

替换为：
```javascript
const code = await AIProvider.generate(`你是一个...`);
```

---

### 步骤 2：添加路由

**在 `src/App.jsx` 或主路由文件中添加：**

```javascript
import PairPage from './pages/PairPage';

// 在路由配置中添加
<Route path="/pair" element={<PairPage />} />
```

---

### 步骤 3：创建 CLI 工具（可选）

**创建 `cli/aios-connector.js`：**

```javascript
#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

// Claude Code 的 Token 文件位置
const CLAUDE_TOKEN_PATH = path.join(
    process.env.HOME,
    '.claude',
    'auth.json'
);

function getClaudeToken() {
    try {
        const authData = JSON.parse(fs.readFileSync(CLAUDE_TOKEN_PATH, 'utf8'));
        return authData.token;
    } catch (error) {
        console.error('❌ 无法读取 Claude Code Token');
        console.error('请确保 Claude Desktop 已安装并登录');
        process.exit(1);
    }
}

function main() {
    console.log('🔗 AI OS Connector');
    console.log('正在读取 Claude Code Token...');
    
    const token = getClaudeToken();
    console.log('✅ Token 已获取');
    
    const pairUrl = `http://localhost:5173/pair?token=${encodeURIComponent(token)}`;
    
    console.log('🌐 正在打开浏览器...');
    
    const command = process.platform === 'darwin' 
        ? `open "${pairUrl}"`
        : process.platform === 'win32'
        ? `start "${pairUrl}"`
        : `xdg-open "${pairUrl}"`;
    
    exec(command, (error) => {
        if (error) {
            console.error('❌ 无法打开浏览器');
            console.log('请手动访问：', pairUrl);
        } else {
            console.log('✅ 配对完成！');
        }
    });
}

main();
```

---

## 🎯 测试流程

### 测试云端模式（默认）

```
1. 刷新浏览器
2. 拖出 AI Terminal
3. 输入："创建一个时钟"
4. 点击运行
5. 应该使用云端 Gemini API 生成
```

### 测试本地模式（需要 Claude Desktop）

```
1. 启动 Claude Desktop
2. 运行 CLI 工具：node cli/aios-connector.js
3. 浏览器自动打开配对页面
4. 配对成功后跳转回主页
5. AI Terminal 会自动使用本地 Claude Code
```

---

## 📊 当前状态

| 组件 | 状态 | 说明 |
|------|------|------|
| AIProvider | ✅ 完成 | 统一 AI 接口 |
| PairPage | ✅ 完成 | 配对页面 |
| AITerminalShape | ⚠️ 需修改 | 添加 AIProvider 导入 |
| 路由配置 | ⏳ 待添加 | 添加 /pair 路由 |
| CLI 工具 | ⏳ 可选 | 用于配对 |

---

## 🚀 快速开始

### 最简单的方式（只用云端）

**当前已经可以工作！**

AI Terminal 默认使用云端 Gemini API，无需任何配置。

### 添加本地支持（可选）

1. 修改 AITerminalShape.jsx（添加导入）
2. 添加路由配置
3. 创建 CLI 工具
4. 测试配对流程

---

## 💡 提示

**AIProvider 已经自动初始化！**

在 `AIProvider.js` 的最后：
```javascript
const aiProvider = new AIProvider();
aiProvider.init();
export default aiProvider;
```

所以您只需要：
1. 导入 AIProvider
2. 调用 `AIProvider.generate(prompt)`

就可以自动享受：
- 云端/本地自动选择
- 自动降级
- 连接管理

---

**现在就可以测试云端模式！** 🎉

刷新浏览器，拖出 AI Terminal，试试看！
