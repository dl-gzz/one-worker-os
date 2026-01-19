# 🚀 快速开始：创建您的第一个智能 Shape

## 🎯 目标

在 5 分钟内创建一个可以与后端通信的 Shape！

## 📋 步骤

### 1️⃣ 启动后端服务器（可选）

如果您想测试数据库查询 Shape：

```bash
# 进入后端目录
cd backend

# 安装依赖
npm install

# 启动服务器
npm start
```

您应该看到：
```
🚀 Backend server running on http://localhost:3001
```

### 2️⃣ 测试数据库 Shape

1. **刷新浏览器**
2. **点击 Dock 中的 🗄️ 图标**（如果已添加）
3. **输入简单的 SQL 查询**：
   ```sql
   SELECT 1 as test
   ```
4. **点击 "Execute Query"**
5. **查看结果！**

---

## 💡 创建自定义 Shape 的 3 种方式

### 方式 1：简单的 API 调用 Shape

**最简单，适合快速原型**

```javascript
// 在任何现有 Shape 中添加
const callAPI = async () => {
    const response = await fetch('https://api.example.com/data');
    const data = await response.json();
    console.log(data);
};
```

### 方式 2：复制现有 Shape 并修改

**推荐，快速上手**

```bash
# 复制 DatabaseQueryShape
cp src/components/shapes/DatabaseQueryShape.jsx src/components/shapes/MyAPIShape.jsx

# 修改：
# 1. 改 static type = 'my_api'
# 2. 改 API 端点
# 3. 改 UI 显示
```

### 方式 3：从零开始创建

**完全自定义**

参考 `ADVANCED_SHAPES_GUIDE.md` 中的详细教程。

---

## 🎨 示例：天气查询 Shape

让我们创建一个简单的天气查询 Shape：

### 步骤 1：创建 Shape 文件

```javascript
// src/components/shapes/WeatherShape.jsx
import { BaseBoxShapeUtil, HTMLContainer } from 'tldraw';
import { useState } from 'react';

export class WeatherShapeUtil extends BaseBoxShapeUtil {
    static type = 'weather';

    getDefaultProps() {
        return {
            w: 300,
            h: 200,
            city: 'Beijing',
            weather: null
        };
    }

    component(shape) {
        const [city, setCity] = useState(shape.props.city);
        const [weather, setWeather] = useState(null);

        const getWeather = async () => {
            // 调用天气 API
            const response = await fetch(
                `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=YOUR_KEY`
            );
            const data = await response.json();
            setWeather(data);
        };

        return (
            <HTMLContainer style={{ pointerEvents: 'all' }}>
                <div style={{ padding: 16, background: 'white', borderRadius: 12 }}>
                    <h3>🌤️ Weather</h3>
                    <input 
                        value={city} 
                        onChange={e => setCity(e.target.value)}
                        placeholder="City name"
                    />
                    <button onClick={getWeather}>Get Weather</button>
                    {weather && (
                        <div>
                            <p>Temperature: {weather.main.temp}°C</p>
                            <p>Condition: {weather.weather[0].description}</p>
                        </div>
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

### 步骤 2：注册 Shape

在 `TldrawBoard.jsx` 中：

```javascript
import { WeatherShapeUtil } from './shapes/WeatherShape';

const customShapeUtils = [
    // ... 其他 Shape
    WeatherShapeUtil,
];
```

### 步骤 3：添加到 Dock

```javascript
const builtInApps = [
    // ... 其他应用
    { 
        id: 'weather', 
        icon: '🌤️', 
        label: 'Weather', 
        type: 'weather', 
        props: {}, 
        builtin: true 
    },
];
```

### 步骤 4：测试

1. 刷新浏览器
2. 点击 🌤️ 图标
3. 输入城市名
4. 查看天气！

---

## 🔥 更多创意 Shape 想法

### 1. 股票查询 Shape
```
输入：股票代码
输出：实时价格、涨跌幅
API：Yahoo Finance / Alpha Vantage
```

### 2. 翻译 Shape
```
输入：文本 + 目标语言
输出：翻译结果
API：Google Translate / DeepL
```

### 3. 图片生成 Shape
```
输入：提示词
输出：AI 生成的图片
API：DALL-E / Stable Diffusion
```

### 4. 代码执行 Shape
```
输入：Python/JavaScript 代码
输出：执行结果
后端：沙盒环境
```

### 5. 数据可视化 Shape
```
输入：数据 JSON
输出：图表（折线图、柱状图）
库：Chart.js / D3.js
```

---

## 🛠️ 调试技巧

### 查看 Shape 数据

```javascript
console.log('Shape props:', shape.props);
console.log('Shape type:', shape.type);
```

### 测试 API 调用

```javascript
// 在浏览器控制台
fetch('http://localhost:3001/api/test')
    .then(r => r.json())
    .then(console.log);
```

### 检查后端日志

```bash
# 后端终端会显示所有请求
POST /api/database/query 200 45ms
```

---

## ❓ 常见问题

### Q: Shape 不显示？
A: 检查是否注册到 `customShapeUtils` 数组

### Q: API 调用失败？
A: 
1. 检查后端是否运行
2. 检查 CORS 设置
3. 查看浏览器控制台错误

### Q: 如何保存 Shape 状态？
A: 使用 `shape.props` 存储数据，Tldraw 会自动持久化

### Q: 如何让 Shape 响应箭头连接？
A: 参考 `AI Agent Shape` 的 `getUpstreamData` 实现

---

## 🎯 下一步

1. ✅ 创建您的第一个 Shape
2. ✅ 测试与后端通信
3. ✅ 添加到 Dock
4. ✅ 保存为应用模板
5. ✅ 分享给团队！

---

**开始创建吧！** 🚀

有问题？查看 `ADVANCED_SHAPES_GUIDE.md` 获取详细文档。
