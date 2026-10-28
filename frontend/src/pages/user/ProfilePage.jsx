import React, { useState, useEffect } from 'react';
import { User, KeyRound, Save, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import api from '../../api/axios';
import Card from '../../components/Card';
import FormField from '../../components/FormField';
import Button from '../../components/Button';

const ProfilePage = () => {
  const { user, updateUser } = useAuth();
  const { showToast } = useToast();

  // Profile form state
  const [profileData, setProfileData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    address: user?.address || ''
  });
  const [profileSaving, setProfileSaving] = useState(false);

  // Password form state
  const [passwordData, setPasswordData] = useState({
    current_password: '',
    new_password: '',
    confirm_new_password: ''
  });
  const [passwordSaving, setPasswordSaving] = useState(false);

  useEffect(() => {
    if (user) {
      setProfileData({
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
        address: user.address || ''
      });
    }
  }, [user]);

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    if (!profileData.name.trim() || !profileData.phone.trim() || !profileData.address.trim()) {
      showToast('Name, phone, and address are required.', 'error');
      return;
    }

    setProfileSaving(true);
    try {
      const res = await api.put('/auth/profile', {
        name: profileData.name.trim(),
        phone: profileData.phone.trim(),
        address: profileData.address.trim()
      });
      if (res.data?.data) {
        updateUser(res.data.data);
      }
      showToast('Profile information updated successfully!', 'success');
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to update profile.', 'error');
    } finally {
      setProfileSaving(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    if (!passwordData.current_password) {
      showToast('Current password is required', 'error');
      return;
    }
    if (!passwordData.new_password || passwordData.new_password.length < 6) {
      showToast('New password must be at least 6 characters', 'error');
      return;
    }
    if (passwordData.new_password !== passwordData.confirm_new_password) {
      showToast('New passwords do not match', 'error');
      return;
    }

    setPasswordSaving(true);
    try {
      await api.put('/auth/password', {
        current_password: passwordData.current_password,
        new_password: passwordData.new_password
      });
      showToast('Password changed successfully!', 'success');
      setPasswordData({
        current_password: '',
        new_password: '',
        confirm_new_password: ''
      });
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to change password.', 'error');
    } finally {
      setPasswordSaving(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', maxWidth: 800 }}>
      {/* Header */}
      <div>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text)' }}>
          Account & Profile
        </h2>
        <p style={{ color: 'var(--muted)', fontSize: '0.9rem', marginTop: '0.2rem' }}>
          Update your contact details and manage your account security.
        </p>
      </div>

      {/* Profile Information Form */}
      <Card style={{ padding: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '1.5rem' }}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              background: 'var(--primary-soft)',
              color: 'var(--primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <User size={20} />
          </div>
          <div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text)' }}>
              Personal Details
            </h3>
            <span style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>
              Your pickup contact info and registered address
            </span>
          </div>
        </div>

        <form onSubmit={handleProfileSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
            <FormField
              label="Full Name"
              name="name"
              value={profileData.name}
              onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
              required
            />

            <FormField
              label="Email Address"
              name="email"
              type="email"
              value={profileData.email}
              disabled
              helpText="Email address cannot be changed."
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
            <FormField
              label="Phone Number"
              name="phone"
              type="tel"
              value={profileData.phone}
              onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
              required
            />

            <FormField
              label="Account Role"
              name="role"
              value={user?.role?.toUpperCase() || 'USER'}
              disabled
            />
          </div>

          <FormField
            label="Collection Address"
            name="address"
            type="textarea"
            rows={3}
            value={profileData.address}
            onChange={(e) => setProfileData({ ...profileData, address: e.target.value })}
            helpText="This is the default address where waste collection vehicles will navigate."
            required
          />

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
            <Button
              type="submit"
              variant="primary"
              loading={profileSaving}
              icon={<Save size={16} />}
            >
              Save Profile Changes
            </Button>
          </div>
        </form>
      </Card>

      {/* Change Password Form */}
      <Card style={{ padding: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '1.5rem' }}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              background: 'var(--warning-soft)',
              color: '#b45309',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <KeyRound size={20} />
          </div>
          <div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text)' }}>
              Change Password
            </h3>
            <span style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>
              Keep your account secure with a strong password
            </span>
          </div>
        </div>

        <form onSubmit={handlePasswordSubmit}>
          <FormField
            label="Current Password"
            name="current_password"
            type="password"
            value={passwordData.current_password}
            onChange={(e) => setPasswordData({ ...passwordData, current_password: e.target.value })}
            placeholder="Enter current password"
            required
          />

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
            <FormField
              label="New Password"
              name="new_password"
              type="password"
              value={passwordData.new_password}
              onChange={(e) => setPasswordData({ ...passwordData, new_password: e.target.value })}
              placeholder="Minimum 6 characters"
              required
            />

            <FormField
              label="Confirm New Password"
              name="confirm_new_password"
              type="password"
              value={passwordData.confirm_new_password}
              onChange={(e) => setPasswordData({ ...passwordData, confirm_new_password: e.target.value })}
              placeholder="Re-type new password"
              required
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
            <Button
              type="submit"
              variant="secondary"
              loading={passwordSaving}
              icon={<ShieldCheck size={16} />}
            >
              Update Password
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};

export default ProfilePage;
