import { BaseBoxShapeUtil, HTMLContainer, createShapeId } from 'tldraw';
import { useState } from 'react';
import { transform } from 'sucrase';

// AI Shape Generator - 核心组件
export class AIShapeGeneratorShapeUtil extends BaseBoxShapeUtil {
    static type = 'ai_shape_generator';

    getDefaultProps() {
        return {
            w: 500,
            h: 600,
            prompt: '',
            generatedCode: '',
            status: 'idle', // idle, generating, success, error
            previewShapeId: null
        };
    }

    component(shape) {
        const [prompt, setPrompt] = useState(shape.props.prompt);
        const [generatedCode, setGeneratedCode] = useState('');
        const [status, setStatus] = useState('idle');

        const generateShape = async () => {
            if (!prompt.trim()) {
                alert('请输入 Shape 描述');
                return;
            }

            setStatus('generating');

            try {
                // 1. 调用 AI 生成代码
                const response = await fetch('/api/ai', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        prompt: `你是一个 Tldraw Shape 代码生成专家。

请根据用户需求生成一个完整的 Tldraw Shape 组件。

要求：
1. 继承 BaseBoxShapeUtil
2. 实现 getDefaultProps() 方法
3. 实现 component(shape) 方法，使用 HTMLContainer 包裹
4. 实现 indicator(shape) 方法
5. 使用 React hooks (useState, useEffect 等)
6. 添加必要的交互功能
7. 样式美观，使用现代 UI 设计

示例代码结构：
\`\`\`javascript
import { BaseBoxShapeUtil, HTMLContainer } from 'tldraw';
import { useState } from 'react';

export class MyShapeUtil extends BaseBoxShapeUtil {
    static type = 'my_shape';
    
    getDefaultProps() {
        return {
            w: 300,
            h: 200,
            // 自定义属性
        };
    }
    
    component(shape) {
        const [state, setState] = useState(initialValue);
        
        return (
            <HTMLContainer style={{ pointerEvents: 'all' }}>
                <div style={{
                    width: shape.props.w,
                    height: shape.props.h,
                    background: 'white',
                    borderRadius: 12,
                    padding: 16,
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                }}>
                    {/* UI 内容 */}
                </div>
            </HTMLContainer>
        );
    }
    
    indicator(shape) {
        return <rect width={shape.props.w} height={shape.props.h} />;
    }
}

export default MyShapeUtil;
\`\`\`

用户需求：${prompt}

请只返回完整的代码，不要有其他说明。代码必须是可以直接执行的 JavaScript。`
                    })
                });

                const data = await response.json();
                const code = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

                // 提取代码块
                const codeMatch = code.match(/```(?:javascript|jsx)?\n([\s\S]*?)```/);
                const cleanCode = codeMatch ? codeMatch[1] : code;

                setGeneratedCode(cleanCode);
                setStatus('success');

                // 2. 触发全局事件，让主应用注册这个 Shape
                window.dispatchEvent(new CustomEvent('newShapeGenerated', {
                    detail: {
                        code: cleanCode,
                        prompt: prompt
                    }
                }));

            } catch (error) {
                console.error('生成失败:', error);
                setStatus('error');
                alert('生成失败：' + error.message);
            }
        };

        const copyCode = () => {
            navigator.clipboard.writeText(generatedCode);
            alert('✅ 代码已复制到剪贴板！');
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
                    gap: 16,
                    overflow: 'hidden'
                }}>
                    {/* 标题 */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 24 }}>🏭</span>
                        <h3 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>
                            AI Shape Factory
                        </h3>
                    </div>

                    {/* 输入区 */}
                    <div>
                        <label style={{
                            fontSize: 12,
                            color: '#666',
                            marginBottom: 8,
                            display: 'block',
                            fontWeight: 500
                        }}>
                            描述您想要的 Shape：
                        </label>
                        <textarea
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            placeholder="例如：创建一个天气卡片，显示城市、温度和天气图标，可以点击刷新按钮更新天气"
                            style={{
                                width: '100%',
                                padding: 12,
                                borderRadius: 8,
                                border: '1px solid #ddd',
                                fontSize: 13,
                                minHeight: 100,
                                resize: 'vertical',
                                fontFamily: 'inherit',
                                outline: 'none'
                            }}
                            onFocus={(e) => e.target.style.borderColor = '#000'}
                            onBlur={(e) => e.target.style.borderColor = '#ddd'}
                        />
                    </div>

                    {/* 生成按钮 */}
                    <button
                        onClick={generateShape}
                        disabled={status === 'generating' || !prompt.trim()}
                        style={{
                            padding: '12px 24px',
                            background: status === 'generating' ? '#ccc' :
                                status === 'success' ? '#10b981' : '#000',
                            color: 'white',
                            border: 'none',
                            borderRadius: 8,
                            cursor: status === 'generating' || !prompt.trim() ? 'not-allowed' : 'pointer',
                            fontWeight: 600,
                            fontSize: 14,
                            transition: 'all 0.2s'
                        }}
                    >
                        {status === 'generating' ? '⏳ AI 生成中...' :
                            status === 'success' ? '✅ 生成成功！' :
                                '🚀 生成 Shape'}
                    </button>

                    {/* 成功提示 */}
                    {status === 'success' && (
                        <div style={{
                            padding: 16,
                            background: '#f0fdf4',
                            borderRadius: 8,
                            border: '1px solid #86efac'
                        }}>
                            <div style={{
                                fontSize: 13,
                                marginBottom: 12,
                                color: '#166534',
                                fontWeight: 600
                            }}>
                                ✅ Shape 已生成！
                            </div>
                            <div style={{ fontSize: 12, color: '#166534', marginBottom: 8 }}>
                                新的 Shape 将在刷新页面后出现在画布上。
                            </div>
                            <button
                                onClick={copyCode}
                                style={{
                                    width: '100%',
                                    padding: '8px',
                                    background: '#16a34a',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: 6,
                                    cursor: 'pointer',
                                    fontWeight: 600,
                                    fontSize: 12
                                }}
                            >
                                📋 复制代码
                            </button>
                        </div>
                    )}

                    {/* 代码预览 */}
                    {generatedCode && (
                        <div style={{
                            flex: 1,
                            background: '#f5f5f5',
                            borderRadius: 8,
                            padding: 12,
                            overflow: 'auto',
                            fontFamily: 'monospace',
                            fontSize: 11,
                            minHeight: 0
                        }}>
                            <div style={{
                                marginBottom: 8,
                                fontWeight: 600,
                                color: '#666'
                            }}>
                                生成的代码：
                            </div>
                            <pre style={{
                                margin: 0,
                                whiteSpace: 'pre-wrap',
                                wordBreak: 'break-word'
                            }}>
                                {generatedCode}
                            </pre>
                        </div>
                    )}

                    {/* 提示 */}
                    <div style={{
                        fontSize: 11,
                        color: '#999',
                        padding: 12,
                        background: '#f9fafb',
                        borderRadius: 6,
                        lineHeight: 1.5
                    }}>
                        💡 <strong>提示：</strong>描述越详细，生成的 Shape 越符合您的需求。
                        可以包含功能、样式、交互等要求。
                    </div>
                </div>
            </HTMLContainer>
        );
    }

    indicator(shape) {
        return <rect width={shape.props.w} height={shape.props.h} />;
    }
}

export default AIShapeGeneratorShapeUtil;
