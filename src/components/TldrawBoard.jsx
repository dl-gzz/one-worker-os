import React, { useState, useEffect, useRef } from 'react';
import { Tldraw, useEditor, createShapeId, BaseBoxShapeUtil, HTMLContainer } from 'tldraw';
import 'tldraw/tldraw.css';
import { QuizShapeUtil } from './shapes/QuizShape';
import { CameraSimulatorShapeUtil } from './shapes/CameraSimulatorShape';

// -----------------------------------------------------------------------------
// 🧠 AI / OS CONFIGURATION
// -----------------------------------------------------------------------------
const AI_AGENT_NAME = "AaaS Copilot";
const API_KEY = "AIzaSyDL8ss39qMOJdCjU_APXO7rlcoS55PdznI";
const API_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-preview:generateContent";

// -----------------------------------------------------------------------------
// 🛠️ HELPER FUNCTIONS (Moved to Top for Safety)
// -----------------------------------------------------------------------------

const runAgentTask = async (editor, agentId) => {
    const agentShape = editor.getShape(agentId);
    if (!agentShape || agentShape.type !== 'ai_agent') return;

    // Set status to thinking
    editor.updateShape({ id: agentId, type: 'ai_agent', props: { status: 'thinking' } });

    try {
        console.log("🚀 Manual Run Triggered for Agent:", agentId);

        // NEW: Find nearby shapes (text AND images)
        const agentBounds = editor.getShapePageBounds(agentId);
        const allShapes = editor.getCurrentPageShapes();
        console.log(`📊 Total shapes on canvas: ${allShapes.length}`);

        let inputText = "";
        const inputImages = []; // Store image data
        const PROXIMITY_THRESHOLD = 300; // pixels

        for (const shape of allShapes) {
            if (shape.id === agentId || shape.type === 'arrow' || shape.type === 'ai_agent') continue;

            const shapeBounds = editor.getShapePageBounds(shape.id);
            if (!shapeBounds) continue;

            // Calculate distance between agent and this shape
            const distance = Math.sqrt(
                Math.pow(agentBounds.x - shapeBounds.x, 2) +
                Math.pow(agentBounds.y - shapeBounds.y, 2)
            );

            if (distance < PROXIMITY_THRESHOLD) {
                console.log(`📍 Found nearby shape: ${shape.type} (distance: ${Math.round(distance)}px)`);

                // 🖼️ Extract IMAGE data
                if (shape.type === 'image') {
                    try {
                        const asset = editor.getAsset(shape.props.assetId);
                        if (asset && asset.props.src) {
                            // Extract base64 data (remove data:image/xxx;base64, prefix)
                            const base64Data = asset.props.src.split(',')[1] || asset.props.src;
                            const mimeType = asset.props.mimeType || 'image/png';
                            inputImages.push({ data: base64Data, mimeType });
                            console.log(`🖼️ Extracted image: ${asset.props.name || 'unnamed'}`);
                        }
                    } catch (e) {
                        console.warn('Failed to extract image:', e);
                    }
                }
                // 📝 Extract TEXT data
                else if (shape.type === 'ai_result' && shape.props.text) {
                    inputText += shape.props.text + "\n";
                    console.log(`📝 Extracted text: ${shape.props.text.substring(0, 50)}...`);
                } else {
                    try {
                        const util = editor.getShapeUtil(shape);
                        const text = util.getText(shape);
                        if (text && text.trim()) {
                            inputText += text + "\n";
                            console.log(`📝 Extracted text via util: ${text.substring(0, 50)}...`);
                        }
                    } catch (e) {
                        const fallbackText = shape.props.text || shape.props.html || "";
                        if (fallbackText) {
                            inputText += fallbackText + "\n";
                            console.log(`📝 Extracted text from props: ${fallbackText.substring(0, 50)}...`);
                        }
                    }
                }
            }
        }

        console.log(`📄 Final input - Text: ${inputText.length} chars, Images: ${inputImages.length}`);

        if (!inputText.trim() && inputImages.length === 0) {
            console.warn("❌ No nearby content found. Try placing text or images near the agent (within 300px).");
            editor.updateShape({ id: agentId, type: 'ai_agent', props: { status: 'idle' } });
            return;
        }

        // Call AI (with Vision support if images present)
        const taskPrompt = `You are a specialised AI Agent node.
        Task Definition: ${agentShape.props.task}
        ${inputText ? `Input Text: ${inputText}` : ''}
        
        Instructions: Execute the task on the input data. Output ONLY the result. No conversational filler.`;

        // Build parts array (text + images)
        const parts = [{ text: taskPrompt }];

        // Add images as inline_data (Gemini Vision API format)
        for (const img of inputImages) {
            parts.push({
                inline_data: {
                    mime_type: img.mimeType,
                    data: img.data
                }
            });
        }

        const body = { contents: [{ parts }] };
        const res = await fetch(`${API_ENDPOINT}?key=${API_KEY}`, {
            method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body)
        });
        const data = await res.json();

        let outputText = "Error processing";
        if (data.error) {
            const errorMsg = data.error.message;
            // Friendly message for overload errors
            if (errorMsg.includes('overloaded')) {
                outputText = `⏳ API 繁忙中...\n\n请稍等片刻后重试。\n\n💡 提示：点击"运行"按钮重新执行。`;
            } else {
                outputText = `API Error: ${errorMsg}`;
            }
            console.error("Gemini API Error:", data.error);
        } else if (data.candidates && data.candidates[0] && data.candidates[0].content) {
            outputText = data.candidates[0].content.parts[0].text;

            // 🔍 Try to parse JSON response (for structured outputs like image URLs)
            try {
                const jsonMatch = outputText.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    const parsed = JSON.parse(jsonMatch[0]);

                    // If response contains an image URL, use it directly
                    if (parsed.image && typeof parsed.image === 'string') {
                        outputText = parsed.image;
                        console.log('📸 Extracted image URL from JSON:', outputText);
                    }
                    // If response has other structured data, stringify it nicely
                    else {
                        outputText = JSON.stringify(parsed, null, 2);
                    }
                }
            } catch (e) {
                // Not JSON or parsing failed, use original text
                console.log('📝 Response is plain text, not JSON');
            }
        } else {
            console.warn("Unexpected API Response:", data);
            if (data.promptFeedback) {
                outputText = `⚠️ Blocked by Safety Filters: ${JSON.stringify(data.promptFeedback)}`;
            } else {
                outputText = "⚠️ Error: Empty response from AI. Check Console.";
            }
        }

        // Create Output - USING CUSTOM 'ai_result' SHAPE
        // This avoids Tldraw schema validation errors on standard shapes
        const newId = createShapeId();
        const outX = agentShape.x + agentShape.props.w + 120;
        const outY = agentShape.y;

        editor.createShape({
            id: newId,
            type: 'ai_result',
            x: outX,
            y: outY,
            props: {
                text: outputText,
                w: 300,
                h: 200
            }
        });

        // NOTE: Arrow connection removed due to Tldraw v4.2.3 binding issues
        // The output card is created successfully without the visual connection

    } catch (e) {
        console.error("Agent Run Error:", e);
    } finally {
        editor.updateShape({ id: agentId, type: 'ai_agent', props: { status: 'idle' } });
    }
};

