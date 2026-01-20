import React, { useState } from 'react';
import './Calculator.css';

const Calculator = () => {
  const [display, setDisplay] = useState('0');
  const [prevValue, setPrevValue] = useState(null);
  const [operator, setOperator] = useState(null);
  const [waitingForOperand, setWaitingForOperand] = useState(false);

  const inputDigit = (digit) => {
    if (waitingForOperand) {
      setDisplay(String(digit));
      setWaitingForOperand(false);
    } else {
      setDisplay(display === '0' ? String(digit) : display + digit);
    }
  };

  const inputDot = () => {
    if (waitingForOperand) {
      setDisplay('0.');
      setWaitingForOperand(false);
    } else if (display.indexOf('.') === -1) {
      setDisplay(display + '.');
    }
  };

  const clear = () => {
    setDisplay('0');
    setPrevValue(null);
    setOperator(null);
    setWaitingForOperand(false);
  };

  const performOperation = (nextOperator) => {
    const inputValue = parseFloat(display);

    if (prevValue === null) {
      setPrevValue(inputValue);
    } else if (operator) {
      const currentValue = prevValue || 0;
      const newValue = calculate(currentValue, inputValue, operator);
      setPrevValue(newValue);
      setDisplay(String(newValue));
    }

    setWaitingForOperand(true);
    setOperator(nextOperator);
  };

  const calculate = (prev, next, op) => {
    switch (op) {
      case '+':
        return prev + next;
      case '-':
        return prev - next;
      case '*':
        return prev * next;
      case '/':
        return prev / next;
      case '=':
        return next;
      default:
        return next;
    }
  };

  return (
    <div className="calculator-container">
      <div className="calculator-display">{display}</div>
      <div className="calculator-keypad">
        <button className="calculator-btn btn-function" onClick={clear}>AC</button>
        <button className="calculator-btn btn-function">+/-</button>
        <button className="calculator-btn btn-function">%</button>
        <button className="calculator-btn btn-operator" onClick={() => performOperation('/')}>÷</button>
        
        <button className="calculator-btn btn-number" onClick={() => inputDigit(7)}>7</button>
        <button className="calculator-btn btn-number" onClick={() => inputDigit(8)}>8</button>
        <button className="calculator-btn btn-number" onClick={() => inputDigit(9)}>9</button>
        <button className="calculator-btn btn-operator" onClick={() => performOperation('*')}>×</button>
        
        <button className="calculator-btn btn-number" onClick={() => inputDigit(4)}>4</button>
        <button className="calculator-btn btn-number" onClick={() => inputDigit(5)}>5</button>
        <button className="calculator-btn btn-number" onClick={() => inputDigit(6)}>6</button>
        <button className="calculator-btn btn-operator" onClick={() => performOperation('-')}>-</button>
        
        <button className="calculator-btn btn-number" onClick={() => inputDigit(1)}>1</button>
        <button className="calculator-btn btn-number" onClick={() => inputDigit(2)}>2</button>
        <button className="calculator-btn btn-number" onClick={() => inputDigit(3)}>3</button>
        <button className="calculator-btn btn-operator" onClick={() => performOperation('+')}>+</button>
        
        <button className="calculator-btn btn-number btn-zero" onClick={() => inputDigit(0)}>0</button>
        <button className="calculator-btn btn-number" onClick={inputDot}>.</button>
        <button className="calculator-btn btn-operator" onClick={() => performOperation('=')}>=</button>
      </div>
    </div>
  );
};

export default Calculator;
