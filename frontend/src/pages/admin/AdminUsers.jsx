import React, { useState, useEffect } from 'react';
import { Users, Search, UserCheck, UserX, Phone, Mail, ShieldAlert } from 'lucide-react';
import api from '../../api/axios';
import { useToast } from '../../context/ToastContext';
import Card from '../../components/Card';
import Button from '../../components/Button';
import Badge from '../../components/Badge';
import Modal from '../../components/Modal';
import Spinner from '../../components/Spinner';
import EmptyState from '../../components/EmptyState';

const AdminUsers = () => {
  const { showToast } = useToast();

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Toggle active modal
  const [toggleModalOpen, setToggleModalOpen] = useState(false);
  const [userToToggle, setUserToToggle] = useState(null);
  const [toggling, setToggling] = useState(false);

  const fetchUsers = async (query = '') => {
    setLoading(true);
    try {
      const url = query ? `/admin/users?search=${encodeURIComponent(query)}` : '/admin/users';
      const res = await api.get(url);
      if (res.data?.data) {
        setUsers(res.data.data);
      }
    } catch (err) {
      showToast('Could not load users list', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchUsers(search);
  };

  const handleOpenToggle = (u) => {
    setUserToToggle(u);
    setToggleModalOpen(true);
  };

  const handleConfirmToggle = async () => {
    if (!userToToggle) return;
    setToggling(true);
    try {
      const res = await api.put(`/admin/users/${userToToggle.id}/toggle-active`);
      const newStatus = res.data?.data?.is_active;
      showToast(
        `User ${userToToggle.name} is now ${newStatus ? 'Activated' : 'Deactivated'}.`,
        'success'
      );
      setToggleModalOpen(false);
      setUserToToggle(null);
      fetchUsers(search);
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to toggle user status', 'error');
    } finally {
      setToggling(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      {/* Header & Search */}
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
            Citizen User Directory
          </h2>
          <p style={{ color: 'var(--muted)', fontSize: '0.9rem', marginTop: '0.2rem' }}>
            Manage registered household accounts, active plans, and account status.
          </p>
        </div>

        <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '0.5rem', minWidth: 280 }}>
          <input
            type="text"
            className="form-input"
            placeholder="Search name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Button type="submit" variant="primary" icon={<Search size={16} />}>
            Search
          </Button>
        </form>
      </div>

      {/* Users Table */}
      <Card style={{ padding: '1.75rem' }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
            <Spinner size="lg" />
          </div>
        ) : users.length === 0 ? (
          <EmptyState
            icon={<Users size={48} strokeWidth={1.5} color="var(--primary)" />}
            title="No Users Found"
            message={search ? `No accounts matching "${search}".` : 'No registered users found.'}
          />
        ) : (
          <div className="table-responsive">
            <table className="sgms-table">
              <thead>
                <tr>
                  <th>Citizen Name</th>
                  <th>Contact Email</th>
                  <th>Phone Number</th>
                  <th>Assigned Bins</th>
                  <th>Active Plan</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id}>
                    <td>
                      <strong>{u.name}</strong>
                    </td>
                    <td style={{ color: 'var(--muted)', fontSize: '0.88rem' }}>
                      {u.email}
                    </td>
                    <td>{u.phone || '—'}</td>
                    <td>
                      <span style={{ fontWeight: 700, color: 'var(--primary)' }}>
                        {u.bins_count || 0} bins
                      </span>
                    </td>
                    <td>
                      {u.active_plan_name ? (
                        <span
                          style={{
                            background: 'var(--primary-soft)',
                            color: 'var(--primary)',
                            padding: '0.2rem 0.55rem',
                            borderRadius: 10,
                            fontSize: '0.78rem',
                            fontWeight: 700
                          }}
                        >
                          {u.active_plan_name}
                        </span>
                      ) : (
                        <span style={{ color: 'var(--muted)', fontSize: '0.82rem' }}>No Plan</span>
                      )}
                    </td>
                    <td>
                      <Badge status={u.is_active ? 'active' : 'inactive'} />
                    </td>
                    <td>
                      <Button
                        size="sm"
                        variant={u.is_active ? 'danger' : 'secondary'}
                        onClick={() => handleOpenToggle(u)}
                      >
                        {u.is_active ? 'Deactivate' : 'Activate'}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Toggle Active Confirmation Modal */}
      <Modal
        isOpen={toggleModalOpen}
        onClose={() => setToggleModalOpen(false)}
        title={userToToggle?.is_active ? 'Deactivate Citizen Account' : 'Activate Citizen Account'}
        maxWidth="440px"
      >
        <p style={{ color: 'var(--muted)', fontSize: '0.92rem', marginBottom: '1.25rem' }}>
          Are you sure you want to {userToToggle?.is_active ? 'deactivate' : 'activate'} the account for{' '}
          <strong>{userToToggle?.name}</strong> ({userToToggle?.email})?
          {userToToggle?.is_active && ' They will be blocked from logging in until reactivated.'}
        </p>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
          <Button variant="secondary" onClick={() => setToggleModalOpen(false)}>
            Cancel
          </Button>
          <Button
            variant={userToToggle?.is_active ? 'danger' : 'primary'}
            loading={toggling}
            onClick={handleConfirmToggle}
          >
            Confirm {userToToggle?.is_active ? 'Deactivation' : 'Activation'}
          </Button>
        </div>
      </Modal>
    </div>
  );
};

export default AdminUsers;
