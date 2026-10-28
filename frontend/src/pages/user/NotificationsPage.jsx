import React, { useState, useEffect } from 'react';
import { Bell, CheckCheck, Clock, Check, MessageSquare } from 'lucide-react';
import api from '../../api/axios';
import { useToast } from '../../context/ToastContext';
import Card from '../../components/Card';
import Button from '../../components/Button';
import Spinner from '../../components/Spinner';
import EmptyState from '../../components/EmptyState';

const NotificationsPage = () => {
  const { showToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [markingAll, setMarkingAll] = useState(false);

  const fetchNotifications = async () => {
    try {
      const res = await api.get('/notifications');
      if (res.data?.data) {
        setNotifications(res.data.data.notifications || []);
        setUnreadCount(res.data.data.unread_count || 0);
      }
    } catch (err) {
      showToast('Could not load notifications', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const handleMarkAsRead = async (id, isRead) => {
    if (isRead) return; // already read

    // Optimistic update
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: 1 } : n))
    );
    setUnreadCount((c) => Math.max(0, c - 1));

    try {
      await api.put(`/notifications/${id}/read`);
    } catch (err) {
      console.error('Failed to mark notification as read', err);
    }
  };

  const handleMarkAllAsRead = async () => {
    if (unreadCount === 0) return;

    setMarkingAll(true);
    // Optimistic update
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: 1 })));
    setUnreadCount(0);

    try {
      await api.put('/notifications/read-all');
      showToast('All notifications marked as read', 'success');
    } catch (err) {
      showToast('Failed to mark all as read', 'error');
      fetchNotifications();
    } finally {
      setMarkingAll(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 300 }}>
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem', maxWidth: 840 }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem'
        }}
      >
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text)' }}>
            Notifications
          </h2>
          <p style={{ color: 'var(--muted)', fontSize: '0.9rem', marginTop: '0.2rem' }}>
            {unreadCount > 0
              ? `You have ${unreadCount} unread notification${unreadCount === 1 ? '' : 's'}`
              : 'All caught up! No unread notifications'}
          </p>
        </div>

        {unreadCount > 0 && (
          <Button
            variant="secondary"
            size="sm"
            onClick={handleMarkAllAsRead}
            loading={markingAll}
            icon={<CheckCheck size={16} />}
          >
            Mark all as read
          </Button>
        )}
      </div>

      {/* Notifications List Card */}
      <Card style={{ padding: '1rem' }}>
        {notifications.length === 0 ? (
          <EmptyState
            icon={<Bell size={48} strokeWidth={1.5} color="var(--primary)" />}
            title="No Notifications Yet"
            message="You will receive alerts here when collection requests are approved, drivers are dispatched, or orders are placed."
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {notifications.map((n) => {
              const isUnread = !n.is_read;
              return (
                <div
                  key={n.id}
                  onClick={() => handleMarkAsRead(n.id, n.is_read)}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '1rem',
                    padding: '1rem 1.25rem',
                    borderRadius: 'var(--radius-sm)',
                    background: isUnread ? 'var(--primary-soft)' : 'transparent',
                    borderLeft: isUnread ? '4px solid var(--primary)' : '4px solid transparent',
                    cursor: isUnread ? 'pointer' : 'default',
                    transition: 'var(--transition)'
                  }}
                  onMouseEnter={(e) => {
                    if (!isUnread) e.currentTarget.style.backgroundColor = '#fafcfb';
                  }}
                  onMouseLeave={(e) => {
                    if (!isUnread) e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  <div
                    style={{
                      width: 38,
                      height: 38,
                      borderRadius: 10,
                      background: isUnread ? 'var(--primary)' : 'var(--input-bg)',
                      color: isUnread ? '#ffffff' : 'var(--muted)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      marginTop: '0.15rem'
                    }}
                  >
                    <Bell size={18} />
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: '0.92rem',
                        fontWeight: isUnread ? 700 : 500,
                        color: 'var(--text)',
                        lineHeight: 1.4
                      }}
                    >
                      {n.message}
                    </div>

                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        fontSize: '0.78rem',
                        color: 'var(--muted)',
                        marginTop: '0.35rem'
                      }}
                    >
                      <Clock size={12} />
                      <span>{new Date(n.created_at).toLocaleString()}</span>
                      {n.type && (
                        <span
                          style={{
                            background: '#e3ebe6',
                            padding: '0.1rem 0.4rem',
                            borderRadius: 6,
                            fontSize: '0.7rem',
                            textTransform: 'uppercase'
                          }}
                        >
                          {n.type}
                        </span>
                      )}
                    </div>
                  </div>

                  {isUnread && (
                    <div
                      title="Click to mark as read"
                      style={{
                        width: 10,
                        height: 10,
                        borderRadius: '50%',
                        background: 'var(--primary)',
                        flexShrink: 0,
                        marginTop: '0.5rem'
                      }}
                    />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
};

export default NotificationsPage;
