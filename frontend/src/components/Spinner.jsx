import React from 'react';

const Spinner = ({ size = 'md', color = 'var(--primary)', style = {} }) => {
  const dimension = size === 'lg' ? 42 : size === 'sm' ? 16 : 24;
  return (
    <div
      className="spinner"
      style={{
        width: dimension,
        height: dimension,
        borderTopColor: color,
        ...style
      }}
    />
  );
};

export default Spinner;
