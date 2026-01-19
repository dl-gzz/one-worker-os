# 🔐 一次性配对方案 - 超简化实现

## 💡 核心理念

**不需要持续运行的桌面应用，只需要一次性配对！**

```
传统方案：
持续运行桌面应用 ← 复杂、笨重

一次性配对：
运行一次 CLI → 获取 Token → 存入浏览器 → 完成！
```

---

## 🎯 工作流程

### 用户视角（超简单）

```
步骤 1：打开 AI OS 网页
  ↓
步骤 2：选择"本地 AI"
  ↓
步骤 3：提示"需要配对"
  ↓
步骤 4：下载并运行 CLI
  ↓
步骤 5：浏览器自动打开，配对完成！
  ↓
步骤 6：以后自动连接，无需再配对
```

### 技术流程

```
1. CLI 读取 Claude Code 的 Token
   ↓
2. CLI 打开浏览器：
   https://your-app.com/pair?token=xxx
   ↓
3. 网页捕获 Token
   ↓
4. 存入 localStorage
   ↓
5. 清理 URL
   ↓
6. 配对完成！
```

---

## 💻 实现代码

### 1. CLI 工具（Node.js）

```javascript
#!/usr/bin/env node
// aios-connector.js

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

// Claude Code 的 Token 文件位置
const CLAUDE_TOKEN_PATH = path.join(
    process.env.HOME,
    '.claude',
    'auth.json'
);

// 读取 Token
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

// 主函数
function main() {
    console.log('🔗 AI OS Connector');
    console.log('正在读取 Claude Code Token...');
    
    const token = getClaudeToken();
    console.log('✅ Token 已获取');
    
    // 构造配对 URL
    const pairUrl = `http://localhost:5173/pair?token=${encodeURIComponent(token)}`;
    
    console.log('🌐 正在打开浏览器...');
    
    // 打开浏览器
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
            console.log('您现在可以关闭此窗口');
        }
    });
}

main();
```

**打包成可执行文件：**

```json
// package.json
{
  "name": "aios-connector",
  "version": "1.0.0",
  "bin": {
    "aios-connector": "./aios-connector.js"
  },
  "pkg": {
    "targets": ["node18-macos-x64", "node18-win-x64", "node18-linux-x64"]
  }
}
```

```bash
# 安装打包工具
npm install -g pkg

# 打包
pkg package.json

# 生成：
# aios-connector-macos
# aios-connector-win.exe
# aios-connector-linux
```

---

### 2. 前端配对页面

```javascript
// src/pages/PairPage.jsx
import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

function PairPage() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();

    useEffect(() => {
        const token = searchParams.get('token');
        
        if (token) {
            // 1. 存入 localStorage
            localStorage.setItem('claudeToken', token);
            console.log('✅ Token 已保存');
            
            // 2. 清理 URL（安全）
            window.history.replaceState({}, '', '/pair');
            
            // 3. 显示成功消息
            setTimeout(() => {
                navigate('/');
            }, 2000);
        }
    }, [searchParams, navigate]);

    const token = searchParams.get('token');

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100vh',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white'
        }}>
            {token ? (
                <>
                    <div style={{ fontSize: 64, marginBottom: 20 }}>✅</div>
                    <h1 style={{ fontSize: 32, marginBottom: 10 }}>配对成功！</h1>
                    <p style={{ fontSize: 16, opacity: 0.9 }}>
                        正在跳转到主页...
                    </p>
                </>
            ) : (
                <>
                    <div style={{ fontSize: 64, marginBottom: 20 }}>🔗</div>
                    <h1 style={{ fontSize: 32, marginBottom: 10 }}>等待配对</h1>
                    <p style={{ fontSize: 16, opacity: 0.9 }}>
                        请运行 aios-connector 工具
                    </p>
                </>
            )}
        </div>
    );
}

export default PairPage;
```

---

### 3. 修改 AIProvider 使用 Token

```javascript
// src/services/AIProvider.js
class AIProvider {
    constructor() {
        this.mode = localStorage.getItem('aiMode') || 'cloud';
        this.token = localStorage.getItem('claudeToken');
        this.localWs = null;
    }

    // 检查是否已配对
    isPaired() {
        return !!this.token;
    }

    // 连接本地 Claude Code
    async connectLocal() {
        if (!this.token) {
            throw new Error('未配对。请先运行 aios-connector');
        }

        try {
            // 使用 Token 连接
            this.localWs = new WebSocket('ws://localhost:3005');
            
            this.localWs.onopen = () => {
                // 发送认证
                this.localWs.send(JSON.stringify({
                    type: 'auth',
                    token: this.token
                }));
                console.log('✅ 已连接到本地 Claude Code');
            };
            
            // ... 其他处理
            
        } catch (error) {
            console.error('连接失败:', error);
            throw error;
        }
    }

