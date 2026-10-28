import React, { useState, useEffect } from 'react';
import {
  Trash2,
  Plus,
  Edit2,
  Trash,
  History,
  AlertCircle,
  MapPin,
  Clock,
  Sparkles
} from 'lucide-react';
import api from '../../api/axios';
import { useToast } from '../../context/ToastContext';
import Card from '../../components/Card';
import Button from '../../components/Button';
import Badge from '../../components/Badge';
import Modal from '../../components/Modal';
import FormField from '../../components/FormField';
import MapPicker from '../../components/MapPicker';
import Spinner from '../../components/Spinner';
import EmptyState from '../../components/EmptyState';

const MyBins = () => {
  const { showToast } = useToast();

  const [bins, setBins] = useState([]);
  const [loading, setLoading] = useState(true);

  // Add / Edit Modal state
  const [modalMode, setModalMode] = useState(null); // 'add' | 'edit' | null
  const [activeBin, setActiveBin] = useState(null);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    location: '',
    bin_type: 'organic',
    capacity_kg: 20,
    latitude: 9.3159,
    longitude: 76.6151
  });

  // History Modal state
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyList, setHistoryList] = useState([]);
  const [historyBin, setHistoryBin] = useState(null);

  // Delete Confirm Modal state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [binToDelete, setBinToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Fetch bins
  const fetchBins = async () => {
    try {
      const res = await api.get('/bins/my');
      if (res.data && res.data.data) {
        setBins(res.data.data);
      }
    } catch (err) {
      showToast('Failed to load bins list', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBins();
  }, []);

  // Update Status directly via segmented control
  const handleStatusChange = async (binId, newStatus) => {
    // Optimistic UI update
    setBins((prev) =>
      prev.map((b) =>
        b.id === binId
          ? {
              ...b,
              fill_status: newStatus,
              current_level: newStatus === 'empty' ? 0 : newStatus === 'half' ? 50 : 100,
              last_updated: new Date().toISOString()
            }
          : b
      )
    );

    try {
      await api.put(`/bins/${binId}/status`, { fill_status: newStatus });
      showToast(`Bin status updated to ${newStatus}`, 'success');
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to update bin status', 'error');
      // Revert on failure
      fetchBins();
    }
  };

  // Open Add Bin Modal
  const openAddModal = () => {
    setFormData({
      location: '',
      bin_type: 'organic',
      capacity_kg: 20,
      latitude: 9.3159,
      longitude: 76.6151
    });
    setActiveBin(null);
    setModalMode('add');
  };

  // Open Edit Bin Modal
  const openEditModal = (bin) => {
    setActiveBin(bin);
    setFormData({
      location: bin.location,
      bin_type: bin.bin_type || 'organic',
      capacity_kg: bin.capacity_kg,
      latitude: Number(bin.latitude) || 9.3159,
      longitude: Number(bin.longitude) || 76.6151
    });
    setModalMode('edit');
  };

  // Submit Add or Edit
  const handleSaveBin = async (e) => {
    e.preventDefault();
    if (!formData.location.trim()) {
      showToast('Location text is required', 'error');
      return;
    }

    setFormSubmitting(true);
    try {
      if (modalMode === 'add') {
        await api.post('/bins', {
          location: formData.location.trim(),
          bin_type: formData.bin_type,
          capacity_kg: Number(formData.capacity_kg),
          latitude: formData.latitude,
          longitude: formData.longitude
        });
        showToast('Smart bin added successfully!', 'success');
      } else {
        await api.put(`/bins/${activeBin.id}`, {
          location: formData.location.trim(),
          capacity_kg: Number(formData.capacity_kg)
        });
        showToast('Bin details updated successfully!', 'success');
      }
      setModalMode(null);
      fetchBins();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to save bin', 'error');
    } finally {
      setFormSubmitting(false);
    }
  };

  // Open History Modal
  const openHistoryModal = async (bin) => {
    setHistoryBin(bin);
    setHistoryModalOpen(true);
    setHistoryLoading(true);
    try {
      const res = await api.get(`/bins/${bin.id}/history`);
      if (res.data && res.data.data) {
        setHistoryList(res.data.data);
      }
    } catch (err) {
      showToast('Could not load bin history', 'error');
    } finally {
      setHistoryLoading(false);
    }
  };

  // Open Delete Modal
  const openDeleteModal = (bin) => {
    setBinToDelete(bin);
    setDeleteModalOpen(true);
  };

  // Confirm Delete
  const handleConfirmDelete = async () => {
    if (!binToDelete) return;
    setDeleting(true);
    try {
      await api.delete(`/bins/${binToDelete.id}`);
      showToast('Bin removed successfully', 'success');
      setDeleteModalOpen(false);
      setBinToDelete(null);
      fetchBins();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to delete bin', 'error');
    } finally {
      setDeleting(false);
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      {/* Top action header */}
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
            Smart Bins
          </h2>
          <p style={{ color: 'var(--muted)', fontSize: '0.9rem', marginTop: '0.2rem' }}>
            Track waste fill levels in real-time and request collection.
          </p>
        </div>

        <Button
          variant="primary"
          onClick={openAddModal}
          icon={<Plus size={18} />}
        >
          Add Bin
        </Button>
      </div>

      {/* Grid of Bins */}
      {bins.length === 0 ? (
        <Card style={{ padding: '3.5rem 1.5rem', textAlign: 'center' }}>
          <EmptyState
            icon={<Trash2 size={48} strokeWidth={1.5} color="var(--primary)" />}
            title="No Smart Bins Registered"
            message="Add your home or community waste bin with GPS coordinates to enable door-to-door collection."
            action={
              <Button variant="primary" onClick={openAddModal} icon={<Plus size={16} />}>
                Add Your First Bin
              </Button>
            }
          />
        </Card>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
            gap: '1.5rem'
          }}
        >
          {bins.map((bin) => {
            const level = Number(bin.current_level) || (bin.fill_status === 'full' ? 100 : bin.fill_status === 'half' ? 50 : 0);
            return (
              <Card
                key={bin.id}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  padding: '1.5rem',
                  gap: '1rem',
                  position: 'relative'
                }}
              >
                {/* Header: Location & Badge */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div
                      style={{
                        fontSize: '1.1rem',
                        fontWeight: 700,
                        color: 'var(--text)',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}
                      title={bin.location}
                    >
                      {bin.location}
                    </div>
                    <div
                      style={{
                        fontSize: '0.78rem',
                        color: 'var(--muted)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.25rem',
                        marginTop: '0.2rem'
                      }}
                    >
                      <MapPin size={13} />
                      <span>
                        Lat: {Number(bin.latitude).toFixed(3)}, Lng: {Number(bin.longitude).toFixed(3)}
                      </span>
                    </div>
                  </div>

                  <Badge status={bin.fill_status} />
                </div>

                {/* Open request alert note */}
                {bin.has_open_request ? (
                  <div
                    style={{
                      background: 'var(--info-soft)',
                      color: 'var(--info)',
                      borderRadius: 8,
                      padding: '0.4rem 0.65rem',
                      fontSize: '0.78rem',
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.4rem'
                    }}
                  >
                    <AlertCircle size={14} />
                    <span>Collection requested</span>
                  </div>
                ) : null}

                {/* Progress bar */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '0.3rem' }}>
                    <span style={{ color: 'var(--muted)' }}>Fill Level</span>
                    <strong style={{ color: 'var(--text)' }}>{level}% ({bin.capacity_kg} kg cap)</strong>
                  </div>
                  <div className="progress-bar">
                    <div
                      className={`progress-fill ${bin.fill_status}`}
                      style={{ width: `${level}%` }}
                    />
                  </div>
                </div>

                {/* Segmented Control for instant status change */}
                <div>
                  <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase' }}>
                    Update Level
                  </span>
                  <div className="segmented-control">
                    <button
                      className={`segmented-btn ${bin.fill_status === 'empty' ? 'active status-empty' : ''}`}
                      onClick={() => handleStatusChange(bin.id, 'empty')}
                    >
                      Empty
                    </button>
                    <button
                      className={`segmented-btn ${bin.fill_status === 'half' ? 'active status-half' : ''}`}
                      onClick={() => handleStatusChange(bin.id, 'half')}
                    >
                      Half
                    </button>
                    <button
                      className={`segmented-btn ${bin.fill_status === 'full' ? 'active status-full' : ''}`}
                      onClick={() => handleStatusChange(bin.id, 'full')}
                    >
                      Full
                    </button>
                  </div>
                </div>

                {/* Footer with last updated time and action buttons */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    borderTop: '1px solid var(--border)',
                    paddingTop: '0.85rem',
                    marginTop: 'auto'
                  }}
                >
                  <span
                    style={{
                      fontSize: '0.75rem',
                      color: 'var(--muted)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.25rem'
                    }}
                  >
                    <Clock size={12} />
                    {bin.last_updated
                      ? new Date(bin.last_updated).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                      : 'Just now'}
                  </span>

                  <div style={{ display: 'flex', gap: '0.35rem' }}>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => openHistoryModal(bin)}
                      title="View Status History"
                      icon={<History size={14} />}
                    >
                      History
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => openEditModal(bin)}
                      title="Edit Bin"
                    >
                      <Edit2 size={14} />
                    </Button>
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => openDeleteModal(bin)}
                      title="Remove Bin"
                    >
                      <Trash size={14} />
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Add / Edit Bin Modal */}
      <Modal
        isOpen={modalMode !== null}
        onClose={() => setModalMode(null)}
        title={modalMode === 'add' ? 'Add Smart Bin' : 'Edit Smart Bin'}
        maxWidth="560px"
      >
        <form onSubmit={handleSaveBin}>
          <FormField
            label="Bin Location Description"
            name="location"
            value={formData.location}
            onChange={(e) => setFormData({ ...formData, location: e.target.value })}
            placeholder="e.g. Front Gate / Kitchen Backyard"
            required
          />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <FormField
              label="Bin Type"
              name="bin_type"
              type="select"
              value={formData.bin_type}
              onChange={(e) => setFormData({ ...formData, bin_type: e.target.value })}
              options={[
                { value: 'organic', label: 'Organic Waste' },
                { value: 'recyclable', label: 'Dry Recyclables' },
                { value: 'mixed', label: 'Mixed Municipal' }
              ]}
              disabled={modalMode === 'edit'}
            />

            <FormField
              label="Capacity (kg)"
              name="capacity_kg"
              type="number"
              min={5}
              max={200}
              value={formData.capacity_kg}
              onChange={(e) => setFormData({ ...formData, capacity_kg: e.target.value })}
              required
            />
          </div>

          {modalMode === 'add' && (
            <div style={{ marginTop: '0.75rem', marginBottom: '1.25rem' }}>
              <label className="form-label" style={{ marginBottom: '0.5rem', display: 'block' }}>
                Pick GPS Location on Map
              </label>
              <MapPicker
                lat={formData.latitude}
                lng={formData.longitude}
                onChange={({ lat, lng }) => setFormData((prev) => ({ ...prev, latitude: lat, longitude: lng }))}
              />
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
            <Button variant="secondary" onClick={() => setModalMode(null)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={formSubmitting}>
              {modalMode === 'add' ? 'Create Bin' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* History Modal */}
      <Modal
        isOpen={historyModalOpen}
        onClose={() => setHistoryModalOpen(false)}
        title={`Status History: ${historyBin?.location || 'Bin'}`}
        maxWidth="600px"
      >
        {historyLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
            <Spinner />
          </div>
        ) : historyList.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--muted)' }}>
            No status changes logged for this bin yet.
          </div>
        ) : (
          <div className="table-responsive">
            <table className="sgms-table">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Status</th>
                  <th>Level</th>
                </tr>
              </thead>
              <tbody>
                {historyList.map((h) => (
                  <tr key={h.id}>
                    <td style={{ fontSize: '0.82rem', color: 'var(--muted)' }}>
                      {new Date(h.recorded_at).toLocaleString([], {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </td>
                    <td>
                      <Badge status={h.status || h.new_fill_status} />
                    </td>
                    <td>
                      <strong>{h.level !== undefined ? h.level : h.new_level_percentage}%</strong>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        title="Remove Smart Bin"
        maxWidth="440px"
      >
        <p style={{ color: 'var(--muted)', fontSize: '0.92rem', marginBottom: '1.25rem' }}>
          Are you sure you want to remove bin <strong>{binToDelete?.location}</strong>? This bin will be
          deactivated from your door collection schedule.
        </p>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
          <Button variant="secondary" onClick={() => setDeleteModalOpen(false)}>
            Keep Bin
          </Button>
          <Button variant="danger" loading={deleting} onClick={handleConfirmDelete}>
            Remove Bin
          </Button>
        </div>
      </Modal>
    </div>
  );
};

export default MyBins;
