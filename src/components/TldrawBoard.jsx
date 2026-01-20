import React, { useState, useEffect, useRef } from 'react';
import * as ReactLib from 'react'; // Capture React for dependency injection
import { Tldraw, useEditor, createShapeId, BaseBoxShapeUtil, HTMLContainer } from 'tldraw';
import * as TldrawLib from 'tldraw'; // Capture all Tldraw exports for dependency injection
import { transform } from 'sucrase'; // The Compiler Engine
import 'tldraw/tldraw.css';


// -----------------------------------------------------------------------------
// 🧠 AI / OS CONFIGURATION
// -----------------------------------------------------------------------------
const AI_AGENT_NAME = "AaaS Copilot";
// ⚠️ SECURITY: Never commit API keys to git! Use environment variables instead.
// Create a .env file in the project root with: VITE_GEMINI_API_KEY=your_key_here
const API_KEY = (import.meta.env.VITE_GEMINI_API_KEY || "").trim();
const API_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent";

// Debug mode: Set to true to see detailed pipeline logs
const DEBUG_MODE = false;

// -----------------------------------------------------------------------------
// 🛠️ HELPER FUNCTIONS (Moved to Top for Safety)
// -----------------------------------------------------------------------------

const extractDataFromShape = (editor, shape) => {
    if (!shape) return null;

    if (DEBUG_MODE) {
        console.log(`📦 Extracting data from ${shape.type} (${shape.id})`);
        console.log(`   Full arrow.props:`, JSON.stringify(shape.props, null, 2));
    }

    // 1. Image Shape
    if (shape.type === 'image') {
        try {
            const asset = editor.getAsset(shape.props.assetId);
            if (asset && asset.props.src) {
                const base64Data = asset.props.src.split(',')[1] || asset.props.src;
                const mimeType = asset.props.mimeType || 'image/png';
                return { type: 'image', data: base64Data, mimeType, name: asset.props.name };
            }
        } catch (e) { console.warn('Image extraction failed', e); }
        return null;
    }

    // 2. Browser Shape
    if (shape.type === 'browser') {
        return { type: 'text', text: `[Browser Context] URL: ${shape.props.url}` };
    }

    // 3. Code Runner
    if (shape.type === 'code_runner') {
        let content = `[Code Context]\nCode:\n${shape.props.code}`;
        if (shape.props.output && shape.props.output.length > 0) {
            const lastOutput = shape.props.output[shape.props.output.length - 1];
            content += `\n\nLast Output: ${lastOutput.text}`;
        }
        return { type: 'text', text: content };
    }

    // 4. Generic Text Handlers (Note, Text, Geo/Rectangle)
    // Try using the editor's getText utility first
    try {
        const util = editor.getShapeUtil(shape);
        if (util && util.getText) {
            const text = util.getText(shape);
            if (text && text.trim()) {
                if (DEBUG_MODE) console.log(`   ✅ Extracted via util.getText: "${text.substring(0, 50)}..."`);
                return { type: 'text', text: text };
            }
        }
    } catch (e) {
        if (DEBUG_MODE) console.warn('   getText util failed:', e.message);
    }

    // Fallback: Direct props.text access
    if (shape.props && typeof shape.props.text === 'string') {
        if (!shape.props.text.trim()) return null; // Ignore empty text
        if (DEBUG_MODE) console.log(`   ✅ Extracted via props.text: "${shape.props.text.substring(0, 50)}..."`);
        return { type: 'text', text: shape.props.text };
    }

    if (DEBUG_MODE) console.warn(`   ❌ No text extraction method worked for ${shape.type}`);
    return null;
};

