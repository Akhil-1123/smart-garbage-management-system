import React, { useState, useEffect } from 'react';
import {
  MessageSquare,
  AlertTriangle,
  Star,
  Send,
  User,
  Truck,
  CheckCircle2,
  Clock,
  Filter
} from 'lucide-react';
import api from '../../api/axios';
import { useToast } from '../../context/ToastContext';
import Card from '../../components/Card';
import Badge from '../../components/Badge';
import Button from '../../components/Button';
import Modal from '../../components/Modal';
import Spinner from '../../components/Spinner';
import EmptyState from '../../components/EmptyState';

const AdminFeedback = () => {
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState('complaint'); // 'complaint' | 'feedback'
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'open' | 'in_progress' | 'resolved'

  // Modal State for Responding
  const [respondModalOpen, setRespondModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [responseStatus, setResponseStatus] = useState('resolved');
  const [responseText, setResponseText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchFeedback = async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/feedback');
      if (res.data?.data) {
        setItems(res.data.data);
      }
    } catch (err) {
      showToast('Could not load feedback and complaints', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFeedback();
  }, []);

  const openRespondModal = (item) => {
    setSelectedItem(item);
    setResponseStatus(item.status || 'resolved');
    setResponseText(item.admin_response || '');
    setRespondModalOpen(true);
  };

  const handleRespondSubmit = async (e) => {
    e.preventDefault();
    if (!selectedItem) return;

    setSubmitting(true);
    try {
      await api.put(`/admin/feedback/${selectedItem.id}`, {
        status: responseStatus,
        admin_response: responseText
      });
      showToast('Response submitted and citizen notified', 'success');
      setRespondModalOpen(false);
      fetchFeedback();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to submit response', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Filter items by active tab and status
  const currentTabItems = items.filter((item) => item.type === activeTab);
  const filteredItems = currentTabItems.filter((item) => {
    if (statusFilter === 'all') return true;
    return item.status === statusFilter;
  });

  const feedbackCount = items.filter((i) => i.type === 'feedback').length;
  const complaintCount = items.filter((i) => i.type === 'complaint').length;
  const openComplaintsCount = items.filter(
    (i) => i.type === 'complaint' && (i.status === 'open' || i.status === 'in_progress')
  ).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      {/* Page Header */}
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
            Feedback & Complaints Desk
          </h2>
          <p style={{ color: 'var(--muted)', fontSize: '0.9rem', marginTop: '0.2rem' }}>
            Review driver performance ratings and address citizen grievances.
          </p>
        </div>

        {/* Tab Switcher */}
        <div
          style={{
            display: 'flex',
            gap: '0.5rem',
            background: '#ffffff',
            padding: 4,
            borderRadius: 12,
            border: '1px solid var(--border)'
          }}
        >
          <button
            onClick={() => {
              setActiveTab('complaint');
              setStatusFilter('all');
            }}
            style={{
              padding: '0.5rem 1.1rem',
              borderRadius: 8,
              fontSize: '0.88rem',
              fontWeight: 700,
              border: 'none',
              background: activeTab === 'complaint' ? 'var(--primary)' : 'transparent',
              color: activeTab === 'complaint' ? '#ffffff' : 'var(--muted)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              transition: 'var(--transition)'
            }}
          >
            <AlertTriangle size={16} />
            Complaints ({complaintCount})
            {openComplaintsCount > 0 && (
              <span
                style={{
                  background: activeTab === 'complaint' ? '#ffffff' : 'var(--danger)',
                  color: activeTab === 'complaint' ? 'var(--danger)' : '#ffffff',
                  fontSize: '0.72rem',
                  padding: '0.1rem 0.45rem',
                  borderRadius: 10,
                  fontWeight: 800
                }}
              >
                {openComplaintsCount}
              </span>
            )}
          </button>

          <button
            onClick={() => {
              setActiveTab('feedback');
              setStatusFilter('all');
            }}
            style={{
              padding: '0.5rem 1.1rem',
              borderRadius: 8,
              fontSize: '0.88rem',
              fontWeight: 700,
              border: 'none',
              background: activeTab === 'feedback' ? 'var(--primary)' : 'transparent',
              color: activeTab === 'feedback' ? '#ffffff' : 'var(--muted)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              transition: 'var(--transition)'
            }}
          >
            <Star size={16} />
            Feedback ({feedbackCount})
          </button>
        </div>
      </div>

      {/* Filter Chips Bar */}
      <Card style={{ padding: '1rem 1.5rem' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '1rem'
          }}
        >
          <span style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text)' }}>
            Showing {filteredItems.length} {activeTab === 'complaint' ? 'complaints' : 'reviews'}
          </span>

          <div
            style={{
              display: 'flex',
              gap: '0.5rem',
              background: '#f8faf9',
              padding: 4,
              borderRadius: 10,
              border: '1px solid var(--border)'
            }}
          >
            {['all', 'open', 'in_progress', 'resolved'].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                style={{
                  padding: '0.35rem 0.75rem',
                  borderRadius: 6,
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  border: 'none',
                  background: statusFilter === st ? 'var(--primary)' : 'transparent',
                  color: statusFilter === st ? '#ffffff' : 'var(--muted)',
                  cursor: 'pointer',
                  textTransform: 'capitalize',
                  transition: 'var(--transition)'
                }}
              >
                {st.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {/* Content Table */}
      <Card style={{ padding: '1.75rem' }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
            <Spinner size="lg" />
          </div>
        ) : filteredItems.length === 0 ? (
          <EmptyState
            icon={
              activeTab === 'complaint' ? (
                <CheckCircle2 size={48} strokeWidth={1.5} color="var(--primary)" />
              ) : (
                <Star size={48} strokeWidth={1.5} color="var(--warning)" />
              )
            }
            title={activeTab === 'complaint' ? 'No Complaints Found' : 'No Feedback Found'}
            message={
              statusFilter !== 'all'
                ? `No ${activeTab} records match the "${statusFilter.replace('_', ' ')}" status.`
                : `No citizen ${activeTab} submissions recorded in this category yet.`
            }
          />
        ) : (
          <div className="table-responsive">
            <table className="sgms-table">
              <thead>
                <tr>
                  <th>Ticket / Date</th>
                  <th>Citizen</th>
                  <th>Driver</th>
                  {activeTab === 'feedback' && <th>Rating</th>}
                  <th>Message</th>
                  <th>Admin Response</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <span style={{ fontWeight: 700, color: 'var(--text)' }}>
                        #{item.id}
                      </span>
                      <div style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>
                        {item.created_at ? new Date(item.created_at).toLocaleDateString() : ''}
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <div
                          style={{
                            width: 30,
                            height: 30,
                            borderRadius: '50%',
                            background: 'var(--primary-soft)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'var(--primary)',
                            fontWeight: 700,
                            fontSize: '0.8rem'
                          }}
                        >
                          {item.user_name ? item.user_name.charAt(0).toUpperCase() : 'U'}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, color: 'var(--text)' }}>
                            {item.user_name}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>
                            {item.user_email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td>
                      {item.driver_name ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                          <Truck size={14} color="var(--primary)" />
                          <span style={{ fontWeight: 600, color: 'var(--text)' }}>
                            {item.driver_name}
                          </span>
                        </div>
                      ) : (
                        <span style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>
                          Not specified
                        </span>
                      )}
                    </td>
                    {activeTab === 'feedback' && (
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              size={15}
                              fill={star <= (item.rating || 0) ? '#f0a830' : 'none'}
                              color={star <= (item.rating || 0) ? '#f0a830' : '#cbd5e1'}
                            />
                          ))}
                          <span
                            style={{
                              marginLeft: '0.35rem',
                              fontWeight: 700,
                              fontSize: '0.85rem',
                              color: 'var(--text)'
                            }}
                          >
                            {item.rating || 0}/5
                          </span>
                        </div>
                      </td>
                    )}
                    <td style={{ maxWidth: 260 }}>
                      <div
                        style={{
                          fontSize: '0.88rem',
                          color: 'var(--text)',
                          lineHeight: 1.4,
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden'
                        }}
                        title={item.message}
                      >
                        {item.message}
                      </div>
                      {item.collection_address && (
                        <div
                          style={{
                            fontSize: '0.75rem',
                            color: 'var(--muted)',
                            marginTop: '0.2rem'
                          }}
                        >
                          Pickup: {item.collection_address}
                        </div>
                      )}
                    </td>
                    <td style={{ maxWidth: 220 }}>
                      {item.admin_response ? (
                        <div
                          style={{
                            fontSize: '0.82rem',
                            color: 'var(--primary)',
                            background: 'var(--primary-soft)',
                            padding: '0.35rem 0.6rem',
                            borderRadius: 'var(--radius-sm)',
                            lineHeight: 1.3
                          }}
                          title={item.admin_response}
                        >
                          {item.admin_response}
                        </div>
                      ) : (
                        <span
                          style={{
                            fontSize: '0.8rem',
                            color: 'var(--muted)',
                            fontStyle: 'italic'
                          }}
                        >
                          No response yet
                        </span>
                      )}
                    </td>
                    <td>
                      <Badge status={item.status || 'open'} />
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <Button
                        size="sm"
                        variant={item.admin_response ? 'secondary' : 'primary'}
                        onClick={() => openRespondModal(item)}
                      >
                        {item.admin_response ? 'Edit Response' : 'Respond'}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Respond Modal */}
      {respondModalOpen && selectedItem && (
        <Modal
          title={`Respond to ${selectedItem.type === 'complaint' ? 'Complaint' : 'Feedback'} #${selectedItem.id}`}
          isOpen={respondModalOpen}
          onClose={() => setRespondModalOpen(false)}
        >
          <form
            onSubmit={handleRespondSubmit}
            style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}
          >
            {/* Citizen Inquiry Details */}
            <div
              style={{
                background: '#f8faf9',
                padding: '1rem',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border)'
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginBottom: '0.5rem'
                }}
              >
                <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text)' }}>
                  From: {selectedItem.user_name} ({selectedItem.user_email})
                </div>
                {selectedItem.rating && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        size={14}
                        fill={star <= selectedItem.rating ? '#f0a830' : 'none'}
                        color={star <= selectedItem.rating ? '#f0a830' : '#cbd5e1'}
                      />
                    ))}
                  </div>
                )}
              </div>
              <div
                style={{
                  fontSize: '0.88rem',
                  color: 'var(--text)',
                  lineHeight: 1.4,
                  whiteSpace: 'pre-wrap'
                }}
              >
                "{selectedItem.message}"
              </div>
            </div>

            {/* Status Selection */}
            <div>
              <label
                style={{
                  display: 'block',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  marginBottom: '0.35rem',
                  color: 'var(--text)'
                }}
              >
                Ticket Status
              </label>
              <select
                value={responseStatus}
                onChange={(e) => setResponseStatus(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.6rem 0.8rem',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border)',
                  background: 'var(--input-bg)',
                  fontSize: '0.9rem'
                }}
              >
                <option value="open">Open (Under Review)</option>
                <option value="in_progress">In Progress (Action Initiated)</option>
                <option value="resolved">Resolved (Grievance Addressed)</option>
              </select>
            </div>

            {/* Admin Response Textarea */}
            <div>
              <label
                style={{
                  display: 'block',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  marginBottom: '0.35rem',
                  color: 'var(--text)'
                }}
              >
                Municipal Admin Response
              </label>
              <textarea
                rows={4}
                required
                placeholder="Write resolution notes or citizen response..."
                value={responseText}
                onChange={(e) => setResponseText(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border)',
                  background: 'var(--input-bg)',
                  fontSize: '0.9rem',
                  resize: 'vertical'
                }}
              />
              <span style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: '0.25rem' }}>
                Submitting will send a notification directly to the citizen user.
              </span>
            </div>

            {/* Actions */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '0.75rem',
                marginTop: '0.5rem'
              }}
            >
              <Button
                type="button"
                variant="secondary"
                onClick={() => setRespondModalOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" loading={submitting}>
                Save & Notify Citizen
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};

export default AdminFeedback;
