import React, { useState } from 'react';
import { Link, Outlet, useNavigate } from 'react-router-dom';
import { Leaf, Menu, X, LogIn, UserPlus, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import Button from '../components/Button';

const PublicLayout = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();

  const getDashboardPath = () => {
    if (!user) return '/login';
    if (user.role === 'admin') return '/admin';
    if (user.role === 'driver') return '/driver';
    return '/app';
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Top Navbar */}
      <header
        style={{
          background: '#ffffff',
          boxShadow: '0 2px 10px rgba(0, 0, 0, 0.04)',
          position: 'sticky',
          top: 0,
          zIndex: 100
        }}
      >
        <div
          style={{
            maxWidth: 1200,
            margin: '0 auto',
            padding: '1rem 1.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          {/* Logo */}
          <Link
            to="/"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.6rem',
              color: 'var(--primary)',
              textDecoration: 'none',
              fontWeight: 800,
              fontSize: '1.4rem',
              letterSpacing: '-0.02em'
            }}
          >
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 10,
                background: 'var(--primary)',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <Leaf size={22} />
            </div>
            <span>SGMS</span>
          </Link>

          {/* Desktop Nav Items */}
          <nav
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '1.75rem'
            }}
            className="desktop-nav"
          >
            <Link
              to="/"
              style={{ color: 'var(--text)', fontWeight: 600, fontSize: '0.95rem' }}
            >
              Home
            </Link>
            <Link
              to="/marketplace"
              style={{ color: 'var(--text)', fontWeight: 600, fontSize: '0.95rem' }}
            >
              Marketplace
            </Link>

            {isAuthenticated ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => navigate(getDashboardPath())}
                  icon={<User size={16} />}
                >
                  Dashboard
                </Button>
                <Button size="sm" variant="danger" onClick={logout}>
                  Logout
                </Button>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => navigate('/login')}
                  icon={<LogIn size={16} />}
                >
                  Login
                </Button>
                <Button
                  size="sm"
                  variant="primary"
                  onClick={() => navigate('/register')}
                  icon={<UserPlus size={16} />}
                >
                  Register
                </Button>
              </div>
            )}
          </nav>

          {/* Mobile hamburger button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="mobile-menu-toggle"
            style={{
              display: 'none',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text)'
            }}
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X size={26} /> : <Menu size={26} />}
          </button>
        </div>

        {/* Mobile dropdown */}
        {mobileMenuOpen && (
          <div
            style={{
              background: '#ffffff',
              borderTop: '1px solid var(--border)',
              padding: '1.25rem 1.5rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem'
            }}
          >
            <Link
              to="/"
              onClick={() => setMobileMenuOpen(false)}
              style={{ color: 'var(--text)', fontWeight: 600 }}
            >
              Home
            </Link>
            <Link
              to="/marketplace"
              onClick={() => setMobileMenuOpen(false)}
              style={{ color: 'var(--text)', fontWeight: 600 }}
            >
              Marketplace
            </Link>

            {isAuthenticated ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <Button
                  variant="secondary"
                  block
                  onClick={() => {
                    setMobileMenuOpen(false);
                    navigate(getDashboardPath());
                  }}
                  icon={<User size={16} />}
                >
                  Dashboard
                </Button>
                <Button
                  variant="danger"
                  block
                  onClick={() => {
                    setMobileMenuOpen(false);
                    logout();
                  }}
                >
                  Logout
                </Button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <Button
                  variant="secondary"
                  block
                  onClick={() => {
                    setMobileMenuOpen(false);
                    navigate('/login');
                  }}
                  icon={<LogIn size={16} />}
                >
                  Login
                </Button>
                <Button
                  variant="primary"
                  block
                  onClick={() => {
                    setMobileMenuOpen(false);
                    navigate('/register');
                  }}
                  icon={<UserPlus size={16} />}
                >
                  Register
                </Button>
              </div>
            )}
          </div>
        )}
      </header>

      {/* Main Content */}
      <main style={{ flex: 1 }}>
        <Outlet />
      </main>

      {/* Footer */}
      <footer
        style={{
          background: '#ffffff',
          borderTop: '1px solid var(--border)',
          padding: '2.5rem 1.5rem',
          marginTop: '3rem'
        }}
      >
        <div
          style={{
            maxWidth: 1200,
            margin: '0 auto',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '1rem',
            textAlign: 'center'
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              color: 'var(--primary)',
              fontWeight: 800,
              fontSize: '1.2rem'
            }}
          >
            <Leaf size={20} />
            <span>SGMS</span>
          </div>
          <p style={{ color: 'var(--muted)', fontSize: '0.9rem', maxWidth: 500 }}>
            Smart Garbage Management System — Empowering communities with clean door-to-door waste
            collection, organic composting, and sustainable bio-fertilizers.
          </p>
          <div style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>
            &copy; {new Date().getFullYear()} SGMS. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
};

export default PublicLayout;