// -----------------------------------------------------------------------------
// 📝 CUSTOM SHAPE: AI Result / Simple Text Note
// -----------------------------------------------------------------------------
// We create this to strictly control the schema and avoid validation errors
class ResultShapeUtil extends BaseBoxShapeUtil {
    static type = 'ai_result';

    getDefaultProps() {
        return {
            w: 300,
            h: 200,
            text: 'Result',
            color: '#f0fdf4'
        };
    }

    component(shape) {
        const text = shape.props.text || '';

        // Check if text is a URL
        const urlPattern = /^https?:\/\/.+/i;
        const isUrl = urlPattern.test(text.trim());

        // Check if URL points to an image
        const imagePattern = /\.(jpg|jpeg|png|gif|webp|svg)(\?.*)?$/i;
        const isImageUrl = isUrl && imagePattern.test(text.trim());

        // Check if text is HTML code (simple check)
        const isHtml = text.trim().startsWith('<html') || text.trim().startsWith('<!DOCTYPE html');

        return (
            <HTMLContainer style={{
                pointerEvents: 'all',
                background: shape.props.color || '#fff',
                border: '1px solid #000',
                borderRadius: 4,
                padding: isHtml ? 0 : 12, // Remove padding for apps
                overflow: 'hidden', // Apps handle their own scroll
                fontFamily: 'monospace',
                fontSize: 14,
                whiteSpace: 'pre-wrap',
                boxShadow: '4px 4px 0px rgba(0,0,0,1)',
                display: 'flex',
                flexDirection: 'column',
                gap: 8
            }}>
                {isHtml ? (
                    <iframe
                        srcDoc={text}
                        style={{ width: '100%', height: '100%', border: 'none' }}
                        sandbox="allow-scripts allow-forms allow-popups"
                    />
                ) : isImageUrl ? (
                    <>
                        <img
                            src={text.trim()}
                            alt="AI Generated"
                            style={{
                                maxWidth: '100%',
                                maxHeight: '200px',
                                objectFit: 'contain',
                                borderRadius: 4
                            }}
                        />
                        <a
                            href={text.trim()}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                                fontSize: 10,
                                color: '#0066cc',
                                textDecoration: 'underline',
                                wordBreak: 'break-all'
                            }}
                        >
                            🔗 打开原图
                        </a>
                    </>
                ) : isUrl ? (
                    <a
                        href={text.trim()}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                            color: '#0066cc',
                            textDecoration: 'underline',
                            wordBreak: 'break-all'
                        }}
                    >
                        🔗 {text.trim()}
                    </a>
                ) : (
                    text
                )}
            </HTMLContainer>
        );
    }

    indicator(shape) {
        return <rect width={shape.props.w} height={shape.props.h} />;
    }
}

