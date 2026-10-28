import React, { useState, useEffect } from 'react';
import {
  MessageSquare,
  AlertTriangle,
  Star,
  CheckCircle2,
  Clock,
  Send,
  HelpCircle,
  ShieldCheck,
  FileText
} from 'lucide-react';
import api from '../../api/axios';
import { useToast } from '../../context/ToastContext';
import Card from '../../components/Card';
import Button from '../../components/Button';
import Badge from '../../components/Badge';
import FormField from '../../components/FormField';
import Spinner from '../../components/Spinner';
import EmptyState from '../../components/EmptyState';

const SupportPage = () => {
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState('complaints'); // 'complaints' | 'feedback'
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState([]);
  const [feedbackList, setFeedbackList] = useState([]);

  // Complaint Form
  const [selectedCollectionId, setSelectedCollectionId] = useState('');
  const [complaintMessage, setComplaintMessage] = useState('');
  const [submittingComplaint, setSubmittingComplaint] = useState(false);
  const [messageError, setMessageError] = useState('');

  const fetchData = async () => {
    try {
      const [reqRes, feedRes] = await Promise.all([
        api.get('/collections/my'),
        api.get('/feedback/my')
      ]);

      if (reqRes.data?.data) {
        setRequests(reqRes.data.data);
      }
      if (feedRes.data?.data) {
        setFeedbackList(feedRes.data.data);
      }
    } catch (err) {
      showToast('Could not load support requests', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSubmitComplaint = async (e) => {
    e.preventDefault();
    if (!complaintMessage.trim()) {
      setMessageError('Complaint message is required.');
      return;
    }
    if (complaintMessage.trim().length < 10) {
      setMessageError('Message must be at least 10 characters long.');
      return;
    }

    setMessageError('');
    setSubmittingComplaint(true);

    try {
      await api.post('/feedback', {
        type: 'complaint',
        collection_id: selectedCollectionId ? Number(selectedCollectionId) : null,
        message: complaintMessage.trim()
      });

      showToast('Grievance ticket submitted. Admin will review shortly.', 'success');
      setComplaintMessage('');
      setSelectedCollectionId('');
      fetchData();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to submit complaint', 'error');
    } finally {
      setSubmittingComplaint(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 320 }}>
        <Spinner size="lg" />
      </div>
    );
  }

  const complaints = feedbackList.filter((f) => f.type === 'complaint');
  const serviceFeedback = feedbackList.filter((f) => f.type === 'feedback');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', maxWidth: 880 }}>
      {/* Header */}
      <div>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text)' }}>
          Citizen Support & Grievance Redressal
        </h2>
        <p style={{ color: 'var(--muted)', fontSize: '0.9rem', marginTop: '0.2rem' }}>
          Report collection issues, vehicle delays, or view feedback given to drivers.
        </p>
      </div>

      {/* Two Tabs Row */}
      <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.25rem' }}>
        <button
          onClick={() => setActiveTab('complaints')}
          style={{
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'complaints' ? '3px solid var(--primary)' : '3px solid transparent',
            padding: '0.65rem 1.25rem',
            fontWeight: 700,
            fontSize: '0.95rem',
            color: activeTab === 'complaints' ? 'var(--primary)' : 'var(--muted)',
            cursor: 'pointer',
            transition: 'var(--transition)'
          }}
        >
          Complaints & Grievances ({complaints.length})
        </button>

        <button
          onClick={() => setActiveTab('feedback')}
          style={{
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'feedback' ? '3px solid var(--primary)' : '3px solid transparent',
            padding: '0.65rem 1.25rem',
            fontWeight: 700,
            fontSize: '0.95rem',
            color: activeTab === 'feedback' ? 'var(--primary)' : 'var(--muted)',
            cursor: 'pointer',
            transition: 'var(--transition)'
          }}
        >
          My Driver Feedback ({serviceFeedback.length})
        </button>
      </div>

      {/* TAB 1: COMPLAINTS */}
      {activeTab === 'complaints' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {/* Submit New Complaint Form */}
          <Card style={{ padding: '2rem' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text)', marginBottom: '1.25rem' }}>
              File a New Complaint
            </h3>

            <form onSubmit={handleSubmitComplaint}>
              {/* Optional related collection select */}
              <FormField
                label="Related Collection Request (Optional)"
                name="collection"
                type="select"
                value={selectedCollectionId}
                onChange={(e) => setSelectedCollectionId(e.target.value)}
                options={[
                  { value: '', label: 'General Complaint (Not related to a specific collection)' },
                  ...requests.map((r) => ({
                    value: String(r.id),
                    label: `Request #${r.id} (${r.status}) — ${new Date(r.requested_at).toLocaleDateString()} [${
                      r.address || r.bin_location || 'Bin'
                    }]`
                  }))
                ]}
                helpText="Associate this issue with a specific collection attempt if applicable."
              />

              {/* Message */}
              <div className="form-group">
                <label className="form-label" htmlFor="complaintMessage">
                  Describe Your Grievance <span style={{ color: 'var(--danger)' }}>*</span>
                </label>
                <textarea
                  id="complaintMessage"
                  rows={4}
                  className="form-textarea"
                  value={complaintMessage}
                  onChange={(e) => {
                    setComplaintMessage(e.target.value);
                    if (messageError) setMessageError('');
                  }}
                  placeholder="Please describe the issue in detail (e.g. driver did not arrive at scheduled window, bin was left unsealed, etc.). Minimum 10 characters."
                />
                {messageError && <span className="form-error">{messageError}</span>}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
                <Button
                  type="submit"
                  variant="primary"
                  loading={submittingComplaint}
                  icon={<Send size={16} />}
                >
                  Submit Complaint
                </Button>
              </div>
            </form>
          </Card>

          {/* List of User's Complaints */}
          <div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text)', marginBottom: '1rem' }}>
              Submitted Grievances
            </h3>

            {complaints.length === 0 ? (
              <Card style={{ padding: '2.5rem', textAlign: 'center' }}>
                <EmptyState
                  icon={<ShieldCheck size={44} color="var(--primary)" />}
                  title="No Complaints Logged"
                  message="You haven't filed any complaints. Any issues submitted will appear here with municipal responses."
                />
              </Card>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {complaints.map((item) => (
                  <Card key={item.id} style={{ padding: '1.5rem' }}>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        flexWrap: 'wrap',
                        gap: '0.75rem',
                        marginBottom: '0.75rem'
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{ fontWeight: 800, fontSize: '1.05rem', color: 'var(--text)' }}>
                            Ticket #{item.id}
                          </span>
                          <Badge status={item.status} />
                        </div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--muted)', marginTop: '0.2rem' }}>
                          Filed on {new Date(item.created_at).toLocaleString()}
                          {item.collection_id && (
                            <span> • Linked to Request #{item.collection_id}</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <p style={{ fontSize: '0.92rem', color: 'var(--text)', lineHeight: 1.5, marginBottom: '0.75rem' }}>
                      {item.message}
                    </p>

                    {/* Admin Response section when present */}
                    {item.admin_response ? (
                      <div
                        style={{
                          background: '#f4fbf6',
                          borderLeft: '4px solid var(--primary)',
                          padding: '0.85rem 1rem',
                          borderRadius: 'var(--radius-sm)',
                          marginTop: '0.75rem'
                        }}
                      >
                        <div
                          style={{
                            fontSize: '0.8rem',
                            fontWeight: 700,
                            color: 'var(--primary)',
                            textTransform: 'uppercase',
                            letterSpacing: '0.04em',
                            marginBottom: '0.25rem'
                          }}
                        >
                          Official Administration Response
                        </div>
                        <div style={{ fontSize: '0.88rem', color: 'var(--text)', lineHeight: 1.4 }}>
                          {item.admin_response}
                        </div>
                      </div>
                    ) : (
                      <div style={{ fontSize: '0.78rem', color: 'var(--muted)', fontStyle: 'italic' }}>
                        ⏳ Awaiting review from SGMS operations team.
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: MY FEEDBACK */}
      {activeTab === 'feedback' && (
        <div>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text)', marginBottom: '1rem' }}>
            Service Ratings & Feedback Given
          </h3>

          {serviceFeedback.length === 0 ? (
            <Card style={{ padding: '3rem', textAlign: 'center' }}>
              <EmptyState
                icon={<Star size={44} color="#f0a830" />}
                title="No Feedback Submitted"
                message="After a waste collection request is marked as collected, you can rate driver punctuality and service quality."
              />
            </Card>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {serviceFeedback.map((fb) => (
                <Card key={fb.id} style={{ padding: '1.5rem' }}>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: '0.5rem',
                      marginBottom: '0.75rem'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <div style={{ display: 'flex', gap: '0.15rem' }}>
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star
                            key={s}
                            size={18}
                            fill={s <= fb.rating ? '#f59e0b' : 'none'}
                            color={s <= fb.rating ? '#f59e0b' : '#cbd5e1'}
                          />
                        ))}
                      </div>
                      <strong style={{ fontSize: '0.92rem', color: 'var(--text)' }}>
                        {fb.rating} / 5 Stars
                      </strong>
                    </div>

                    <div style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>
                      Submitted {new Date(fb.created_at).toLocaleDateString()}
                    </div>
                  </div>

                  {fb.message ? (
                    <p style={{ fontSize: '0.9rem', color: 'var(--text)', lineHeight: 1.5, marginBottom: '0.5rem' }}>
                      "{fb.message}"
                    </p>
                  ) : (
                    <p style={{ fontSize: '0.85rem', color: 'var(--muted)', fontStyle: 'italic', marginBottom: '0.5rem' }}>
                      No written comment provided.
                    </p>
                  )}

                  <div
                    style={{
                      fontSize: '0.78rem',
                      color: 'var(--muted)',
                      borderTop: '1px solid #f0f4f2',
                      paddingTop: '0.5rem',
                      marginTop: '0.5rem'
                    }}
                  >
                    Collection #{fb.collection_id || 'N/A'}{' '}
                    {fb.driver_name && <span>• Driver: <strong>{fb.driver_name}</strong></span>}
                    {fb.collection_address && <span> • Location: {fb.collection_address}</span>}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SupportPage;
