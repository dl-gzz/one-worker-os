# Tldraw 自定义组件开发指南

## 📚 组件基础结构

### 1. 核心组成部分

每个 Tldraw 组件（Shape）由三部分组成：

```javascript
class MyShapeUtil extends BaseBoxShapeUtil {
  // 1️⃣ 类型标识（必需）
  static type = 'my_shape';
  
  // 2️⃣ 默认属性（必需）
  getDefaultProps() {
    return {
      w: 300,        // 宽度
      h: 200,        // 高度
      // 自定义属性...
    };
  }
  
  // 3️⃣ 渲染组件（必需）
  component(shape) {
    return (
      <HTMLContainer>
        {/* React 组件代码 */}
      </HTMLContainer>
    );
  }
  
  // 4️⃣ 选中指示器（可选）
  indicator(shape) {
    return <rect width={shape.props.w} height={shape.props.h} />;
  }
}
```

---

## 🎯 现有组件分析

### 组件 1：AI 智能体 (AgentShapeUtil)

**技术栈**：
- React Hooks (`useState`, `useEffect`, `useCallback`)
- Tldraw `useEditor()` hook
- 自定义逻辑：邻近检测、按钮交互

**关键特性**：
```javascript
// ✅ 状态管理
const [nearbyCount, setNearbyCount] = React.useState(0);

// ✅ 定时任务
React.useEffect(() => {
  const interval = setInterval(checkProximity, 500);
  return () => clearInterval(interval);
}, []);

// ✅ 事件处理
const handleRun = React.useCallback((e) => {
  e.stopPropagation();
  runAgentTask(editor, shape.id);
}, [editor, shape.id]);
```

---

### 组件 2：结果卡片 (ResultShapeUtil)

**技术栈**：
- 纯 React（无 Hooks）
- 条件渲染
- URL 检测和图片预览

**关键特性**：
```javascript
// ✅ 智能内容识别
const isUrl = /^https?:\/\/.+/i.test(text);
const isImageUrl = /\.(jpg|png|webp)$/i.test(text);

// ✅ 条件渲染
{isImageUrl ? <img src={text} /> : <a href={text}>{text}</a>}
```

---

### 组件 3：HTML 预览器 (PreviewShapeUtil)

**技术栈**：
- iframe 沙箱
- 自定义拖拽手柄

**关键特性**：
```javascript
// ✅ 安全的 HTML 渲染
<iframe 
  srcDoc={shape.props.html}
  sandbox="allow-scripts allow-forms..."
/>
```

---

## 🛠️ 创建新组件的步骤

### 步骤 1：定义组件类

```javascript
// src/components/shapes/QuizShape.jsx
import { BaseBoxShapeUtil, HTMLContainer } from 'tldraw';
import React from 'react';

export class QuizShapeUtil extends BaseBoxShapeUtil {
  static type = 'quiz';
  
  getDefaultProps() {
    return {
      w: 400,
      h: 300,
      question: '这是一道选择题',
      options: ['选项 A', '选项 B', '选项 C', '选项 D'],
      correctAnswer: 0,
      userAnswer: null,
      showFeedback: false
    };
  }
  
  component(shape) {
    const editor = useEditor();
    
    const handleAnswer = (index) => {
      editor.updateShape({
        id: shape.id,
        type: 'quiz',
        props: {
          userAnswer: index,
          showFeedback: true
        }
      });
    };
    
    return (
      <HTMLContainer style={{
        pointerEvents: 'all',
        background: '#fff',
        border: '2px solid #3b82f6',
        borderRadius: 12,
        padding: 16,
        display: 'flex',
        flexDirection: 'column',
        gap: 12
      }}>
        {/* 题目 */}
        <div style={{ fontSize: 16, fontWeight: 600 }}>
          {shape.props.question}
        </div>
        
        {/* 选项 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {shape.props.options.map((option, index) => (
            <button
              key={index}
              onClick={() => handleAnswer(index)}
              style={{
                padding: '8px 12px',
                border: '1px solid #ddd',
                borderRadius: 6,
                background: shape.props.userAnswer === index 
                  ? (index === shape.props.correctAnswer ? '#dcfce7' : '#fee2e2')
                  : '#fff',
                cursor: 'pointer',
                textAlign: 'left'
              }}
            >
              {option}
            </button>
          ))}
        </div>
        
        {/* 反馈 */}
        {shape.props.showFeedback && (
          <div style={{
            padding: 8,
            borderRadius: 6,
            background: shape.props.userAnswer === shape.props.correctAnswer 
              ? '#dcfce7' 
              : '#fee2e2',
            fontSize: 14
          }}>
            {shape.props.userAnswer === shape.props.correctAnswer 
              ? '✅ 回答正确！' 
              : '❌ 答案错误，再试试吧'}
          </div>
        )}
      </HTMLContainer>
    );
  }
  
  indicator(shape) {
    return <rect width={shape.props.w} height={shape.props.h} rx={12} />;
  }
}
```

