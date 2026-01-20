import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, Coffee, Briefcase, Armchair, GripHorizontal, Timer } from 'lucide-react';
import './Pomodoro.css';

const MODES = {
  work: { label: 'Focus', time: 25 * 60, icon: <Briefcase size={14} /> },
  short: { label: 'Short', time: 5 * 60, icon: <Coffee size={14} /> },
  long: { label: 'Long', time: 15 * 60, icon: <Armchair size={14} /> },
};

const Pomodoro = () => {
  const [mode, setMode] = useState('work');
  const [timeLeft, setTimeLeft] = useState(MODES.work.time);
  const [isActive, setIsActive] = useState(false);
  
  // Dragging state
  const [position, setPosition] = useState({ x: window.innerWidth - 300, y: 80 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    let interval = null;
    if (isActive) {
      interval = setInterval(() => {
        setTimeLeft((prevTime) => {
          if (prevTime <= 0) {
            setIsActive(false);
            return 0;
          }
          return prevTime - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isActive]);

  const toggleTimer = () => setIsActive(!isActive);

  const resetTimer = () => {
    setIsActive(false);
    setTimeLeft(MODES[mode].time);
  };

  const changeMode = (newMode) => {
    setMode(newMode);
    setIsActive(false);
    setTimeLeft(MODES[newMode].time);
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Drag handlers
  const handleMouseDown = (e) => {
    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y
    };
  };

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isDragging) return;
      
      const newX = e.clientX - dragStartRef.current.x;
      const newY = e.clientY - dragStartRef.current.y;
      
      // Optional: Add bounds checking to keep within screen
      setPosition({
        x: newX,
        y: newY
      });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  const progress = ((MODES[mode].time - timeLeft) / MODES[mode].time) * 100;

  return (
    <div 
      className="pomodoro-widget"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`
      }}
    >
      <div className="pomodoro-title-bar" onMouseDown={handleMouseDown}>
        <div className="title-content">
          <Timer size={16} className="text-slate-500" />
          <span>Pomodoro</span>
        </div>
        <GripHorizontal size={16} className="drag-handle" />
      </div>

      <div className="pomodoro-body">
        <div className="mode-selector">
          {Object.keys(MODES).map((key) => (
            <button
              key={key}
              className={`mode-btn ${mode === key ? 'active' : ''}`}
              onClick={() => changeMode(key)}
            >
              {MODES[key].label}
            </button>
          ))}
        </div>

        <div className="timer-display">
          <div className="time-text">{formatTime(timeLeft)}</div>
          <div className="progress-container">
            <div className="progress-fill" style={{ width: `${progress}%` }}></div>
          </div>
        </div>

        <div className="controls">
          <button className="control-btn secondary" onClick={resetTimer}>
            <RotateCcw size={18} />
          </button>
          <button className="control-btn main" onClick={toggleTimer}>
            {isActive ? <Pause size={24} /> : <Play size={24} style={{ marginLeft: '2px' }} />}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Pomodoro;
