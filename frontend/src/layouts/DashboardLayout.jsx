import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  Leaf,
  LayoutDashboard,
  Trash2,
  CreditCard,
  Send,
  Clock,
  ShoppingBag,
  Package,
  BarChart3,
  MessageSquare,
  Bell,
  User,
  LogOut,
  Menu,
  X,
  Users,
  Truck,
  Scale,
  Recycle,
  ShieldCheck
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import api from '../api/axios';

const DEFAULT_USER_NAV_ITEMS = [
  { path: '/app', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { path: '/app/bins', label: 'My Bins', icon: Trash2 },
  { path: '/app/subscription', label: 'Subscription', icon: CreditCard },
  { path: '/app/request', label: 'Request Collection', icon: Send },
  { path: '/app/requests', label: 'My Requests', icon: Clock },
  { path: '/app/marketplace', label: 'Marketplace', icon: ShoppingBag },
  { path: '/app/orders', label: 'My Orders', icon: Package },
  { path: '/app/reports', label: 'Monthly Report', icon: BarChart3 },
  { path: '/app/support', label: 'Feedback & Support', icon: MessageSquare },
  { path: '/app/notifications', label: 'Notifications', icon: Bell },
  { path: '/app/profile', label: 'Profile', icon: User }
];

const ADMIN_NAV_ITEMS = [
  { path: '/admin', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { path: '/admin/users', label: 'Users', icon: Users },
  { path: '/admin/drivers', label: 'Drivers', icon: Truck },
  { path: '/admin/bins', label: 'Bins', icon: Trash2 },
  { path: '/admin/requests', label: 'Collection Requests', icon: Clock },
  { path: '/admin/waste', label: 'Waste Records', icon: Scale },
  { path: '/admin/composting', label: 'Composting', icon: Recycle },
  { path: '/admin/products', label: 'Products', icon: ShoppingBag },
  { path: '/admin/orders', label: 'Orders', icon: Package },
  { path: '/admin/payments', label: 'Payments', icon: CreditCard },
  { path: '/admin/subscriptions', label: 'Subscriptions', icon: ShieldCheck },
  { path: '/admin/feedback', label: 'Feedback & Complaints', icon: MessageSquare },
  { path: '/admin/reports', label: 'Reports', icon: BarChart3 },
  { path: '/admin/notifications', label: 'Notifications', icon: Bell }
];

const DRIVER_NAV_ITEMS = [
  { path: '/driver', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { path: '/driver/collections', label: 'My Collections', icon: Truck },
  { path: '/driver/history', label: 'History', icon: Clock },
  { path: '/driver/notifications', label: 'Notifications', icon: Bell },
  { path: '/driver/profile', label: 'Profile', icon: User }
];

const DashboardLayout = ({ navItems = null, title = '' }) => {
  const { user, logout } = useAuth();
  const { totalItemCount, setIsDrawerOpen } = useCart();
  const navigate = useNavigate();
  const location = useLocation();

  const [unreadCount, setUnreadCount] = useState(0);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  const items = navItems || (
    user?.role === 'admin'
      ? ADMIN_NAV_ITEMS
      : user?.role === 'driver'
      ? DRIVER_NAV_ITEMS
      : DEFAULT_USER_NAV_ITEMS
  );

  // Determine current page title if not explicitly passed
  const currentItem = items.find((item) =>
    item.exact ? location.pathname === item.path : location.pathname.startsWith(item.path)
  );
  const pageTitle = title || (currentItem ? currentItem.label : 'Dashboard');

  // Fetch unread notifications count
  const fetchUnreadCount = async () => {
    try {
      const res = await api.get('/notifications');
      if (res.data && res.data.data) {
        setUnreadCount(res.data.data.unread_count || 0);
      }
    } catch {
      // Ignore background notification fetch errors
    }
  };

  useEffect(() => {
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, [location.pathname]);

  const handleNavClick = () => {
    setMobileDrawerOpen(false);
  };

  return (
    <div className="dashboard-container" style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg)' }}>
      {/* Mobile Drawer Backdrop */}
      {mobileDrawerOpen && (
        <div
          className="drawer-backdrop"
          onClick={() => setMobileDrawerOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.4)',
            backdropFilter: 'blur(3px)',
            zIndex: 1000
          }}
        />
      )}

      {/* Sidebar Navigation */}
      <aside
        className={`sidebar ${mobileDrawerOpen ? 'drawer-open' : ''}`}
        style={{
          width: 260,
          background: '#ffffff',
          boxShadow: '2px 0 16px rgba(0, 0, 0, 0.04)',
          display: 'flex',
          flexDirection: 'column',
          zIndex: 1001,
          transition: 'transform 0.3s ease'
        }}
      >
        {/* Brand Logo Header */}
        <div
          style={{
            padding: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid var(--border)'
          }}
        >
          <div
            onClick={() => navigate(user?.role === 'admin' ? '/admin' : user?.role === 'driver' ? '/driver' : '/app')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.65rem',
              cursor: 'pointer'
            }}
          >
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: 'var(--primary)',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <Leaf size={20} />
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: '1.25rem', color: 'var(--primary)', lineHeight: 1 }}>
                SGMS
              </div>
              <div style={{ fontSize: '0.68rem', color: 'var(--muted)', fontWeight: 600, letterSpacing: '0.04em' }}>
                {user?.role === 'admin' ? 'ADMIN CONSOLE' : user?.role === 'driver' ? 'DRIVER PORTAL' : 'CITIZEN PORTAL'}
              </div>
            </div>
          </div>

          {/* Close drawer button on mobile */}
          <button
            className="mobile-close-btn"
            onClick={() => setMobileDrawerOpen(false)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--muted)',
              display: 'none'
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Navigation Link List */}
        <nav
          style={{
            flex: 1,
            padding: '1rem 0.75rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.25rem',
            overflowY: 'auto'
          }}
        >
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.exact}
                onClick={handleNavClick}
                className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
                style={({ isActive }) => ({
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.7rem 0.9rem',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.9rem',
                  fontWeight: isActive ? 700 : 500,
                  color: isActive ? 'var(--primary)' : 'var(--text)',
                  backgroundColor: isActive ? 'var(--primary-soft)' : 'transparent',
                  textDecoration: 'none',
                  transition: 'var(--transition)'
                })}
              >
                <Icon size={18} color="currentColor" />
                <span style={{ flex: 1 }}>{item.label}</span>
                {item.label === 'Notifications' && unreadCount > 0 && (
                  <span
                    style={{
                      background: 'var(--danger)',
                      color: '#ffffff',
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      padding: '0.15rem 0.45rem',
                      borderRadius: 10
                    }}
                  >
                    {unreadCount}
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* Sidebar Footer User Info */}
        <div
          style={{
            padding: '1rem',
            borderTop: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <div style={{ minWidth: 0, flex: 1, marginRight: '0.5rem' }}>
            <div
              style={{
                fontSize: '0.88rem',
                fontWeight: 700,
                color: 'var(--text)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}
            >
              {user?.name || 'Citizen'}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--muted)', textTransform: 'capitalize' }}>
              {user?.role || 'User'}
            </div>
          </div>
          <button
            onClick={logout}
            title="Logout"
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--muted)',
              padding: '0.4rem',
              borderRadius: 8,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'var(--transition)'
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--danger)')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--muted)')}
          >
            <LogOut size={18} />
          </button>
        </div>
      </aside>

      {/* Main App Canvas */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* Top Navbar */}
        <header
          style={{
            background: '#ffffff',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.03)',
            height: 64,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 1.5rem',
            position: 'sticky',
            top: 0,
            zIndex: 99
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <button
              className="drawer-toggle-btn"
              onClick={() => setMobileDrawerOpen(true)}
              style={{
                display: 'none',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--text)',
                padding: '0.25rem'
              }}
              aria-label="Open navigation drawer"
            >
              <Menu size={22} />
            </button>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text)' }}>
              {pageTitle}
            </h2>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            {/* Cart Button (Citizens only) */}
            {user?.role === 'user' && (
              <button
                onClick={() => setIsDrawerOpen(true)}
                style={{
                  position: 'relative',
                  background: 'var(--input-bg)',
                  border: '1px solid var(--border)',
                  borderRadius: 10,
                  width: 38,
                  height: 38,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: 'var(--text)',
                  transition: 'var(--transition)'
                }}
                title="Shopping Cart"
              >
                <ShoppingBag size={18} />
                {totalItemCount > 0 && (
                  <span
                    style={{
                      position: 'absolute',
                      top: -4,
                      right: -4,
                      background: 'var(--primary)',
                      color: '#ffffff',
                      fontSize: '0.65rem',
                      fontWeight: 700,
                      width: 18,
                      height: 18,
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: '2px solid #ffffff'
                    }}
                  >
                    {totalItemCount > 9 ? '9+' : totalItemCount}
                  </span>
                )}
              </button>
            )}

            {/* Notification Bell */}
            <button
              onClick={() =>
                navigate(
                  user?.role === 'admin'
                    ? '/admin/notifications'
                    : user?.role === 'driver'
                    ? '/driver/notifications'
                    : '/app/notifications'
                )
              }
              style={{
                position: 'relative',
                background: 'var(--input-bg)',
                border: '1px solid var(--border)',
                borderRadius: 10,
                width: 38,
                height: 38,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: 'var(--text)',
                transition: 'var(--transition)'
              }}
              title="Notifications"
            >
              <Bell size={18} />
              {unreadCount > 0 && (
                <span
                  style={{
                    position: 'absolute',
                    top: -4,
                    right: -4,
                    background: 'var(--danger)',
                    color: '#ffffff',
                    fontSize: '0.65rem',
                    fontWeight: 700,
                    width: 18,
                    height: 18,
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '2px solid #ffffff'
                  }}
                >
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {/* User display badge */}
            <div
              onClick={() => navigate('/app/profile')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.6rem',
                cursor: 'pointer',
                padding: '0.35rem 0.65rem',
                borderRadius: 'var(--radius-sm)',
                background: 'var(--input-bg)',
                border: '1px solid var(--border)'
              }}
            >
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: '50%',
                  background: 'var(--primary-soft)',
                  color: 'var(--primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  fontSize: '0.8rem'
                }}
              >
                {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
              </div>
              <span
                className="user-name-label"
                style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text)' }}
              >
                {user?.name || 'My Account'}
              </span>
            </div>
          </div>
        </header>

        {/* Scrollable Page Content */}
        <main style={{ flex: 1, padding: '1.75rem', maxWidth: 1280, width: '100%', margin: '0 auto' }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
