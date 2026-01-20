import { BaseBoxShapeUtil, HTMLContainer, useEditor } from 'tldraw';
import React, { useState } from 'react';
import { Cloud, CloudRain, Sun, Wind, Droplets, Search, CloudLightning, CloudSnow, MapPin, RefreshCw } from 'lucide-react';

export class WeatherShapeUtil extends BaseBoxShapeUtil {
    static type = 'weather';

    getDefaultProps() {
        return {
            w: 340,
            h: 400,
            city: 'Shanghai',
            temp: 24,
            condition: 'sunny', // sunny, rainy, cloudy, snowy, thunder
            humidity: 60,
            windSpeed: 5,
            forecast: [
                { day: 'Mon', temp: 25, condition: 'sunny' },
                { day: 'Tue', temp: 22, condition: 'cloudy' },
                { day: 'Wed', temp: 20, condition: 'rainy' }
            ],
            lastUpdate: Date.now()
        };
    }

    component(shape) {
        const editor = useEditor();
        const [searchTerm, setSearchTerm] = useState('');
        const [isLoading, setIsLoading] = useState(false);

        // Mock weather data simulation
        const updateWeather = (newCity) => {
            setIsLoading(true);
            
            // Simulate network delay
            setTimeout(() => {
                const conditions = ['sunny', 'rainy', 'cloudy', 'snowy', 'thunder'];
                const randomCondition = conditions[Math.floor(Math.random() * conditions.length)];
                const randomTemp = Math.floor(Math.random() * 30) + 5; // 5 to 35
                
                const generateForecast = () => {
                    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
                    const today = new Date().getDay();
                    return [1, 2, 3].map(offset => ({
                        day: days[(today + offset) % 7],
                        temp: Math.floor(Math.random() * 30) + 5,
                        condition: conditions[Math.floor(Math.random() * conditions.length)]
                    }));
                };

                editor.updateShape({
                    id: shape.id,
                    type: 'weather',
                    props: {
                        city: newCity || shape.props.city,
                        temp: randomTemp,
                        condition: randomCondition,
                        humidity: Math.floor(Math.random() * 60) + 30,
                        windSpeed: Math.floor(Math.random() * 20) + 2,
                        forecast: generateForecast(),
                        lastUpdate: Date.now()
                    }
                });
                setIsLoading(false);
                setSearchTerm('');
            }, 800);
        };

        const handleSearch = (e) => {
            e.stopPropagation();
            if (e.key === 'Enter' && searchTerm.trim()) {
                updateWeather(searchTerm);
            }
        };

        const getIcon = (condition, size = 24, color = 'white') => {
            switch(condition) {
                case 'sunny': return <Sun size={size} color={color} />;
                case 'rainy': return <CloudRain size={size} color={color} />;
                case 'cloudy': return <Cloud size={size} color={color} />;
                case 'snowy': return <CloudSnow size={size} color={color} />;
                case 'thunder': return <CloudLightning size={size} color={color} />;
                default: return <Sun size={size} color={color} />;
            }
        };

        const getBgGradient = (condition) => {
             switch(condition) {
                case 'sunny': return 'linear-gradient(135deg, #60a5fa, #3b82f6)';
                case 'rainy': return 'linear-gradient(135deg, #4b5563, #1f2937)';
                case 'cloudy': return 'linear-gradient(135deg, #9ca3af, #6b7280)';
                case 'snowy': return 'linear-gradient(135deg, #e5e7eb, #9ca3af)';
                case 'thunder': return 'linear-gradient(135deg, #374151, #111827)';
                default: return 'linear-gradient(135deg, #60a5fa, #3b82f6)';
            }
        };

        const bgGradient = getBgGradient(shape.props.condition);
        const textColor = shape.props.condition === 'snowy' ? '#374151' : 'white';
        const iconColor = shape.props.condition === 'snowy' ? '#374151' : 'white';

        return (
            <HTMLContainer style={{ pointerEvents: 'all' }}>
                <div style={{
                    width: '100%',
                    height: '100%',
                    background: bgGradient,
                    color: textColor,
                    borderRadius: 24,
                    padding: 24,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.2)',
                    fontFamily: 'Inter, system-ui, sans-serif',
                    position: 'relative',
                    overflow: 'hidden'
                }}>
                    {/* Search Bar */}
                    <div 
                        style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            background: 'rgba(255,255,255,0.2)', 
                            borderRadius: 12,
                            padding: '8px 12px',
                            backdropFilter: 'blur(4px)'
                        }}
                        onPointerDown={e => e.stopPropagation()}
                    >
                        <Search size={16} color={iconColor} style={{ opacity: 0.7 }} />
                        <input 
                            type="text" 
                            placeholder="Search city..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            onKeyDown={handleSearch}
                            style={{
                                background: 'transparent',
                                border: 'none',
                                color: textColor,
                                marginLeft: 8,
                                width: '100%',
                                outline: 'none',
                                fontSize: 14,
                                fontWeight: 500,
                                '::placeholder': { color: textColor, opacity: 0.5 }
                            }}
                        />
                    </div>

                    {/* Main Weather Info */}
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: 8, padding: '20px 0' }}>
                        {isLoading ? (
                            <div style={{ animation: 'spin 1s linear infinite' }}>
                                <RefreshCw size={32} color={iconColor} />
                            </div>
                        ) : (
                            <>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <MapPin size={16} color={iconColor} />
                                    <span style={{ fontSize: 18, fontWeight: 600 }}>{shape.props.city}</span>
                                </div>
                                <div style={{ transform: 'scale(1.2)' }}>
                                    {getIcon(shape.props.condition, 80, iconColor)}
                                </div>
                                <div style={{ fontSize: 64, fontWeight: 'bold', lineHeight: 1 }}>
                                    {shape.props.temp}°
                                </div>
                                <div style={{ fontSize: 16, opacity: 0.9, fontWeight: 500 }}>
                                    {shape.props.condition.toUpperCase()}
                                </div>
                            </>
                        )}
                    </div>

                    {/* Stats Grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
                        <div style={{ 
                            background: 'rgba(255,255,255,0.15)', 
                            borderRadius: 12, 
                            padding: 10,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8
                        }}>
                            <Droplets size={18} color={iconColor} />
                            <div>
                                <div style={{ fontSize: 12, opacity: 0.8 }}>Humidity</div>
                                <div style={{ fontWeight: 600 }}>{shape.props.humidity}%</div>
                            </div>
                        </div>
                        <div style={{ 
                            background: 'rgba(255,255,255,0.15)', 
                            borderRadius: 12, 
                            padding: 10,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8
                        }}>
                            <Wind size={18} color={iconColor} />
                            <div>
                                <div style={{ fontSize: 12, opacity: 0.8 }}>Wind</div>
                                <div style={{ fontWeight: 600 }}>{shape.props.windSpeed} km/h</div>
                            </div>
                        </div>
                    </div>

                    {/* Forecast */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 16, borderTop: '1px solid rgba(255,255,255,0.2)' }}>
                        {shape.props.forecast && shape.props.forecast.map((day, i) => (
                            <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                                <span style={{ fontSize: 12, opacity: 0.8 }}>{day.day}</span>
                                {getIcon(day.condition, 20, iconColor)}
                                <span style={{ fontWeight: 600, fontSize: 14 }}>{day.temp}°</span>
                            </div>
                        ))}
                    </div>
                </div>
                <style>{`
                    @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                `}</style>
            </HTMLContainer>
        );
    }

    indicator(shape) {
        return <rect width={shape.props.w} height={shape.props.h} rx={24} />;
    }
}
