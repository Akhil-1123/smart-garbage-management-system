import React from 'react';
import Spinner from './Spinner';

const Button = ({
  children,
  variant = 'primary',
  size = 'md',
  block = false,
  loading = false,
  disabled = false,
  onClick,
  type = 'button',
  className = '',
  icon = null,
  style = {}
}) => {
  const btnClass = `btn btn-${variant} ${size === 'sm' ? 'btn-sm' : ''} ${block ? 'btn-block' : ''} ${className}`;

  return (
    <button
      type={type}
      className={btnClass}
      disabled={disabled || loading}
      onClick={onClick}
      style={style}
    >
      {loading ? (
        <>
          <Spinner size="sm" color={variant === 'secondary' ? 'var(--primary)' : '#ffffff'} />
          <span>Processing...</span>
        </>
      ) : (
        <>
          {icon}
          {children}
        </>
      )}
    </button>
  );
};

export default Button;
