import React from 'react';

const Card = ({ children, className = '', style = {}, onClick }) => {
  return (
    <div
      className={`sgms-card ${className}`}
      style={style}
      onClick={onClick}
    >
      {children}
    </div>
  );
};

export default Card;
