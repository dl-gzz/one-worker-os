# 🎨 Figma → AI → Shape 自动化工作流

## 🎯 您的想法

```
Figma 设计 → 导出代码 → AI 转换 → 生成 Shape → 直接可用
```

**这是完全可行的！** 而且是未来的趋势！

---

## 🔄 完整工作流

### 方案 1：Figma → AI → Shape（推荐）

```
步骤 1: Figma 设计
    ↓
步骤 2: 使用 Figma to Code 插件
    ↓
步骤 3: 获得 React 代码
    ↓
步骤 4: AI 转换成 Shape
    ↓
步骤 5: 自动注册和使用
```

---

## 🛠️ 具体实现

### 步骤 1：在 Figma 中设计 UI

**Figma 设计示例：**
```
设计一个用户卡片：
- 头像（圆形）
- 用户名（大字体）
- 简介（小字体）
- 关注按钮
```

### 步骤 2：使用 Figma 插件导出代码

**推荐插件：**

1. **Figma to Code (HTML/CSS/React)**
   - 自动生成 React 代码
   - 支持 Tailwind CSS
   - 免费使用

2. **Anima**
   - 生成高质量 React 代码
   - 支持响应式
   - 部分功能付费

3. **Builder.io**
   - 可视化转代码
   - 支持多种框架
   - 免费版可用

**导出的代码示例：**
```jsx
// Figma 导出的 React 代码
export default function UserCard() {
  return (
    <div className="user-card">
      <img src="/avatar.jpg" className="avatar" />
      <h2 className="username">John Doe</h2>
      <p className="bio">Frontend Developer</p>
      <button className="follow-btn">Follow</button>
    </div>
  );
}
```

### 步骤 3：使用 AI 转换成 Shape

**方法 A：使用 ChatGPT/Claude**

**提示词模板：**
```
请将以下 React 组件转换成 Tldraw Shape。

要求：
1. 继承 BaseBoxShapeUtil
2. 添加 getDefaultProps 方法
3. 在 component 方法中使用 HTMLContainer 包裹
4. 添加 indicator 方法
5. 使 props 可配置（如用户名、头像等）

React 组件代码：
[粘贴 Figma 导出的代码]
```

**AI 生成的 Shape 代码：**
```javascript
import { BaseBoxShapeUtil, HTMLContainer } from 'tldraw';

export class UserCardShapeUtil extends BaseBoxShapeUtil {
    static type = 'user_card';

    getDefaultProps() {
        return {
            w: 300,
            h: 200,
            username: 'John Doe',
            bio: 'Frontend Developer',
            avatar: '/avatar.jpg',
            isFollowing: false
        };
    }

    component(shape) {
        const [isFollowing, setIsFollowing] = useState(shape.props.isFollowing);

        return (
            <HTMLContainer style={{ pointerEvents: 'all' }}>
                <div style={{
                    width: shape.props.w,
                    height: shape.props.h,
                    background: 'white',
                    borderRadius: 12,
                    padding: 20,
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 12
                }}>
                    <img 
                        src={shape.props.avatar} 
                        style={{
                            width: 80,
                            height: 80,
                            borderRadius: '50%',
                            objectFit: 'cover'
                        }}
                    />
                    <h2 style={{
                        margin: 0,
                        fontSize: 20,
                        fontWeight: 600
                    }}>
                        {shape.props.username}
                    </h2>
                    <p style={{
                        margin: 0,
                        fontSize: 14,
                        color: '#666',
                        textAlign: 'center'
                    }}>
                        {shape.props.bio}
                    </p>
                    <button
                        onClick={() => setIsFollowing(!isFollowing)}
                        style={{
                            padding: '8px 24px',
                            background: isFollowing ? '#f0f0f0' : '#000',
                            color: isFollowing ? '#000' : 'white',
                            border: 'none',
                            borderRadius: 6,
                            cursor: 'pointer',
                            fontWeight: 600
                        }}
                    >
                        {isFollowing ? 'Following' : 'Follow'}
                    </button>
                </div>
            </HTMLContainer>
        );
    }

    indicator(shape) {
        return <rect width={shape.props.w} height={shape.props.h} />;
    }
}
```

---

## 🤖 自动化方案：AI Shape 生成器

### 创建一个 AI Shape 生成器 Agent

```javascript
// AIShapeGeneratorShape.jsx
import { BaseBoxShapeUtil, HTMLContainer } from 'tldraw';
import { useState } from 'react';

export class AIShapeGeneratorShapeUtil extends BaseBoxShapeUtil {
    static type = 'ai_shape_generator';

    getDefaultProps() {
        return {
            w: 500,
            h: 600,
            figmaCode: '',
            generatedCode: '',
            status: 'idle'
        };
    }

    component(shape) {
        const [figmaCode, setFigmaCode] = useState(shape.props.figmaCode);
        const [generatedCode, setGeneratedCode] = useState('');
        const [status, setStatus] = useState('idle');

        const generateShape = async () => {
            setStatus('generating');

            const prompt = `
