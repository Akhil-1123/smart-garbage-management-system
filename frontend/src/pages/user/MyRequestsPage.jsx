import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Clock,
  Send,
  Truck,
  Scale,
  Star,
  XCircle,
  CheckCircle2,
  AlertCircle,
  History,
  Phone,
  FileText,
  Plus
} from 'lucide-react';
import api from '../../api/axios';
import { useToast } from '../../context/ToastContext';
import Card from '../../components/Card';
import Button from '../../components/Button';
import Badge from '../../components/Badge';
import Modal from '../../components/Modal';
import Stepper from '../../components/Stepper';
import Spinner from '../../components/Spinner';
import EmptyState from '../../components/EmptyState';

const STATUS_FILTERS = [
  { key: 'all', label: 'All Requests' },
  { key: 'pending', label: 'Pending' },
  { key: 'approved', label: 'Approved' },
  { key: 'driver_assigned', label: 'Driver Assigned' },
  { key: 'collected', label: 'Collected' },
  { key: 'cancelled', label: 'Cancelled' }
];

const COLLECTION_STEPS = [
  'Pending',
  'Approved',
  'Driver Assigned',
  'Collected'
];

const getStepIndex = (status) => {
  switch (status) {
    case 'pending': return 0;
    case 'approved': return 1;
    case 'driver_assigned': return 2;
    case 'collected': return 3;
    default: return -1;
  }
};

const MyRequestsPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState(() =>
    location.pathname.includes('/history') ? 'history' : 'requests'
  );
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState([]);
  const [rateableIds, setRateableIds] = useState(new Set());

  // Cancel modal state
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [requestToCancel, setRequestToCancel] = useState(null);
  const [cancelling, setCancelling] = useState(false);

  // Rating / Feedback modal state
  const [ratingModalOpen, setRatingModalOpen] = useState(false);
  const [ratingTargetRequest, setRatingTargetRequest] = useState(null);
  const [ratingScore, setRatingScore] = useState(5);
  const [ratingComment, setRatingComment] = useState('');
  const [submittingRating, setSubmittingRating] = useState(false);

  const fetchRequests = async () => {
    try {
      const [reqRes, rateableRes] = await Promise.all([
        api.get('/collections/my'),
        api.get('/feedback/rateable')
      ]);

      if (reqRes.data?.data) {
        setRequests(reqRes.data.data);
      }
      if (rateableRes.data?.data) {
        const ids = new Set(rateableRes.data.data.map((r) => r.id));
        setRateableIds(ids);
      }
    } catch (err) {
      showToast('Could not load requests', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  // Update tab if location changed
  useEffect(() => {
    if (location.pathname.includes('/history')) {
      setActiveTab('history');
    }
  }, [location.pathname]);

  // Cancel request flow
  const handleOpenCancel = (req) => {
    setRequestToCancel(req);
    setCancelModalOpen(true);
  };

  const handleConfirmCancel = async () => {
    if (!requestToCancel) return;
    setCancelling(true);
    try {
      await api.put(`/collections/${requestToCancel.id}/cancel`);
      showToast(`Request #${requestToCancel.id} has been cancelled`, 'success');
      setCancelModalOpen(false);
      setRequestToCancel(null);
      fetchRequests();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to cancel request', 'error');
    } finally {
      setCancelling(false);
    }
  };

  // Rating flow
  const handleOpenRating = (req) => {
    setRatingTargetRequest(req);
    setRatingScore(5);
    setRatingComment('');
    setRatingModalOpen(true);
  };

  const handleSubmitRating = async (e) => {
    e.preventDefault();
    if (!ratingTargetRequest) return;

    setSubmittingRating(true);
    try {
      await api.post('/feedback', {
        type: 'feedback',
        collection_id: ratingTargetRequest.id,
        rating: ratingScore,
        message: ratingComment.trim() || undefined
      });

      showToast('Thank you! Your rating has been submitted.', 'success');
      // Remove from rateable set immediately
      setRateableIds((prev) => {
        const next = new Set(prev);
        next.delete(ratingTargetRequest.id);
        return next;
      });
      setRatingModalOpen(false);
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to submit rating', 'error');
    } finally {
      setSubmittingRating(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 320 }}>
        <Spinner size="lg" />
      </div>
    );
  }

  // Filter requests
  const filteredRequests = requests.filter((r) => {
    if (selectedFilter === 'all') return true;
    return r.status === selectedFilter;
  });

  const collectedRequests = requests.filter((r) => r.status === 'collected');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      {/* Top Header */}
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
            Collection Requests & Dispatches
          </h2>
          <p style={{ color: 'var(--muted)', fontSize: '0.9rem', marginTop: '0.2rem' }}>
            Monitor real-time pickup status, vehicle dispatches, and driver ratings.
          </p>
        </div>

        <Button
          variant="primary"
          onClick={() => navigate('/app/request')}
          icon={<Plus size={16} />}
        >
          New Collection Request
        </Button>
      </div>

      {/* Main Mode Tabs: Active Requests vs History */}
      <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.25rem' }}>
        <button
          onClick={() => setActiveTab('requests')}
          style={{
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'requests' ? '3px solid var(--primary)' : '3px solid transparent',
            padding: '0.65rem 1.25rem',
            fontWeight: 700,
            fontSize: '0.95rem',
            color: activeTab === 'requests' ? 'var(--primary)' : 'var(--muted)',
            cursor: 'pointer',
            transition: 'var(--transition)'
          }}
        >
          All Requests ({requests.length})
        </button>

        <button
          onClick={() => setActiveTab('history')}
          style={{
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'history' ? '3px solid var(--primary)' : '3px solid transparent',
            padding: '0.65rem 1.25rem',
            fontWeight: 700,
            fontSize: '0.95rem',
            color: activeTab === 'history' ? 'var(--primary)' : 'var(--muted)',
            cursor: 'pointer',
            transition: 'var(--transition)'
          }}
        >
          Collection History ({collectedRequests.length})
        </button>
      </div>

      {/* TAB 1: ALL REQUESTS */}
      {activeTab === 'requests' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Status Filter Chips Row */}
          <div
            style={{
              display: 'flex',
              gap: '0.5rem',
              overflowX: 'auto',
              paddingBottom: '0.25rem'
            }}
          >
            {STATUS_FILTERS.map((f) => (
              <button
                key={f.key}
                onClick={() => setSelectedFilter(f.key)}
                style={{
                  padding: '0.45rem 1rem',
                  borderRadius: 20,
                  fontSize: '0.85rem',
                  fontWeight: 600,
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

          {/* Request Cards Grid */}
          {filteredRequests.length === 0 ? (
            <Card style={{ padding: '3.5rem 1.5rem', textAlign: 'center' }}>
              <EmptyState
                icon={<Clock size={48} strokeWidth={1.5} color="var(--primary)" />}
                title="No Requests Found"
                message={
                  selectedFilter === 'all'
                    ? 'You have not submitted any collection requests yet.'
                    : `No requests with status "${selectedFilter}".`
                }
                action={
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={() => navigate('/app/request')}
                    icon={<Send size={14} />}
                  >
                    Request Collection
                  </Button>
                }
              />
            </Card>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {filteredRequests.map((req) => {
                const stepIdx = getStepIndex(req.status);
                const isCancellable = ['pending', 'approved', 'driver_assigned'].includes(req.status);
                const isRateable = req.status === 'collected' && rateableIds.has(req.id);

                return (
                  <Card key={req.id} style={{ padding: '1.75rem', position: 'relative' }}>
                    {/* Header info */}
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        flexWrap: 'wrap',
                        gap: '0.75rem',
                        marginBottom: '1rem'
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text)' }}>
                            Request #{req.id}
                          </h3>
                          <Badge status={req.status} />
                        </div>

                        <div style={{ fontSize: '0.82rem', color: 'var(--muted)', marginTop: '0.25rem' }}>
                          Requested on {new Date(req.requested_at).toLocaleString()} • Waste Type: <strong>{req.waste_type || 'organic'}</strong>
                        </div>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text)', marginTop: '0.25rem' }}>
                          📍 {req.address || req.bin_location || 'Designated bin location'}
                        </div>
                      </div>

                      {/* Top Action Buttons */}
                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        {isRateable && (
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => handleOpenRating(req)}
                            icon={<Star size={14} color="#f0a830" />}
                          >
                            Rate this service
                          </Button>
                        )}

                        {isCancellable && (
                          <Button
                            size="sm"
                            variant="danger"
                            onClick={() => handleOpenCancel(req)}
                            icon={<XCircle size={14} />}
                          >
                            Cancel
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Stepper (Lifecycle) */}
                    {req.status === 'cancelled' ? (
                      <div
                        style={{
                          background: 'var(--danger-soft)',
                          color: 'var(--danger)',
                          padding: '0.75rem 1rem',
                          borderRadius: 'var(--radius-sm)',
                          fontSize: '0.88rem',
                          fontWeight: 600,
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          margin: '1rem 0'
                        }}
                      >
                        <AlertCircle size={16} />
                        <span>This request was cancelled before collection.</span>
                      </div>
                    ) : (
                      <div style={{ margin: '1.25rem 0 0.75rem' }}>
                        <Stepper steps={COLLECTION_STEPS} currentStep={stepIdx} />
                      </div>
                    )}

                    {/* Operational Details (Driver & Weight) */}
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                        gap: '1rem',
                        marginTop: '1.25rem',
                        paddingTop: '1rem',
                        borderTop: '1px solid #f0f4f2',
                        background: '#fafcfb',
                        padding: '1rem',
                        borderRadius: 'var(--radius-sm)'
                      }}
                    >
                      {/* Driver Information */}
                      <div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--muted)', textTransform: 'uppercase', fontWeight: 600 }}>
                          Assigned Driver & Vehicle
                        </div>
                        {req.driver_name ? (
                          <div style={{ marginTop: '0.35rem' }}>
                            <div style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--text)' }}>
                              {req.driver_name}
                            </div>
                            <div style={{ fontSize: '0.78rem', color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                              <Truck size={12} /> {req.vehicle_no || 'Municipal Vehicle'} • <Phone size={12} /> {req.driver_phone || 'Contact via dispatcher'}
                            </div>
                          </div>
                        ) : (
                          <div style={{ fontSize: '0.85rem', color: 'var(--muted)', marginTop: '0.2rem' }}>
                            Waiting for driver dispatch
                          </div>
                        )}
                      </div>

                      {/* Weight Log */}
                      <div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--muted)', textTransform: 'uppercase', fontWeight: 600 }}>
                          Logged Waste Weight
                        </div>
                        {req.weight_kg !== null && req.weight_kg !== undefined ? (
                          <div style={{ marginTop: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <Scale size={18} color="var(--primary)" />
                            <span style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--primary)' }}>
                              {Number(req.weight_kg).toFixed(2)} kg
                            </span>
                          </div>
                        ) : (
                          <div style={{ fontSize: '0.85rem', color: 'var(--muted)', marginTop: '0.2rem' }}>
                            Pending driver scale verification
                          </div>
                        )}
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: COLLECTION HISTORY TABLE */}
      {activeTab === 'history' && (
        <Card style={{ padding: '1.75rem' }}>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text)', marginBottom: '1rem' }}>
            Completed Collections Ledger
          </h3>

          {collectedRequests.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2.5rem 0', color: 'var(--muted)' }}>
              No completed waste collections yet.
            </div>
          ) : (
            <div className="table-responsive">
              <table className="sgms-table">
                <thead>
                  <tr>
                    <th>Req #</th>
                    <th>Date Collected</th>
                    <th>Bin Location</th>
                    <th>Waste Type</th>
                    <th>Driver & Vehicle</th>
                    <th>Weight</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {collectedRequests.map((c) => (
                    <tr key={c.id}>
                      <td><strong>#{c.id}</strong></td>
                      <td>{c.collected_at ? new Date(c.collected_at).toLocaleDateString() : new Date(c.requested_at).toLocaleDateString()}</td>
                      <td>{c.address || c.bin_location || 'Home Bin'}</td>
                      <td style={{ textTransform: 'capitalize' }}>{c.waste_type || 'organic'}</td>
                      <td>{c.driver_name ? `${c.driver_name} (${c.vehicle_no})` : 'Assigned Driver'}</td>
                      <td>
                        <strong style={{ color: 'var(--primary)' }}>
                          {c.weight_kg ? `${Number(c.weight_kg).toFixed(2)} kg` : '—'}
                        </strong>
                      </td>
                      <td>
                        <Badge status={c.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* Cancel Confirmation Modal */}
      <Modal
        isOpen={cancelModalOpen}
        onClose={() => setCancelModalOpen(false)}
        title="Cancel Collection Request"
        maxWidth="440px"
      >
        <p style={{ color: 'var(--muted)', fontSize: '0.92rem', marginBottom: '1.25rem' }}>
          Are you sure you want to cancel collection request <strong>#{requestToCancel?.id}</strong>? If a driver has already been assigned, they will be notified of the cancellation.
        </p>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
          <Button variant="secondary" onClick={() => setCancelModalOpen(false)}>
            Keep Request
          </Button>
          <Button variant="danger" loading={cancelling} onClick={handleConfirmCancel}>
            Yes, Cancel Request
          </Button>
        </div>
      </Modal>

      {/* Rate This Service Modal */}
      <Modal
        isOpen={ratingModalOpen}
        onClose={() => setRatingModalOpen(false)}
        title={`Rate Service: Request #${ratingTargetRequest?.id}`}
        maxWidth="480px"
      >
        <form onSubmit={handleSubmitRating}>
          <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
            <label className="form-label" style={{ marginBottom: '0.65rem', display: 'block' }}>
              How satisfied are you with this collection?
            </label>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem' }}>
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRatingScore(star)}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '0.25rem',
                    color: star <= ratingScore ? '#f59e0b' : '#cbd5e1',
                    transition: 'transform 0.15s ease'
                  }}
                >
                  <Star size={32} fill={star <= ratingScore ? '#f59e0b' : 'none'} strokeWidth={1.5} />
                </button>
              ))}
            </div>
            <span style={{ fontSize: '0.85rem', color: 'var(--muted)', marginTop: '0.35rem', display: 'block' }}>
              {ratingScore === 5 ? 'Excellent Service!' : ratingScore === 4 ? 'Good Service' : ratingScore === 3 ? 'Average' : 'Needs Improvement'}
            </span>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="ratingComment">
              Comments or Driver Feedback (Optional)
            </label>
            <textarea
              id="ratingComment"
              rows={3}
              className="form-textarea"
              value={ratingComment}
              onChange={(e) => setRatingComment(e.target.value)}
              placeholder="e.g. Driver arrived promptly and handled the bin carefully."
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
            <Button variant="secondary" onClick={() => setRatingModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={submittingRating}>
              Submit Feedback
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default MyRequestsPage;