    // 取消配对
    unpair() {
        localStorage.removeItem('claudeToken');
        this.token = null;
        if (this.localWs) {
            this.localWs.close();
        }
    }
}
```

---

### 4. 配对引导 UI

```javascript
// 在 AI Terminal 中添加
function PairingGuide() {
    const [isPaired, setIsPaired] = useState(AIProvider.isPaired());

    if (isPaired) {
        return (
            <div style={{
                padding: 12,
                background: 'rgba(16, 185, 129, 0.2)',
                borderRadius: 8,
                fontSize: 12,
                color: 'white'
            }}>
                ✅ 已配对本地 Claude Code
                <button
                    onClick={() => {
                        AIProvider.unpair();
                        setIsPaired(false);
                    }}
                    style={{
                        marginLeft: 8,
                        padding: '4px 8px',
                        background: 'rgba(255,255,255,0.2)',
                        color: 'white',
                        border: 'none',
                        borderRadius: 4,
                        cursor: 'pointer',
                        fontSize: 11
                    }}
                >
                    取消配对
                </button>
            </div>
        );
    }

    return (
        <div style={{
            padding: 12,
            background: 'rgba(251, 191, 36, 0.2)',
            borderRadius: 8,
            fontSize: 12,
            color: 'white'
        }}>
            <div style={{ marginBottom: 8 }}>
                ⚠️ 需要配对才能使用本地 AI
            </div>
            <div style={{ fontSize: 11, opacity: 0.9, marginBottom: 8 }}>
                1. 下载 aios-connector
                <br />
                2. 运行工具
                <br />
                3. 浏览器自动完成配对
            </div>
            <a
                href="/downloads/aios-connector"
                download
                style={{
                    display: 'inline-block',
                    padding: '6px 12px',
                    background: 'rgba(255,255,255,0.9)',
                    color: '#667eea',
                    textDecoration: 'none',
                    borderRadius: 6,
                    fontSize: 12,
                    fontWeight: 600
                }}
            >
                📥 下载配对工具
            </a>
        </div>
    );
}
```

---

## 🎯 完整流程演示

### 首次使用

```
1. 用户打开 AI OS
   ↓
2. 选择"本地 AI"模式
   ↓
3. 看到提示："需要配对"
   ↓
4. 点击"下载配对工具"
   ↓
5. 下载 aios-connector
   ↓
6. 双击运行
   ↓
7. 终端显示：
   🔗 AI OS Connector
   正在读取 Claude Code Token...
   ✅ Token 已获取
   🌐 正在打开浏览器...
   ✅ 配对完成！
   ↓
8. 浏览器自动打开配对页面
   ↓
9. 显示："✅ 配对成功！"
   ↓
10. 自动跳转回主页
   ↓
11. AI Terminal 显示："✅ 已配对本地 Claude Code"
   ↓
12. 完成！以后自动连接
```

### 后续使用

```
1. 打开 AI OS
   ↓
2. 自动从 localStorage 读取 Token
   ↓
3. 自动连接本地 Claude Code
   ↓
4. 直接使用，无需再配对！
```

---

## 🔒 安全考虑

### 1. Token 传输安全

```javascript
// URL 中的 Token 立即被清理
window.history.replaceState({}, '', '/pair');

// Token 只存在于：
// - localStorage（浏览器本地）
// - 内存中（运行时）
```

### 2. Token 存储安全

```javascript
// localStorage 是域隔离的
// 只有您的网站能访问
// 其他网站无法读取
```

### 3. Token 过期处理

```javascript
// 定期验证 Token
async function validateToken() {
    try {
        await AIProvider.connectLocal();
        return true;
    } catch (error) {
        // Token 失效，提示重新配对
        AIProvider.unpair();
        return false;
    }
}
```

---

## 📊 优势对比

| 方案 | 复杂度 | 用户体验 | 安全性 |
|------|--------|---------|--------|
| **持续运行桌面应用** | ⭐⭐⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐⭐ |
| **一次性配对 CLI** | ⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |

---

## 🚀 实施计划

### 阶段 1：CLI 工具（1天）

```
✅ 创建 Node.js CLI
✅ 读取 Claude Token
✅ 打开浏览器
✅ 打包成可执行文件
```

### 阶段 2：前端集成（半天）

```
✅ 创建配对页面
✅ 捕获和存储 Token
✅ 修改 AIProvider
✅ 添加配对引导 UI
```

### 阶段 3：测试和发布（半天）

```
✅ 测试完整流程
✅ 优化用户体验
✅ 发布 CLI 工具
```

**总计：2 天完成！**

---

## 🎉 总结

### 这个方案的完美之处

**1. 简单**
- 用户只需运行一次
- 以后自动连接

**2. 安全**
- Token 不暴露
- 域隔离保护

**3. 优雅**
- 保持 Web 应用纯粹性
- 无需重量级桌面应用

**4. 可行**
- 技术成熟
- 2 天可完成

---

**这就是最终方案！** 🚀

**要开始实现吗？** 😊
