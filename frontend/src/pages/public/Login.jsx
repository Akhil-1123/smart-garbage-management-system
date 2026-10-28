import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Leaf, LogIn, KeyRound, Mail, ShieldAlert } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import Card from '../../components/Card';
import FormField from '../../components/FormField';
import Button from '../../components/Button';

const Login = () => {
  const { login } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.email.trim()) {
      newErrors.email = 'Email address is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }
    if (!formData.password) {
      newErrors.password = 'Password is required';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      await login(formData.email.trim(), formData.password);
      showToast('Login successful! Welcome back.', 'success');
    } catch (err) {
      const msg = err.response?.data?.message || 'Invalid email or password. Please try again.';
      showToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleFillDemo = (email, pass) => {
    setFormData({ email, password: pass });
    setErrors({});
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '3rem 1.5rem',
        minHeight: 'calc(100vh - 160px)'
      }}
    >
      <div style={{ width: '100%', maxWidth: 440 }}>
        {/* Brand / Header */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div
            style={{
              width: 50,
              height: 50,
              borderRadius: 14,
              background: 'var(--primary)',
              color: '#ffffff',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '1rem'
            }}
          >
            <Leaf size={28} />
          </div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text)' }}>
            Welcome Back
          </h2>
          <p style={{ color: 'var(--muted)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
            Sign in to manage your bins, collections & orders
          </p>
        </div>

        {/* Login Card */}
        <Card style={{ padding: '2.25rem' }}>
          <form onSubmit={handleSubmit} noValidate>
            <FormField
              label="Email Address"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="name@example.com"
              error={errors.email}
              required
            />

            <FormField
              label="Password"
              name="password"
              type="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="••••••••"
              error={errors.password}
              required
            />

            <Button
              type="submit"
              variant="primary"
              block
              loading={loading}
              icon={<LogIn size={18} />}
              style={{ marginTop: '0.75rem' }}
            >
              Sign In
            </Button>
          </form>

          <div
            style={{
              marginTop: '1.5rem',
              textAlign: 'center',
              fontSize: '0.88rem',
              color: 'var(--muted)'
            }}
          >
            Don't have an account?{' '}
            <Link to="/register" style={{ fontWeight: 600 }}>
              Register here
            </Link>
          </div>
        </Card>

        {/* Demo Credentials Box */}
        <div
          style={{
            marginTop: '1.75rem',
            padding: '1.25rem',
            background: '#ffffff',
            borderRadius: 'var(--radius)',
            boxShadow: 'var(--shadow-sm)',
            border: '1px dashed var(--border)',
            fontSize: '0.82rem'
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              color: 'var(--text)',
              fontWeight: 700,
              marginBottom: '0.65rem'
            }}
          >
            <ShieldAlert size={16} color="var(--primary)" />
            <span>Demo Credentials (Click to pre-fill)</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <div
              onClick={() => handleFillDemo('admin@sgms.com', 'Admin@123')}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: '0.4rem 0.6rem',
                borderRadius: 8,
                background: 'var(--input-bg)',
                cursor: 'pointer',
                transition: 'var(--transition)'
              }}
              title="Click to fill Admin credentials"
            >
              <span><strong>Admin:</strong> admin@sgms.com</span>
              <span style={{ color: 'var(--muted)' }}>Admin@123</span>
            </div>

            <div
              onClick={() => handleFillDemo('driver1@sgms.com', 'Driver@123')}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: '0.4rem 0.6rem',
                borderRadius: 8,
                background: 'var(--input-bg)',
                cursor: 'pointer',
                transition: 'var(--transition)'
              }}
              title="Click to fill Driver 1 credentials"
            >
              <span><strong>Driver 1:</strong> driver1@sgms.com</span>
              <span style={{ color: 'var(--muted)' }}>Driver@123</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