请将以下 React 组件转换成 Tldraw Shape。

要求：
1. 继承 BaseBoxShapeUtil
2. 添加 getDefaultProps 方法
3. 使用 HTMLContainer 包裹
4. 添加 indicator 方法
5. 使所有文本和样式可配置

React 组件代码：
${figmaCode}

请只返回完整的 Shape 代码，不要有其他说明。
`;

            try {
                const response = await fetch('/api/ai', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ prompt })
                });

                const data = await response.json();
                const code = data.candidates[0].content.parts[0].text;
                
                setGeneratedCode(code);
                setStatus('success');
            } catch (error) {
                setStatus('error');
                alert('生成失败：' + error.message);
            }
        };

        const copyCode = () => {
            navigator.clipboard.writeText(generatedCode);
            alert('代码已复制到剪贴板！');
        };

        return (
            <HTMLContainer style={{ pointerEvents: 'all' }}>
                <div style={{
                    width: shape.props.w,
                    height: shape.props.h,
                    background: 'white',
                    borderRadius: 12,
                    padding: 20,
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 12
                }}>
                    <h3 style={{ margin: 0 }}>🤖 AI Shape Generator</h3>
                    
                    <div style={{ fontSize: 12, color: '#666' }}>
                        粘贴 Figma 导出的 React 代码：
                    </div>
                    
                    <textarea
                        value={figmaCode}
                        onChange={(e) => setFigmaCode(e.target.value)}
                        placeholder="粘贴 Figma 导出的 React 代码..."
                        style={{
                            flex: 1,
                            padding: 12,
                            borderRadius: 8,
                            border: '1px solid #ddd',
                            fontFamily: 'monospace',
                            fontSize: 12,
                            resize: 'none'
                        }}
                    />

                    <button
                        onClick={generateShape}
                        disabled={status === 'generating'}
                        style={{
                            padding: '12px 24px',
                            background: status === 'generating' ? '#ccc' : '#000',
                            color: 'white',
                            border: 'none',
                            borderRadius: 8,
                            cursor: status === 'generating' ? 'not-allowed' : 'pointer',
                            fontWeight: 600
                        }}
                    >
                        {status === 'generating' ? '⏳ 生成中...' : '🚀 生成 Shape'}
                    </button>

                    {generatedCode && (
                        <>
                            <div style={{ fontSize: 12, color: '#666' }}>
                                生成的 Shape 代码：
                            </div>
                            <div style={{
                                flex: 1,
                                padding: 12,
                                background: '#f5f5f5',
                                borderRadius: 8,
                                overflow: 'auto',
                                fontFamily: 'monospace',
                                fontSize: 11
                            }}>
                                <pre style={{ margin: 0 }}>{generatedCode}</pre>
                            </div>
                            <button
                                onClick={copyCode}
                                style={{
                                    padding: '8px 16px',
                                    background: '#10b981',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: 6,
                                    cursor: 'pointer',
                                    fontWeight: 600
                                }}
                            >
                                📋 复制代码
                            </button>
                        </>
                    )}
                </div>
            </HTMLContainer>
        );
    }

    indicator(shape) {
        return <rect width={shape.props.w} height={shape.props.h} />;
    }
}
```

---

## 🚀 完整的自动化流程

### 方案 2：完全自动化（高级）

```javascript
// 1. Figma Plugin 自动导出
// 2. 自动发送到 AI
// 3. 自动生成 Shape
// 4. 自动注册到系统
// 5. 立即可用

// FigmaToShapeAutomation.js
class FigmaToShapeAutomation {
    async convertFigmaToShape(figmaNodeId) {
        // 1. 从 Figma API 获取设计
        const figmaData = await this.fetchFromFigma(figmaNodeId);
        
        // 2. 转换成 React 代码
        const reactCode = await this.figmaToReact(figmaData);
        
        // 3. AI 转换成 Shape
        const shapeCode = await this.reactToShape(reactCode);
        
        // 4. 动态创建 Shape 类
        const ShapeClass = this.createShapeClass(shapeCode);
        
        // 5. 注册到系统
        this.registerShape(ShapeClass);
        
        return ShapeClass;
    }

    async fetchFromFigma(nodeId) {
        const response = await fetch(
            `https://api.figma.com/v1/files/${FILE_KEY}/nodes?ids=${nodeId}`,
            {
                headers: {
                    'X-Figma-Token': FIGMA_ACCESS_TOKEN
                }
            }
        );
        return response.json();
    }

    async figmaToReact(figmaData) {
        // 使用 figma-to-react 或类似工具
        return convertToReact(figmaData);
    }

    async reactToShape(reactCode) {
        const prompt = `转换成 Tldraw Shape: ${reactCode}`;
        const response = await callAI(prompt);
        return response;
    }

    createShapeClass(code) {
        // 动态创建类
        const ShapeClass = eval(code);
        return ShapeClass;
    }

    registerShape(ShapeClass) {
        // 动态注册到 Tldraw
        customShapeUtils.push(ShapeClass);
    }
}
```

---

## 📋 实际使用流程

### 流程 A：手动流程（简单）

```
1. 在 Figma 设计 UI
   ↓
