import { BaseBoxShapeUtil, HTMLContainer } from 'tldraw';
import { useState, useEffect } from 'react';

// 数据库查询 Shape 定义
export class DatabaseQueryShapeUtil extends BaseBoxShapeUtil {
    static type = 'database_query';

    getDefaultProps() {
        return {
            w: 400,
            h: 300,
            query: 'SELECT * FROM users LIMIT 10',
            database: 'postgresql',
            host: 'localhost',
            port: 5432,
            dbname: '',
            username: '',
            password: '',
            results: [],
            status: 'idle', // idle, loading, success, error
            error: null
        };
    }

    component(shape) {
        return <DatabaseQueryComponent shape={shape} />;
    }

    indicator(shape) {
        return <rect width={shape.props.w} height={shape.props.h} />;
    }
}

// React 组件
function DatabaseQueryComponent({ shape }) {
    const [query, setQuery] = useState(shape.props.query);
    const [results, setResults] = useState(shape.props.results);
    const [status, setStatus] = useState(shape.props.status);
    const [error, setError] = useState(null);

    const executeQuery = async () => {
        setStatus('loading');
        setError(null);

        try {
            // 调用您的后端 API
            const response = await fetch('http://localhost:3001/api/database/query', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    database: shape.props.database,
                    host: shape.props.host,
                    port: shape.props.port,
                    dbname: shape.props.dbname,
                    username: shape.props.username,
                    password: shape.props.password,
                    query: query
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            setResults(data.results);
            setStatus('success');
        } catch (err) {
            setError(err.message);
            setStatus('error');
        }
    };

    return (
        <HTMLContainer style={{ pointerEvents: 'all' }}>
            <div style={{
                width: shape.props.w,
                height: shape.props.h,
                background: 'white',
                borderRadius: 12,
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                padding: 16,
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
                overflow: 'hidden'
            }}>
                {/* Header */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    borderBottom: '1px solid #e5e7eb',
                    paddingBottom: 8
                }}>
                    <span style={{ fontSize: 20 }}>🗄️</span>
                    <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: 14 }}>Database Query</div>
                        <div style={{ fontSize: 11, color: '#666' }}>
                            {shape.props.database} @ {shape.props.host}
                        </div>
                    </div>
                    <div style={{
                        fontSize: 10,
                        padding: '4px 8px',
                        borderRadius: 6,
                        background: status === 'success' ? '#10b981' :
                            status === 'error' ? '#ef4444' :
                                status === 'loading' ? '#f59e0b' : '#6b7280',
                        color: 'white',
                        fontWeight: 600
                    }}>
                        {status.toUpperCase()}
                    </div>
                </div>

                {/* SQL Query Input */}
                <textarea
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Enter SQL query..."
                    style={{
                        flex: 1,
                        padding: 8,
                        borderRadius: 8,
                        border: '1px solid #ddd',
                        fontSize: 12,
                        fontFamily: 'monospace',
                        resize: 'none'
                    }}
                />

                {/* Execute Button */}
                <button
                    onClick={executeQuery}
                    disabled={status === 'loading'}
                    style={{
                        padding: '8px 16px',
                        background: status === 'loading' ? '#9ca3af' : '#000',
                        color: 'white',
                        border: 'none',
                        borderRadius: 8,
                        cursor: status === 'loading' ? 'not-allowed' : 'pointer',
                        fontWeight: 600,
                        fontSize: 13
                    }}
                >
                    {status === 'loading' ? '⏳ Executing...' : '▶️ Execute Query'}
                </button>

                {/* Results Display */}
                {error && (
                    <div style={{
                        padding: 12,
                        background: '#fee2e2',
                        borderRadius: 8,
                        fontSize: 12,
                        color: '#991b1b'
                    }}>
                        ❌ {error}
                    </div>
                )}

                {results.length > 0 && (
                    <div style={{
                        flex: 1,
                        overflowY: 'auto',
                        fontSize: 11,
                        fontFamily: 'monospace'
                    }}>
                        <div style={{ fontWeight: 600, marginBottom: 4 }}>
                            Results ({results.length} rows):
                        </div>
                        <pre style={{
                            background: '#f9fafb',
                            padding: 8,
                            borderRadius: 6,
                            overflow: 'auto'
                        }}>
                            {JSON.stringify(results, null, 2)}
                        </pre>
                    </div>
                )}
            </div>
        </HTMLContainer>
    );
}

export default DatabaseQueryShapeUtil;
