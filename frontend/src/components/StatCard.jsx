import React from 'react';
import Card from './Card';

const StatCard = ({ icon, label, value, subtext, color = 'var(--primary)', onClick, className = '' }) => {
  return (
    <Card
      className={`stat-card ${className}`}
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '1.25rem',
        cursor: onClick ? 'pointer' : 'default',
        padding: '1.5rem',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      <div
        style={{
          width: 52,
          height: 52,
          borderRadius: 14,
          background: 'var(--primary-soft)',
          color: color,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0
        }}
      >
        {icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '0.85rem', color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.25rem' }}>
          {label}
        </div>
        <div style={{ fontSize: '1.65rem', fontWeight: 700, color: 'var(--text)', lineHeight: 1.2 }}>
          {value ?? '—'}
        </div>
        {subtext && (
          <div style={{ fontSize: '0.78rem', color: 'var(--muted)', marginTop: '0.25rem' }}>
            {subtext}
          </div>
        )}
      </div>
    </Card>
  );
};

export default StatCard;
