import React, { useState, useEffect } from 'react';
import {
  Package,
  Truck,
  CheckCircle2,
  XCircle,
  Receipt,
  User,
  Filter,
  DollarSign
} from 'lucide-react';
import api from '../../api/axios';
import { useToast } from '../../context/ToastContext';
import Card from '../../components/Card';
import Button from '../../components/Button';
import Badge from '../../components/Badge';
import Modal from '../../components/Modal';
import Spinner from '../../components/Spinner';
import EmptyState from '../../components/EmptyState';

const ORDER_FILTERS = [
  { key: 'all', label: 'All Orders' },
  { key: 'pending', label: 'Pending (COD)' },
  { key: 'paid', label: 'Paid & Ready to Ship' },
  { key: 'shipped', label: 'Shipped (In Transit)' },
  { key: 'delivered', label: 'Delivered' },
  { key: 'cancelled', label: 'Cancelled' }
];

const AdminOrders = () => {
  const { showToast } = useToast();

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedFilter, setSelectedFilter] = useState('all');

  // Cancel Modal
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [orderToCancel, setOrderToCancel] = useState(null);
  const [cancelling, setCancelling] = useState(false);

  const fetchOrders = async () => {
    try {
      const res = await api.get('/admin/orders');
      if (res.data?.data) {
        setOrders(res.data.data);
      }
    } catch (err) {
      showToast('Could not load orders list', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const handleUpdateStatus = async (orderId, targetStatus) => {
    try {
      await api.put(`/admin/orders/${orderId}/status`, { status: targetStatus });
      showToast(`Order #${orderId} marked as ${targetStatus.toUpperCase()}.`, 'success');
      fetchOrders();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to update order status', 'error');
    }
  };

  const handleOpenCancel = (order) => {
    setOrderToCancel(order);
    setCancelModalOpen(true);
  };

  const handleConfirmCancel = async () => {
    if (!orderToCancel) return;
    setCancelling(true);
    try {
      await api.put(`/admin/orders/${orderToCancel.id}/status`, { status: 'cancelled' });
      showToast(`Order #${orderToCancel.id} has been cancelled.`, 'success');
      setCancelModalOpen(false);
      setOrderToCancel(null);
      fetchOrders();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to cancel order', 'error');
    } finally {
      setCancelling(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 340 }}>
        <Spinner size="lg" />
      </div>
    );
  }

  const filteredOrders = orders.filter((o) => {
    if (selectedFilter === 'all') return true;
    return o.status === selectedFilter;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      {/* Header */}
      <div>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text)' }}>
          Customer Purchase Orders
        </h2>
        <p style={{ color: 'var(--muted)', fontSize: '0.9rem', marginTop: '0.2rem' }}>
          Dispatch fertilizer shipments, track COD payments, and fulfill compost sales.
        </p>
      </div>

      {/* Filter Tabs */}
      <div
        style={{
          display: 'flex',
          gap: '0.5rem',
          overflowX: 'auto',
          borderBottom: '1px solid var(--border)',
          paddingBottom: '0.5rem'
        }}
      >
        {ORDER_FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setSelectedFilter(f.key)}
            style={{
              padding: '0.45rem 1rem',
              borderRadius: 20,
              fontSize: '0.85rem',
              fontWeight: 700,
              border: '1px solid var(--border)',
              background: selectedFilter === f.key ? 'var(--primary)' : '#ffffff',
              color: selectedFilter === f.key ? '#ffffff' : 'var(--muted)',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              transition: 'var(--transition)'
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Orders Table */}
      <Card style={{ padding: '1.75rem' }}>
        {filteredOrders.length === 0 ? (
          <EmptyState
            icon={<Package size={48} strokeWidth={1.5} color="var(--primary)" />}
            title="No Orders Found"
            message={`No customer orders matching status filter "${selectedFilter}".`}
          />
        ) : (
          <div className="table-responsive">
            <table className="sgms-table">
              <thead>
                <tr>
                  <th>Order #</th>
                  <th>Customer</th>
                  <th>Ordered Items</th>
                  <th>Total Payable</th>
                  <th>Payment Info</th>
                  <th>Order Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map((o) => {
                  const isPaid = o.status === 'paid';
                  const isShipped = o.status === 'shipped';
                  const isPendingCod = o.status === 'pending' && o.payment_method === 'cod';
                  const isCancellable = ['pending', 'paid'].includes(o.status);

                  return (
                    <tr key={o.id}>
                      <td>
                        <strong>#{o.id}</strong>
                        <div style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>
                          {new Date(o.order_date).toLocaleDateString()}
                        </div>
                      </td>
                      <td>
                        <div>
                          <strong>{o.user_name}</strong>
                          <div style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>
                            {o.shipping_address}
                          </div>
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                          {o.items?.map((it, idx) => (
                            <span key={idx} style={{ fontSize: '0.82rem' }}>
                              <strong style={{ color: 'var(--primary)' }}>{it.qty}x</strong> {it.product_name}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td>
                        <strong style={{ fontSize: '1.05rem', color: 'var(--primary)' }}>
                          ₹{Number(o.total_amount).toFixed(2)}
                        </strong>
                      </td>
                      <td>
                        <div>
                          <span style={{ fontSize: '0.82rem', fontWeight: 700, textTransform: 'uppercase' }}>
                            {o.payment_method || 'CARD'}
                          </span>
                          <div style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>
                            {o.payment_status || 'Paid'}
                          </div>
                        </div>
                      </td>
                      <td>
                        <Badge status={o.status} />
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                          {isPendingCod && (
                            <Button
                              size="sm"
                              variant="primary"
                              onClick={() => handleUpdateStatus(o.id, 'paid')}
                            >
                              Confirm COD Paid
                            </Button>
                          )}

                          {isPaid && (
                            <Button
                              size="sm"
                              variant="primary"
                              onClick={() => handleUpdateStatus(o.id, 'shipped')}
                              icon={<Truck size={13} />}
                            >
                              Ship
                            </Button>
                          )}

                          {isShipped && (
                            <Button
                              size="sm"
                              variant="primary"
                              onClick={() => handleUpdateStatus(o.id, 'delivered')}
                              icon={<CheckCircle2 size={13} />}
                            >
                              Mark Delivered
                            </Button>
                          )}

                          {isCancellable && (
                            <Button
                              size="sm"
                              variant="danger"
                              onClick={() => handleOpenCancel(o)}
                            >
                              Cancel
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Cancel Order Modal */}
      <Modal
        isOpen={cancelModalOpen}
        onClose={() => setCancelModalOpen(false)}
        title={`Cancel Order #${orderToCancel?.id}`}
        maxWidth="440px"
      >
        <p style={{ color: 'var(--muted)', fontSize: '0.92rem', marginBottom: '1.25rem' }}>
          Are you sure you want to cancel order <strong>#{orderToCancel?.id}</strong> for customer{' '}
          <strong>{orderToCancel?.user_name}</strong>? Reserved product inventory will be restored.
        </p>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
          <Button variant="secondary" onClick={() => setCancelModalOpen(false)}>
            Keep Order
          </Button>
          <Button variant="danger" loading={cancelling} onClick={handleConfirmCancel}>
            Yes, Cancel Order
          </Button>
        </div>
      </Modal>
    </div>
  );
};

export default AdminOrders;
