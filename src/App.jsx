import TldrawBoard from './components/TldrawBoard';
import Calculator from './components/Calculator/Calculator';
import Pomodoro from './components/Pomodoro/Pomodoro';
import PomodoroTimer from './components/PomodoroTimer';
import StockWidget from './components/StockWidget/StockWidget';
import WeatherWidget from './components/WeatherWidget/WeatherWidget';
import './App.css';

function App() {
  return (
    <div className="app-container">
      {/* <Whiteboard /> */}
      <TldrawBoard />
      <div style={{ position: 'absolute', top: '20px', right: '20px', zIndex: 1000 }}>
        <WeatherWidget />
      </div>
      {/* <PomodoroTimer /> */}
      {/* <Calculator /> */}
      <StockWidget />
      {/* <Pomodoro /> */}
    </div>
  );
}

export default App;
