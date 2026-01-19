import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AIProvider from '../services/AIProvider';

/**
 * 配对页面
 * 用于接收来自 CLI 工具的 Token
 */
function PairPage() {
    const navigate = useNavigate();
    const [status, setStatus] = useState('waiting'); // waiting, success, error
    const [message, setMessage] = useState('');

    useEffect(() => {
        // 从 URL 获取 Token
        const urlParams = new URLSearchParams(window.location.search);
        const token = urlParams.get('token');

        if (token) {
            handlePairing(token);
        }
    }, []);

    const handlePairing = async (token) => {
        try {
            setStatus('processing');
            setMessage('正在配对...');

            // 1. 保存 Token
            AIProvider.pair(token);

            // 2. 清理 URL（安全）
            window.history.replaceState({}, '', '/pair');

            // 3. 尝试连接
            setMessage('正在连接本地 Claude Code...');
            await AIProvider.connectLocal();

            // 4. 成功
            setStatus('success');
            setMessage('配对成功！');

            // 5. 2秒后跳转
            setTimeout(() => {
                navigate('/');
            }, 2000);

        } catch (error) {
            console.error('配对失败:', error);
            setStatus('error');
            setMessage('配对失败：' + error.message);
        }
    };

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100vh',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            fontFamily: 'system-ui, -apple-system, sans-serif'
        }}>
            {/* 图标 */}
            <div style={{
                fontSize: 80,
                marginBottom: 30,
                animation: status === 'processing' ? 'spin 2s linear infinite' : 'none'
            }}>
                {status === 'waiting' && '🔗'}
                {status === 'processing' && '⏳'}
                {status === 'success' && '✅'}
                {status === 'error' && '❌'}
            </div>

            {/* 标题 */}
            <h1 style={{
                fontSize: 36,
                marginBottom: 20,
                fontWeight: 600
            }}>
                {status === 'waiting' && '等待配对'}
                {status === 'processing' && '配对中...'}
                {status === 'success' && '配对成功！'}
                {status === 'error' && '配对失败'}
            </h1>

            {/* 消息 */}
            <p style={{
                fontSize: 18,
                opacity: 0.9,
                marginBottom: 40,
                textAlign: 'center',
                maxWidth: 500
            }}>
                {message || '请运行 aios-connector 工具'}
            </p>

            {/* 等待状态的说明 */}
            {status === 'waiting' && (
                <div style={{
                    background: 'rgba(255,255,255,0.1)',
                    padding: 30,
                    borderRadius: 12,
                    maxWidth: 500
                }}>
                    <h3 style={{ fontSize: 18, marginBottom: 15 }}>
                        如何配对？
                    </h3>
                    <ol style={{
                        fontSize: 14,
                        lineHeight: 1.8,
                        paddingLeft: 20,
                        margin: 0
                    }}>
                        <li>下载 aios-connector 工具</li>
                        <li>双击运行工具</li>
                        <li>浏览器会自动打开此页面</li>
                        <li>配对自动完成</li>
                    </ol>
                    <div style={{
                        marginTop: 20,
                        paddingTop: 20,
                        borderTop: '1px solid rgba(255,255,255,0.2)'
                    }}>
                        <a
                            href="/downloads/aios-connector"
                            download
                            style={{
                                display: 'inline-block',
                                padding: '12px 24px',
                                background: 'white',
                                color: '#667eea',
                                textDecoration: 'none',
                                borderRadius: 8,
                                fontWeight: 600,
                                fontSize: 14
                            }}
                        >
                            📥 下载配对工具
                        </a>
                    </div>
                </div>
            )}

            {/* 成功状态 */}
            {status === 'success' && (
                <div style={{
                    background: 'rgba(16, 185, 129, 0.2)',
                    padding: 20,
                    borderRadius: 12,
                    fontSize: 14
                }}>
                    ✨ 正在跳转到主页...
                </div>
            )}

            {/* 错误状态 */}
            {status === 'error' && (
                <div style={{
                    background: 'rgba(239, 68, 68, 0.2)',
                    padding: 20,
                    borderRadius: 12,
                    maxWidth: 500
                }}>
                    <p style={{ fontSize: 14, marginBottom: 15 }}>
                        可能的原因：
                    </p>
                    <ul style={{
                        fontSize: 13,
                        lineHeight: 1.8,
                        paddingLeft: 20,
                        margin: 0
                    }}>
                        <li>Claude Desktop 未运行</li>
                        <li>Token 已过期</li>
                        <li>网络连接问题</li>
                    </ul>
                    <button
                        onClick={() => window.location.reload()}
                        style={{
                            marginTop: 20,
                            padding: '10px 20px',
                            background: 'white',
                            color: '#667eea',
                            border: 'none',
                            borderRadius: 8,
                            cursor: 'pointer',
                            fontWeight: 600,
                            fontSize: 14
                        }}
                    >
                        🔄 重试
                    </button>
                </div>
            )}

            {/* 动画样式 */}
            <style>{`
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
}

export default PairPage;
