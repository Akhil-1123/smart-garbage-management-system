import React from 'react';
import { Check } from 'lucide-react';

const Stepper = ({ steps = [], currentStep = 0, className = '' }) => {
  return (
    <div
      className={`sgms-stepper ${className}`}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '100%',
        position: 'relative',
        margin: '1.5rem 0'
      }}
    >
      {steps.map((step, idx) => {
        const isCompleted = idx < currentStep;
        const isActive = idx === currentStep;
        const isLast = idx === steps.length - 1;

        const title = typeof step === 'string' ? step : step.title;
        const subtitle = typeof step === 'object' ? step.subtitle : '';

        return (
          <React.Fragment key={idx}>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                textAlign: 'center',
                zIndex: 2,
                flex: 1
              }}
            >
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  fontSize: '0.9rem',
                  transition: 'var(--transition)',
                  background: isCompleted || isActive ? 'var(--primary)' : 'var(--border)',
                  color: isCompleted || isActive ? '#ffffff' : 'var(--muted)',
                  boxShadow: isActive ? '0 0 0 4px var(--primary-soft)' : 'none'
                }}
              >
                {isCompleted ? <Check size={18} strokeWidth={2.5} /> : idx + 1}
              </div>
              <div
                style={{
                  marginTop: '0.65rem',
                  fontSize: '0.88rem',
                  fontWeight: isActive ? 700 : 500,
                  color: isActive ? 'var(--primary)' : isCompleted ? 'var(--text)' : 'var(--muted)'
                }}
              >
                {title}
              </div>
              {subtitle && (
                <div style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: '0.15rem' }}>
                  {subtitle}
                </div>
              )}
            </div>

            {!isLast && (
              <div
                style={{
                  flex: 1,
                  height: 3,
                  background: isCompleted ? 'var(--primary)' : 'var(--border)',
                  margin: '0 0.5rem',
                  transform: 'translateY(-14px)',
                  transition: 'background 0.3s ease'
                }}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};

export default Stepper;
