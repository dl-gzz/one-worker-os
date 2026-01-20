import React, { useState, useEffect } from 'react';
import { Play, Pause, RotateCcw, Coffee, Briefcase, Armchair } from 'lucide-react';
import './Pomodoro.css';

const MODES = {
  work: { label: '专注', time: 25 * 60, icon: <Briefcase size={18} /> },
  short: { label: '短休', time: 5 * 60, icon: <Coffee size={18} /> },
  long: { label: '长休', time: 15 * 60, icon: <Armchair size={18} /> },
};

const Pomodoro = () => {
  const [mode, setMode] = useState('work');
  const [timeLeft, setTimeLeft] = useState(MODES.work.time);
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    let interval = null;
    if (isActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((time) => time - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      setIsActive(false);
      // Optional: Play sound here
    }
    return () => clearInterval(interval);
  }, [isActive, timeLeft]);

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

  const progress = ((MODES[mode].time - timeLeft) / MODES[mode].time) * 100;

  return (
    <div className="pomodoro-widget">
      <div className="pomodoro-header">
        {Object.keys(MODES).map((key) => (
          <button
            key={key}
            className={`mode-btn ${mode === key ? 'active' : ''}`}
            onClick={() => changeMode(key)}
            title={MODES[key].label}
          >
            {MODES[key].icon}
          </button>
        ))}
      </div>

      <div className="timer-display">
        <div className="time-text">{formatTime(timeLeft)}</div>
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${progress}%` }}></div>
        </div>
      </div>

      <div className="controls">
        <button className="control-btn main" onClick={toggleTimer}>
          {isActive ? <Pause size={24} /> : <Play size={24} />}
        </button>
        <button className="control-btn secondary" onClick={resetTimer}>
          <RotateCcw size={20} />
        </button>
      </div>
    </div>
  );
};

export default Pomodoro;