// -----------------------------------------------------------------------------
// 🖥️ CUSTOM SHAPE: HTML Preview (Web App Container)
// -----------------------------------------------------------------------------
class PreviewShapeUtil extends BaseBoxShapeUtil {
    static type = 'preview_html';

    getDefaultProps() {
        return {
            w: 480,
            h: 640,
            html: '<div style="padding: 24px;"><h2>Loading App...</h2></div>',
            source: ''
        };
    }

    component(shape) {
        return (
            <HTMLContainer style={{ pointerEvents: 'all', background: '#fff', borderRadius: 8, boxShadow: '0 0 10px rgba(0,0,0,0.1)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                {/* Drag Handle Header */}
                <div
                    style={{ height: 32, background: '#f3f4f6', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'grab', userSelect: 'none' }}
                    className="custom-drag-handle"
                >
                    <div style={{ width: 40, height: 4, borderRadius: 2, background: '#d1d5db' }} />
                </div>
                {/* Iframe Content */}
                <iframe
                    srcDoc={shape.props.html}
                    style={{ width: '100%', height: '100%', border: 'none', background: '#fff' }}
                    sandbox="allow-scripts allow-top-navigation-by-user-activation allow-forms allow-same-origin allow-popups allow-modals allow-downloads"
                    onPointerDown={(e) => e.stopPropagation()}
                />
            </HTMLContainer>
        );
    }

    indicator(shape) {
        return <rect width={shape.props.w} height={shape.props.h} />;
    }
}

// -----------------------------------------------------------------------------
// 🤖 CUSTOM SHAPE: AI Agent Node (The "Processor")
// -----------------------------------------------------------------------------
class AgentShapeUtil extends BaseBoxShapeUtil {
    static type = 'ai_agent';

    getDefaultProps() {
        return {
            w: 280,
            h: 160,
            status: 'idle', // idle, thinking, done
            task: '等待指令...',
            output: '',
            nearbyCount: 0  // Number of nearby text shapes
        };
    }

    component(shape) {
        const editor = useEditor();
        const [nearbyCount, setNearbyCount] = React.useState(0);

        // Check for nearby shapes periodically
        React.useEffect(() => {
            const checkProximity = () => {
                const agentBounds = editor.getShapePageBounds(shape.id);
                if (!agentBounds) return;

                const allShapes = editor.getCurrentPageShapes();
                let count = 0;
                const PROXIMITY_THRESHOLD = 300;

                for (const s of allShapes) {
                    if (s.id === shape.id || s.type === 'arrow' || s.type === 'ai_agent') continue;

                    const sBounds = editor.getShapePageBounds(s.id);
                    if (!sBounds) continue;

                    const distance = Math.sqrt(
                        Math.pow(agentBounds.x - sBounds.x, 2) +
                        Math.pow(agentBounds.y - sBounds.y, 2)
                    );

                    if (distance < PROXIMITY_THRESHOLD) {
                        // Check if it has text OR is an image
                        let hasContent = false;

                        // Check for images
                        if (s.type === 'image') {
                            hasContent = true;
                        }
                        // Check for text
                        else if (s.type === 'ai_result' && s.props.text) {
                            hasContent = true;
                        } else if (s.props.text) {
                            hasContent = true;
                        } else {
                            // Try to get text via util
                            try {
                                const util = editor.getShapeUtil(s);
                                const text = util.getText(s);
                                if (text && text.trim()) hasContent = true;
                            } catch (e) {
                                // Ignore
                            }
                        }

                        if (hasContent) {
                            count++;
                            // Removed verbose logging to reduce console spam
                        }
                    }
                }

                setNearbyCount(count);
            };

            checkProximity();
            const interval = setInterval(checkProximity, 500);
            return () => clearInterval(interval);
        }, [editor, shape.id]);

        const handleRun = React.useCallback((e) => {
            e.stopPropagation();
            e.preventDefault();
            console.log('AGENT BUTTON CLICKED', shape.id);
            runAgentTask(editor, shape.id);
        }, [editor, shape.id]);

        return (
            <HTMLContainer style={{ pointerEvents: 'all', display: 'flex', flexDirection: 'column', height: '100%', borderRadius: 12, border: '2px solid #8b5cf6', background: 'white', overflow: 'hidden', boxShadow: '0 4px 12px rgba(139, 92, 246, 0.15)', position: 'relative' }}>
                {/* Header */}
                <div style={{ background: '#f5f3ff', padding: '8px 12px', borderBottom: '1px solid #ddd6fe', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 18 }}>🤖</span>
                    <span style={{ fontWeight: 600, color: '#5b21b6', fontSize: 13 }}>AI 智能体</span>

                    {/* Proximity Indicator */}
                    {nearbyCount > 0 && (
                        <div style={{
                            display: 'flex', alignItems: 'center', gap: 4,
                            padding: '2px 8px', borderRadius: 99,
                            background: '#fef3c7', fontSize: 10, color: '#b45309',
                            animation: 'pulse 2s infinite'
                        }}>
                            <span>💡</span>
                            <span>{nearbyCount} 个输入</span>
                        </div>
                    )}

                    <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 4, padding: '2px 6px', borderRadius: 99, background: shape.props.status === 'thinking' ? '#fef3c7' : '#dcfce7', fontSize: 10, color: shape.props.status === 'thinking' ? '#b45309' : '#15803d' }}>
                        <div style={{ width: 6, height: 6, borderRadius: '50%', background: shape.props.status === 'thinking' ? '#f59e0b' : '#22c55e' }} />
                        {shape.props.status === 'thinking' ? '思考中' : '待命'}
                    </div>
                </div>

                {/* Task Body */}
                <div style={{ padding: 12, paddingBottom: 52, fontSize: 12, color: '#4b5563', flex: 1, fontFamily: 'monospace', lineHeight: 1.4, overflowY: 'auto' }}>
                    &gt; {shape.props.task}
                </div>

                {/* Footer Controls - ABSOLUTE POSITIONED */}
                <div
                    className="nodrag"
                    onPointerDownCapture={e => e.stopPropagation()}
                    style={{
                        position: 'absolute', bottom: 0, left: 0, right: 0,
                        padding: '8px 12px', borderTop: '1px solid #f3f4f6', background: '#fafafa',
                        display: 'flex', justifyContent: 'flex-end', zIndex: 9999,
                        pointerEvents: 'auto'
                    }}
                >
                    <button
                        className="nodrag"
                        onPointerDownCapture={handleRun}
                        onClick={handleRun}
                        style={{
                            background: shape.props.status === 'thinking' ? '#d1d5db' : '#7c3aed',
                            pointerEvents: 'auto',
                            position: 'relative', zIndex: 10000,
                            color: 'white', border: 'none', borderRadius: 6,
                            padding: '6px 16px', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                            display: 'flex', alignItems: 'center', gap: 6,
                            boxShadow: '0 2px 4px rgba(124, 58, 237, 0.2)'
                        }}
                    >
                        <span>{shape.props.status === 'thinking' ? '⏳' : '▶'}</span>
                        {shape.props.status === 'thinking' ? '运行中...' : '运行'}
                    </button>
                </div>
            </HTMLContainer>
        );
    }

