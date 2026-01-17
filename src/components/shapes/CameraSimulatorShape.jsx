import { BaseBoxShapeUtil, HTMLContainer, useEditor } from 'tldraw';
import React, { useMemo } from 'react';

/**
 * 📷 相机模拟器组件
 * AaaS 核心组件：用于教授摄影三要素（光圈、快门、ISO）
 */
export class CameraSimulatorShapeUtil extends BaseBoxShapeUtil {
    static type = 'camera_simulator';

    getDefaultProps() {
        return {
            w: 500,
            h: 620,
            aperture: 5.6,  // F值
            shutter: 125,   // 快门分母 (1/125s)
            iso: 400,       // 感光度
            // 默认一张街景照片，适合观察曝光和模糊
            imageUrl: 'https://images.unsplash.com/photo-1551096738-4235fc52458e?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80',
            feedback: ''    // AI 给出的反馈
        };
    }

    component(shape) {
        const editor = useEditor();
        const { aperture, shutter, iso, imageUrl, feedback } = shape.props;

        // 🧮 曝光模拟算法 (Simplified Physics)
        const exposureStyle = useMemo(() => {
            // 1. 基准值 (Standard Exposure)
            // 假设标准曝光: f/8, 1/125s, ISO 100
            const BASE_APERTURE = 8;
            const BASE_SHUTTER = 125;
            const BASE_ISO = 100;

            // 2. 计算 EV 偏差 (Exposure Value Delta)
            // log2(A / B) calculate stops difference

            // 光圈：F值越小越亮。F/2.8 比 F/5.6 亮 2 档 (2^2=4倍进光)
            // Diff = log2(Base^2 / Current^2)
            const stopsAperture = Math.log2(Math.pow(BASE_APERTURE, 2) / Math.pow(aperture, 2));

            // 快门：时间越长(分母越小)越亮。1/60 比 1/125 亮 1 档
            const stopsShutter = Math.log2(BASE_SHUTTER / shutter);

            // ISO：值越大越亮。ISO 200 比 100 亮 1 档
            const stopsISO = Math.log2(iso / BASE_ISO);

            const totalStops = stopsAperture + stopsShutter + stopsISO;

            // 3. 映射到 CSS Filter
            // 0 EV = 100% brightness
            // +1 EV = 130% brightness (aesthetic curve)
            // -1 EV = 70% brightness
            let brightness = 100 * Math.pow(1.3, totalStops);

            // 限制范围防止纯白或纯黑太快
            brightness = Math.max(10, Math.min(300, brightness));

            // 4. 计算模糊 (Motion Blur & Depth of Field simulation)
            let blur = 0;
            // 如果快门慢于 1/60s，开始产生手抖模糊
            if (shutter < 60) {
                blur += (60 - shutter) * 0.1;
            }
            // 简单模拟大光圈背景虚化 (F值越小越模糊)
            if (aperture < 2.8) {
                blur += (2.8 - aperture) * 1.5;
            }

            return {
                filter: `brightness(${brightness}%) blur(${blur}px)`,
                transition: 'filter 0.3s ease-out'
            };

        }, [aperture, shutter, iso]);

        // 更新参数
        const updateParams = (key, value) => {
            editor.updateShape({
                id: shape.id,
                type: 'camera_simulator',
                props: { [key]: parseFloat(value) }
            });
        };

        // 预设的档位值
        const APERTURES = [1.4, 2.0, 2.8, 4.0, 5.6, 8.0, 11, 16, 22];
        const SHUTTERS = [1000, 500, 250, 125, 60, 30, 15, 8, 4, 2, 1]; // 分母
        const ISOS = [100, 200, 400, 800, 1600, 3200, 6400];

        return (
            <HTMLContainer style={{
                pointerEvents: 'all',
                background: '#1a1a1a', // 专业相机深色风格
                color: '#e5e5e5',
                borderRadius: 16,
                padding: 0,
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
                border: '1px solid #333'
            }}>
                {/* 1. 顶部取景器 (Viewfinder) */}
                <div style={{
                    flex: 1,
                    position: 'relative',
                    background: '#000',
                    overflow: 'hidden',
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                    <img
                        src={imageUrl}
                        style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                            ...exposureStyle // 应用计算出的曝光样式
                        }}
                    />

                    {/* 模拟取景框 UI */}
                    <div style={{
                        position: 'absolute', inset: 20,
                        border: '1px solid rgba(255,255,255,0.3)',
                        pointerEvents: 'none'
                    }}>
                        {/* 对焦点 */}
                        <div style={{
                            position: 'absolute', top: '50%', left: '50%',
                            width: 20, height: 20,
                            border: '2px solid rgba(255,255,0,0.8)',
                            transform: 'translate(-50%, -50%)'
                        }} />
                    </div>

                    {/* 当前参数显示 Overlay */}
                    <div style={{
                        position: 'absolute', bottom: 10, left: 0, right: 0,
                        display: 'flex', justifyContent: 'space-around',
                        fontSize: 14, fontWeight: 'bold',
                        textShadow: '0 2px 4px rgba(0,0,0,0.8)',
                        fontFamily: 'monospace'
                    }}>
                        <span>f/{aperture}</span>
                        <span>1/{shutter}</span>
                        <span>ISO {iso}</span>
                    </div>
                </div>

                {/* 2. 控制面板 (Control Panel) */}
                <div style={{ padding: 20, background: '#222', display: 'flex', flexDirection: 'column', gap: 16 }}>

                    {/* 光圈控制 */}
                    <div className="control-group">
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                            <span style={{ fontSize: 12, color: '#888' }}>APERTURE (光圈)</span>
                            <span style={{ color: '#fbbf24' }}>f/{aperture}</span>
                        </div>
                        <input
                            type="range" min="0" max={APERTURES.length - 1} step="1"
                            value={APERTURES.indexOf(aperture) === -1 ? 4 : APERTURES.indexOf(aperture)}
                            onChange={(e) => updateParams('aperture', APERTURES[e.target.value])}
                            style={{ width: '100%', cursor: 'pointer' }}
                        />
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#555', marginTop: 4 }}>
                            <span>f/1.4</span><span>f/22</span>
                        </div>
                    </div>

                    {/* 快门控制 */}
                    <div className="control-group">
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                            <span style={{ fontSize: 12, color: '#888' }}>SHUTTER SPEED (快门)</span>
                            <span style={{ color: '#34d399' }}>1/{shutter}s</span>
                        </div>
                        <input
                            type="range" min="0" max={SHUTTERS.length - 1} step="1"
                            value={SHUTTERS.indexOf(shutter) === -1 ? 3 : SHUTTERS.indexOf(shutter)}
                            onChange={(e) => updateParams('shutter', SHUTTERS[e.target.value])}
                            style={{ width: '100%', cursor: 'pointer' }}
                        />
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#555', marginTop: 4 }}>
                            <span>1/1000</span><span>1/1</span>
                        </div>
                    </div>

                    {/* ISO 控制 */}
                    <div className="control-group">
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                            <span style={{ fontSize: 12, color: '#888' }}>ISO (感光度)</span>
                            <span style={{ color: '#60a5fa' }}>{iso}</span>
                        </div>
                        <input
                            type="range" min="0" max={ISOS.length - 1} step="1"
                            value={ISOS.indexOf(iso) === -1 ? 2 : ISOS.indexOf(iso)}
                            onChange={(e) => updateParams('iso', ISOS[e.target.value])}
                            style={{ width: '100%', cursor: 'pointer' }}
                        />
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#555', marginTop: 4 }}>
                            <span>100</span><span>6400</span>
                        </div>
                    </div>

                </div>

                {/* 3. AI 反馈区域 */}
                {feedback && (
                    <div style={{
                        padding: '12px 20px',
                        background: '#333',
                        borderTop: '1px solid #444',
                        fontSize: 13,
                        color: '#d1d5db',
                        display: 'flex', gap: 10, alignItems: 'center'
                    }}>
                        <span style={{ fontSize: 18 }}>🤖</span>
                        <span>{feedback}</span>
                    </div>
                )}
            </HTMLContainer>
        );
    }

    indicator(shape) {
        return <rect width={shape.props.w} height={shape.props.h} rx={16} ry={16} />;
    }
}
