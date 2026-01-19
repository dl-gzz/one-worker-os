# 🎯 超简化的混合 AI 架构

## 💡 核心理念

**让用户选择 AI 来源：**

```
选项 1：云端 API（简单）
  ↓
直接调用 Gemini/OpenAI
快速、零配置

选项 2：本地 AI（强大）
  ↓
连接本地 Claude/Ollama
隐私、离线、免费
```

---

## 🚀 超简单实现（30分钟）

### 步骤 1：创建 AI 提供商管理器

```javascript
// src/services/AIProvider.js
class AIProvider {
    constructor() {
        this.mode = localStorage.getItem('aiMode') || 'cloud'; // cloud 或 local
        this.localWs = null;
    }

    // 设置模式
    setMode(mode) {
        this.mode = mode;
        localStorage.setItem('aiMode', mode);
        
        if (mode === 'local') {
            this.connectLocal();
        }
    }

    // 连接本地 AI
    connectLocal() {
        try {
            this.localWs = new WebSocket('ws://localhost:3005');
            
            this.localWs.onopen = () => {
                console.log('✅ 已连接到本地 AI');
            };
            
            this.localWs.onerror = () => {
                console.log('❌ 本地 AI 未运行，切换到云端模式');
                this.setMode('cloud');
            };
        } catch (error) {
            console.log('本地连接失败，使用云端模式');
            this.setMode('cloud');
        }
    }

    // 统一的生成接口
    async generate(prompt) {
        if (this.mode === 'local' && this.localWs?.readyState === WebSocket.OPEN) {
            return this.generateLocal(prompt);
        } else {
            return this.generateCloud(prompt);
        }
    }

    // 本地生成
    generateLocal(prompt) {
        return new Promise((resolve, reject) => {
            this.localWs.send(JSON.stringify({ 
                type: 'generate',
                prompt 
            }));
            
            this.localWs.onmessage = (event) => {
                const data = JSON.parse(event.data);
                resolve(data.code);
            };
            
            setTimeout(() => reject('超时'), 30000);
        });
    }

    // 云端生成
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

---

### 步骤 2：修改 AI Shape Generator

```javascript
// AIShapeGeneratorShape.jsx
import AIProvider from '../services/AIProvider';

const generateShape = async () => {
    setStatus('generating');
    
    try {
        // 使用统一接口，自动选择云端或本地
        const code = await AIProvider.generate(`
            创建一个 Tldraw Shape：${prompt}
            
            要求：
            - 继承 BaseBoxShapeUtil
            - 实现所有必需方法
            - 使用 HTMLContainer
        `);
        
        setGeneratedCode(code);
        setStatus('success');
        
    } catch (error) {
        setStatus('error');
        alert('生成失败：' + error.message);
    }
};
```

---

### 步骤 3：添加设置面板

```javascript
// AISettingsPanel.jsx
import AIProvider from '../services/AIProvider';

function AISettingsPanel() {
    const [mode, setMode] = useState(AIProvider.mode);
    const [localStatus, setLocalStatus] = useState('未连接');

    const handleModeChange = (newMode) => {
        setMode(newMode);
        AIProvider.setMode(newMode);
    };

    return (
        <div style={{
            position: 'fixed',
            top: 20,
            right: 20,
            background: 'white',
            padding: 20,
            borderRadius: 12,
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            zIndex: 1000
        }}>
            <h3>⚙️ AI 设置</h3>
            
            <div style={{ marginTop: 16 }}>
                <label>
                    <input
                        type="radio"
                        checked={mode === 'cloud'}
                        onChange={() => handleModeChange('cloud')}
                    />
                    <span style={{ marginLeft: 8 }}>☁️ 云端 AI（简单）</span>
                </label>
                <div style={{ fontSize: 12, color: '#666', marginLeft: 24 }}>
                    使用 Gemini API，需要网络
                </div>
            </div>

            <div style={{ marginTop: 12 }}>
                <label>
                    <input
                        type="radio"
                        checked={mode === 'local'}
                        onChange={() => handleModeChange('local')}
                    />
                    <span style={{ marginLeft: 8 }}>💻 本地 AI（强大）</span>
                </label>
                <div style={{ fontSize: 12, color: '#666', marginLeft: 24 }}>
                    连接本地 Claude/Ollama，隐私保护
                </div>
                {mode === 'local' && (
                    <div style={{ 
                        fontSize: 11, 
                        color: localStatus === '已连接' ? '#10b981' : '#ef4444',
                        marginLeft: 24,
                        marginTop: 4
                    }}>
                        状态：{localStatus}
                    </div>
                )}
            </div>

            {mode === 'local' && localStatus === '未连接' && (
                <div style={{
                    marginTop: 16,
                    padding: 12,
                    background: '#fef3c7',
                    borderRadius: 8,
                    fontSize: 12
                }}>
                    ⚠️ 请先启动本地 AI 应用：
                    <ul style={{ margin: '8px 0', paddingLeft: 20 }}>
                        <li>Claude Desktop</li>
                        <li>Ollama</li>
                        <li>LM Studio</li>
                    </ul>
                </div>
            )}
        </div>
    );
}
```

---

## 🎯 使用场景

### 场景 1：快速开始（云端）

```
用户：刚打开应用
系统：默认使用云端 API
体验：立即可用，零配置
```

### 场景 2：隐私保护（本地）

```
用户：启动 Claude Desktop
系统：自动检测并连接
体验：数据不离开电脑
```

### 场景 3：自动降级

```
用户：选择本地模式
本地 AI：未运行
系统：自动切换到云端
体验：无缝降级
```

---

## 📊 对比

| 特性 | 云端模式 | 本地模式 |
|------|---------|---------|
| 配置 | ✅ 零配置 | ⚠️ 需要安装 |
| 速度 | ⚠️ 依赖网络 | ✅ 本地快速 |
| 隐私 | ⚠️ 数据上传 | ✅ 完全本地 |
| 成本 | ⚠️ API 费用 | ✅ 免费 |
| 离线 | ❌ 需要网络 | ✅ 可离线 |

---

## 🚀 立即可用的本地 AI

### 推荐的本地 AI 应用

1. **Ollama**（最简单）
   ```bash
   # 安装
   brew install ollama
   
   # 运行
   ollama serve
   
   # 下载模型
   ollama pull codellama
   ```

2. **LM Studio**（图形界面）
   - 下载：lmstudio.ai
   - 一键启动本地服务器

3. **Claude Desktop**（官方）
   - 需要订阅
   - 最佳质量

---

## 💡 实现优先级

### 现在（30分钟）

```
✅ 创建 AIProvider 类
✅ 修改 AI Shape Generator
✅ 添加模式切换
```

### 以后（可选）

```
💡 添加设置面板 UI
💡 支持更多本地 AI
💡 流式输出
💡 模型选择
```

---

## 🎯 总结

### 这个架构的优势

**1. 简单**
- 只需一个 AIProvider 类
- 自动检测和降级
- 用户无感知切换

**2. 灵活**
- 支持云端和本地
- 可以随时切换
- 未来可扩展

**3. 实用**
- 云端：快速开始
- 本地：隐私保护
- 两全其美

---

**要实现吗？** 😊

只需 30 分钟，就能让您的系统支持：
- ☁️ 云端 AI（现有）
- 💻 本地 AI（新增）
- 🔄 自动切换（智能）
