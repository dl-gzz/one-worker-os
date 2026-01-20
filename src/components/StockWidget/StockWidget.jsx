import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Activity, ChevronDown, ChevronUp } from 'lucide-react';
import './StockWidget.css';

const INITIAL_STOCKS = [
  { symbol: 'AAPL', name: 'Apple', price: 185.92, change: 1.25, data: [182, 183, 182.5, 184, 185, 185.92] },
  { symbol: 'NVDA', name: 'NVIDIA', price: 726.13, change: 15.40, data: [710, 715, 712, 720, 722, 726.13] },
  { symbol: 'MSFT', name: 'Microsoft', price: 406.32, change: -2.10, data: [408, 409, 407, 406, 405, 406.32] },
  { symbol: 'TSLA', name: 'Tesla', price: 198.50, change: -1.50, data: [200, 201, 199, 198, 197, 198.50] },
  { symbol: 'BTC',  name: 'Bitcoin', price: 51200.00, change: 850.00, data: [50000, 50500, 50200, 51000, 51100, 51200] },
];

const StockWidget = () => {
  const [stocks, setStocks] = useState(INITIAL_STOCKS);
  const [isExpanded, setIsExpanded] = useState(true);

  // Simulate price updates
  useEffect(() => {
    const interval = setInterval(() => {
      setStocks(currentStocks => 
        currentStocks.map(stock => {
          const volatility = stock.price * 0.002; // 0.2% volatility
          const change = (Math.random() - 0.5) * volatility;
          const newPrice = Number((stock.price + change).toFixed(2));
          const newChange = Number((stock.change + change).toFixed(2));
          
          // Update chart data (keep last 10 points)
          const newData = [...stock.data, newPrice].slice(-10);
          
          return {
            ...stock,
            price: newPrice,
            change: newChange,
            data: newData
          };
        })
      );
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  const getChangeColor = (change) => {
    return change >= 0 ? 'text-green' : 'text-red';
  };

  // Simple Sparkline SVG
  const Sparkline = ({ data, color }) => {
    if (!data || data.length < 2) return null;
    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;
    const width = 60;
    const height = 24;
    
    const points = data.map((val, i) => {
      const x = (i / (data.length - 1)) * width;
      const y = height - ((val - min) / range) * height;
      return `${x},${y}`;
    }).join(' ');

    return (
      <svg width={width} height={height} className="sparkline">
        <polyline
          points={points}
          fill="none"
          stroke={color}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  };

  return (
    <div className={`stock-widget ${isExpanded ? 'expanded' : 'collapsed'}`}>
      <div className="stock-header" onClick={() => setIsExpanded(!isExpanded)}>
        <div className="header-title">
          <Activity size={18} />
          <span>Market</span>
        </div>
        <button className="toggle-btn">
          {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
      </div>

      {isExpanded && (
        <div className="stock-list">
          {stocks.map(stock => {
            const isUp = stock.change >= 0;
            const colorClass = getChangeColor(stock.change);
            const strokeColor = isUp ? '#10b981' : '#ef4444'; // Tailwind colors: emerald-500, red-500

            return (
              <div key={stock.symbol} className="stock-item">
                <div className="stock-info">
                  <div className="stock-symbol">{stock.symbol}</div>
                  <div className="stock-name">{stock.name}</div>
                </div>
                
                <div className="stock-chart">
                  <Sparkline data={stock.data} color={strokeColor} />
                </div>

                <div className="stock-price-block">
                  <div className="stock-price">{stock.price.toFixed(2)}</div>
                  <div className={`stock-change ${colorClass}`}>
                    {isUp ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                    {stock.change > 0 ? '+' : ''}{stock.change.toFixed(2)}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default StockWidget;