const getUpstreamData = (editor, agentId) => {
    if (DEBUG_MODE) console.log(`🚀 getUpstreamData called for ${agentId}`);
    const inputs = [];
    const agentShape = editor.getShape(agentId);
    if (!agentShape) {
        console.warn("⚠️ Agent shape not found in editor");
        return [];
    }

    const agentBounds = editor.getShapePageBounds(agentId);
    if (!agentBounds && DEBUG_MODE) console.warn("⚠️ Agent bounds could not be determined");

    const allShapes = editor.getCurrentPageShapes();
    const arrows = allShapes.filter(s => s.type === 'arrow');

    if (DEBUG_MODE) console.log(`🔍 Checking ${arrows.length} arrows...`);

    for (const arrow of arrows) {
        let isConnectedToAgent = false;
        let sourceShapeId = null;

        if (DEBUG_MODE) {
            console.log(`🔎 Inspecting arrow ${arrow.id}:`);
            console.log(`   Full arrow.props:`, JSON.stringify(arrow.props, null, 2));
            console.log(`   arrow.x: ${arrow.x}, arrow.y: ${arrow.y}`);
        }

        // -------------------------------------------------------------
        // 1. END POINT CHECK (Arrow Tip -> Agent?)
        // -------------------------------------------------------------

        // Check 1: Strict Binding (if available)
        if (arrow.props.end?.type === 'binding' && arrow.props.end?.boundShapeId === agentId) {
            if (DEBUG_MODE) console.log(`🔗 Arrow ${arrow.id} Tip is STRICTLY BOUND to Agent`);
            isConnectedToAgent = true;
        }
        // Check 2: Geometric check (works for all arrow types)
        else if (agentBounds && arrow.props.end) {
            // Try to get coordinates - handle both point type and direct x/y
            const endX = arrow.x + (arrow.props.end.x || 0);
            const endY = arrow.y + (arrow.props.end.y || 0);
            const buffer = 100;

            if (DEBUG_MODE) console.log(`📏 Checking geometry: Tip (${Math.round(endX)}, ${Math.round(endY)}) vs Agent bounds`);

            if (endX >= agentBounds.x - buffer && endX <= agentBounds.x + agentBounds.w + buffer &&
                endY >= agentBounds.y - buffer && endY <= agentBounds.y + agentBounds.h + buffer) {
                isConnectedToAgent = true;
                if (DEBUG_MODE) console.log("✅ TIP HIT DETECTED (Geometry)!");
            }
        }

        if (!isConnectedToAgent) {
            continue;
        }

        // -------------------------------------------------------------
        // 2. START POINT CHECK (Arrow Tail -> Source?)
        // -------------------------------------------------------------

        // Check 1: Strict Binding (if available)
        if (arrow.props.start?.type === 'binding' && arrow.props.start?.boundShapeId) {
            sourceShapeId = arrow.props.start.boundShapeId;
            if (DEBUG_MODE) console.log(`🔗 Arrow ${arrow.id} Start is BOUND to ${sourceShapeId}`);
        }
        // Check 2: Geometric scan (works for all arrow types)
        else if (arrow.props.start) {
            const startX = arrow.x + (arrow.props.start.x || 0);
            const startY = arrow.y + (arrow.props.start.y || 0);
            const buffer = 300; // SUPER MAGNET TOLERANCE

            if (DEBUG_MODE) console.log(`📏 Check Arrow Tail: (${Math.round(startX)}, ${Math.round(startY)}) with 300px Magnet...`);

            const otherShapes = allShapes.filter(s => s.id !== arrow.id && s.id !== agentId && s.type !== 'arrow');

            let closestShape = null;
            let minDist = Infinity;

            for (const s of otherShapes) {
                const b = editor.getShapePageBounds(s.id);
                if (!b) continue;

                // Check intersection with HUGE buffer
                if (startX >= b.x - buffer && startX <= b.x + b.w + buffer &&
                    startY >= b.y - buffer && startY <= b.y + b.h + buffer) {

                    // Find the closest one among candidates
                    const centerX = b.x + b.w / 2;
                    const centerY = b.y + b.h / 2;
                    const dist = Math.sqrt(Math.pow(centerX - startX, 2) + Math.pow(centerY - startY, 2));

                    if (dist < minDist) {
                        minDist = dist;
                        closestShape = s;
                    }
                }
            }

            if (closestShape) {
                sourceShapeId = closestShape.id;
                if (DEBUG_MODE) console.log(`🧲 MAGNET ATTRACTED: ${closestShape.type} (${closestShape.id}) Dist: ~${Math.round(minDist)}px`);
            } else if (DEBUG_MODE) {
                console.log("❌ TAIL MISS (Even with 300px magnet)");
            }
        }

        if (sourceShapeId) {
            const sourceShape = editor.getShape(sourceShapeId);
            const data = extractDataFromShape(editor, sourceShape);
            if (data) {
                inputs.push({ ...data, sourceId: sourceShape.id });
                console.log(`✨ ${sourceShape.type} → Agent`);
            } else {
                console.warn(`⚠️ Connected shape ${sourceShape.type} produced no data.`);
            }
        }
    }

    return inputs;
};

