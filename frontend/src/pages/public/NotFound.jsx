import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Compass, Home, ArrowLeft } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import Card from '../../components/Card';
import Button from '../../components/Button';

const NotFound = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleGoHome = () => {
    if (user?.role === 'admin') {
      navigate('/admin');
    } else if (user?.role === 'driver') {
      navigate('/driver');
    } else if (user?.role === 'user') {
      navigate('/app');
    } else {
      navigate('/');
    }
  };

  return (
    <div
      style={{
        minHeight: '80vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem 1rem'
      }}
    >
      <Card
        style={{
          maxWidth: 520,
          width: '100%',
          padding: '3rem 2rem',
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center'
        }}
      >
        <div
          style={{
            width: 80,
            height: 80,
            borderRadius: 24,
            background: 'var(--primary-soft)',
            color: 'var(--primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '1.5rem'
          }}
        >
          <Compass size={44} strokeWidth={1.5} />
        </div>

        <span
          style={{
            fontSize: '3.5rem',
            fontWeight: 900,
            color: 'var(--primary)',
            lineHeight: 1
          }}
        >
          404
        </span>

        <h2
          style={{
            fontSize: '1.5rem',
            fontWeight: 800,
            color: 'var(--text)',
            marginTop: '0.75rem'
          }}
        >
          Page Not Found
        </h2>

        <p
          style={{
            color: 'var(--muted)',
            fontSize: '0.95rem',
            marginTop: '0.5rem',
            lineHeight: 1.5,
            maxWidth: 380
          }}
        >
          The page or operational route you are looking for does not exist, has been archived, or you may not have authorization to view it.
        </p>

        <div
          style={{
            display: 'flex',
            gap: '0.75rem',
            marginTop: '2rem',
            flexWrap: 'wrap',
            justifyContent: 'center'
          }}
        >
          <Button
            variant="secondary"
            onClick={() => navigate(-1)}
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
          >
            <ArrowLeft size={16} />
            Go Back
          </Button>

          <Button
            onClick={handleGoHome}
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
          >
            <Home size={16} />
            Back to Dashboard
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default NotFound;
