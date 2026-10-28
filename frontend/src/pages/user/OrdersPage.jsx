import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Package,
  Clock,
  CheckCircle2,
  XCircle,
  Truck,
  CreditCard,
  ShoppingBag,
  ArrowRight,
  Receipt
} from 'lucide-react';
import api from '../../api/axios';
import { useToast } from '../../context/ToastContext';
import Card from '../../components/Card';
import Button from '../../components/Button';
import Badge from '../../components/Badge';
import Modal from '../../components/Modal';
import Spinner from '../../components/Spinner';
import EmptyState from '../../components/EmptyState';

const OrdersPage = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  // Cancel order modal
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [orderToCancel, setOrderToCancel] = useState(null);
  const [cancelling, setCancelling] = useState(false);

  const fetchOrders = async () => {
    try {
      const res = await api.get('/orders/my');
      if (res.data?.data) {
        setOrders(res.data.data);
      }
    } catch (err) {
      showToast('Could not load orders', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const handleOpenCancel = (order) => {
    setOrderToCancel(order);
    setCancelModalOpen(true);
  };

  const handleConfirmCancel = async () => {
    if (!orderToCancel) return;
    setCancelling(true);
    try {
      await api.put(`/orders/${orderToCancel.id}/cancel`);
      showToast(`Order #${orderToCancel.id} has been cancelled and product stock restored.`, 'success');
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
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 320 }}>
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem', maxWidth: 900 }}>
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
            My Compost & Fertilizer Orders
          </h2>
          <p style={{ color: 'var(--muted)', fontSize: '0.9rem', marginTop: '0.2rem' }}>
            Track product dispatch, payments, and delivery fulfillment.
          </p>
        </div>

        <Button
          variant="secondary"
          onClick={() => navigate('/app/marketplace')}
          icon={<ShoppingBag size={16} />}
        >
          Browse Marketplace
        </Button>
      </div>

      {/* Orders List */}
      {orders.length === 0 ? (
        <Card style={{ padding: '3.5rem 1.5rem', textAlign: 'center' }}>
          <EmptyState
            icon={<Package size={48} strokeWidth={1.5} color="var(--primary)" />}
            title="No Orders Placed Yet"
            message="Support local circular composting by purchasing organic fertilizers and bio-nutrients."
            action={
              <Button
                variant="primary"
                onClick={() => navigate('/app/marketplace')}
                icon={<ShoppingBag size={16} />}
              >
                Shop Organic Compost
              </Button>
            }
          />
        </Card>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {orders.map((order) => {
            const isCancellable = ['pending', 'paid'].includes(order.status);
            return (
              <Card key={order.id} style={{ padding: '1.75rem' }}>
                {/* Header row */}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    flexWrap: 'wrap',
                    gap: '0.75rem',
                    borderBottom: '1px solid #f0f4f2',
                    paddingBottom: '1rem',
                    marginBottom: '1rem'
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text)' }}>
                        Order #{order.id}
                      </h3>
                      <Badge status={order.status} />
                    </div>
                    <div style={{ fontSize: '0.82rem', color: 'var(--muted)', marginTop: '0.25rem' }}>
                      Placed on {new Date(order.order_date).toLocaleString()}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--primary)' }}>
                        ₹{Number(order.total_amount).toFixed(2)}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--muted)', textTransform: 'capitalize' }}>
                        {order.payment_method?.toUpperCase()} • {order.payment_status || 'Paid'}
                      </div>
                    </div>

                    {isCancellable && (
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => handleOpenCancel(order)}
                        icon={<XCircle size={14} />}
                      >
                        Cancel
                      </Button>
                    )}
                  </div>
                </div>

                {/* Items list */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginBottom: '1.25rem' }}>
                  {order.items &&
                    order.items.map((item, idx) => (
                      <div
                        key={idx}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '0.5rem 0.75rem',
                          background: 'var(--input-bg)',
                          borderRadius: 'var(--radius-sm)',
                          fontSize: '0.88rem'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{ fontWeight: 700, color: 'var(--primary)' }}>
                            {item.qty}x
                          </span>
                          <span style={{ fontWeight: 600, color: 'var(--text)' }}>
                            {item.product_name}
                          </span>
                        </div>
                        <span style={{ fontWeight: 700, color: 'var(--text)' }}>
                          ₹{(Number(item.price) * item.qty).toFixed(2)}
                        </span>
                      </div>
                    ))}
                </div>

                {/* Delivery and payment footer info */}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '0.75rem',
                    fontSize: '0.8rem',
                    color: 'var(--muted)',
                    borderTop: '1px solid #f0f4f2',
                    paddingTop: '0.75rem'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <Truck size={14} color="var(--primary)" />
                    <span>Shipping to: <strong>{order.shipping_address}</strong></span>
                  </div>

                  {order.transaction_id && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <Receipt size={14} />
                      <span>Txn Ref: <strong>{order.transaction_id}</strong></span>
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Cancel Order Confirmation Modal */}
      <Modal
        isOpen={cancelModalOpen}
        onClose={() => setCancelModalOpen(false)}
        title="Cancel Compost Order"
        maxWidth="440px"
      >
        <p style={{ color: 'var(--muted)', fontSize: '0.92rem', marginBottom: '1.25rem' }}>
          Are you sure you want to cancel order <strong>#{orderToCancel?.id}</strong>? The reserved inventory
          will be restored to the marketplace stock.
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

export default OrdersPage;
