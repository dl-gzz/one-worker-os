# 🎨 将任何 React 组件封装成 Shape

## 🎯 核心概念

**任何 React 组件都可以变成 Tldraw Shape！**

```
React 组件 → Shape → 可拖拽、可连接、可保存
```

---

## 📚 完整示例集合

### 示例 1：数据表格 Shape

```javascript
// TableShape.jsx
import { BaseBoxShapeUtil, HTMLContainer } from 'tldraw';
import { useState } from 'react';

export class TableShapeUtil extends BaseBoxShapeUtil {
    static type = 'data_table';

    getDefaultProps() {
        return {
            w: 600,
            h: 400,
            data: [
                { id: 1, name: '张三', age: 25, city: '北京' },
                { id: 2, name: '李四', age: 30, city: '上海' },
            ],
            columns: ['id', 'name', 'age', 'city']
        };
    }

    component(shape) {
        const [data, setData] = useState(shape.props.data);
        const [editingCell, setEditingCell] = useState(null);

        const handleCellEdit = (rowIndex, colName, value) => {
            const newData = [...data];
            newData[rowIndex][colName] = value;
            setData(newData);
        };

        return (
            <HTMLContainer style={{ pointerEvents: 'all' }}>
                <div style={{
                    width: shape.props.w,
                    height: shape.props.h,
                    background: 'white',
                    borderRadius: 8,
                    padding: 16,
                    overflow: 'auto',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                }}>
                    <h3 style={{ margin: '0 0 12px 0' }}>📊 Data Table</h3>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr>
                                {shape.props.columns.map(col => (
                                    <th key={col} style={{
                                        padding: 8,
                                        borderBottom: '2px solid #ddd',
                                        textAlign: 'left',
                                        fontWeight: 600
                                    }}>
                                        {col}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {data.map((row, rowIndex) => (
                                <tr key={rowIndex}>
                                    {shape.props.columns.map(col => (
                                        <td key={col} style={{
                                            padding: 8,
                                            borderBottom: '1px solid #eee'
                                        }}>
                                            {editingCell?.row === rowIndex && editingCell?.col === col ? (
                                                <input
                                                    autoFocus
                                                    value={row[col]}
                                                    onChange={(e) => handleCellEdit(rowIndex, col, e.target.value)}
                                                    onBlur={() => setEditingCell(null)}
                                                    style={{ width: '100%', padding: 4 }}
                                                />
                                            ) : (
                                                <div 
                                                    onClick={() => setEditingCell({ row: rowIndex, col })}
                                                    style={{ cursor: 'pointer' }}
                                                >
                                                    {row[col]}
                                                </div>
                                            )}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    <button
                        onClick={() => setData([...data, { id: data.length + 1, name: '', age: 0, city: '' }])}
                        style={{
                            marginTop: 12,
                            padding: '6px 12px',
                            background: '#000',
                            color: 'white',
                            border: 'none',
                            borderRadius: 4,
                            cursor: 'pointer'
                        }}
                    >
                        + Add Row
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

### 示例 2：图表 Shape

```javascript
// ChartShape.jsx
import { BaseBoxShapeUtil, HTMLContainer } from 'tldraw';
import { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

export class ChartShapeUtil extends BaseBoxShapeUtil {
    static type = 'chart';

    getDefaultProps() {
        return {
            w: 500,
            h: 300,
            data: [
                { name: 'Jan', value: 400 },
                { name: 'Feb', value: 300 },
                { name: 'Mar', value: 600 },
                { name: 'Apr', value: 800 },
                { name: 'May', value: 500 },
            ],
            chartType: 'line' // line, bar, area
        };
    }

    component(shape) {
        const [data, setData] = useState(shape.props.data);

        return (
            <HTMLContainer style={{ pointerEvents: 'all' }}>
                <div style={{
                    width: shape.props.w,
                    height: shape.props.h,
                    background: 'white',
                    borderRadius: 8,
                    padding: 16,
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                }}>
                    <h3 style={{ margin: '0 0 12px 0' }}>📈 Chart</h3>
                    <LineChart width={shape.props.w - 32} height={shape.props.h - 80} data={data}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Line type="monotone" dataKey="value" stroke="#8884d8" />
                    </LineChart>
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

### 示例 3：日历 Shape

```javascript
// CalendarShape.jsx
import { BaseBoxShapeUtil, HTMLContainer } from 'tldraw';
import { useState } from 'react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';

export class CalendarShapeUtil extends BaseBoxShapeUtil {
    static type = 'calendar';

    getDefaultProps() {
        return {
            w: 350,
            h: 400,
            selectedDate: new Date(),
            events: {}
        };
    }

    component(shape) {
        const [date, setDate] = useState(new Date(shape.props.selectedDate));
        const [events, setEvents] = useState(shape.props.events);
        const [newEvent, setNewEvent] = useState('');

        const addEvent = () => {
            const dateKey = date.toDateString();
            setEvents({
                ...events,
                [dateKey]: [...(events[dateKey] || []), newEvent]
            });
            setNewEvent('');
        };

        const dateKey = date.toDateString();
        const todayEvents = events[dateKey] || [];

        return (
            <HTMLContainer style={{ pointerEvents: 'all' }}>
                <div style={{
                    width: shape.props.w,
                    height: shape.props.h,
                    background: 'white',
                    borderRadius: 8,
                    padding: 16,
                    overflow: 'auto',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                }}>
                    <h3 style={{ margin: '0 0 12px 0' }}>📅 Calendar</h3>
                    <Calendar
                        onChange={setDate}
                        value={date}
                    />
                    <div style={{ marginTop: 16 }}>
                        <h4>Events for {date.toLocaleDateString()}</h4>
                        {todayEvents.map((event, i) => (
                            <div key={i} style={{
                                padding: 8,
                                background: '#f0f0f0',
                                borderRadius: 4,
                                marginBottom: 4
                            }}>
                                {event}
                            </div>
                        ))}
                        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                            <input
                                value={newEvent}
                                onChange={(e) => setNewEvent(e.target.value)}
                                placeholder="Add event..."
                                style={{ flex: 1, padding: 6, borderRadius: 4, border: '1px solid #ddd' }}
                            />
                            <button
                                onClick={addEvent}
                                style={{
                                    padding: '6px 12px',
                                    background: '#000',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: 4,
                                    cursor: 'pointer'
                                }}
                            >
                                Add
                            </button>
                        </div>
                    </div>
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

### 示例 4：Markdown 编辑器 Shape

```javascript
// MarkdownEditorShape.jsx
import { BaseBoxShapeUtil, HTMLContainer } from 'tldraw';
import { useState } from 'react';
import ReactMarkdown from 'react-markdown';

export class MarkdownEditorShapeUtil extends BaseBoxShapeUtil {
    static type = 'markdown_editor';

    getDefaultProps() {
        return {
            w: 600,
            h: 400,
            content: '# Hello\n\nStart writing **markdown** here!'
        };
    }

    component(shape) {
        const [content, setContent] = useState(shape.props.content);
        const [mode, setMode] = useState('edit'); // edit or preview

        return (
            <HTMLContainer style={{ pointerEvents: 'all' }}>
                <div style={{
                    width: shape.props.w,
                    height: shape.props.h,
                    background: 'white',
                    borderRadius: 8,
                    padding: 16,
                    display: 'flex',
                    flexDirection: 'column',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                }}>
                    <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                        <button
                            onClick={() => setMode('edit')}
                            style={{
                                padding: '6px 12px',
                                background: mode === 'edit' ? '#000' : '#f0f0f0',
                                color: mode === 'edit' ? 'white' : '#000',
                                border: 'none',
                                borderRadius: 4,
                                cursor: 'pointer'
                            }}
                        >
                            ✏️ Edit
                        </button>
                        <button
                            onClick={() => setMode('preview')}
                            style={{
                                padding: '6px 12px',
                                background: mode === 'preview' ? '#000' : '#f0f0f0',
                                color: mode === 'preview' ? 'white' : '#000',
                                border: 'none',
                                borderRadius: 4,
                                cursor: 'pointer'
                            }}
                        >
                            👁️ Preview
                        </button>
                    </div>
                    {mode === 'edit' ? (
                        <textarea
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            style={{
                                flex: 1,
                                padding: 12,
                                borderRadius: 4,
                                border: '1px solid #ddd',
                                fontFamily: 'monospace',
                                fontSize: 14,
                                resize: 'none'
                            }}
                        />
                    ) : (
                        <div style={{
                            flex: 1,
                            padding: 12,
                            overflow: 'auto',
                            background: '#f9f9f9',
                            borderRadius: 4
                        }}>
                            <ReactMarkdown>{content}</ReactMarkdown>
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

---

### 示例 5：待办事项 Shape

```javascript
// TodoListShape.jsx
import { BaseBoxShapeUtil, HTMLContainer } from 'tldraw';
import { useState } from 'react';

export class TodoListShapeUtil extends BaseBoxShapeUtil {
    static type = 'todo_list';

    getDefaultProps() {
        return {
            w: 300,
            h: 400,
            todos: [
                { id: 1, text: 'Learn Tldraw', done: true },
                { id: 2, text: 'Build amazing apps', done: false },
            ]
        };
    }

    component(shape) {
        const [todos, setTodos] = useState(shape.props.todos);
        const [newTodo, setNewTodo] = useState('');

        const addTodo = () => {
            if (!newTodo.trim()) return;
            setTodos([...todos, {
                id: Date.now(),
                text: newTodo,
                done: false
            }]);
            setNewTodo('');
        };

        const toggleTodo = (id) => {
            setTodos(todos.map(todo =>
                todo.id === id ? { ...todo, done: !todo.done } : todo
            ));
        };

        const deleteTodo = (id) => {
            setTodos(todos.filter(todo => todo.id !== id));
        };

        return (
            <HTMLContainer style={{ pointerEvents: 'all' }}>
                <div style={{
                    width: shape.props.w,
                    height: shape.props.h,
                    background: 'white',
                    borderRadius: 8,
                    padding: 16,
                    display: 'flex',
                    flexDirection: 'column',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                }}>
                    <h3 style={{ margin: '0 0 12px 0' }}>✅ Todo List</h3>
                    
                    <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                        <input
                            value={newTodo}
                            onChange={(e) => setNewTodo(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && addTodo()}
                            placeholder="Add new todo..."
                            style={{
                                flex: 1,
                                padding: 8,
                                borderRadius: 4,
                                border: '1px solid #ddd'
                            }}
                        />
                        <button
                            onClick={addTodo}
                            style={{
                                padding: '8px 16px',
                                background: '#000',
                                color: 'white',
                                border: 'none',
                                borderRadius: 4,
                                cursor: 'pointer'
                            }}
                        >
                            +
                        </button>
                    </div>

                    <div style={{ flex: 1, overflow: 'auto' }}>
                        {todos.map(todo => (
                            <div
                                key={todo.id}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 8,
                                    padding: 8,
                                    marginBottom: 4,
                                    background: todo.done ? '#f0f0f0' : 'white',
                                    borderRadius: 4,
                                    border: '1px solid #eee'
                                }}
                            >
                                <input
                                    type="checkbox"
                                    checked={todo.done}
                                    onChange={() => toggleTodo(todo.id)}
                                    style={{ cursor: 'pointer' }}
                                />
                                <span style={{
                                    flex: 1,
                                    textDecoration: todo.done ? 'line-through' : 'none',
                                    color: todo.done ? '#999' : '#000'
                                }}>
                                    {todo.text}
                                </span>
                                <button
                                    onClick={() => deleteTodo(todo.id)}
                                    style={{
                                        padding: '4px 8px',
                                        background: '#ff4444',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: 4,
                                        cursor: 'pointer',
                                        fontSize: 12
                                    }}
                                >
                                    ×
                                </button>
                            </div>
                        ))}
                    </div>

                    <div style={{
                        marginTop: 12,
                        padding: 8,
                        background: '#f9f9f9',
                        borderRadius: 4,
                        fontSize: 12,
                        color: '#666'
                    }}>
                        {todos.filter(t => t.done).length} / {todos.length} completed
                    </div>
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

## 🎯 封装任何 React 组件的通用模板

```javascript
// GenericReactComponentShape.jsx
import { BaseBoxShapeUtil, HTMLContainer } from 'tldraw';
import YourReactComponent from 'your-library';

export class YourShapeUtil extends BaseBoxShapeUtil {
    static type = 'your_shape_type';

    getDefaultProps() {
        return {
            w: 400,
            h: 300,
            // 添加您的组件需要的 props
            customProp1: 'value1',
            customProp2: 'value2',
        };
    }

    component(shape) {
        return (
            <HTMLContainer style={{ pointerEvents: 'all' }}>
                <div style={{
                    width: shape.props.w,
                    height: shape.props.h,
                    // 添加样式
                }}>
                    <YourReactComponent 
                        prop1={shape.props.customProp1}
                        prop2={shape.props.customProp2}
                        // 传递所有需要的 props
                    />
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

## 💡 可以封装的流行 React 库

| 库名 | 用途 | Shape 示例 |
|------|------|-----------|
| Ant Design | UI 组件 | 表格、表单、模态框 |
| Material-UI | UI 组件 | 卡片、列表、对话框 |
| Recharts | 图表 | 折线图、柱状图、饼图 |
| React-Leaflet | 地图 | 交互式地图 |
| React-Player | 视频 | 视频播放器 |
| React-Quill | 编辑器 | 富文本编辑器 |
| React-Calendar | 日历 | 日期选择器 |
| React-DnD | 拖拽 | 看板、排序列表 |
| React-Three-Fiber | 3D | 3D 模型查看器 |
| React-PDF | PDF | PDF 查看器 |

---

## 🚀 总结

### 是的！您可以封装：

✅ 任何 React 组件
✅ 任何 npm 包
✅ 任何自定义组件
✅ 任何第三方库

### 这意味着：

🎨 **无限可能性** - 任何 Web 应用都能变成 Shape
🔧 **快速开发** - 复用现有组件
💡 **创新应用** - 可视化编程 + 强大组件

---

**需要我帮您封装某个特定的 React 组件吗？** 😊
