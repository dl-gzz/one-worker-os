import { BaseBoxShapeUtil, HTMLContainer, createShapeId, useEditor } from 'tldraw';
import React, { useState } from 'react';
import { transform } from 'sucrase';
import AIProvider from '../../services/AIProvider';

// AI Terminal Shape - 实时对话终端

// Helper Component for Collapsible Code
const CollapsibleCode = ({ code }) => {
    const [isOpen, setIsOpen] = useState(false);
    return (
        <div style={{ marginTop: 8, marginBottom: 8, border: '1px solid #444', borderRadius: 6, overflow: 'hidden' }}>
            <div
                onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen); }}
                onPointerDown={(e) => e.stopPropagation()}
                style={{
                    padding: '6px 10px',
                    background: '#252526',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    fontSize: 11,
                    color: '#858585',
                    userSelect: 'none'
                }}
            >
                <span style={{ fontSize: 10 }}>{isOpen ? '▼' : '▶'}</span>
                <span style={{ fontWeight: 600 }}>JSON Actions Output</span>
            </div>
            {isOpen && (
                <div style={{ padding: 10, background: '#1e1e1e', overflowX: 'auto', borderTop: '1px solid #333' }}>
                    <code style={{ fontSize: 11, fontFamily: 'monospace', color: '#ce9178', whiteSpace: 'pre' }}>
                        {code}
                    </code>
                </div>
            )}
        </div>
    );
};

export class AITerminalShapeUtil extends BaseBoxShapeUtil {
    static type = 'ai_terminal';

    getDefaultProps() {
        return {
            w: 400,
            h: 500, // 增加高度以适应对话
            messages: [], // 存储对话历史: { role: 'user'|'ai', text: '...' }
            sessionId: null, // OpenCode 会话 ID
            status: 'idle'
        };
    }

