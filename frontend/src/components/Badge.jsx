import React from 'react';

const formatStatusText = (status) => {
  if (!status) return '';
  return status
    .toString()
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
};

const Badge = ({ status = 'pending', label, className = '', style = {} }) => {
  const normalizedStatus = (status || '').toLowerCase().replace(/\s+/g, '_');
  const displayText = label || formatStatusText(status);

  return (
    <span
      className={`badge badge-${normalizedStatus} ${className}`}
      style={style}
    >
      {displayText}
    </span>
  );
};

export default Badge;
