import React, { useState } from 'react';
import { 
  CloudSun, 
  Wind, 
  Droplets, 
  ThermometerSun, 
  MapPin, 
  RefreshCw 
} from 'lucide-react';
import './WeatherWidget.css';

const MOCK_WEATHER_DATA = {
  city: '上海',
  district: '浦东新区',
  temp: 24,
  condition: '多云',
  humidity: 65,
  windSpeed: '12km/h',
  feelsLike: 26
};

const WeatherWidget = () => {
  const [weather, setWeather] = useState(MOCK_WEATHER_DATA);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = () => {
    setIsRefreshing(true);
    // 模拟API请求延迟
    setTimeout(() => {
      // 可以在这里切换随机数据来模拟变化
      const randomTemp = 20 + Math.floor(Math.random() * 10);
      setWeather(prev => ({
        ...prev,
        temp: randomTemp,
        feelsLike: randomTemp + 2
      }));
      setIsRefreshing(false);
    }, 1000);
  };

  return (
    <div className="weather-container">
      <div className="weather-card">
        <div className="weather-header">
          <div className="location-info">
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <MapPin size={16} color="#666" />
              <h2>{weather.city}</h2>
            </div>
            <p>{weather.district}</p>
          </div>
          <button 
            className={`refresh-btn ${isRefreshing ? 'spinning' : ''}`} 
            onClick={handleRefresh}
            title="刷新天气"
          >
            <RefreshCw size={20} />
          </button>
        </div>

        <div className="current-weather">
          <div className="temperature">
            {weather.temp}<span>°</span>
          </div>
          <CloudSun size={64} className="weather-icon-large" />
        </div>

        <div className="weather-details">
          <div className="detail-item">
            <span className="detail-label">湿度</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Droplets size={14} color="#3b82f6" />
              <span className="detail-value">{weather.humidity}%</span>
            </div>
          </div>
          
          <div className="detail-item">
            <span className="detail-label">风速</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Wind size={14} color="#8b5cf6" />
              <span className="detail-value">{weather.windSpeed}</span>
            </div>
          </div>

          <div className="detail-item">
            <span className="detail-label">体感</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <ThermometerSun size={14} color="#f97316" />
              <span className="detail-value">{weather.feelsLike}°</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WeatherWidget;