const runAgentTask = async (editor, agentId) => {
    const agentShape = editor.getShape(agentId);
    if (!agentShape || agentShape.type !== 'ai_agent') return;

    // Security check: Ensure API key is configured
    if (!API_KEY || API_KEY.trim() === '') {
        console.error('❌ API_KEY is not configured! Please set VITE_GEMINI_API_KEY in your .env file.');
        console.error('📖 See SECURITY_SETUP.md for instructions.');
        editor.updateShape({
            id: agentId,
            type: 'ai_agent',
            props: { status: 'idle' }
        });
        alert('⚠️ API Key not configured!\n\nPlease:\n1. Create a .env file\n2. Add: VITE_GEMINI_API_KEY=your_key\n3. Restart the dev server\n\nSee SECURITY_SETUP.md for details.');
        return;
    }

    // Set status to thinking
    editor.updateShape({ id: agentId, type: 'ai_agent', props: { status: 'thinking' } });

    try {
        console.log("🚀 Manual Run Triggered for Agent:", agentId);

        let inputText = "";
        const inputImages = [];
        let usedSources = [];

        // 1. STRATEGY: SPATIAL PIPELINE (Arrows)
        // Check for connected upstream shapes first
        const linkedInputs = getUpstreamData(editor, agentId);

        if (linkedInputs.length > 0) {
            console.log("✅ Using CONNECTED mode (ignoring proximity)");
            for (const input of linkedInputs) {
                if (input.type === 'text') inputText += input.text + "\n\n";
                if (input.type === 'image') inputImages.push(input);
                usedSources.push(input.sourceId);
            }
        }
        // 2. STRATEGY: PROXIMITY (Fallback)
        else {
            console.log("⚠️ No connections found. Using PROXIMITY mode.");
            const agentBounds = editor.getShapePageBounds(agentId);
            const allShapes = editor.getCurrentPageShapes();
            const PROXIMITY_THRESHOLD = 300; // pixels

            for (const shape of allShapes) {
                if (shape.id === agentId || shape.type === 'arrow' || shape.type === 'ai_agent') continue;
                // Add helper to avoid re-calculating if we already processed (future proofing)

                const shapeBounds = editor.getShapePageBounds(shape.id);
                if (!shapeBounds) continue;

                const distance = Math.sqrt(
                    Math.pow(agentBounds.x - shapeBounds.x, 2) +
                    Math.pow(agentBounds.y - shapeBounds.y, 2)
                );

                if (distance < PROXIMITY_THRESHOLD) {
                    const data = extractDataFromShape(editor, shape);
                    if (data) {
                        console.log(`📍 Found nearby shape: ${shape.type} (distance: ${Math.round(distance)}px)`);
                        if (data.type === 'text') inputText += data.text + "\n\n";
                        if (data.type === 'image') inputImages.push(data);
                    }
                }
            }
        }

        console.log(`📄 Final input - Text: ${inputText.length} chars, Images: ${inputImages.length}`);

        if (!inputText.trim() && inputImages.length === 0) {
            console.warn("❌ No content found (neither connected nor nearby).");
            editor.updateShape({ id: agentId, type: 'ai_agent', props: { status: 'idle' } });
            return;
        }

        // Call AI
        const taskPrompt = `You are a specialised AI Agent node in a visual OS.
        Task Definition: ${agentShape.props.task}
        
        DATA CONTEXT:
        ${inputText ? `Input Data:\n${inputText}` : 'No text input.'}
        
        Instructions: Execute the task on the input data. Output ONLY the result. No conversational filler.`;

        const parts = [{ text: taskPrompt }];
        for (const img of inputImages) {
            parts.push({
                inline_data: { mime_type: img.mimeType, data: img.data }
            });
        }

        let outputText = "";

        try {
            const body = { contents: [{ parts }] };
            const res = await fetch(`${API_ENDPOINT}?key=${API_KEY}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body)
            });

            // Check HTTP status
            if (!res.ok) {
                const errorData = await res.json().catch(() => ({}));
                throw new Error(errorData.error?.message || `HTTP ${res.status}: ${res.statusText}`);
            }

            const data = await res.json();

            if (data.error) {
                throw new Error(data.error.message);
            } else if (data.candidates && data.candidates[0]) {
                outputText = data.candidates[0].content.parts[0].text;

                // Try to extract JSON image/structure if present
                try {
                    const jsonMatch = outputText.match(/\{[\s\S]*\}/);
                    if (jsonMatch) {
                        const parsed = JSON.parse(jsonMatch[0]);
                        if (parsed.image) outputText = parsed.image;
                        else outputText = JSON.stringify(parsed, null, 2);
                    }
                } catch (e) {
                    // JSON parsing failed, use raw text
                }
            } else {
                throw new Error("No response from AI");
            }
        } catch (error) {
            console.error("❌ AI Agent Error:", error);
            outputText = `⚠️ Error: ${error.message}\n\nPlease check:\n- API key is valid\n- Network connection\n- Input data format`;

            // Show user-friendly alert for critical errors
            if (error.message.includes("API key") || error.message.includes("403")) {
                alert("🔑 API Key Error\n\nYour Gemini API key may be invalid or expired.\nPlease check your .env file.");
            }
        }

        // Create Output
        // Find existing output connection? (Future: Update existing downstream note)
        // For now, simple create new note
        const newId = createShapeId();
        const outX = agentShape.x + agentShape.props.w + 100;
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

        // 🔗 AUTO-CONNECT OUTPUT (Pipeline Feature)
        // Create a simple arrow from Agent -> Result using point coordinates
        const arrowId = createShapeId();
        const arrowX = agentShape.x + agentShape.props.w / 2;
        const arrowY = agentShape.y + agentShape.props.h / 2;

        editor.createShape({
            id: arrowId,
            type: 'arrow',
            x: arrowX,
            y: arrowY,
            props: {
                start: { x: 0, y: 0 },  // Relative to arrow position
                end: { x: outX - arrowX + 150, y: outY - arrowY + 100 }  // Point to center of result
            }
        });

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
import { customShapeUtils as externalShapeUtils } from './shapes/registry';
import { RedSquareShapeUtil } from './shapes/RedSquareShape';

// ... (Retain locally defined shapes like Preview, Agent, Result)

// REGISTER CUSTOM SHAPES
// Combine local core shapes with external registry shapes
const customShapeUtils = [
    PreviewShapeUtil,
    AgentShapeUtil,
    ResultShapeUtil,
    RedSquareShapeUtil,
    ...externalShapeUtils
];

export default function TldrawBoard() {
    // 动态 ShapeUtils State
    const [shapeUtils, setShapeUtils] = useState(customShapeUtils);
    const [editor, setEditor] = useState(null);

    // GOD MODE: 动态注册 Shape 的核心引擎
    const registerDynamicShape = (codeString = null) => {
        const defaultCode = `
            import { BaseBoxShapeUtil, HTMLContainer } from 'tldraw'
            import React from 'react'

            export class GodModeShapeUtil extends BaseBoxShapeUtil {
                static type = 'god_mode_shape'
                
                getDefaultProps() {
                    return { w: 200, h: 200 }
                }

                component(shape) {
                    return (
                        <HTMLContainer style={{ pointerEvents: 'all' }}>
                            <div style={{ 
                                width: '100%', height: '100%', 
                                background: 'linear-gradient(45deg, #FF0000, #0000FF)', 
                                borderRadius: '12px',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                flexDirection: 'column',
                                color: 'white', fontWeight: 'bold',
                                boxShadow: '0 10px 20px rgba(0,0,0,0.5)',
                                border: '2px solid white'
                            }}>
                                <div style={{ fontSize: 40 }}>⚡</div>
                                <div>GOD MODE</div>
                                <div style={{ fontSize: 10, opacity: 0.8 }}>Generated at Runtime</div>
                            </div>
                        </HTMLContainer>
                    )
                }
                indicator(shape) {
                    return <rect width={shape.props.w} height={shape.props.h} />
                }
            }
        `;

        const codeStr = codeString || defaultCode;

        try {
            console.log("⚡ Compiling dynamic shape...");
            // 1. Transpile (compile JSX/TS to JS)
            const compiledCode = transform(codeStr, {
                transforms: ['typescript', 'jsx', 'imports'],
            }).code;

            // 2. Prepare Injection Context
            const exports = {};
            const require = (mod) => {
                if (mod === 'tldraw') return TldrawLib;
                if (mod === 'react') return ReactLib;
                throw new Error(`Unknown module: ${mod}`);
            };

            // 3. Execute with Function constructor
            const factory = new Function('require', 'exports', 'React', compiledCode);
            factory(require, exports, ReactLib);

            // 4. Extract the ShapeUtil
            const UtilClass = Object.values(exports)[0];

            if (!UtilClass || !UtilClass.type) {
                throw new Error("Code did not export a valid ShapeUtil class with a static 'type' property.");
            }

            console.log("🔥 GOD MODE: Registered new shape:", UtilClass.type);

            // 5. Hot Swap!
            setShapeUtils(prev => {
                // Remove existing if same type to update
                const filtered = prev.filter(u => u.type !== UtilClass.type);
                return [...filtered, UtilClass];
            });

            // 6. Create Instance (Need editor)
            if (editor) {
                editor.run(() => {
                    const id = createShapeId();
                    editor.createShape({
                        id,
                        type: UtilClass.type,
                        x: editor.getViewportPageBounds().x + editor.getViewportPageBounds().w / 2 - 100,
                        y: editor.getViewportPageBounds().y + editor.getViewportPageBounds().h / 2 - 100,
                    });
                    // Center camera on it
                    editor.zoomToBounds(editor.getShapePageBounds(id), { duration: 1000 });
                });
                // alert("⚡ God Mode Activated: New Shape Class Injected!");
            } else {
                alert("Editor not ready yet, but shape registered.");
            }

        } catch (e) {
            console.error("GOD MODE FAILED:", e);
            alert("Compilation Failed: " + e.message);
        }
    };

    // Event Listener for AI Terminal to trigger shape registration
    useEffect(() => {
        const handleRegisterEvent = (e) => {
            console.log("📩 Received 'tldraw-register-shape' event");
            if (e.detail && e.detail.code) {
                registerDynamicShape(e.detail.code);
            }
        };

        window.addEventListener('tldraw-register-shape', handleRegisterEvent);
        return () => window.removeEventListener('tldraw-register-shape', handleRegisterEvent);
    }, [editor]); // Re-bind if editor changes (though functions are stable)

    return (
        <div style={{ position: 'fixed', inset: 0 }}>
            <Tldraw
                persistenceKey="flush-v4-clean"
                shapeUtils={shapeUtils}
                onMount={(originalEditor) => setEditor(originalEditor)}
            >
                <BoardLogic />
                <AppLauncherDock />

                {/* GOD MODE BUTTON (Test Trigger) */}
                {/* GOD MODE BUTTON Removed */}
            </Tldraw>
        </div>
    );
}

// -----------------------------------------------------------------------------
// 🏪 APP STORE PANEL
// -----------------------------------------------------------------------------
function AppStorePanel({ editor, customApps, setCustomApps, onClose }) {
    const [newAppName, setNewAppName] = useState('');
    const [newAppIcon, setNewAppIcon] = useState('⭐');
    const [selectedShape, setSelectedShape] = useState(null);

    // Get selected shape to save as template
    useEffect(() => {
        if (!editor) return;
        const selected = editor.getSelectedShapes()[0];
        setSelectedShape(selected || null);
    }, [editor]);

    const saveCurrentShapeAsApp = () => {
        if (!selectedShape || !newAppName.trim()) {
            alert('Please select a shape and enter a name');
            return;
        }

        const newApp = {
            id: `custom_${Date.now()}`,
            icon: newAppIcon,
            label: newAppName,
            type: selectedShape.type,
            props: { ...selectedShape.props },
            builtin: false
        };

        const updated = [...customApps, newApp];
        setCustomApps(updated);
        localStorage.setItem('customDockApps', JSON.stringify(updated));

        setNewAppName('');
        setNewAppIcon('⭐');
        alert(`✅ "${newAppName}" added to Dock!`);
    };

    const exportApps = () => {
        const dataStr = JSON.stringify(customApps, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'my-apps.json';
        link.click();
    };

    const importApps = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const imported = JSON.parse(event.target.result);
                const updated = [...customApps, ...imported];
                setCustomApps(updated);
                localStorage.setItem('customDockApps', JSON.stringify(updated));
                alert(`✅ Imported ${imported.length} apps!`);
            } catch (error) {
                alert('❌ Failed to import apps');
            }
        };
        reader.readAsText(file);
    };

    return (
        <div style={{
            position: 'absolute',
            bottom: 90,
            left: '50%',
            transform: 'translateX(-50%)',
            width: 500,
            maxHeight: 400,
            background: 'white',
            borderRadius: 16,
            boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
            padding: 20,
            zIndex: 1001,
            pointerEvents: 'all',
            display: 'flex',
            flexDirection: 'column',
            gap: 16
        }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>🏪 App Store</h3>
                <button
                    onClick={onClose}
                    style={{
                        border: 'none',
                        background: 'transparent',
                        fontSize: 20,
                        cursor: 'pointer',
                        color: '#666'
                    }}
                >
                    ×
                </button>
            </div>

            {/* Save Current Shape Section */}
            <div style={{
                padding: 16,
                background: '#f9fafb',
                borderRadius: 12,
                border: '1px solid #e5e7eb'
            }}>
                <h4 style={{ margin: '0 0 12px 0', fontSize: 14, fontWeight: 600 }}>
                    💾 Save Current Shape as App
                </h4>
                {selectedShape ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <div style={{ fontSize: 12, color: '#666' }}>
                            Selected: <strong>{selectedShape.type}</strong>
                        </div>
                        <input
                            type="text"
                            placeholder="App Name"
                            value={newAppName}
                            onChange={e => setNewAppName(e.target.value)}
                            style={{
                                padding: '8px 12px',
                                borderRadius: 8,
                                border: '1px solid #ddd',
                                fontSize: 13
                            }}
                        />
                        <input
                            type="text"
                            placeholder="Icon (emoji)"
                            value={newAppIcon}
                            onChange={e => setNewAppIcon(e.target.value)}
                            maxLength={2}
                            style={{
                                padding: '8px 12px',
                                borderRadius: 8,
                                border: '1px solid #ddd',
                                fontSize: 13
                            }}
                        />
                        <button
                            onClick={saveCurrentShapeAsApp}
                            style={{
                                padding: '8px 16px',
                                background: '#000',
                                color: 'white',
                                border: 'none',
                                borderRadius: 8,
                                cursor: 'pointer',
                                fontWeight: 600
                            }}
                        >
                            Add to Dock
                        </button>
                    </div>
                ) : (
                    <div style={{ fontSize: 12, color: '#999', textAlign: 'center', padding: 16 }}>
                        Select a shape on the canvas to save it as an app
                    </div>
                )}
            </div>

            {/* My Apps List */}
            <div style={{ flex: 1, overflowY: 'auto' }}>
                <h4 style={{ margin: '0 0 8px 0', fontSize: 14, fontWeight: 600 }}>
                    📱 My Apps ({customApps.length})
                </h4>
                {customApps.length === 0 ? (
                    <div style={{ fontSize: 12, color: '#999', textAlign: 'center', padding: 16 }}>
                        No custom apps yet
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {customApps.map(app => (
                            <div
                                key={app.id}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 12,
                                    padding: 8,
                                    background: '#f9fafb',
                                    borderRadius: 8
                                }}
                            >
                                <span style={{ fontSize: 24 }}>{app.icon}</span>
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontWeight: 600, fontSize: 13 }}>{app.label}</div>
                                    <div style={{ fontSize: 11, color: '#666' }}>{app.type}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Import/Export */}
            <div style={{ display: 'flex', gap: 8, borderTop: '1px solid #e5e7eb', paddingTop: 12 }}>
                <button
                    onClick={exportApps}
                    disabled={customApps.length === 0}
                    style={{
                        flex: 1,
                        padding: '8px',
                        background: customApps.length > 0 ? '#f3f4f6' : '#e5e7eb',
                        border: 'none',
                        borderRadius: 8,
                        cursor: customApps.length > 0 ? 'pointer' : 'not-allowed',
                        fontSize: 12,
                        fontWeight: 600
                    }}
                >
                    📤 Export
                </button>
                <label style={{ flex: 1 }}>
                    <input
                        type="file"
                        accept=".json"
                        onChange={importApps}
                        style={{ display: 'none' }}
                    />
                    <div style={{
                        padding: '8px',
                        background: '#f3f4f6',
                        border: 'none',
                        borderRadius: 8,
                        cursor: 'pointer',
                        fontSize: 12,
                        fontWeight: 600,
                        textAlign: 'center'
                    }}>
                        📥 Import
                    </div>
                </label>
            </div>
        </div>
    );
}

// -----------------------------------------------------------------------------
// 🚀 APP LAUNCHER DOCK UI
// -----------------------------------------------------------------------------
function AppLauncherDock() {
    const editor = useEditor();
    const [customApps, setCustomApps] = useState([]);
    const [showAppStore, setShowAppStore] = useState(false);

    // 删除确认对话框状态
    const [deleteConfirm, setDeleteConfirm] = useState(null); // { shapeType, label }

    // Load custom apps from localStorage on mount
    useEffect(() => {
        const saved = localStorage.getItem('customDockApps');
        if (saved) {
            try {
                setCustomApps(JSON.parse(saved));
            } catch (e) {
                console.warn('Failed to load custom apps:', e);
            }
        }
    }, []);

    // Built-in apps (核心系统组件)
    const builtInApps = [
        { id: 'browser', icon: '🌐', label: 'Browser', type: 'browser', props: {}, builtin: true },
        { id: 'ai_terminal', icon: '💬', label: 'AI Terminal', type: 'ai_terminal', props: {}, builtin: true },
    ];

    // 🔥 动态注册表组件 (自动从 registry.js 读取)
    const registryApps = externalShapeUtils
        .filter(util => !builtInApps.find(app => app.type === util.type)) // 避免重复
        .map(util => ({
            id: util.type,
            icon: '🧩', // 默认图标（未来可以让 AI 在组件里定义 static dockIcon）
            label: util.type.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' '), // 自动生成标签
            type: util.type,
            props: {},
            builtin: true,
            isRegistry: true // 标记为可删除的 registry 组件
        }));

    // Combine built-in, registry, and custom apps
    const allApps = [...builtInApps, ...registryApps, ...customApps];

    const createApp = (app) => {
        const center = editor.getViewportPageBounds().center;
        editor.createShape({
            id: createShapeId(),
            type: app.type,
            x: center.x - 100 + (Math.random() * 40 - 20),
            y: center.y - 100 + (Math.random() * 40 - 20),
            props: app.props
        });
    };

    const deleteRegistryApp = async (shapeType) => {
        console.log('🗑️ 开始删除组件:', shapeType);

        try {
            const url = 'http://localhost:3008/api/shapes/delete';
            console.log('📡 发送请求到:', url);

            const res = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ shapeType })
            });

            console.log('📨 收到响应:', res.status, res.statusText);

            if (!res.ok) {
                const errorText = await res.text();
                console.error('❌ HTTP 错误:', errorText);
                throw new Error(`HTTP ${res.status}: ${errorText}`);
            }

            const data = await res.json();
            console.log('📄 响应数据:', data);

            if (data.success) {
                console.log(`✅ 删除成功: ${data.file}`);
                // 直接刷新，无需 alert
                window.location.reload();
            } else {
                alert(`❌ 删除失败: ${data.error}`);
            }
        } catch (error) {
            console.error('💥 删除过程出错:', error);
            alert(`❌ 删除失败: ${error.message}`);
        }
    };

    const removeCustomApp = (appId) => {
        const updated = customApps.filter(app => app.id !== appId);
        setCustomApps(updated);
        localStorage.setItem('customDockApps', JSON.stringify(updated));
    };

    return (
        <>
            {/* Main Dock */}
            <div style={{
                position: 'absolute',
                bottom: 24,
                left: '50%',
                transform: 'translateX(-50%)',
                background: 'rgba(255, 255, 255, 0.9)',
                backdropFilter: 'blur(10px)',
                padding: '8px 16px',
                borderRadius: 20,
                boxShadow: '0 10px 30px rgba(0,0,0,0.1), 0 0 0 1px rgba(0,0,0,0.05)',
                display: 'flex',
                flexDirection: 'row',
                gap: 12,
                zIndex: 1000,
                pointerEvents: 'all'
            }}>
                {allApps.map(app => (
                    <div key={app.id} style={{ position: 'relative' }}>
                        <button
                            onClick={() => createApp(app)}
                            title={app.label}
                            style={{
                                width: 64,
                                height: 48,
                                border: 'none',
                                background: 'transparent',
                                borderRadius: 12,
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                transition: 'transform 0.1s, background 0.1s',
                                fontSize: 24,
                                position: 'relative'
                            }}
                            onMouseEnter={e => {
                                e.currentTarget.style.transform = 'scale(1.1) translateY(-4px)';
                                e.currentTarget.style.background = 'rgba(0,0,0,0.05)';
                            }}
                            onMouseLeave={e => {
                                e.currentTarget.style.transform = 'scale(1)';
                                e.currentTarget.style.background = 'transparent';
                            }}
                        >
                            <span>{app.icon}</span>
                            <span style={{ fontSize: 9, fontWeight: 500, color: '#64748b', marginTop: 2 }}>{app.label}</span>
                            {/* Custom app indicator */}
                            {!app.builtin && (
                                <span style={{
                                    position: 'absolute',
                                    top: 2,
                                    right: 2,
                                    width: 6,
                                    height: 6,
                                    borderRadius: '50%',
                                    background: '#10b981',
                                    border: '1px solid white'
                                }} />
                            )}
                        </button>
                        {/* Remove button for custom apps and registry apps */}
                        {(!app.builtin || app.isRegistry) && (
                            <button
                                className="dock-delete-btn"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (app.isRegistry) {
                                        deleteRegistryApp(app.type);
                                    } else {
                                        removeCustomApp(app.id);
                                    }
                                }}
                                style={{
                                    position: 'absolute',
                                    top: -4,
                                    right: -4,
                                    width: 18,
                                    height: 18,
                                    borderRadius: '50%',
                                    border: 'none',
                                    background: '#ef4444',
                                    color: 'white',
                                    fontSize: 12,
                                    fontWeight: 'bold',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                                    transition: 'all 0.2s',
                                    zIndex: 10
                                }}
                                onMouseEnter={e => {
                                    e.currentTarget.style.transform = 'scale(1.2)';
                                    e.currentTarget.style.background = '#dc2626';
                                }}
                                onMouseLeave={e => {
                                    e.currentTarget.style.transform = 'scale(1)';
                                    e.currentTarget.style.background = '#ef4444';
                                }}
                                title={app.isRegistry ? "删除组件（源文件）" : "从 Dock 移除"}
                            >
                                ×
                            </button>
                        )}
                    </div>
                ))}

                {/* App Store Button */}
                <button
                    onClick={() => setShowAppStore(!showAppStore)}
                    title="App Store"
                    style={{
                        width: 48,
                        height: 48,
                        border: 'none',
                        background: showAppStore ? 'rgba(0,0,0,0.1)' : 'transparent',
                        borderRadius: 12,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        fontSize: 24,
                        marginLeft: 8,
                        borderLeft: '1px solid rgba(0,0,0,0.1)'
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,0,0,0.05)'}
                    onMouseLeave={e => e.currentTarget.style.background = showAppStore ? 'rgba(0,0,0,0.1)' : 'transparent'}
                >
                    🏪
                </button>
            </div>

            {/* App Store Panel */}
            {showAppStore && (
                <AppStorePanel
                    editor={editor}
                    customApps={customApps}
                    setCustomApps={setCustomApps}
                    onClose={() => setShowAppStore(false)}
                />
            )}
        </>
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

            const fileFingerprint = files.map(f => `${f.name} - ${f.size}`).join('|');
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
                        const assetIdString = `asset: ${Date.now()}`;
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
        const SYSTEM_PROMPT = `You are an expert Courseware Designer & Developer.
You specialize in creating interactive, visually stunning educational tools.

🎓 EXPERTISE: Instructional Design, Visual Design, Interactive Components, Presentation Tools

🌍 LANGUAGE: Use Chinese(简体中文) for "thought" and voice responses.

🚀 COURSEWARE CAPABILITIES:
1. 📊 SLIDES: Create 'preview_html' with navigation
2. 📝 QUIZZES: Create 'quiz' with feedback
3. 🎯 FLASHCARDS: Create flip animations
4. ⏱️ TIMELINES: Visual event timelines
5. 📚 KNOWLEDGE CARDS: Create 'ai_result' for concepts

RESPONSE FORMAT (JSON):
{"thought": "中文思考...", "operations": [...], "voice_response": "..."}

💡 DESIGN RULES: Include navigation, visual feedback, professional colors, progress indicators, readable text (14px+, line-height 1.6)
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
            console.log("📨 AI 原始响应:", responseText);

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
