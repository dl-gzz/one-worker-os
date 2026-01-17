import { BaseBoxShapeUtil, HTMLContainer, useEditor } from 'tldraw';
import React, { useState } from 'react';
import { Globe, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';

export class BrowserShapeUtil extends BaseBoxShapeUtil {
    static type = 'browser';

    getDefaultProps() {
        return {
            w: 800,
            h: 600,
            url: 'https://www.example.com',
            title: 'New Tab'
        };
    }

    component(shape) {
        const editor = useEditor();
        const [urlInput, setUrlInput] = useState(shape.props.url);
        const [iframeUrl, setIframeUrl] = useState(shape.props.url);
        const [isLoading, setIsLoading] = useState(false);

        const handleGo = (e) => {
            e?.preventDefault();
            e?.stopPropagation();
            let targetUrl = urlInput;
            if (!targetUrl.startsWith('http')) {
                targetUrl = 'https://' + targetUrl;
            }
            setIframeUrl(targetUrl);
            editor.updateShape({
                id: shape.id,
                type: 'browser',
                props: { url: targetUrl }
            });
            setIsLoading(true);
        };

        const handleKeyDown = (e) => {
            if (e.key === 'Enter') {
                handleGo();
            }
            e.stopPropagation();
        };

        return (
            <HTMLContainer style={{
                pointerEvents: 'all',
                background: '#fff',
                borderRadius: 8,
                border: '1px solid #cbd5e1',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
            }}>
                {/* Browser Toolbar */}
                <div style={{
                    height: 40,
                    background: '#f1f5f9',
                    borderBottom: '1px solid #e2e8f0',
                    display: 'flex',
                    alignItems: 'center',
                    padding: '0 8px',
                    gap: 8
                }}>
                    {/* Window Controls (Fake) */}
                    <div style={{ display: 'flex', gap: 6, marginRight: 8 }}>
                        <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#ef4444' }} />
                        <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#eab308' }} />
                        <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#22c55e' }} />
                    </div>

                    {/* Navigation Buttons */}
                    <div style={{ display: 'flex', gap: 4, color: '#64748b' }}>
                        <ChevronLeft size={16} />
                        <ChevronRight size={16} />
                        <RefreshCw size={14} onClick={() => setIsLoading(true)} style={{ cursor: 'pointer' }} />
                    </div>

                    {/* Address Bar */}
                    <div style={{
                        flex: 1,
                        background: '#fff',
                        borderRadius: 4,
                        border: '1px solid #e2e8f0',
                        height: 28,
                        display: 'flex',
                        alignItems: 'center',
                        padding: '0 8px',
                        gap: 8,
                        boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
                    }}>
                        <Globe size={14} color="#94a3b8" />
                        <input
                            value={urlInput}
                            onChange={(e) => setUrlInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                            onPointerDown={e => e.stopPropagation()}
                            style={{
                                border: 'none',
                                outline: 'none',
                                width: '100%',
                                fontSize: 13,
                                color: '#334155'
                            }}
                        />
                    </div>
                </div>

                {/* Content Area */}
                <div style={{ flex: 1, position: 'relative', background: '#fff' }}>
                    {isLoading && (
                        <div style={{
                            position: 'absolute', inset: 0,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            background: 'rgba(255,255,255,0.8)', zIndex: 10
                        }}>
                            <RefreshCw className="animate-spin" style={{ animation: 'spin 1s linear infinite' }} />
                        </div>
                    )}

                    {/* Note: Many sites block iframe embedding (X-Frame-Options). 
                        We can add a fallback message or proxy service later. */}
                    <iframe
                        src={iframeUrl}
                        onLoad={() => setIsLoading(false)}
                        style={{ width: '100%', height: '100%', border: 'none' }}
                        sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                        title="browser-view"
                    />
                </div>
            </HTMLContainer>
        );
    }

    indicator(shape) {
        return <rect width={shape.props.w} height={shape.props.h} rx={8} ry={8} />;
    }
}