    // Helper to get text from this shape if needed 
    getText(shape) {
        return shape.props.task;
    }

    indicator(shape) {
        return <rect width={shape.props.w} height={shape.props.h} rx={12} ry={12} />;
    }
}

// REGISTER CUSTOM SHAPES
const customShapeUtils = [PreviewShapeUtil, AgentShapeUtil, ResultShapeUtil, QuizShapeUtil, CameraSimulatorShapeUtil];

export default function TldrawBoard() {
    return (
        <div style={{ position: 'fixed', inset: 0 }}>
            <Tldraw persistenceKey="one-worker-os-v2" shapeUtils={customShapeUtils}>
                <BoardLogic />
            </Tldraw>
        </div>
    );
}

// Inner component to handle AI logic and events
function BoardLogic() {
    const editor = useEditor();

    // AI Chat State
    const [isAiOpen, setIsAiOpen] = useState(false);
    const [aiInput, setAiInput] = useState('');
    const [messages, setMessages] = useState([
        { role: 'system', text: '已切换至 Tldraw (DOM) 架构。我是您的全能 OS 助手。' }
    ]);
    const [loading, setLoading] = useState(false);
    const [isListening, setIsListening] = useState(false);
    const [selectedCount, setSelectedCount] = useState(0);

    // Update selection count on interaction
    useEffect(() => {
        if (!editor) return;

        // Initial check
        setSelectedCount(editor.getSelectedShapeIds().length);

        // Listen for internal Tldraw state changes
        const cleanup = editor.store.listen((entry) => {
            const ids = editor.getSelectedShapeIds();
            setSelectedCount(ids.length);
        });

        // Also keep DOM listeners as backup for pure selection clicks
        const updateSelection = () => {
            const ids = editor.getSelectedShapeIds();
            setSelectedCount(ids.length);
        };

        window.addEventListener('pointerup', updateSelection);
        window.addEventListener('keyup', updateSelection);

        return () => {
            cleanup();
            window.removeEventListener('pointerup', updateSelection);
            window.removeEventListener('keyup', updateSelection);
        };
    }, [editor]);

    // 📂 FILE DROP HANDLER (Text/Code/Markdown)
    // -------------------------------------------------------------------------
    // 📂 FILE DROP HANDLER (Text/Code/Markdown)
    // -------------------------------------------------------------------------

    useEffect(() => {
        if (!editor) return;

        const handleDrop = async (e) => {
            e.preventDefault();
            e.stopPropagation(); // Stop other handlers immediately

            // Enhanced duplicate prevention
            const now = Date.now();

            // 1. Time-based lock (increased to 2 seconds for async image processing)
            if (window._dropLock && now - window._dropLock < 2000) {
                console.log('🚫 Drop blocked by time lock');
                return;
            }

            // 2. File fingerprint lock (name + size + timestamp)
            const files = Array.from(e.dataTransfer.files);
            if (files.length === 0) return;

            const fileFingerprint = files.map(f => `${f.name}-${f.size}`).join('|');
            if (window._lastDropFingerprint === fileFingerprint && now - window._dropLock < 2000) {
                console.log('🚫 Drop blocked by fingerprint match');
                return;
            }

            // Set locks
            window._dropLock = now;
            window._lastDropFingerprint = fileFingerprint;

            console.log('✅ Processing drop:', fileFingerprint);

            const point = editor.screenToPage({ x: e.clientX, y: e.clientY });
            let offset = 0;

            for (const file of files) {
                // 🖼️ Handle Image Files
                if (file.type.startsWith('image/')) {
                    const reader = new FileReader();
                    reader.onload = async (e) => {
                        const src = e.target.result;
                        // Manual asset ID generation that matches Tldraw's expected format
                        // Using a simple random string for local offline usage
                        const assetIdString = `asset:${Date.now()}`;
                        // In TypeScript this would need casting, but in JS string is fine for the ID field usually,
                        // but Tldraw expects a specific Branded type. In strict mode createAssets handles it.

                        // Load image to get dimensions
                        const img = new window.Image();
                        img.onload = () => {
                            const w = img.width;
                            const h = img.height;

                            // Scale down if too big
                            let scale = 1;
                            if (w > 1000) scale = 1000 / w;

                            // 1. Create the Asset Record
                            // Tldraw v2+ requires assets for images
                            editor.createAssets([{
                                id: assetIdString,
                                typeName: 'asset',
                                type: 'image',
                                props: {
                                    w: w,
                                    h: h,
                                    mimeType: file.type,
                                    src: src, // Base64 data
                                    name: file.name,
                                    isAnimated: false
                                },
                                meta: {}
                            }]);

                            // 2. Create the Image Shape referencing the Asset
                            editor.createShape({
                                id: createShapeId(),
                                type: 'image',
                                x: point.x + offset,
                                y: point.y + offset,
                                props: {
                                    w: w * scale,
                                    h: h * scale,
                                    assetId: assetIdString
                                }
                            });
                        };
                        img.src = src;
                    };
                    reader.readAsDataURL(file);
                    offset += 40;
                    continue; // Skip text logic
                }

                // 📄 Handle Text/Code Files
                // 📄 Handle Text/Code Files
                // Use extension check as primary method because MIME types can be unreliable for dev files
                if (file.type.startsWith('text/') ||
                    file.name.toLowerCase().endsWith('.md') ||
                    file.name.toLowerCase().endsWith('.markdown') ||
                    file.name.toLowerCase().endsWith('.txt') ||
                    file.name.toLowerCase().endsWith('.json') ||
                    file.name.toLowerCase().endsWith('.js') ||
                    file.name.toLowerCase().endsWith('.jsx') ||
                    file.name.toLowerCase().endsWith('.ts') ||
                    file.name.toLowerCase().endsWith('.tsx') ||
                    file.name.toLowerCase().endsWith('.py') ||
                    file.name.toLowerCase().endsWith('.csv') ||
                    file.name.toLowerCase().endsWith('.html') ||
                    file.name.toLowerCase().endsWith('.css')) {

                    const text = await file.text();

                    editor.createShape({
                        id: createShapeId(),
                        type: 'ai_result', // Use our CUSTOM shape which we know has 'text' prop
                        x: point.x + offset,
                        y: point.y + offset,
                        props: {
                            text: text.slice(0, 2000) + (text.length > 2000 ? "\n...(truncated)" : ""),
                            w: 240,
                            h: 240
                        }
                    });

                    offset += 40;
                }
            }
        };

        const handleDragOver = (e) => {
            e.preventDefault(); // valid drop target
        };

        // We attach to window to catch drops anywhere, but ideally we check if it's on canvas
        // Tldraw might stop propagation, so we use capture phase
        window.addEventListener('drop', handleDrop, true);
        window.addEventListener('dragover', handleDragOver, true);

        return () => {
            window.removeEventListener('drop', handleDrop, true);
            window.removeEventListener('dragover', handleDragOver, true);
        };
    }, [editor]);

    const startVoiceInput = () => {
        if (!('webkitSpeechRecognition' in window)) {
            return alert("您的浏览器不支持语音输入 (需 Chrome/Edge)");
        }
        const recognition = new window.webkitSpeechRecognition();
        recognition.lang = 'zh-CN';
        recognition.onstart = () => setIsListening(true);
        recognition.onend = () => setIsListening(false);
        recognition.onresult = (e) => {
            const text = e.results[0][0].transcript;
            setAiInput(text);
        };
        recognition.start();
    };

    // -------------------------------------------------------------------------
    // 🧠 AI SYSTEM PROMPT
    // -------------------------------------------------------------------------
    const SYSTEM_PROMPT = `You are the OS Kernel for a spatial canvas.
    You have FULL control to create and modify shapes.
    
    🌍 LANGUAGE RULE: 
    - You MUST use Chinese (简体中文) for the "thought" field and any voice responses.
    - If creating an Agent, the 'task' description should be in Chinese (e.g., "翻译成英文").
    
    CAPABILITIES:
    1. Create sticky notes for text/knowledge.
    2. Create arrows to connect ideas.
    3. 🚀 GENERATE APPS: If the user asks for a tool, game, or utility (e.g. "calculator", "clock", "snake game"), 
       create a 'preview_html' shape. 
       Return JSON: { action: "create", type: "preview_html", props: { html: "<html>...REALLY COOL MODERN UI...</html>", w: 480, h: 640 } }
       Ensure the HTML is fully functional (embedded CSS/JS).
    4. 🤖 CREATE AGENTS: If the user asks for an AI processor (e.g. "translator", "summarizer"),
       create an 'ai_agent' shape.
       Return JSON: { action: "create", type: "ai_agent", props: { task: "Translate to English", status: "idle" } }
    5. 📝 CREATE QUIZ: If user asks for a quiz or practice question,
       create a 'quiz' shape.
       Return JSON: { action: "create", type: "quiz", props: { question: "...", options: [...], correctAnswer: 0 } }
    6. 📷 CREATE CAMERA: If user asks for a camera simulator,
       create a 'camera_simulator' shape.
       Return JSON: { action: "create", type: "camera_simulator", props: {} }
    7. 🔗 CREATE CONNECTED WORKFLOWS: If user asks to connect shapes or create a workflow:
       - First create the shapes
       - Then create arrows with PROPER BINDINGS
       - Arrow format: { action: "create", type: "arrow", props: { 
           start: { x: 0, y: 0 },
           end: { x: 100, y: 100 }
         }}
    
    RESPONSE FORMAT (JSON ONLY):
    {
      "thought": "Reasoning...",
      "operations": [
        { "action": "create", "type": "ai_result", "props": { "text": "..." }, "x": 0, "y": 0 },
        { "action": "update", "id": "...", "props": { ... } }
      ],
      "voice_response": "Optional spoken text"
    }
    
    CONTEXT AWARENESS:
    I will provide the selected shapes. Use them! 
    - If user says "Make this red", update the selected shape.
    - If user says "Summarize this", read the selected text.
    - If user says "Connect these", create arrows between selected shapes.
    `;

    // -------------------------------------------------------------------------
    // 🤖 AI CALL HANDLER
    // -------------------------------------------------------------------------
    async function callAI(promptOverride = null) {
        if (!promptOverride && !aiInput.trim()) return;

        const userText = promptOverride || aiInput;
        // Optimization: Clean input immediately
        if (!promptOverride) {
            setMessages(prev => [...prev, { role: 'user', text: userText }]);
            setAiInput('');
        }
        setLoading(true);

        try {
            // 1. Gather Context (Selected Shapes)
            const selectedIds = editor.getSelectedShapeIds();
            let contextData = "Selected Shapes:\n";
            if (selectedIds.length > 0) {
                selectedIds.forEach(id => {
                    const shape = editor.getShape(id);
                    let content = "";
                    // Extract text/code content
                    if (shape.type === 'ai_result' || shape.type === 'text') {
                        content = `Content: "${shape.props.text}"`;
                    } else if (shape.type === 'preview_html') {
                        content = `Code: "${shape.props.html}"`;
                    } else if (shape.type === 'ai_agent') {
                        content = `Agent Task: "${shape.props.task}"`;
                    }
                    contextData += "- ID: " + shape.id + ", Type: " + shape.type + ", " + content + ", Positions: x=" + Math.round(shape.x) + ", y=" + Math.round(shape.y) + "\n";
                });
            } else {
                contextData += "No shapes selected.\n";
            }

            // 2. Build Request
            const finalPrompt = SYSTEM_PROMPT + "\n\nCURRENT CONTEXT:\n" + contextData + "\n\nUSER REQUEST: " + userText;

            const body = {
                contents: [{ parts: [{ text: finalPrompt }] }]
            };

            const res = await fetch(`${API_ENDPOINT}?key=${API_KEY}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body)
            });

            const data = await res.json();
            const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text;

            if (!responseText) {
                console.error("AI Error Data:", data);
                const errorMsg = data.error ? data.error.message : (data.promptFeedback ? "Blocked by Safety" : "Empty Response");
                throw new Error("AI Error: " + errorMsg);
            }

            // 3. Parse JSON & Execute
            const jsonMatch = responseText.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const jsonStr = jsonMatch[0];
                const plan = JSON.parse(jsonStr);

                setMessages(prev => [...prev, { role: 'assistant', text: plan.thought || "Processing..." }]);

                // Voice Output
                if (plan.voice_response && 'speechSynthesis' in window) {
                    const utterance = new SpeechSynthesisUtterance(plan.voice_response);
                    utterance.lang = 'zh-CN';
                    window.speechSynthesis.speak(utterance);
                }

                // Execute Operations
                if (plan.operations) {
                    {
                        const center = editor.getViewportPageBounds().center;
                        let offset = 0;

                        plan.operations.forEach(op => {
                            if (op.action === 'create') {
                                const newId = createShapeId();
                                // Smart Positioning
                                let x = center.x + (op.x || 0) + offset;
                                let y = center.y + (op.y || 0) + offset;

                                // If context exists, place next to it
                                if (selectedIds.length > 0) {
                                    const first = editor.getShape(selectedIds[0]);
                                    x = first.x + first.props.w + 40;
                                    y = first.y;
                                }

                                const finalProps = op.props;
                                let shapeType = op.type;

                                // FIX: Redirect everything to 'ai_result' to avoid schema errors
                                if (shapeType === 'note' || shapeType === 'geo' || shapeType === 'text') {
                                    shapeType = 'ai_result';
                                    finalProps.text = finalProps.text || "New Note";
                                    finalProps.w = 300;
                                    finalProps.h = 200;
                                }

                                // FIX: Handle 'connector' hallucinations
                                if (shapeType === 'connector' || shapeType === 'edge') {
                                    shapeType = 'arrow';
                                }

                                // Special handling for Apps
                                if (shapeType === 'preview_html') {
                                    // Ensure dimensions
                                    finalProps.w = finalProps.w || 480;
                                    finalProps.h = finalProps.h || 640;
                                }

                                // Special handling for Arrows - use simple point-to-point
                                if (shapeType === 'arrow') {
                                    console.log('🏹 Creating arrow with props:', finalProps);

                                    // Simplified arrow structure - only use points, not bindings
                                    // Tldraw's binding validation is too strict and version-dependent
                                    const arrowProps = {
                                        start: {
                                            x: finalProps.start?.x || 0,
                                            y: finalProps.start?.y || 0
                                        },
                                        end: {
                                            x: finalProps.end?.x || 100,
                                            y: finalProps.end?.y || 100
                                        }
                                    };

                                    // Arrows use absolute positioning via start/end points
                                    editor.createShape({
                                        id: newId,
                                        type: 'arrow',
                                        props: arrowProps
                                    });
                                    offset += 40;
                                    return; // Skip the normal createShape below
                                }

                                editor.createShape({
                                    id: newId,
                                    type: shapeType,
                                    x: x,
                                    y: y,
                                    props: finalProps
                                });
                                offset += 40;
                            } else if (op.action === 'update' && op.id) {
                                editor.updateShape({
                                    id: op.id,
                                    props: op.props
                                });
                            }
                        });
                    }
                }
            } else {
                // Fallback for non-JSON response
                setMessages(prev => [...prev, { role: 'assistant', text: responseText }]);
            }

        } catch (e) {
            console.error(e);
            setMessages(prev => [...prev, { role: 'system', text: "Error: " + e.message }]);
        } finally {
            setLoading(false);
        }
    }

    // -------------------------------------------------------------------------
    // 🧠 VISUAL PROGRAMMING: ARROW LISTENERS
    // -------------------------------------------------------------------------
    React.useEffect(() => {
        if (!editor) return;
        const cleanup = editor.store.listen((entry) => {
            const changes = entry.changes;
            if (changes.updated) {
                // Auto-trigger logic (Future)
            }
        });
        return () => cleanup();
    }, [editor]);



    return (
        <>

            {/* AI Widget / Chat Panel */}
            <div
                style={{
                    position: 'absolute',
                    top: 12,
                    right: 180, // Moved left to avoid overlap
                    width: 380,
                    display: 'flex', flexDirection: 'column', gap: 8,
                    pointerEvents: 'none' // Wrapper non-blocking
                }}
            >
                {/* Chat Bubble */}
                {isAiOpen && (
                    <div style={{
                        background: 'rgba(255, 255, 255, 0.95)',
                        backdropFilter: 'blur(12px)',
                        borderRadius: 20,
                        boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
                        border: '1px solid rgba(255,255,255,0.5)',
                        padding: 16,
                        maxHeight: 500,
                        display: 'flex', flexDirection: 'column',
                        pointerEvents: 'all' // Content interactive
                    }}>
                        <div style={{ flex: 1, overflowY: 'auto', marginBottom: 12, minHeight: 100, fontSize: 13, gap: 12, display: 'flex', flexDirection: 'column' }}>
                            {messages.map((m, i) => (
                                <div key={i} style={{
                                    alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
                                    background: m.role === 'user' ? '#000' : '#f3f4f6',
                                    color: m.role === 'user' ? '#fff' : '#000',
                                    padding: '8px 12px', borderRadius: 12, maxWidth: '85%', lineHeight: 1.4
                                }}>
                                    {m.text}
                                </div>
                            ))}
                            {loading && <div style={{ color: '#666', fontSize: 12 }}>Processing...</div>}
                        </div>

                        <div style={{ display: 'flex', gap: 8 }}>
                            <input
                                style={{ flex: 1, padding: '8px 12px', borderRadius: 8, border: '1px solid #ddd', fontSize: 13, outline: 'none' }}
                                placeholder="描述一个应用、工具或修改..."
                                value={aiInput}
                                onChange={e => setAiInput(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && callAI()}
                            />
                            {/* Voice Button */}
                            <button
                                onClick={startVoiceInput}
                                style={{
                                    width: 36, borderRadius: 8, border: 'none',
                                    background: isListening ? '#ef4444' : '#fee2e2',
                                    color: '#b91c1c', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'
                                }}
                                title="Voice Input"
                            >
                                🎤
                            </button>
                            {/* Send Button */}
                            <button
                                onClick={() => callAI()}
                                style={{ background: '#000', color: '#fff', border: 'none', borderRadius: 8, padding: '0 16px', cursor: 'pointer', fontWeight: 600 }}
                            >
                                ↵
                            </button>
                        </div>
                    </div>
                )}

                {/* Floating Action Button (FAB) */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, pointerEvents: 'all' }}>

                    {/* 📷 相机模拟器按钮 */}
                    <button
                        onClick={() => {
                            const center = editor.getViewportPageBounds().center;
                            editor.createShape({
                                type: 'camera_simulator',
                                x: center.x - 250,
                                y: center.y - 300,
                                props: {}
                            });
                        }}
                        title="创建相机模拟器"
                        style={{
                            width: 48, height: 48, borderRadius: 24,
                            background: '#1a1a1a', color: '#fff',
                            border: '1px solid #333', boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
                            fontSize: 20, cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            transition: 'all 0.2s cubic-bezier(0.25, 1, 0.5, 1)'
                        }}
                    >
                        📷
                    </button>

                    {/* 📝 选择题按钮 */}
                    <button
                        onClick={() => {
                            const center = editor.getViewportPageBounds().center;
                            editor.createShape({
                                type: 'quiz',
                                x: center.x - 200,
                                y: center.y - 160,
                                props: {}
                            });
                        }}
                        title="创建选择题"
                        style={{
                            width: 48, height: 48, borderRadius: 24,
                            background: '#3b82f6', color: '#fff',
                            border: 'none', boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)',
                            fontSize: 20, cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            transition: 'all 0.2s cubic-bezier(0.25, 1, 0.5, 1)'
                        }}
                    >
                        📝
                    </button>

                    {/* ✨ AI 助手按钮 */}
                    <button
                        onClick={() => setIsAiOpen(!isAiOpen)}
                        title="AI 助手"
                        style={{
                            width: 48, height: 48, borderRadius: 24,
                            background: '#000', color: '#fff',
                            border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                            fontSize: 20, cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            transition: 'all 0.2s cubic-bezier(0.25, 1, 0.5, 1)'
                        }}
                    >
                        {isAiOpen ? '✕' : '✨'}
                    </button>
                </div>
            </div>
        </>
    );
}
