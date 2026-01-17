import { BaseBoxShapeUtil, HTMLContainer, useEditor } from 'tldraw';
import React from 'react';

/**
 * 选择题组件 - AaaS 交互式练习题
 * 
 * 功能：
 * - 显示题目和选项
 * - 用户点击选择答案
 * - 自动判断对错并显示反馈
 */
export class QuizShapeUtil extends BaseBoxShapeUtil {
    static type = 'quiz';

    getDefaultProps() {
        return {
            w: 400,
            h: 320,
            question: '1 + 1 = ?',
            options: ['1', '2', '3', '4'],
            correctAnswer: 1,  // 索引，0 表示第一个选项
            userAnswer: null,
            showFeedback: false
        };
    }

    component(shape) {
        const editor = useEditor();

        // 处理用户选择答案
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

        // 重置答案
        const handleReset = (e) => {
            e.stopPropagation();
            editor.updateShape({
                id: shape.id,
                type: 'quiz',
                props: {
                    userAnswer: null,
                    showFeedback: false
                }
            });
        };

        const isCorrect = shape.props.userAnswer === shape.props.correctAnswer;

        return (
            <HTMLContainer style={{
                pointerEvents: 'all',
                background: '#ffffff',
                border: '2px solid #3b82f6',
                borderRadius: 12,
                padding: 16,
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
                boxShadow: '0 4px 12px rgba(59, 130, 246, 0.15)'
            }}>
                {/* 标题栏 */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    paddingBottom: 8,
                    borderBottom: '1px solid #e5e7eb'
                }}>
                    <span style={{ fontSize: 18 }}>📝</span>
                    <span style={{ fontWeight: 600, color: '#1e40af', fontSize: 14 }}>
                        选择题
                    </span>
                    {shape.props.showFeedback && (
                        <button
                            onClick={handleReset}
                            style={{
                                marginLeft: 'auto',
                                padding: '4px 12px',
                                fontSize: 12,
                                border: '1px solid #d1d5db',
                                borderRadius: 6,
                                background: '#f9fafb',
                                cursor: 'pointer'
                            }}
                        >
                            🔄 重试
                        </button>
                    )}
                </div>

                {/* 题目 */}
                <div style={{
                    fontSize: 16,
                    fontWeight: 500,
                    color: '#111827',
                    lineHeight: 1.5
                }}>
                    {shape.props.question}
                </div>

                {/* 选项列表 */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {shape.props.options.map((option, index) => {
                        const isSelected = shape.props.userAnswer === index;
                        const isCorrectOption = index === shape.props.correctAnswer;
                        const showCorrect = shape.props.showFeedback && isCorrectOption;
                        const showWrong = shape.props.showFeedback && isSelected && !isCorrect;

                        return (
                            <button
                                key={index}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (!shape.props.showFeedback) {
                                        handleAnswer(index);
                                    }
                                }}
                                disabled={shape.props.showFeedback}
                                style={{
                                    padding: '12px 16px',
                                    border: showCorrect ? '2px solid #22c55e' :
                                        showWrong ? '2px solid #ef4444' :
                                            isSelected ? '2px solid #3b82f6' : '1px solid #d1d5db',
                                    borderRadius: 8,
                                    background: showCorrect ? '#dcfce7' :
                                        showWrong ? '#fee2e2' :
                                            isSelected ? '#dbeafe' : '#ffffff',
                                    cursor: shape.props.showFeedback ? 'default' : 'pointer',
                                    textAlign: 'left',
                                    fontSize: 14,
                                    color: '#374151',
                                    transition: 'all 0.2s',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 8
                                }}
                            >
                                <span style={{
                                    fontWeight: 600,
                                    color: '#6b7280',
                                    minWidth: 24
                                }}>
                                    {String.fromCharCode(65 + index)}.
                                </span>
                                <span>{option}</span>
                                {showCorrect && <span style={{ marginLeft: 'auto' }}>✅</span>}
                                {showWrong && <span style={{ marginLeft: 'auto' }}>❌</span>}
                            </button>
                        );
                    })}
                </div>

                {/* 反馈信息 */}
                {shape.props.showFeedback && (
                    <div style={{
                        padding: 12,
                        borderRadius: 8,
                        background: isCorrect ? '#dcfce7' : '#fee2e2',
                        border: isCorrect ? '1px solid #22c55e' : '1px solid #ef4444',
                        fontSize: 14,
                        color: isCorrect ? '#15803d' : '#b91c1c',
                        fontWeight: 500
                    }}>
                        {isCorrect
                            ? '🎉 回答正确！做得很好！'
                            : `💡 答案错误。正确答案是：${String.fromCharCode(65 + shape.props.correctAnswer)}`
                        }
                    </div>
                )}
            </HTMLContainer>
        );
    }

    indicator(shape) {
        return <rect width={shape.props.w} height={shape.props.h} rx={12} />;
    }
}
