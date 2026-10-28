import React, { useState, useEffect } from 'react';
import { CreditCard, DollarSign, CheckCircle2, Clock, XCircle, Receipt } from 'lucide-react';
import api from '../../api/axios';
import { useToast } from '../../context/ToastContext';
import Card from '../../components/Card';
import Badge from '../../components/Badge';
import Spinner from '../../components/Spinner';
import EmptyState from '../../components/EmptyState';

const AdminPayments = () => {
  const { showToast } = useToast();

  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'success' | 'pending' | 'failed'

  const fetchPayments = async () => {
    setLoading(true);
    try {
      const url = statusFilter !== 'all' ? `/admin/payments?status=${statusFilter}` : '/admin/payments';
      const res = await api.get(url);
      if (res.data?.data) {
        setPayments(res.data.data);
      }
    } catch (err) {
      showToast('Could not load payment ledger', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, [statusFilter]);

  // Calculate total successful revenue
  const totalSuccessfulAmount = payments
    .filter((p) => p.status === 'success')
    .reduce((sum, p) => sum + Number(p.amount || 0), 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      {/* Header */}
      <div>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text)' }}>
          Unified Payments & Revenue Ledger
        </h2>
        <p style={{ color: 'var(--muted)', fontSize: '0.9rem', marginTop: '0.2rem' }}>
          Audit trail of mock subscription purchases, e-commerce orders, and transaction authorizations.
        </p>
      </div>

      {/* Top Total Successful Amount Banner */}
      <Card style={{ padding: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1.25rem' }}>
        <div>
          <div style={{ fontSize: '0.82rem', color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase' }}>
            Total Successful Collections & Sales
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--primary)', lineHeight: 1.2, marginTop: '0.25rem' }}>
            ₹{totalSuccessfulAmount.toFixed(2)}
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--muted)', marginTop: '0.2rem' }}>
            From {payments.filter((p) => p.status === 'success').length} successful payments
          </div>
        </div>

        {/* Status Filter Buttons */}
        <div style={{ display: 'flex', gap: '0.5rem', background: '#ffffff', padding: 4, borderRadius: 12, border: '1px solid var(--border)' }}>
          {['all', 'success', 'pending', 'failed'].map((st) => (
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
      </Card>

      {/* Payments Table */}
      <Card style={{ padding: '1.75rem' }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
            <Spinner size="lg" />
          </div>
        ) : payments.length === 0 ? (
          <EmptyState
            icon={<Receipt size={48} strokeWidth={1.5} color="var(--primary)" />}
            title="No Payments Recorded"
            message={`No payment entries found matching status "${statusFilter}".`}
          />
        ) : (
          <div className="table-responsive">
            <table className="sgms-table">
              <thead>
                <tr>
                  <th>Transaction ID</th>
                  <th>Payment Type</th>
                  <th>Customer</th>
                  <th>Amount</th>
                  <th>Payment Method</th>
                  <th>Status</th>
                  <th>Paid Date</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <strong style={{ fontFamily: 'monospace', fontSize: '0.88rem' }}>
                        {p.transaction_id || `TXN-ORD-${p.id}`}
                      </strong>
                    </td>
                    <td>
                      <span
                        style={{
                          background: p.type === 'subscription' ? 'var(--primary-soft)' : 'var(--info-soft)',
                          color: p.type === 'subscription' ? 'var(--primary)' : 'var(--info)',
                          padding: '0.2rem 0.55rem',
                          borderRadius: 8,
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          textTransform: 'capitalize'
                        }}
                      >
                        {p.type} #{p.reference_id}
                      </span>
                    </td>
                    <td>
                      <div>
                        <strong>{p.user_name}</strong>
                        <div style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>
                          {p.user_email}
                        </div>
                      </div>
                    </td>
                    <td>
                      <strong style={{ color: 'var(--primary)', fontSize: '0.98rem' }}>
                        ₹{Number(p.amount).toFixed(2)}
                      </strong>
                    </td>
                    <td>
                      <span style={{ fontSize: '0.82rem', fontWeight: 600, textTransform: 'uppercase' }}>
                        {p.method || 'UPI'}
                      </span>
                    </td>
                    <td>
                      <Badge status={p.status} />
                    </td>
                    <td style={{ fontSize: '0.82rem', color: 'var(--muted)' }}>
                      {p.date ? new Date(p.date).toLocaleString([], {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      }) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
};

export default AdminPayments;
