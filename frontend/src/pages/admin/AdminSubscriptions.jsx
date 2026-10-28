import React, { useState, useEffect } from 'react';
import { ShieldCheck, Search, Calendar, User, CreditCard } from 'lucide-react';
import api from '../../api/axios';
import { useToast } from '../../context/ToastContext';
import Card from '../../components/Card';
import StatCard from '../../components/StatCard';
import Badge from '../../components/Badge';
import Spinner from '../../components/Spinner';
import EmptyState from '../../components/EmptyState';

const AdminSubscriptions = () => {
  const { showToast } = useToast();

  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'active' | 'expired' | 'cancelled'

  const fetchSubscriptions = async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/subscriptions');
      if (res.data?.data) {
        setSubscriptions(res.data.data);
      }
    } catch (err) {
      showToast('Could not load subscriptions ledger', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubscriptions();
  }, []);

  // Filter subscriptions based on status & search term
  const filteredSubscriptions = subscriptions.filter((sub) => {
    const matchesStatus = statusFilter === 'all' || sub.status === statusFilter;
    const term = search.toLowerCase().trim();
    const matchesSearch =
      !term ||
      (sub.user_name && sub.user_name.toLowerCase().includes(term)) ||
      (sub.user_email && sub.user_email.toLowerCase().includes(term)) ||
      (sub.plan_name && sub.plan_name.toLowerCase().includes(term));
    return matchesStatus && matchesSearch;
  });

  // Analytics Metrics
  const totalCount = subscriptions.length;
  const activeCount = subscriptions.filter((s) => s.status === 'active').length;
  const totalRevenue = subscriptions
    .filter((s) => s.status === 'active' || s.status === 'expired')
    .reduce((sum, s) => sum + Number(s.amount || 0), 0);
  const cancelledCount = subscriptions.filter((s) => s.status === 'cancelled').length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      {/* Page Title & Subtitle */}
      <div>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text)' }}>
          Citizen Subscriptions Directory
        </h2>
        <p style={{ color: 'var(--muted)', fontSize: '0.9rem', marginTop: '0.2rem' }}>
          Audit and monitor all municipal waste collection subscriptions and renewal schedules.
        </p>
      </div>

      {/* KPI Overview StatCards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '1rem'
        }}
      >
        <StatCard
          icon={<ShieldCheck size={24} />}
          label="Total Subscriptions"
          value={totalCount}
        />
        <StatCard
          icon={<CreditCard size={24} />}
          label="Active Subscriptions"
          value={activeCount}
        />
        <StatCard
          icon={<CreditCard size={24} />}
          label="Total Revenue"
          value={`₹${totalRevenue.toFixed(2)}`}
        />
        <StatCard
          icon={<ShieldCheck size={24} />}
          label="Cancelled Plans"
          value={cancelledCount}
        />
      </div>

      {/* Filter and Search Bar */}
      <Card style={{ padding: '1.25rem' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '1rem'
          }}
        >
          {/* Search Box */}
          <div style={{ position: 'relative', width: '100%', maxWidth: 320 }}>
            <Search
              size={18}
              style={{
                position: 'absolute',
                left: 12,
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--muted)'
              }}
            />
            <input
              type="text"
              placeholder="Search citizen or plan..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: '100%',
                padding: '0.55rem 0.75rem 0.55rem 2.4rem',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border)',
                background: 'var(--input-bg)',
                fontSize: '0.88rem'
              }}
            />
          </div>

          {/* Status Filter Tabs */}
          <div
            style={{
              display: 'flex',
              gap: '0.5rem',
              background: '#f8faf9',
              padding: 4,
              borderRadius: 12,
              border: '1px solid var(--border)'
            }}
          >
            {['all', 'active', 'expired', 'cancelled'].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                style={{
                  padding: '0.4rem 0.85rem',
                  borderRadius: 8,
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  border: 'none',
                  background: statusFilter === st ? 'var(--primary)' : 'transparent',
                  color: statusFilter === st ? '#ffffff' : 'var(--muted)',
                  cursor: 'pointer',
                  textTransform: 'capitalize',
                  transition: 'var(--transition)'
                }}
              >
                {st}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {/* Subscriptions Table */}
      <Card style={{ padding: '1.75rem' }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
            <Spinner size="lg" />
          </div>
        ) : filteredSubscriptions.length === 0 ? (
          <EmptyState
            icon={<ShieldCheck size={48} strokeWidth={1.5} color="var(--primary)" />}
            title="No Subscriptions Found"
            message={
              search || statusFilter !== 'all'
                ? 'No subscriptions match your search and filter criteria.'
                : 'No citizen subscriptions have been registered in the system yet.'
            }
          />
        ) : (
          <div className="table-responsive">
            <table className="sgms-table">
              <thead>
                <tr>
                  <th>Subscription ID</th>
                  <th>Citizen</th>
                  <th>Plan Name</th>
                  <th>Start Date</th>
                  <th>End Date</th>
                  <th>Amount</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredSubscriptions.map((sub) => {
                  const sDate = sub.start_date
                    ? new Date(sub.start_date).toLocaleDateString()
                    : 'N/A';
                  const eDate = sub.end_date
                    ? new Date(sub.end_date).toLocaleDateString()
                    : 'N/A';

                  return (
                    <tr key={sub.id}>
                      <td>
                        <span style={{ fontWeight: 700, color: 'var(--text)' }}>
                          #SUB-{sub.id}
                        </span>
                        <div style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>
                          {sub.created_at ? new Date(sub.created_at).toLocaleDateString() : ''}
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <div
                            style={{
                              width: 32,
                              height: 32,
                              borderRadius: '50%',
                              background: 'var(--primary-soft)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: 'var(--primary)',
                              fontWeight: 700,
                              fontSize: '0.85rem'
                            }}
                          >
                            {sub.user_name ? sub.user_name.charAt(0).toUpperCase() : 'U'}
                          </div>
                          <div>
                            <div style={{ fontWeight: 600, color: 'var(--text)' }}>
                              {sub.user_name}
                            </div>
                            <div style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>
                              {sub.user_email}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span style={{ fontWeight: 600, color: 'var(--text)' }}>
                          {sub.plan_name}
                        </span>
                        <div
                          style={{
                            fontSize: '0.75rem',
                            color: 'var(--muted)',
                            textTransform: 'capitalize'
                          }}
                        >
                          {sub.plan_type || 'standard'}
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--text)' }}>
                          <Calendar size={14} color="var(--muted)" />
                          <span>{sDate}</span>
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--text)' }}>
                          <Calendar size={14} color="var(--muted)" />
                          <span>{eDate}</span>
                        </div>
                      </td>
                      <td>
                        <span style={{ fontWeight: 700, color: 'var(--primary)' }}>
                          ₹{Number(sub.amount || 0).toFixed(2)}
                        </span>
                      </td>
                      <td>
                        <Badge status={sub.status || 'active'} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
};

export default AdminSubscriptions;