    component(shape) {
        const editor = useEditor();
        const [input, setInput] = useState('');
        const [isSending, setIsSending] = useState(false);
        const messagesEndRef = React.useRef(null);

        // 自动滚动到底部
        const scrollToBottom = () => {
            messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
        };

        React.useEffect(() => {
            scrollToBottom();
        }, [shape.props.messages, isSending]);

        // 发送消息
        const sendMessage = async () => {
            if (!input.trim() || isSending) return;

            const userText = input;
            setInput(''); // 立即清空输入框
            setIsSending(true);

            // 1. 更新 UI：添加用户消息
            const newMessages = [
                ...(shape.props.messages || []),
                { role: 'user', text: userText }
            ];

            // 更新 Shape 属性以保存历史
            editor.updateShape({
                id: shape.id,
                type: shape.type,
                props: { messages: newMessages }
            });

            try {
                // --- 核心逻辑改造：Skills 注入与上下文感知 ---

                // 用户要求 Skills 定义不在前端硬编码，而是由 OpenCode 侧处理（或作为外部配置）。
                // 因此这里我们移除 SKILLS_DEFINITION 的注入。
                // 前端只负责：1. 发送用户文本 2. 解析可能返回的 JSON 执行动作。

                const fullPrompt = userText;

                // 2. 调用 AI
                const response = await AIProvider.chat(fullPrompt, shape.props.sessionId);

                // 3. 解析响应 (尝试提取 JSON Actions)
                let replyText = response.text;
                let actions = [];

                try {
                    // 匹配 ```json ... ``` 或 直接 {...}
                    const jsonMatch = response.text.match(/```json\n([\s\S]*?)\n```/) || response.text.match(/(\{[\s\S]*"actions"[\s\S]*\})/);

                    if (jsonMatch) {
                        const jsonStr = jsonMatch[1] || jsonMatch[0];
                        const data = JSON.parse(jsonStr);

                        // 优先显示 message，如果没有则显示 JSON 字符串
                        if (data.message) replyText = data.message;
                        else if (!replyText) replyText = "(执行指令)";

                        if (data.actions && Array.isArray(data.actions)) {
                            actions = data.actions;
                        }
                    }
                } catch (e) {
                    console.log('非 JSON 响应:', e);
                }

                // 4. 执行 Actions (Frontend Executor)
                if (actions.length > 0) {
                    editor.run(() => {
                        actions.forEach(act => {
                            try {
                                // CREATE
                                if (act.action === 'createShape' && act.shape) {
                                    const id = createShapeId();
                                    const shapeData = {
                                        id,
                                        type: act.shape.type || 'geo',
                                        x: act.shape.x || (Math.random() * 400),
                                        y: act.shape.y || (Math.random() * 400),
                                        props: act.shape.props || {}
                                    };
                                    console.log('🔧 Execute createShape:', shapeData);
                                    editor.createShape(shapeData);
                                }
                                // UPDATE (新增支持)
                                else if (act.action === 'updateShape' && act.id) {
                                    console.log('🔧 Execute updateShape:', act);
                                    editor.updateShape({
                                        id: act.id,
                                        props: act.props || {}
                                    });
                                }
                                // GOD MODE: Generate Shape Utils (Dynamic Compilation)
                                // 动作格式: { action: "generateShapeUtils", code: "..." }
                                else if (act.action === 'generateShapeUtils' && act.code) {
                                    console.log('⚡ God Mode Triggered from AI:', act.code.substring(0, 50) + '...');
                                    const event = new CustomEvent('tldraw-register-shape', {
                                        detail: { code: act.code }
                                    });
                                    window.dispatchEvent(event);
                                    replyText += `\n(⚡ 已生成并编译新组件)`;
                                }
                                // SOURCE MODE: Persist to File System (Self-Evolution)
                                // 动作格式: { action: "createSourceComponent", shapeName: "Stock", code: "..." }
                                else if (act.action === 'createSourceComponent' && act.shapeName && act.code) {
                                    console.log('🧬 Source Mode Triggered (Redirected to God Mode):', act.shapeName);

                                    // ⚡ 关键修改：不再写入文件导致刷新，而是使用 God Mode 动态注入
                                    const event = new CustomEvent('tldraw-register-shape', {
                                        detail: { code: act.code }
                                    });
                                    window.dispatchEvent(event);

                                    replyText += `\n(⚡ 已在运行时动态生成组件: ${act.shapeName})`;
                                }
                                // DELETE (新增支持)
                                else if (act.action === 'deleteShape' && act.id) {
                                    console.log('🔧 Execute deleteShape:', act);
                                    editor.deleteShape(act.id);
                                }
                            } catch (err) {
                                console.error('❌ 执行指令失败:', act, err);
                                replyText += `\n(⚠️ 指令执行出错: ${err.message})`;
                            }
                        });
                    });
                    replyText += '\n✨ 指令已执行';
                }

                // 5. 更新 UI：添加 AI 回复
                editor.updateShape({
                    id: shape.id,
                    type: shape.type,
                    props: {
                        messages: [
                            ...newMessages,
                            { role: 'ai', text: replyText }
                        ],
                        sessionId: response.sessionId // 保存 Session ID 用于下一次对话
                    }
                });

            } catch (error) {
                console.error('对话失败:', error);
                editor.updateShape({
                    id: shape.id,
                    type: shape.type,
                    props: {
                        messages: [
                            ...newMessages,
                            { role: 'error', text: '❌ 发送失败: ' + error.message }
                        ]
                    }
                });
            } finally {
                setIsSending(false);
            }
        };

        const messages = shape.props.messages || [];

        return (
            <HTMLContainer style={{ pointerEvents: 'all' }}>
                <div style={{
                    width: shape.props.w,
                    height: shape.props.h,
                    background: '#1e1e1e', // VS Code 风格深色背景
                    borderRadius: 12,
                    boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden',
                    color: '#ccc',
                    fontFamily: 'Menlo, Monaco, "Courier New", monospace',
                    border: '1px solid #333'
                }}>
                    {/* 标题栏 */}
                    <div style={{
                        padding: '10px 16px',
                        background: '#252526',
                        borderBottom: '1px solid #333',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span>💬</span>
                            <span style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>OpenCode Terminal</span>
                        </div>
                        <div style={{ fontSize: 10, color: '#666' }}>
                            {shape.props.sessionId ? '🟢 Connected' : '⚪ Ready'}
                        </div>
                    </div>

                    {/* 消息历史区 - 增加自定义滚动条样式 (已移至 App.css) */}
                    <div
                        className="ai-terminal-scroll"
                        onPointerDown={(e) => e.stopPropagation()} // 防止拖拽 Shape 时误触，也允许选中文字
                        style={{
                            flex: 1,
                            overflowY: 'auto',
                            padding: '16px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 16,
                            pointerEvents: 'auto' // 确保内部可以交互
                        }}
                    >
                        {messages.length === 0 && (
                            <div style={{
                                textAlign: 'center',
                                color: '#555',
                                marginTop: 40,
                                fontSize: 13
                            }}>
                                <div style={{ fontSize: 24, marginBottom: 10 }}>👋</div>
                                开始与 OpenCode 对话...
                            </div>
                        )}

                        {messages.map((msg, i) => (
                            <div key={i} style={{
                                alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                                maxWidth: '85%',
                                fontSize: 18, // 字体增大到 18px
                                lineHeight: '1.6'
                            }}>
                                <div style={{
                                    padding: '8px 12px',
                                    borderRadius: 8,
                                    background: msg.role === 'user' ? '#0e639c' : '#333', // VS Code 蓝色 和 深灰色
                                    color: msg.role === 'user' ? '#fff' : '#eee',
                                    whiteSpace: 'pre-wrap',
                                    wordBreak: 'break-word',
                                    border: msg.role === 'error' ? '1px solid #f44336' : 'none'
                                }}>
                                    {msg.text.split(/(```json[\s\S]*?```)/g).map((part, idx) => {
                                        if (part.startsWith('```json')) {
                                            const code = part.replace(/```json\n?/, '').replace(/```$/, '');
                                            return <CollapsibleCode key={idx} code={code} />;
                                        }
                                        return <span key={idx}>{part}</span>;
                                    })}
                                </div>
                                {/* 角色标签 */}
                                <div style={{
                                    fontSize: 10,
                                    marginTop: 4,
                                    opacity: 0.5,
                                    textAlign: msg.role === 'user' ? 'right' : 'left'
                                }}>
                                    {msg.role === 'user' ? 'You' : 'OpenCode'}
                                </div>
                            </div>
                        ))}

                        {isSending && (
                            <div style={{ alignSelf: 'flex-start', color: '#888', fontSize: 12 }}>
                                <span className="typing-dot">●</span> 正在思考...
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* 输入区 */}
                    <div style={{
                        padding: 12,
                        background: '#252526',
                        borderTop: '1px solid #333',
                        display: 'flex',
                        gap: 8
                    }}>
                        <textarea
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    sendMessage();
                                }
                            }}
                            placeholder="输入消息..."
                            style={{
                                flex: 1,
                                background: '#3c3c3c',
                                border: '1px solid #3c3c3c',
                                borderRadius: 4,
                                color: '#eee',
                                padding: '8px',
                                fontSize: 13,
                                resize: 'none',
                                height: 36,
                                outline: 'none',
                                fontFamily: 'inherit'
                            }}
                        />
                        <button
                            onClick={(e) => {
                                e.stopPropagation(); // 防止选中 Shape
                                sendMessage();
                            }}
                            onPointerDown={(e) => e.stopPropagation()}
                            disabled={isSending || !input.trim()}
                            style={{
                                background: isSending ? '#444' : '#0e639c',
                                color: 'white',
                                border: 'none',
                                borderRadius: 4,
                                padding: '0 16px',
                                cursor: isSending ? 'not-allowed' : 'pointer',
                                fontSize: 13,
                                fontWeight: 500
                            }}
                        >
                            发送
                        </button>
                    </div>
                </div>
            </HTMLContainer>
        );
    }

    indicator(shape) {
        return <rect width={shape.props.w} height={shape.props.h} />;
    }
}

export default AITerminalShapeUtil;