---

### 步骤 2：注册组件

```javascript
// src/components/TldrawBoard.jsx

// 导入新组件
import { QuizShapeUtil } from './shapes/QuizShape';

// 注册到 customShapeUtils
const customShapeUtils = [
  PreviewShapeUtil, 
  AgentShapeUtil, 
  ResultShapeUtil,
  QuizShapeUtil  // ← 添加新组件
];
```

---

### 步骤 3：创建组件实例

有两种方式：

#### 方式 A：通过 UI 按钮
```javascript
// 添加一个"创建选择题"按钮
<button onClick={() => {
  const center = editor.getViewportPageBounds().center;
  editor.createShape({
    type: 'quiz',
    x: center.x - 200,
    y: center.y - 150,
    props: {
      question: '1 + 1 = ?',
      options: ['1', '2', '3', '4'],
      correctAnswer: 1
    }
  });
}}>
  ➕ 创建选择题
</button>
```

#### 方式 B：通过 AI 生成
```javascript
// 在 AI 系统提示词中添加
CAPABILITIES:
5. 🎓 CREATE QUIZ: If user asks for a quiz or practice question,
   create a 'quiz' shape.
   Return JSON: { 
     action: "create", 
     type: "quiz", 
     props: { 
       question: "...", 
       options: [...],
       correctAnswer: 0
     } 
   }
```

---

## 🎨 组件样式指南

### 推荐的设计模式

```javascript
// ✅ 使用内联样式（Tldraw 推荐）
<div style={{ 
  background: '#fff',
  border: '2px solid #3b82f6',
  borderRadius: 12,
  padding: 16
}}>

// ❌ 避免使用外部 CSS 类
<div className="my-component">  // 不推荐
```

### 颜色方案建议

```javascript
const COLORS = {
  primary: '#3b82f6',      // 蓝色 - 主要操作
  success: '#22c55e',      // 绿色 - 成功状态
  warning: '#f59e0b',      // 橙色 - 警告
  error: '#ef4444',        // 红色 - 错误
  neutral: '#6b7280',      // 灰色 - 次要信息
  background: '#f9fafb'    // 浅灰 - 背景
};
```

---

## 🔧 常用功能模式

### 1. 更新组件状态

```javascript
const editor = useEditor();

editor.updateShape({
  id: shape.id,
  type: 'quiz',  // 必须指定类型
  props: {
    userAnswer: 2,
    showFeedback: true
  }
});
```

### 2. 读取其他组件

```javascript
// 获取所有形状
const allShapes = editor.getCurrentPageShapes();

// 获取特定形状
const targetShape = editor.getShape(shapeId);

// 获取形状边界
const bounds = editor.getShapePageBounds(shapeId);
```

### 3. 创建新组件

```javascript
import { createShapeId } from 'tldraw';

const newId = createShapeId();
editor.createShape({
  id: newId,
  type: 'quiz',
  x: 100,
  y: 200,
  props: { ... }
});
```

### 4. 阻止事件冒泡

```javascript
// 防止点击按钮时拖动组件
<button 
  onClick={(e) => {
    e.stopPropagation();
    e.preventDefault();
    // 你的逻辑
  }}
>
```

---

## 📦 组件文件组织

推荐的项目结构：

```
src/
├── components/
│   ├── TldrawBoard.jsx          # 主画布
│   ├── shapes/                  # 自定义组件文件夹
│   │   ├── AgentShape.jsx       # AI 智能体
│   │   ├── ResultShape.jsx      # 结果卡片
│   │   ├── PreviewShape.jsx     # HTML 预览
│   │   ├── QuizShape.jsx        # 选择题 ← 新组件
│   │   ├── CameraSimulator.jsx  # 相机模拟器 ← 新组件
│   │   └── index.js             # 统一导出
│   └── utils/
│       └── shapeHelpers.js      # 组件辅助函数
```

---

## 🚀 下一步：创建你的第一个 AaaS 组件

### 推荐从这些开始：

1. **选择题组件** (QuizShape) - 简单，适合入门
2. **填空题组件** (FillBlankShape) - 稍复杂，有输入框
3. **代码编辑器** (CodeEditorShape) - 集成 Monaco Editor
4. **相机模拟器** (CameraSimulatorShape) - 复杂交互

---

## 💡 关键要点

1. **组件 = React 组件**
   - 你会 React，就会写 Tldraw 组件
   
2. **状态管理 = Tldraw 自动处理**
   - 使用 `editor.updateShape()` 更新
   - 支持撤销/重做
   
3. **样式 = 内联样式**
   - 避免外部 CSS
   - 使用 `style` 属性
   
4. **交互 = 标准 React 事件**
   - `onClick`, `onChange` 等
   - 记得 `stopPropagation()`

---

**准备好创建你的第一个组件了吗？** 🎯

告诉我你想先做哪一个，我会提供完整的代码！