2. 安装 "Figma to Code" 插件
   ↓
3. 选中设计，点击 "Export to React"
   ↓
4. 复制生成的代码
   ↓
5. 在白板中创建 "AI Shape Generator"
   ↓
6. 粘贴代码，点击 "生成"
   ↓
7. 复制生成的 Shape 代码
   ↓
8. 创建新文件，粘贴代码
   ↓
9. 注册到系统
   ↓
10. 完成！可以使用了
```

**时间：5-10 分钟**

### 流程 B：半自动流程（推荐）

```
1. 在 Figma 设计 UI
   ↓
2. 使用 Figma 插件导出
   ↓
3. 在白板中使用 AI Shape Generator
   ↓
4. 自动生成并复制代码
   ↓
5. 保存到项目
   ↓
6. 完成！
```

**时间：2-3 分钟**

### 流程 C：全自动流程（未来）

```
1. 在 Figma 设计 UI
   ↓
2. 点击 "同步到白板"
   ↓
3. 自动生成 Shape
   ↓
4. 立即可用
```

**时间：30 秒**

---

## 🛠️ 需要的工具

### Figma 端

1. **Figma to Code** 插件
   - 免费
   - 支持 React
   - 质量较好

2. **Anima** 插件
   - 付费（有免费版）
   - 质量最好
   - 支持响应式

### AI 端

1. **ChatGPT API**
   - 转换代码
   - 优化结构

2. **Claude API**
   - 更好的代码理解
   - 更准确的转换

### 开发端

1. **VS Code**
   - 编辑生成的代码
   - 调试

2. **您的白板系统**
   - 测试 Shape
   - 使用

---

## 💡 最佳实践

### 1. Figma 设计规范

```
✅ 使用 Auto Layout
✅ 命名清晰
✅ 组件化设计
✅ 使用变量（颜色、字体）
```

### 2. AI 提示词优化

```
好的提示词：
"将这个 React 组件转换成 Tldraw Shape，
要求可配置的 props 包括：文本、颜色、尺寸。
添加交互功能：点击、悬停效果。"

不好的提示词：
"转换成 Shape"
```

### 3. 代码优化

```javascript
// AI 生成后，手动优化：
// 1. 添加错误处理
// 2. 优化性能
// 3. 添加注释
// 4. 测试边界情况
```

---

## 🎯 实际案例

### 案例：设计一个天气卡片

**步骤 1：Figma 设计**
```
- 城市名称
- 温度（大字体）
- 天气图标
- 描述文字
- 背景渐变
```

**步骤 2：导出 React 代码**
```jsx
export default function WeatherCard() {
  return (
    <div className="weather-card">
      <h2>Beijing</h2>
      <div className="temp">25°C</div>
      <img src="/sunny.svg" />
      <p>Sunny</p>
    </div>
  );
}
```

**步骤 3：AI 转换**
```
提示词：
"将这个天气卡片转换成 Tldraw Shape。
要求：
- 城市名称可配置
- 温度可配置
- 天气状态可配置
- 自动选择对应图标
- 添加刷新按钮"
```

**步骤 4：生成的 Shape**
```javascript
export class WeatherCardShapeUtil extends BaseBoxShapeUtil {
    static type = 'weather_card';
    
    getDefaultProps() {
        return {
            city: 'Beijing',
            temp: 25,
            condition: 'sunny'
        };
    }
    
    component(shape) {
        const [weather, setWeather] = useState(shape.props);
        
        const refresh = async () => {
            const data = await fetchWeather(shape.props.city);
            setWeather(data);
        };
        
        return (
            <HTMLContainer>
                {/* 完整的天气卡片 UI */}
            </HTMLContainer>
        );
    }
}
```

---

## 🚀 未来展望

### 即将实现的功能

1. **Figma 插件直连**
   - 一键同步设计
   - 实时更新

2. **AI 优化建议**
   - 自动优化代码
   - 性能建议

3. **组件市场**
   - 分享 Shape
   - 下载使用

4. **版本管理**
   - 设计历史
   - 回滚功能

---

## 📝 总结

### 您的想法完全可行！

✅ **Figma 设计** → 视觉设计
✅ **AI 转换** → 自动生成代码
✅ **Shape 封装** → 立即可用
✅ **可视化编程** → 拖拽使用

### 这是未来的开发方式！

**传统开发：**
```
设计 → 切图 → 写代码 → 调试 → 上线
时间：几天到几周
```

**您的方式：**
```
设计 → AI 生成 → 拖拽使用
时间：几分钟
```

---

**需要我帮您：**
1. ✅ 创建 AI Shape Generator
2. ✅ 提供 Figma 插件推荐
3. ✅ 优化 AI 提示词
4. ✅ 测试完整流程

**现在开始吗？** 🚀
