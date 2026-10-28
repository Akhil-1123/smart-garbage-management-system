import React from 'react';

const FormField = ({
  label,
  name,
  type = 'text',
  value,
  onChange,
  placeholder = '',
  error = '',
  required = false,
  options = [],
  rows = 3,
  disabled = false,
  helpText = '',
  min,
  max,
  step,
  className = '',
  style = {}
}) => {
  return (
    <div className={`form-group ${className}`} style={style}>
      {label && (
        <label className="form-label" htmlFor={name}>
          {label} {required && <span style={{ color: 'var(--danger)' }}>*</span>}
        </label>
      )}

      {type === 'select' ? (
        <select
          id={name}
          name={name}
          className="form-select"
          value={value}
          onChange={onChange}
          disabled={disabled}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      ) : type === 'textarea' ? (
        <textarea
          id={name}
          name={name}
          rows={rows}
          className="form-textarea"
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          disabled={disabled}
        />
      ) : (
        <input
          id={name}
          name={name}
          type={type}
          className="form-input"
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          disabled={disabled}
          min={min}
          max={max}
          step={step}
        />
      )}

      {helpText && !error && (
        <span style={{ fontSize: '0.78rem', color: 'var(--muted)', marginTop: '0.2rem' }}>
          {helpText}
        </span>
      )}

      {error && <span className="form-error">{error}</span>}
    </div>
  );
};

export default FormField;
