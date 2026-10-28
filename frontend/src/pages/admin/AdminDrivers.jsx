import React, { useState, useEffect } from 'react';
import {
  Truck,
  Plus,
  Edit2,
  CheckCircle2,
  XCircle,
  Star,
  MapPin,
  Phone,
  ShieldCheck
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

const AdminDrivers = () => {
  const { showToast } = useToast();

  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Add Modal State
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [submittingAdd, setSubmittingAdd] = useState(false);
  const [addForm, setAddForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    address: '',
    license_no: '',
    vehicle_no: '',
    service_area: 'Chengannur Central',
    base_latitude: 9.3159,
    base_longitude: 76.6151
  });

  // Edit Modal State
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [driverToEdit, setDriverToEdit] = useState(null);
  const [submittingEdit, setSubmittingEdit] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    phone: '',
    address: '',
    license_no: '',
    vehicle_no: '',
    service_area: '',
    base_latitude: 9.3159,
    base_longitude: 76.6151,
    is_available: true
  });

  // Toggle Active Modal
  const [toggleModalOpen, setToggleModalOpen] = useState(false);
  const [driverToToggle, setDriverToToggle] = useState(null);
  const [toggling, setToggling] = useState(false);

  const fetchDrivers = async () => {
    try {
      const res = await api.get('/admin/drivers');
      if (res.data?.data) {
        setDrivers(res.data.data);
      }
    } catch (err) {
      showToast('Could not load drivers list', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDrivers();
  }, []);

  // Open Add Driver Modal
  const handleOpenAdd = () => {
    setAddForm({
      name: '',
      email: '',
      phone: '',
      password: '',
      address: '',
      license_no: '',
      vehicle_no: '',
      service_area: 'Chengannur Central',
      base_latitude: 9.3159,
      base_longitude: 76.6151
    });
    setAddModalOpen(true);
  };

  const handleSubmitAdd = async (e) => {
    e.preventDefault();
    setSubmittingAdd(true);
    try {
      await api.post('/admin/drivers', {
        name: addForm.name.trim(),
        email: addForm.email.trim(),
        phone: addForm.phone.trim(),
        password: addForm.password,
        address: addForm.address.trim(),
        license_no: addForm.license_no.trim(),
        vehicle_no: addForm.vehicle_no.trim(),
        service_area: addForm.service_area.trim(),
        base_latitude: Number(addForm.base_latitude),
        base_longitude: Number(addForm.base_longitude)
      });

      showToast(`Driver ${addForm.name} created successfully!`, 'success');
      setAddModalOpen(false);
      fetchDrivers();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to create driver', 'error');
    } finally {
      setSubmittingAdd(false);
    }
  };

  // Open Edit Modal
  const handleOpenEdit = (d) => {
    setDriverToEdit(d);
    setEditForm({
      name: d.name,
      phone: d.phone || '',
      address: d.address || '',
      license_no: d.license_no,
      vehicle_no: d.vehicle_no,
      service_area: d.service_area || '',
      base_latitude: Number(d.base_latitude) || 9.3159,
      base_longitude: Number(d.base_longitude) || 76.6151,
      is_available: Boolean(d.is_available)
    });
    setEditModalOpen(true);
  };

  const handleSubmitEdit = async (e) => {
    e.preventDefault();
    if (!driverToEdit) return;

    setSubmittingEdit(true);
    try {
      await api.put(`/admin/drivers/${driverToEdit.id}`, {
        name: editForm.name.trim(),
        phone: editForm.phone.trim(),
        address: editForm.address.trim(),
        license_no: editForm.license_no.trim(),
        vehicle_no: editForm.vehicle_no.trim(),
        service_area: editForm.service_area.trim(),
        base_latitude: Number(editForm.base_latitude),
        base_longitude: Number(editForm.base_longitude),
        is_available: editForm.is_available
      });

      showToast('Driver details updated successfully.', 'success');
      setEditModalOpen(false);
      setDriverToEdit(null);
      fetchDrivers();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to update driver', 'error');
    } finally {
      setSubmittingEdit(false);
    }
  };

  // Toggle Active
  const handleOpenToggle = (d) => {
    setDriverToToggle(d);
    setToggleModalOpen(true);
  };

  const handleConfirmToggle = async () => {
    if (!driverToToggle) return;
    setToggling(true);
    try {
      const res = await api.put(`/admin/drivers/${driverToToggle.id}/toggle-active`);
      const newStatus = res.data?.data?.is_active;
      showToast(
        `Driver ${driverToToggle.name} is now ${newStatus ? 'Activated' : 'Deactivated'}.`,
        'success'
      );
      setToggleModalOpen(false);
      setDriverToToggle(null);
      fetchDrivers();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to toggle status', 'error');
    } finally {
      setToggling(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
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
            Collection Fleet & Drivers
          </h2>
          <p style={{ color: 'var(--muted)', fontSize: '0.9rem', marginTop: '0.2rem' }}>
            Manage authorized municipal drivers, vehicle registrations, and service zones.
          </p>
        </div>

        <Button
          variant="primary"
          onClick={handleOpenAdd}
          icon={<Plus size={16} />}
        >
          Add Driver
        </Button>
      </div>

      {/* Drivers Table */}
      <Card style={{ padding: '1.75rem' }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
            <Spinner size="lg" />
          </div>
        ) : drivers.length === 0 ? (
          <EmptyState
            icon={<Truck size={48} strokeWidth={1.5} color="var(--primary)" />}
            title="No Drivers Registered"
            message="Click 'Add Driver' to register your first municipal collection vehicle."
          />
        ) : (
          <div className="table-responsive">
            <table className="sgms-table">
              <thead>
                <tr>
                  <th>Driver Name</th>
                  <th>Contact Phone</th>
                  <th>Vehicle No</th>
                  <th>Service Area</th>
                  <th>Availability</th>
                  <th>Avg Rating</th>
                  <th>Total Pickups</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {drivers.map((d) => (
                  <tr key={d.id}>
                    <td>
                      <div>
                        <strong>{d.name}</strong>
                        <div style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>
                          License: {d.license_no}
                        </div>
                      </div>
                    </td>
                    <td>{d.phone || '—'}</td>
                    <td>
                      <span
                        style={{
                          background: 'var(--input-bg)',
                          border: '1px solid var(--border)',
                          padding: '0.2rem 0.5rem',
                          borderRadius: 6,
                          fontWeight: 700,
                          fontSize: '0.82rem'
                        }}
                      >
                        {d.vehicle_no}
                      </span>
                    </td>
                    <td>{d.service_area || 'Central'}</td>
                    <td>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.3rem',
                          fontSize: '0.82rem',
                          fontWeight: 700,
                          color: d.is_available ? 'var(--primary)' : 'var(--muted)'
                        }}
                      >
                        <span
                          style={{
                            width: 8,
                            height: 8,
                            borderRadius: '50%',
                            background: d.is_available ? 'var(--primary)' : 'var(--muted)'
                          }}
                        />
                        {d.is_available ? 'Available' : 'Busy / Off'}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <Star size={14} color="#f59e0b" fill="#f59e0b" />
                        <span style={{ fontWeight: 700, fontSize: '0.88rem' }}>
                          {Number(d.average_rating || 0).toFixed(1)}
                        </span>
                      </div>
                    </td>
                    <td>
                      <span style={{ fontWeight: 700, color: 'var(--primary)' }}>
                        {d.total_collections || 0}
                      </span>
                    </td>
                    <td>
                      <Badge status={d.driver_is_active ? 'active' : 'inactive'} />
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.4rem' }}>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => handleOpenEdit(d)}
                          title="Edit Driver Details"
                        >
                          <Edit2 size={13} />
                        </Button>
                        <Button
                          size="sm"
                          variant={d.driver_is_active ? 'danger' : 'secondary'}
                          onClick={() => handleOpenToggle(d)}
                        >
                          {d.driver_is_active ? 'Deactivate' : 'Activate'}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Add Driver Modal */}
      <Modal
        isOpen={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        title="Register New Collection Driver"
        maxWidth="600px"
      >
        <form onSubmit={handleSubmitAdd}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <FormField
              label="Driver Full Name"
              name="name"
              value={addForm.name}
              onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
              placeholder="e.g. Rajesh Kumar"
              required
            />

            <FormField
              label="Login Email"
              name="email"
              type="email"
              value={addForm.email}
              onChange={(e) => setAddForm({ ...addForm, email: e.target.value })}
              placeholder="driver@sgms.com"
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <FormField
              label="Contact Phone"
              name="phone"
              value={addForm.phone}
              onChange={(e) => setAddForm({ ...addForm, phone: e.target.value })}
              placeholder="9876543210"
              required
            />

            <FormField
              label="Temporary Password"
              name="password"
              type="password"
              value={addForm.password}
              onChange={(e) => setAddForm({ ...addForm, password: e.target.value })}
              placeholder="Min 6 characters"
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <FormField
              label="Driving License No"
              name="license_no"
              value={addForm.license_no}
              onChange={(e) => setAddForm({ ...addForm, license_no: e.target.value })}
              placeholder="KL-30-2023-001"
              required
            />

            <FormField
              label="Vehicle Registration No"
              name="vehicle_no"
              value={addForm.vehicle_no}
              onChange={(e) => setAddForm({ ...addForm, vehicle_no: e.target.value })}
              placeholder="KL-30-A-1111"
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <FormField
              label="Service Area / Ward"
              name="service_area"
              value={addForm.service_area}
              onChange={(e) => setAddForm({ ...addForm, service_area: e.target.value })}
              placeholder="e.g. Chengannur North"
              required
            />

            <FormField
              label="Residential Address"
              name="address"
              value={addForm.address}
              onChange={(e) => setAddForm({ ...addForm, address: e.target.value })}
              placeholder="House, locality"
              required
            />
          </div>

          <div style={{ margin: '1rem 0' }}>
            <label className="form-label" style={{ marginBottom: '0.4rem', display: 'block' }}>
              Base Depot GPS Coordinates on Map
            </label>
            <MapPicker
              lat={addForm.base_latitude}
              lng={addForm.base_longitude}
              onChange={({ lat, lng }) =>
                setAddForm((prev) => ({ ...prev, base_latitude: lat, base_longitude: lng }))
              }
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.25rem' }}>
            <Button variant="secondary" onClick={() => setAddModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={submittingAdd}>
              Create Driver Profile
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit Driver Modal */}
      <Modal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        title={`Edit Driver: ${driverToEdit?.name || ''}`}
        maxWidth="600px"
      >
        <form onSubmit={handleSubmitEdit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <FormField
              label="Driver Name"
              name="edit_name"
              value={editForm.name}
              onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
              required
            />

            <FormField
              label="Contact Phone"
              name="edit_phone"
              value={editForm.phone}
              onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <FormField
              label="Driving License No"
              name="edit_license"
              value={editForm.license_no}
              onChange={(e) => setEditForm({ ...editForm, license_no: e.target.value })}
              required
            />

            <FormField
              label="Vehicle No"
              name="edit_vehicle"
              value={editForm.vehicle_no}
              onChange={(e) => setEditForm({ ...editForm, vehicle_no: e.target.value })}
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <FormField
              label="Service Area"
              name="edit_area"
              value={editForm.service_area}
              onChange={(e) => setEditForm({ ...editForm, service_area: e.target.value })}
              required
            />

            <FormField
              label="Residential Address"
              name="edit_address"
              value={editForm.address}
              onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={editForm.is_available}
                onChange={(e) => setEditForm({ ...editForm, is_available: e.target.checked })}
              />
              <span>Driver is Currently Available for Dispatches</span>
            </label>
          </div>

          <div style={{ margin: '1rem 0' }}>
            <label className="form-label" style={{ marginBottom: '0.4rem', display: 'block' }}>
              Base Coordinates
            </label>
            <MapPicker
              lat={editForm.base_latitude}
              lng={editForm.base_longitude}
              onChange={({ lat, lng }) =>
                setEditForm((prev) => ({ ...prev, base_latitude: lat, base_longitude: lng }))
              }
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.25rem' }}>
            <Button variant="secondary" onClick={() => setEditModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={submittingEdit}>
              Save Driver Changes
            </Button>
          </div>
        </form>
      </Modal>

      {/* Toggle Modal */}
      <Modal
        isOpen={toggleModalOpen}
        onClose={() => setToggleModalOpen(false)}
        title={driverToToggle?.driver_is_active ? 'Deactivate Driver' : 'Activate Driver'}
        maxWidth="440px"
      >
        <p style={{ color: 'var(--muted)', fontSize: '0.92rem', marginBottom: '1.25rem' }}>
          Are you sure you want to {driverToToggle?.driver_is_active ? 'deactivate' : 'activate'}{' '}
          <strong>{driverToToggle?.name}</strong>?
          {driverToToggle?.driver_is_active && ' They will be removed from route dispatching until reactivated.'}
        </p>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
          <Button variant="secondary" onClick={() => setToggleModalOpen(false)}>
            Cancel
          </Button>
          <Button
            variant={driverToToggle?.driver_is_active ? 'danger' : 'primary'}
            loading={toggling}
            onClick={handleConfirmToggle}
          >
            Confirm
          </Button>
        </div>
      </Modal>
    </div>
  );
};

export default AdminDrivers;
