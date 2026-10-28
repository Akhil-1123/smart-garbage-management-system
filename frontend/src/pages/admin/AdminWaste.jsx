import React, { useState, useEffect } from 'react';
import { Scale, Filter, Edit2, Calendar, FileText, CheckCircle2 } from 'lucide-react';
import api from '../../api/axios';
import { useToast } from '../../context/ToastContext';
import Card from '../../components/Card';
import Button from '../../components/Button';
import Badge from '../../components/Badge';
import Modal from '../../components/Modal';
import FormField from '../../components/FormField';
import Spinner from '../../components/Spinner';
import EmptyState from '../../components/EmptyState';

const AdminWaste = () => {
  const { showToast } = useToast();

  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [monthFilter, setMonthFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'pending' | 'batched'

  // Edit weight modal
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [recordToEdit, setRecordToEdit] = useState(null);
  const [newWeight, setNewWeight] = useState('');
  const [updating, setUpdating] = useState(false);

  const fetchWasteRecords = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (monthFilter) params.append('month', monthFilter);
      if (statusFilter !== 'all') params.append('processing_status', statusFilter);

      const res = await api.get(`/admin/waste-records?${params.toString()}`);
      if (res.data?.data) {
        setRecords(res.data.data);
      }
    } catch (err) {
      showToast('Could not load waste records', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWasteRecords();
  }, [monthFilter, statusFilter]);

  const totalKg = records.reduce((sum, r) => sum + Number(r.weight_kg || 0), 0);

  const handleOpenEdit = (rec) => {
    setRecordToEdit(rec);
    setNewWeight(String(rec.weight_kg));
    setEditModalOpen(true);
  };

  const handleConfirmEdit = async (e) => {
    e.preventDefault();
    if (!recordToEdit || isNaN(Number(newWeight)) || Number(newWeight) <= 0) {
      showToast('Please enter a valid weight in kg', 'error');
      return;
    }

    setUpdating(true);
    try {
      await api.put(`/admin/waste-records/${recordToEdit.id}`, {
        weight_kg: Number(newWeight)
      });
      showToast(`Record #${recordToEdit.id} weight updated to ${newWeight} kg.`, 'success');
      setEditModalOpen(false);
      setRecordToEdit(null);
      fetchWasteRecords();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to update record weight', 'error');
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      {/* Header */}
      <div>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text)' }}>
          Municipal Waste Collection Records
        </h2>
        <p style={{ color: 'var(--muted)', fontSize: '0.9rem', marginTop: '0.2rem' }}>
          Audit weighed pickups, correct sensor/scale entries, and monitor pending compost intake.
        </p>
      </div>

      {/* Summary KPI Banner & Filters */}
      <Card style={{ padding: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1.25rem' }}>
        <div>
          <div style={{ fontSize: '0.82rem', color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase' }}>
            Filtered Total Waste Intake
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--primary)', lineHeight: 1.2, marginTop: '0.25rem' }}>
            {totalKg.toFixed(2)} kg
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--muted)', marginTop: '0.2rem' }}>
            Across {records.length} logged collection records
          </div>
        </div>

        {/* Filter inputs */}
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label" htmlFor="monthFilter" style={{ fontSize: '0.8rem' }}>
              Filter by Month
            </label>
            <input
              id="monthFilter"
              type="month"
              className="form-input"
              value={monthFilter}
              onChange={(e) => setMonthFilter(e.target.value)}
              style={{ padding: '0.45rem 0.75rem' }}
            />
          </div>

          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label" htmlFor="statusFilter" style={{ fontSize: '0.8rem' }}>
              Processing Status
            </label>
            <select
              id="statusFilter"
              className="form-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{ padding: '0.45rem 0.75rem' }}
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending (Unbatched)</option>
              <option value="batched">Batched in Unit</option>
            </select>
          </div>

          {(monthFilter || statusFilter !== 'all') && (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                setMonthFilter('');
                setStatusFilter('all');
              }}
            >
              Reset
            </Button>
          )}
        </div>
      </Card>

      {/* Waste Records Table */}
      <Card style={{ padding: '1.75rem' }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
            <Spinner size="lg" />
          </div>
        ) : records.length === 0 ? (
          <EmptyState
            icon={<Scale size={48} strokeWidth={1.5} color="var(--primary)" />}
            title="No Waste Records Found"
            message="No records match the current month and status filters."
          />
        ) : (
          <div className="table-responsive">
            <table className="sgms-table">
              <thead>
                <tr>
                  <th>Record #</th>
                  <th>Req #</th>
                  <th>Waste Type</th>
                  <th>Weight (kg)</th>
                  <th>Processing Status</th>
                  <th>Assigned Driver</th>
                  <th>Citizen / Location</th>
                  <th>Recorded At</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {records.map((r) => (
                  <tr key={r.id}>
                    <td><strong>#{r.id}</strong></td>
                    <td>#{r.collection_id || '—'}</td>
                    <td style={{ textTransform: 'capitalize' }}>
                      {r.waste_type || 'organic'}
                    </td>
                    <td>
                      <strong style={{ color: 'var(--primary)', fontSize: '0.95rem' }}>
                        {Number(r.weight_kg).toFixed(2)} kg
                      </strong>
                    </td>
                    <td>
                      <span
                        style={{
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          padding: '0.2rem 0.55rem',
                          borderRadius: 10,
                          background: r.processing_status === 'batched' ? 'var(--primary-soft)' : 'var(--warning-soft)',
                          color: r.processing_status === 'batched' ? 'var(--primary)' : '#b45309',
                          textTransform: 'capitalize'
                        }}
                      >
                        {r.processing_status || 'pending'}
                      </span>
                    </td>
                    <td>
                      {r.driver_name ? (
                        <div>
                          <strong>{r.driver_name}</strong>
                          <div style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>
                            {r.driver_vehicle_no}
                          </div>
                        </div>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td>
                      <div>
                        {r.user_name || 'Citizen'}
                        <div style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>
                          {r.bin_location || 'Bin'}
                        </div>
                      </div>
                    </td>
                    <td style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>
                      {new Date(r.recorded_at).toLocaleString([], {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </td>
                    <td>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleOpenEdit(r)}
                        icon={<Edit2 size={12} />}
                      >
                        Edit
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Edit Weight Modal */}
      <Modal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        title={`Correct Weight: Record #${recordToEdit?.id}`}
        maxWidth="440px"
      >
        <form onSubmit={handleConfirmEdit}>
          <p style={{ color: 'var(--muted)', fontSize: '0.88rem', marginBottom: '1.25rem' }}>
            Adjust the verified weight in kilograms logged by driver{' '}
            <strong>{recordToEdit?.driver_name || 'driver'}</strong>.
          </p>

          <FormField
            label="Corrected Weight (kg)"
            name="newWeight"
            type="number"
            step="0.01"
            min="0.1"
            max="1000"
            value={newWeight}
            onChange={(e) => setNewWeight(e.target.value)}
            required
          />

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.25rem' }}>
            <Button variant="secondary" onClick={() => setEditModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={updating}>
              Save Weight
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default AdminWaste;
