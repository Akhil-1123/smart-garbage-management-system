import React, { useState, useEffect } from 'react';
import {
  CreditCard,
  CheckCircle2,
  Calendar,
  AlertTriangle,
  Sparkles,
  ShieldCheck,
  Check,
  XCircle,
  Clock
} from 'lucide-react';
import api from '../../api/axios';
import { useToast } from '../../context/ToastContext';
import Card from '../../components/Card';
import Button from '../../components/Button';
import Badge from '../../components/Badge';
import Modal from '../../components/Modal';
import Spinner from '../../components/Spinner';

const SubscriptionPage = () => {
  const { showToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [plans, setPlans] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [activeSub, setActiveSub] = useState(null);

  // Payment modal state
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('card');
  const [processingPayment, setProcessingPayment] = useState(false);

  // Cancel modal state
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const fetchData = async () => {
    try {
      const [plansRes, subsRes] = await Promise.all([
        api.get('/subscription-plans'),
        api.get('/subscriptions/my')
      ]);

      if (plansRes.data?.data) {
        setPlans(plansRes.data.data);
      }

      if (subsRes.data?.data) {
        const list = subsRes.data.data;
        setSubscriptions(list);
        const current = list.find((s) => s.is_current || s.status === 'active');
        if (current) {
          const daysLeft = Math.max(
            0,
            Math.ceil((new Date(current.end_date) - new Date()) / (1000 * 60 * 60 * 24))
          );
          setActiveSub({ ...current, daysLeft });
        } else {
          setActiveSub(null);
        }
      }
    } catch (err) {
      showToast('Error loading subscription details', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Initiate Subscribe flow
  const handleOpenSubscribe = (plan) => {
    setSelectedPlan(plan);
    setPaymentMethod('upi');
    setPaymentModalOpen(true);
  };

  // Submit Mock Payment & Subscribe
  const handleProcessPayment = async () => {
    if (!selectedPlan) return;

    setProcessingPayment(true);
    // Fake 1-second spinner as requested
    setTimeout(async () => {
      try {
        await api.post('/subscriptions', {
          plan_id: selectedPlan.id,
          payment_method: paymentMethod
        });
        showToast(`Successfully subscribed to ${selectedPlan.name}!`, 'success');
        setPaymentModalOpen(false);
        setSelectedPlan(null);
        fetchData();
      } catch (err) {
        showToast(err.response?.data?.message || 'Payment failed. Please try again.', 'error');
      } finally {
        setProcessingPayment(false);
      }
    }, 1000);
  };

  // Handle Cancel Subscription
  const handleConfirmCancel = async () => {
    if (!activeSub) return;
    setCancelling(true);
    try {
      await api.put(`/subscriptions/${activeSub.id}/cancel`);
      showToast('Subscription cancelled successfully.', 'success');
      setCancelModalOpen(false);
      fetchData();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to cancel subscription', 'error');
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Header */}
      <div>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text)' }}>
          Waste Collection Subscriptions
        </h2>
        <p style={{ color: 'var(--muted)', fontSize: '0.9rem', marginTop: '0.2rem' }}>
          Subscribe to enjoy hassle-free, door-to-door biodegradable solid waste pickups.
        </p>
      </div>

      {/* Active Subscription Banner Card */}
      {activeSub ? (
        <Card
          style={{
            background: 'linear-gradient(135deg, #ffffff 0%, #f4fbf6 100%)',
            border: '1.5px solid var(--primary-soft)',
            padding: '2rem'
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              flexWrap: 'wrap',
              gap: '1.25rem'
            }}
          >
            <div>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  color: 'var(--primary)',
                  background: 'var(--primary-soft)',
                  padding: '0.25rem 0.65rem',
                  borderRadius: 12,
                  marginBottom: '0.65rem'
                }}
              >
                <ShieldCheck size={16} />
                <span>ACTIVE SUBSCRIPTION</span>
              </div>
              <h3 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text)' }}>
                {activeSub.plan_name}
              </h3>
              <p style={{ color: 'var(--muted)', fontSize: '0.92rem', marginTop: '0.25rem' }}>
                Unlimited scheduled pickups • Priority morning dispatch
              </p>
            </div>

            <Button
              variant="danger"
              size="sm"
              onClick={() => setCancelModalOpen(true)}
              icon={<XCircle size={16} />}
            >
              Cancel Plan
            </Button>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
              gap: '1.25rem',
              marginTop: '1.75rem',
              paddingTop: '1.5rem',
              borderTop: '1px solid #e7f0ea'
            }}
          >
            <div>
              <div style={{ fontSize: '0.78rem', color: 'var(--muted)', textTransform: 'uppercase' }}>
                Start Date
              </div>
              <div style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text)', marginTop: '0.2rem' }}>
                {new Date(activeSub.start_date).toLocaleDateString()}
              </div>
            </div>

            <div>
              <div style={{ fontSize: '0.78rem', color: 'var(--muted)', textTransform: 'uppercase' }}>
                Renewal / End Date
              </div>
              <div style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text)', marginTop: '0.2rem' }}>
                {new Date(activeSub.end_date).toLocaleDateString()}
              </div>
            </div>

            <div>
              <div style={{ fontSize: '0.78rem', color: 'var(--muted)', textTransform: 'uppercase' }}>
                Days Left
              </div>
              <div style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--primary)', marginTop: '0.2rem' }}>
                {activeSub.daysLeft} days
              </div>
            </div>

            <div>
              <div style={{ fontSize: '0.78rem', color: 'var(--muted)', textTransform: 'uppercase' }}>
                Plan Amount
              </div>
              <div style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text)', marginTop: '0.2rem' }}>
                ₹{Number(activeSub.amount).toFixed(2)}
              </div>
            </div>
          </div>
        </Card>
      ) : (
        <Card
          style={{
            padding: '1.75rem',
            background: 'var(--warning-soft)',
            border: '1px solid #f9e2ba',
            display: 'flex',
            alignItems: 'center',
            gap: '1rem'
          }}
        >
          <AlertTriangle size={32} color="#b45309" style={{ flexShrink: 0 }} />
          <div>
            <h4 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#92400e' }}>
              No Active Collection Plan
            </h4>
            <p style={{ fontSize: '0.88rem', color: '#b45309', marginTop: '0.2rem' }}>
              You need an active subscription before requesting waste collections. Select a plan below to activate your account.
            </p>
          </div>
        </Card>
      )}

      {/* Available Plans Section */}
      <div>
        <div style={{ marginBottom: '1.25rem' }}>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text)' }}>
            Available Plans
          </h3>
          <p style={{ color: 'var(--muted)', fontSize: '0.88rem' }}>
            Choose a recurring subscription plan that matches your household waste needs.
          </p>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '1.5rem'
          }}
        >
          {plans.map((p) => {
            const isCurrent = activeSub && activeSub.plan_id === p.id;
            return (
              <Card
                key={p.id}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  padding: '2rem',
                  border: isCurrent ? '2px solid var(--primary)' : '1px solid var(--border)',
                  position: 'relative'
                }}
              >
                {isCurrent && (
                  <span
                    style={{
                      position: 'absolute',
                      top: 16,
                      right: 16,
                      background: 'var(--primary-soft)',
                      color: 'var(--primary)',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      padding: '0.25rem 0.65rem',
                      borderRadius: 12
                    }}
                  >
                    Current Plan
                  </span>
                )}

                <h4 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text)' }}>
                  {p.name}
                </h4>

                <div style={{ margin: '1rem 0' }}>
                  <span style={{ fontSize: '2.2rem', fontWeight: 800, color: 'var(--primary)' }}>
                    ₹{Number(p.price).toFixed(0)}
                  </span>
                  <span style={{ fontSize: '0.85rem', color: 'var(--muted)', fontWeight: 500 }}>
                    {' '}/ {p.duration_days} days
                  </span>
                </div>

                <p style={{ fontSize: '0.9rem', color: 'var(--muted)', lineHeight: 1.5, marginBottom: '1.5rem', flex: 1 }}>
                  {p.description || 'Full door-to-door municipal solid waste collection.'}
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginBottom: '1.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
                    <Check size={16} color="var(--primary)" />
                    <span>Regular door-to-door pickups</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
                    <Check size={16} color="var(--primary)" />
                    <span>Smart bin fill tracking</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
                    <Check size={16} color="var(--primary)" />
                    <span>Composting batch contributions</span>
                  </div>
                </div>

                <Button
                  variant={isCurrent ? 'secondary' : 'primary'}
                  block
                  disabled={isCurrent}
                  onClick={() => handleOpenSubscribe(p)}
                >
                  {isCurrent ? 'Active Plan' : 'Subscribe Now'}
                </Button>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Subscription History Table */}
      <Card style={{ padding: '1.75rem' }}>
        <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text)', marginBottom: '1rem' }}>
          Subscription History
        </h3>

        {subscriptions.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem 0', color: 'var(--muted)' }}>
            No subscriptions purchased yet.
          </div>
        ) : (
          <div className="table-responsive">
            <table className="sgms-table">
              <thead>
                <tr>
                  <th>Plan</th>
                  <th>Start Date</th>
                  <th>End Date</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Purchased On</th>
                </tr>
              </thead>
              <tbody>
                {subscriptions.map((sub) => (
                  <tr key={sub.id}>
                    <td>
                      <strong>{sub.plan_name}</strong>
                    </td>
                    <td>{new Date(sub.start_date).toLocaleDateString()}</td>
                    <td>{new Date(sub.end_date).toLocaleDateString()}</td>
                    <td>₹{Number(sub.amount).toFixed(2)}</td>
                    <td>
                      <Badge status={sub.status} />
                    </td>
                    <td style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>
                      {new Date(sub.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Mock Payment Modal */}
      <Modal
        isOpen={paymentModalOpen}
        onClose={() => !processingPayment && setPaymentModalOpen(false)}
        title="Complete Subscription Payment"
        maxWidth="460px"
      >
        {selectedPlan && (
          <div>
            <div
              style={{
                background: 'var(--primary-soft)',
                padding: '1.25rem',
                borderRadius: 'var(--radius-sm)',
                marginBottom: '1.5rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <div>
                <div style={{ fontSize: '0.82rem', color: 'var(--primary)', fontWeight: 600 }}>
                  Selected Plan
                </div>
                <div style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text)' }}>
                  {selectedPlan.name}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--primary)' }}>
                  ₹{Number(selectedPlan.price).toFixed(2)}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>
                  {selectedPlan.duration_days} days validity
                </div>
              </div>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label className="form-label" style={{ marginBottom: '0.65rem', display: 'block' }}>
                Choose Payment Method
              </label>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    padding: '0.75rem 1rem',
                    borderRadius: 'var(--radius-sm)',
                    border: paymentMethod === 'upi' ? '2px solid var(--primary)' : '1px solid var(--border)',
                    background: paymentMethod === 'upi' ? '#f4fbf6' : 'var(--input-bg)',
                    cursor: 'pointer'
                  }}
                >
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="upi"
                    checked={paymentMethod === 'upi'}
                    onChange={() => setPaymentMethod('upi')}
                  />
                  <span style={{ fontWeight: 600, fontSize: '0.92rem' }}>UPI (Google Pay, PhonePe, Paytm)</span>
                </label>

                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    padding: '0.75rem 1rem',
                    borderRadius: 'var(--radius-sm)',
                    border: paymentMethod === 'card' ? '2px solid var(--primary)' : '1px solid var(--border)',
                    background: paymentMethod === 'card' ? '#f4fbf6' : 'var(--input-bg)',
                    cursor: 'pointer'
                  }}
                >
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="card"
                    checked={paymentMethod === 'card'}
                    onChange={() => setPaymentMethod('card')}
                  />
                  <span style={{ fontWeight: 600, fontSize: '0.92rem' }}>Credit / Debit Card (Visa, MasterCard)</span>
                </label>

                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    padding: '0.75rem 1rem',
                    borderRadius: 'var(--radius-sm)',
                    border: paymentMethod === 'wallet' ? '2px solid var(--primary)' : '1px solid var(--border)',
                    background: paymentMethod === 'wallet' ? '#f4fbf6' : 'var(--input-bg)',
                    cursor: 'pointer'
                  }}
                >
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="wallet"
                    checked={paymentMethod === 'wallet'}
                    onChange={() => setPaymentMethod('wallet')}
                  />
                  <span style={{ fontWeight: 600, fontSize: '0.92rem' }}>Digital Wallet</span>
                </label>
              </div>
            </div>

            <div style={{ fontSize: '0.78rem', color: 'var(--muted)', marginBottom: '1.25rem', textAlign: 'center' }}>
              🔒 Mock payment simulation with instant transaction authorization.
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <Button
                variant="secondary"
                disabled={processingPayment}
                onClick={() => setPaymentModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                loading={processingPayment}
                onClick={handleProcessPayment}
              >
                Pay ₹{Number(selectedPlan.price).toFixed(2)} Now
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Cancel Subscription Confirmation Modal */}
      <Modal
        isOpen={cancelModalOpen}
        onClose={() => setCancelModalOpen(false)}
        title="Cancel Active Subscription"
        maxWidth="440px"
      >
        <p style={{ color: 'var(--muted)', fontSize: '0.92rem', marginBottom: '1.25rem' }}>
          Are you sure you want to cancel your <strong>{activeSub?.plan_name}</strong>?
          Door-to-door collections will be paused once the subscription is terminated.
        </p>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
          <Button variant="secondary" onClick={() => setCancelModalOpen(false)}>
            Keep Plan
          </Button>
          <Button variant="danger" loading={cancelling} onClick={handleConfirmCancel}>
            Yes, Cancel Plan
          </Button>
        </div>
      </Modal>
    </div>
  );
};

export default SubscriptionPage;
