import { BaseBoxShapeUtil, HTMLContainer, useEditor } from 'tldraw';
import React, { useState, useCallback, useEffect, useRef } from 'react';

export class CodeRunnerShapeUtil extends BaseBoxShapeUtil {
    static type = 'code_runner';

    getDefaultProps() {
        return {
            w: 400,
            h: 300,
            code: '// Write JavaScript here\nconsole.log("Hello One Worker OS!");\n\nconst now = new Date();\nconsole.log("Time:", now.toLocaleTimeString());',
            language: 'javascript',
            output: []
        };
    }

    component(shape) {
        const editor = useEditor();
        const [output, setOutput] = useState(shape.props.output || []);

        // Update shape props when code changes (debounced could be better but direct is fine for now)
        const handleCodeChange = (e) => {
            // Stop propagation to prevent canvas panning while typing
            e.stopPropagation();
            const newCode = e.target.value;
            editor.updateShape({
                id: shape.id,
                type: 'code_runner',
                props: { code: newCode }
            });
        };

        const runCode = useCallback(() => {
            const logs = [];
            const originalLog = console.log;
            const originalWarn = console.warn;
            const originalError = console.error;

            // Capture logs
            const logger = (type) => (...args) => {
                const text = args.map(arg =>
                    typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
                ).join(' ');
                logs.push({ type, text, time: new Date().toLocaleTimeString() });
            };

            console.log = logger('log');
            console.warn = logger('warn');
            console.error = logger('error');

            try {
                // Safe-ish execution using Function constructor
                // Note: unique scope for this run
                new Function(shape.props.code)();
            } catch (err) {
                logs.push({ type: 'error', text: err.toString(), time: new Date().toLocaleTimeString() });
            } finally {
                // Restore console
                console.log = originalLog;
                console.warn = originalWarn;
                console.error = originalError;

                // Update local state and shape state
                setOutput(logs);
                editor.updateShape({
                    id: shape.id,
                    type: 'code_runner',
                    props: { output: logs }
                });
            }
        }, [shape.props.code, editor, shape.id]);

        return (
            <HTMLContainer style={{
                pointerEvents: 'all',
                background: '#1e1e1e',
                borderRadius: 8,
                border: '1px solid #333',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                fontFamily: 'Menlo, Monaco, "Courier New", monospace'
            }}>
                {/* Header / Toolbar */}
                <div style={{
                    background: '#252526',
                    padding: '8px 12px',
                    borderBottom: '1px solid #333',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                }}>
                    <div style={{ display: 'flex', gap: 6 }}>
                        <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#ff5f56' }} />
                        <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#ffbd2e' }} />
                        <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#27c93f' }} />
                    </div>
                    <div style={{ color: '#ccc', fontSize: 12, fontWeight: 600 }}>JS Runner</div>
                    <button
                        onClick={(e) => { e.stopPropagation(); runCode(); }}
                        style={{
                            background: '#27c93f',
                            color: '#fff',
                            border: 'none',
                            borderRadius: 4,
                            padding: '2px 8px',
                            fontSize: 11,
                            cursor: 'pointer',
                            fontWeight: 'bold'
                        }}
                    >
                        ▶ RUN
                    </button>
                </div>

                {/* Editor Area */}
                <textarea
                    value={shape.props.code}
                    onChange={handleCodeChange}
                    onPointerDown={e => e.stopPropagation()}
                    onKeyDown={e => e.stopPropagation()}
                    spellCheck={false}
                    style={{
                        flex: 1,
                        background: '#1e1e1e',
                        color: '#d4d4d4',
                        border: 'none',
                        resize: 'none',
                        padding: 12,
                        fontSize: 13,
                        lineHeight: 1.5,
                        outline: 'none',
                    }}
                />

                {/* Console Output */}
                <div style={{
                    height: '35%',
                    background: '#000',
                    borderTop: '1px solid #333',
                    padding: 8,
                    overflowY: 'auto',
                    fontSize: 12
                }}>
                    {output.length === 0 && <span style={{ color: '#555' }}>&gt; Ready to execute...</span>}
                    {output.map((log, i) => (
                        <div key={i} style={{
                            marginBottom: 4,
                            color: log.type === 'error' ? '#ff5f56' : log.type === 'warn' ? '#ffbd2e' : '#ccc',
                            display: 'flex', gap: 8
                        }}>
                            <span style={{ color: '#555', userSelect: 'none' }}>[{log.time}]</span>
                            <span style={{ whiteSpace: 'pre-wrap' }}>{log.text}</span>
                        </div>
                    ))}
                </div>
            </HTMLContainer>
        );
    }

    indicator(shape) {
        return <rect width={shape.props.w} height={shape.props.h} rx={8} ry={8} />;
    }
}
