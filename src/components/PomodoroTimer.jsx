import React, { useState, useEffect } from 'react';
import { Play, Pause, RotateCcw } from 'lucide-react';
import './PomodoroTimer.css';

const PomodoroTimer = () => {
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    let interval = null;

    if (isActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prevTime) => prevTime - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      setIsActive(false);
      // Optional: Play sound or notification here
    } else {
      clearInterval(interval);
    }

    return () => clearInterval(interval);
  }, [isActive, timeLeft]);

  const toggleTimer = () => {
    setIsActive(!isActive);
  };

  const resetTimer = () => {
    setIsActive(false);
    setTimeLeft(25 * 60);
  };

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="pomodoro-container">
      <div className="pomodoro-card">
        <h2 className="pomodoro-title">专注番茄钟</h2>
        <div className="timer-display">
          {formatTime(timeLeft)}
        </div>
        <div className="controls">
          <button 
            className={`control-btn ${isActive ? 'pause' : 'start'}`} 
            onClick={toggleTimer}
          >
            {isActive ? <Pause size={24} /> : <Play size={24} />}
            <span>{isActive ? '暂停' : '开始'}</span>
          </button>
          
          <button className="control-btn reset" onClick={resetTimer}>
            <RotateCcw size={24} />
            <span>重置</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default PomodoroTimer;
