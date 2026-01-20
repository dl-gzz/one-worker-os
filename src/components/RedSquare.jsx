import React from 'react';

const RedSquare = () => {
  const style = {
    width: '100px',
    height: '100px',
    backgroundColor: 'red',
    color: 'white',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    fontSize: '16px',
    fontWeight: 'bold',
    borderRadius: '4px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
  };

  return (
    <div style={style}>
      Hello
    </div>
  );
};

export default RedSquare;
