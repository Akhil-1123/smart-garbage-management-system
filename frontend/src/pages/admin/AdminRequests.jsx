import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import {
  Clock,
  CheckCircle2,
  XCircle,
  Truck,
  MapPin,
  Calendar,
  Phone,
  User,
  Scale,
  Sparkles,
  Eye,
  AlertCircle
} from 'lucide-react';
import api from '../../api/axios';
import { useToast } from '../../context/ToastContext';
import Card from '../../components/Card';
import Button from '../../components/Button';
import Badge from '../../components/Badge';
import Modal from '../../components/Modal';
import Spinner from '../../components/Spinner';
import EmptyState from '../../components/EmptyState';

const STATUS_TABS = [
  { key: 'all', label: 'All Requests' },
  { key: 'pending', label: 'Pending' },
  { key: 'approved', label: 'Approved' },
  { key: 'driver_assigned', label: 'Driver Assigned' },
  { key: 'collected', label: 'Collected' },
  { key: 'cancelled', label: 'Cancelled' }
];

const AdminRequests = () => {
  const { showToast } = useToast();

  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedFilter, setSelectedFilter] = useState('all');

  // Assign Driver Modal
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [targetRequestForAssign, setTargetRequestForAssign] = useState(null);
  const [nearbyDrivers, setNearbyDrivers] = useState([]);
  const [loadingNearby, setLoadingNearby] = useState(false);
  const [selectedDriverId, setSelectedDriverId] = useState(null);
  const [assigning, setAssigning] = useState(false);

  // Cancel Modal
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [targetRequestForCancel, setTargetRequestForCancel] = useState(null);
  const [cancelRemarks, setCancelRemarks] = useState('');
  const [cancelling, setCancelling] = useState(false);

  // Details Modal (Map + Timeline)
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [detailRequest, setDetailRequest] = useState(null);

  const fetchRequests = async () => {
    try {
      const res = await api.get('/admin/collections');
      if (res.data?.data) {
        setRequests(res.data.data);
      }
    } catch (err) {
      showToast('Could not load collection requests', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  // Approve Request
  const handleApprove = async (req) => {
    try {
      await api.put(`/admin/collections/${req.id}/approve`);
      showToast(`Request #${req.id} approved! You can now assign a driver.`, 'success');
      fetchRequests();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to approve request', 'error');
    }
  };

  // Open Assign Modal
  const handleOpenAssign = async (req) => {
    setTargetRequestForAssign(req);
    setSelectedDriverId(null);
    setAssignModalOpen(true);
    setLoadingNearby(true);

    try {
      const res = await api.get(`/admin/collections/${req.id}/nearby-drivers`);
      if (res.data?.data) {
        setNearbyDrivers(res.data.data);
        if (res.data.data.length > 0) {
          // Default to the first (recommended) driver
          setSelectedDriverId(res.data.data[0].id || res.data.data[0].driver_id);
        }
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to fetch nearby drivers', 'error');
    } finally {
      setLoadingNearby(false);
    }
  };

  // Confirm Assign
  const handleConfirmAssign = async () => {
    if (!targetRequestForAssign || !selectedDriverId) return;

    setAssigning(true);
    try {
      await api.put(`/admin/collections/${targetRequestForAssign.id}/assign`, {
        driver_id: Number(selectedDriverId)
      });
      showToast(`Driver successfully dispatched to Request #${targetRequestForAssign.id}!`, 'success');
      setAssignModalOpen(false);
      fetchRequests();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to assign driver', 'error');
    } finally {
      setAssigning(false);
    }
  };

  // Open Cancel Modal
  const handleOpenCancel = (req) => {
    setTargetRequestForCancel(req);
    setCancelRemarks('');
    setCancelModalOpen(true);
  };

  const handleConfirmCancel = async (e) => {
    e.preventDefault();
    if (!targetRequestForCancel) return;

    setCancelling(true);
    try {
      await api.put(`/admin/collections/${targetRequestForCancel.id}/cancel`, {
        remarks: cancelRemarks.trim() || undefined
      });
      showToast(`Request #${targetRequestForCancel.id} cancelled.`, 'success');
      setCancelModalOpen(false);
      fetchRequests();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to cancel request', 'error');
    } finally {
      setCancelling(false);
    }
  };

  // Open Details Modal
  const handleOpenDetails = (req) => {
    setDetailRequest(req);
    setDetailsModalOpen(true);
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 340 }}>
        <Spinner size="lg" />
      </div>
    );
  }

  // Count requests by status
  const counts = {
    all: requests.length,
    pending: requests.filter((r) => r.status === 'pending').length,
    approved: requests.filter((r) => r.status === 'approved').length,
    driver_assigned: requests.filter((r) => r.status === 'driver_assigned').length,
    collected: requests.filter((r) => r.status === 'collected').length,
    cancelled: requests.filter((r) => r.status === 'cancelled').length
  };

  const filteredRequests = requests.filter((r) => {
    if (selectedFilter === 'all') return true;
    return r.status === selectedFilter;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      {/* Header */}
      <div>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text)' }}>
          Waste Collection Dispatch Desk
        </h2>
        <p style={{ color: 'var(--muted)', fontSize: '0.9rem', marginTop: '0.2rem' }}>
          Approve household pickup requests, calculate optimal driver proximity, and track collections.
        </p>
      </div>

      {/* Status Filter Tabs Row */}
      <div
        style={{
          display: 'flex',
          gap: '0.5rem',
          overflowX: 'auto',
          borderBottom: '1px solid var(--border)',
          paddingBottom: '0.5rem'
        }}
      >
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setSelectedFilter(tab.key)}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: 20,
              fontSize: '0.85rem',
              fontWeight: 700,
              border: '1px solid var(--border)',
              background: selectedFilter === tab.key ? 'var(--primary)' : '#ffffff',
              color: selectedFilter === tab.key ? '#ffffff' : 'var(--muted)',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              transition: 'var(--transition)'
            }}
          >
            <span>{tab.label}</span>
            <span
              style={{
                background: selectedFilter === tab.key ? 'rgba(255,255,255,0.25)' : 'var(--input-bg)',
                color: selectedFilter === tab.key ? '#ffffff' : 'var(--text)',
                padding: '0.1rem 0.45rem',
                borderRadius: 10,
                fontSize: '0.72rem'
              }}
            >
              {counts[tab.key] || 0}
            </span>
          </button>
        ))}
      </div>

      {/* Requests Table */}
      <Card style={{ padding: '1.75rem' }}>
        {filteredRequests.length === 0 ? (
          <EmptyState
            icon={<Clock size={48} strokeWidth={1.5} color="var(--primary)" />}
            title="No Requests Match Filter"
            message={`No collection requests currently have status "${selectedFilter}".`}
          />
        ) : (
          <div className="table-responsive">
            <table className="sgms-table">
              <thead>
                <tr>
                  <th>Req #</th>
                  <th>Citizen & Phone</th>
                  <th>Bin Location</th>
                  <th>Waste Type</th>
                  <th>Requested Date</th>
                  <th>Assigned Driver</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredRequests.map((req) => (
                  <tr key={req.id}>
                    <td><strong>#{req.id}</strong></td>
                    <td>
                      <div>
                        <strong>{req.user_name}</strong>
                        <div style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>
                          📞 {req.user_phone || 'N/A'}
                        </div>
                      </div>
                    </td>
                    <td>{req.address || req.bin_location || 'Home Bin'}</td>
                    <td style={{ textTransform: 'capitalize' }}>
                      {req.waste_type || 'organic'}
                    </td>
                    <td style={{ fontSize: '0.82rem', color: 'var(--muted)' }}>
                      {new Date(req.requested_at).toLocaleString([], {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </td>
                    <td>
                      {req.driver_name ? (
                        <div>
                          <strong>{req.driver_name}</strong>
                          <div style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>
                            {req.driver_vehicle_no}
                          </div>
                        </div>
                      ) : (
                        <span style={{ color: 'var(--muted)', fontSize: '0.82rem' }}>—</span>
                      )}
                    </td>
                    <td>
                      <Badge status={req.status} />
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center' }}>
                        {/* Status-specific action buttons */}
                        {req.status === 'pending' && (
                          <>
                            <Button
                              size="sm"
                              variant="primary"
                              onClick={() => handleApprove(req)}
                              title="Approve Request"
                            >
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="danger"
                              onClick={() => handleOpenCancel(req)}
                              title="Cancel Request"
                            >
                              Cancel
                            </Button>
                          </>
                        )}

                        {req.status === 'approved' && (
                          <Button
                            size="sm"
                            variant="primary"
                            onClick={() => handleOpenAssign(req)}
                            icon={<Truck size={13} />}
                          >
                            Assign Driver
                          </Button>
                        )}

                        {req.status === 'driver_assigned' && (
                          <>
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => handleOpenAssign(req)}
                            >
                              Reassign
                            </Button>
                            <Button
                              size="sm"
                              variant="danger"
                              onClick={() => handleOpenCancel(req)}
                            >
                              Cancel
                            </Button>
                          </>
                        )}

                        {req.status === 'collected' && (
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => handleOpenDetails(req)}
                            icon={<Eye size={13} />}
                          >
                            View
                          </Button>
                        )}

                        {/* Always allow viewing details */}
                        {req.status !== 'collected' && (
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => handleOpenDetails(req)}
                            title="Inspect Timeline & Map"
                          >
                            <Eye size={13} />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Assign Driver Modal (Nearby Proximity) */}
      <Modal
        isOpen={assignModalOpen}
        onClose={() => setAssignModalOpen(false)}
        title={`Dispatch Driver: Request #${targetRequestForAssign?.id}`}
        maxWidth="560px"
      >
        <p style={{ color: 'var(--muted)', fontSize: '0.88rem', marginBottom: '1.25rem' }}>
          Showing available drivers ranked by GPS proximity (Haversine formula) to pickup location{' '}
          <strong>{targetRequestForAssign?.address || targetRequestForAssign?.bin_location}</strong>.
        </p>

        {loadingNearby ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
            <Spinner />
          </div>
        ) : nearbyDrivers.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--muted)' }}>
            No active and available drivers found. Please ensure drivers are set to Available under Drivers.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: 320, overflowY: 'auto' }}>
            {nearbyDrivers.map((d, index) => {
              const driverId = d.id || d.driver_id;
              const isSelected = selectedDriverId === driverId;
              const isFirst = index === 0;

              return (
                <div
                  key={driverId}
                  onClick={() => setSelectedDriverId(driverId)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.85rem 1rem',
                    borderRadius: 'var(--radius-sm)',
                    border: isSelected ? '2px solid var(--primary)' : '1px solid var(--border)',
                    background: isSelected ? '#f4fbf6' : 'var(--input-bg)',
                    cursor: 'pointer',
                    transition: 'var(--transition)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <input
                      type="radio"
                      name="selectedDriver"
                      checked={isSelected}
                      onChange={() => setSelectedDriverId(driverId)}
                    />
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <strong style={{ fontSize: '0.95rem', color: 'var(--text)' }}>
                          {d.name}
                        </strong>
                        {(d.recommended || isFirst) && (
                          <span
                            style={{
                              background: 'var(--primary)',
                              color: '#ffffff',
                              fontSize: '0.68rem',
                              fontWeight: 700,
                              padding: '0.15rem 0.45rem',
                              borderRadius: 10
                            }}
                          >
                            Recommended
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--muted)', marginTop: '0.15rem' }}>
                        {d.vehicle_no} • {d.service_area || 'Central'} • {d.phone}
                      </div>
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 800, color: 'var(--primary)', fontSize: '0.95rem' }}>
                      {Number(d.distance_km || 0).toFixed(1)} km away
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>
                      {d.open_jobs || 0} active jobs
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
          <Button variant="secondary" onClick={() => setAssignModalOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="primary"
            disabled={!selectedDriverId || nearbyDrivers.length === 0}
            loading={assigning}
            onClick={handleConfirmAssign}
            icon={<Truck size={15} />}
          >
            Assign Selected Driver
          </Button>
        </div>
      </Modal>

      {/* Cancel Modal */}
      <Modal
        isOpen={cancelModalOpen}
        onClose={() => setCancelModalOpen(false)}
        title={`Cancel Collection Request #${targetRequestForCancel?.id}`}
        maxWidth="460px"
      >
        <form onSubmit={handleConfirmCancel}>
          <div className="form-group">
            <label className="form-label" htmlFor="cancelRemarks">
              Reason / Remarks for Cancellation
            </label>
            <textarea
              id="cancelRemarks"
              rows={3}
              className="form-textarea"
              value={cancelRemarks}
              onChange={(e) => setCancelRemarks(e.target.value)}
              placeholder="e.g. Inaccessible gate, false request, citizen requested cancellation."
              required
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.25rem' }}>
            <Button variant="secondary" onClick={() => setCancelModalOpen(false)}>
              Keep Request
            </Button>
            <Button type="submit" variant="danger" loading={cancelling}>
              Confirm Cancellation
            </Button>
          </div>
        </form>
      </Modal>

      {/* Details & Map Modal */}
      <Modal
        isOpen={detailsModalOpen}
        onClose={() => setDetailsModalOpen(false)}
        title={`Request Details: #${detailRequest?.id}`}
        maxWidth="640px"
      >
        {detailRequest && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* Header info */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h4 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text)' }}>
                  {detailRequest.user_name}
                </h4>
                <div style={{ fontSize: '0.82rem', color: 'var(--muted)' }}>
                  📞 {detailRequest.user_phone} • 📍 {detailRequest.address || detailRequest.bin_location}
                </div>
              </div>
              <Badge status={detailRequest.status} />
            </div>

            {/* Small Leaflet Map with marker */}
            <div style={{ borderRadius: 'var(--radius-sm)', overflow: 'hidden', border: '1px solid var(--border)', height: 220 }}>
              <MapContainer
                center={[Number(detailRequest.latitude) || 9.3159, Number(detailRequest.longitude) || 76.6151]}
                zoom={14}
                scrollWheelZoom={false}
                style={{ width: '100%', height: '100%' }}
              >
                <TileLayer
                  attribution='&copy; OpenStreetMap'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <Marker position={[Number(detailRequest.latitude) || 9.3159, Number(detailRequest.longitude) || 76.6151]}>
                  <Popup>
                    <strong>Request #{detailRequest.id}</strong><br />
                    {detailRequest.address || detailRequest.bin_location}
                  </Popup>
                </Marker>
              </MapContainer>
            </div>

            {/* Lifecycle Timeline */}
            <div
              style={{
                background: 'var(--input-bg)',
                padding: '1rem',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border)',
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                gap: '0.75rem',
                fontSize: '0.8rem'
              }}
            >
              <div>
                <div style={{ color: 'var(--muted)', fontWeight: 600 }}>Requested At</div>
                <div style={{ fontWeight: 700, color: 'var(--text)', marginTop: '0.15rem' }}>
                  {detailRequest.requested_at ? new Date(detailRequest.requested_at).toLocaleString() : '—'}
                </div>
              </div>

              <div>
                <div style={{ color: 'var(--muted)', fontWeight: 600 }}>Approved At</div>
                <div style={{ fontWeight: 700, color: 'var(--text)', marginTop: '0.15rem' }}>
                  {detailRequest.approved_at ? new Date(detailRequest.approved_at).toLocaleString() : '—'}
                </div>
              </div>

              <div>
                <div style={{ color: 'var(--muted)', fontWeight: 600 }}>Driver Assigned</div>
                <div style={{ fontWeight: 700, color: 'var(--text)', marginTop: '0.15rem' }}>
                  {detailRequest.assigned_at ? new Date(detailRequest.assigned_at).toLocaleString() : '—'}
                </div>
              </div>

              <div>
                <div style={{ color: 'var(--muted)', fontWeight: 600 }}>Collected At</div>
                <div style={{ fontWeight: 700, color: 'var(--text)', marginTop: '0.15rem' }}>
                  {detailRequest.collected_at ? new Date(detailRequest.collected_at).toLocaleString() : '—'}
                </div>
              </div>
            </div>

            {/* Driver and weight metrics */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div style={{ background: '#fafcfb', padding: '0.85rem', borderRadius: 8, border: '1px solid var(--border)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--muted)', textTransform: 'uppercase', fontWeight: 600 }}>
                  Assigned Driver
                </div>
                <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text)', marginTop: '0.2rem' }}>
                  {detailRequest.driver_name || 'Not assigned yet'}
                </div>
                {detailRequest.driver_phone && (
                  <div style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>
                    {detailRequest.driver_phone} ({detailRequest.driver_vehicle_no})
                  </div>
                )}
              </div>

              <div style={{ background: '#fafcfb', padding: '0.85rem', borderRadius: 8, border: '1px solid var(--border)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--muted)', textTransform: 'uppercase', fontWeight: 600 }}>
                  Logged Waste Weight
                </div>
                <div style={{ fontWeight: 800, fontSize: '1.15rem', color: 'var(--primary)', marginTop: '0.2rem' }}>
                  {detailRequest.collected_weight_kg ? `${Number(detailRequest.collected_weight_kg).toFixed(2)} kg` : 'Pending pickup'}
                </div>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default AdminRequests;
