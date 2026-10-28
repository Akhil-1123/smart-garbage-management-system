import React, { useState, useEffect } from 'react';
import {
  User,
  Truck,
  ShieldCheck,
  KeyRound,
  Save,
  Lock,
  MapPin,
  FileText,
  AlertCircle
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import api from '../../api/axios';
import Card from '../../components/Card';
import FormField from '../../components/FormField';
import Button from '../../components/Button';
import Spinner from '../../components/Spinner';

const DriverProfile = () => {
  const { user, updateUser } = useAuth();
  const { showToast } = useToast();

  const [driverInfo, setDriverInfo] = useState(null);
  const [loading, setLoading] = useState(true);

  // Editable Contact State
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [savingContact, setSavingContact] = useState(false);

  // Password State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  const fetchDriverDetails = async () => {
    try {
      const res = await api.get('/driver/profile');
      if (res.data?.data) {
        const d = res.data.data.driver;
        setDriverInfo(d);
        setName(d.name || user?.name || '');
        setPhone(d.phone || user?.phone || '');
        setAddress(d.address || user?.address || '');
      }
    } catch (err) {
      showToast('Could not load driver profile details', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDriverDetails();
  }, []);

  const handleUpdateContact = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      showToast('Full name is required', 'error');
      return;
    }
    if (!phone.trim()) {
      showToast('Phone number is required', 'error');
      return;
    }

    setSavingContact(true);
    try {
      const res = await api.put('/auth/profile', {
        name: name.trim(),
        phone: phone.trim(),
        address: address ? address.trim() : undefined
      });

      if (res.data?.data) {
        updateUser(res.data.data);
      }
      showToast('Contact details updated successfully', 'success');
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to update contact info', 'error');
    } finally {
      setSavingContact(false);
    }
  };

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    if (!currentPassword) {
      showToast('Current password is required', 'error');
      return;
    }
    if (!newPassword || newPassword.length < 6) {
      showToast('New password must be at least 6 characters', 'error');
      return;
    }
    if (newPassword !== confirmPassword) {
      showToast('New passwords do not match', 'error');
      return;
    }

    setSavingPassword(true);
    try {
      await api.put('/auth/password', {
        current_password: currentPassword,
        new_password: newPassword
      });

      showToast('Password updated successfully', 'success');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to change password', 'error');
    } finally {
      setSavingPassword(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      {/* Page Title */}
      <div>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text)' }}>
          Driver Profile & Settings
        </h2>
        <p style={{ color: 'var(--muted)', fontSize: '0.9rem', marginTop: '0.2rem' }}>
          View authorized fleet credentials, update contact information, and manage your account security.
        </p>
      </div>

      {/* Read-Only Vehicle & Operational Details Banner */}
      <Card style={{ padding: '1.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
          <Truck size={20} color="var(--primary)" />
          <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text)' }}>
            Authorized Vehicle & Route Credentials
          </h3>
          <span
            style={{
              marginLeft: 'auto',
              fontSize: '0.75rem',
              fontWeight: 700,
              padding: '0.2rem 0.6rem',
              borderRadius: 8,
              background: 'var(--primary-soft)',
              color: 'var(--primary)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem'
            }}
          >
            <ShieldCheck size={14} />
            Verified Municipal Operator
          </span>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '1.25rem',
            background: '#f8faf9',
            padding: '1.25rem',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border)'
          }}
        >
          <div>
            <span style={{ fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--muted)' }}>
              Driving License No
            </span>
            <div style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text)', marginTop: '0.25rem' }}>
              {driverInfo?.license_no || 'N/A'}
            </div>
          </div>

          <div>
            <span style={{ fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--muted)' }}>
              Assigned Vehicle Reg
            </span>
            <div style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text)', marginTop: '0.25rem' }}>
              {driverInfo?.vehicle_no || 'N/A'}
            </div>
          </div>

          <div>
            <span style={{ fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--muted)' }}>
              Service Zone
            </span>
            <div style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--primary)', marginTop: '0.25rem' }}>
              {driverInfo?.service_area || 'Zone-wide'}
            </div>
          </div>

          <div>
            <span style={{ fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--muted)' }}>
              Base Depot GPS Coordinates
            </span>
            <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text)', marginTop: '0.25rem' }}>
              {driverInfo?.base_latitude != null && driverInfo?.base_longitude != null
                ? `${Number(driverInfo.base_latitude).toFixed(4)}, ${Number(driverInfo.base_longitude).toFixed(4)}`
                : 'Not Set'}
            </div>
          </div>
        </div>

        <p style={{ color: 'var(--muted)', fontSize: '0.8rem', marginTop: '0.75rem', fontStyle: 'italic' }}>
          Note: Vehicle registration numbers, license details, and operating depots can only be modified by municipal administrators.
        </p>
      </Card>

      {/* Dual Column: Editable Contact Information & Password Security */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
          gap: '1.5rem'
        }}
      >
        {/* Contact Information Form */}
        <Card style={{ padding: '1.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
            <User size={20} color="var(--primary)" />
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text)' }}>
              Personal & Contact Information
            </h3>
          </div>

          <form onSubmit={handleUpdateContact} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <FormField
              label="Full Name"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
            />

            <FormField
              label="Email Address"
              type="email"
              disabled
              value={driverInfo?.email || user?.email || ''}
              helper="Email is managed by system administration"
            />

            <FormField
              label="Contact Phone Number"
              type="tel"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />

            <FormField
              label="Residential Address"
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />

            <div style={{ marginTop: '0.5rem' }}>
              <Button type="submit" loading={savingContact}>
                <Save size={16} />
                Save Contact Info
              </Button>
            </div>
          </form>
        </Card>

        {/* Password & Security Form */}
        <Card style={{ padding: '1.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
            <KeyRound size={20} color="var(--primary)" />
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text)' }}>
              Change Driver Password
            </h3>
          </div>

          <form onSubmit={handleUpdatePassword} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <FormField
              label="Current Password"
              type="password"
              required
              placeholder="••••••••"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
            />

            <FormField
              label="New Password"
              type="password"
              required
              placeholder="At least 6 characters"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />

            <FormField
              label="Confirm New Password"
              type="password"
              required
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />

            <div style={{ marginTop: '0.5rem' }}>
              <Button type="submit" variant="secondary" loading={savingPassword}>
                <Lock size={16} />
                Update Password
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
};

export default DriverProfile;
