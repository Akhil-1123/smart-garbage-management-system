import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend
} from 'recharts';
import {
  Users,
  Truck,
  Trash2,
  Clock,
  Scale,
  Package,
  ArrowRight,
  AlertCircle,
  MessageSquare,
  CheckCircle2,
  Calendar
} from 'lucide-react';
import api from '../../api/axios';
import { useToast } from '../../context/ToastContext';
import Card from '../../components/Card';
import StatCard from '../../components/StatCard';
import Badge from '../../components/Badge';
import Button from '../../components/Button';
import Spinner from '../../components/Spinner';

const STATUS_COLORS = {
  pending: '#f0a830',
  approved: '#3b82c4',
  driver_assigned: '#8b5cf6',
  collected: '#2e7d4f',
  cancelled: '#d9534f'
};

const PIE_PALETTE = ['#2e7d4f', '#3b82c4', '#f0a830', '#8b5cf6', '#10b981', '#ec4899'];

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState(null);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const res = await api.get('/admin/dashboard');
        if (res.data?.data) {
          setDashboardData(res.data.data);
        }
      } catch (err) {
        showToast('Failed to load administrative dashboard', 'error');
      } finally {
        setLoading(false);
      }
    };
    fetchDashboard();
  }, []);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 340 }}>
        <Spinner size="lg" />
      </div>
    );
  }

  const counters = dashboardData?.counters || {};
  const monthlyWaste = dashboardData?.monthly_waste || [];
  const wasteByType = dashboardData?.waste_by_type || [];
  const requestsByStatusRaw = dashboardData?.requests_by_status || {};

  // Transform requestsByStatus into pie array
  const requestsByStatus = Object.entries(requestsByStatusRaw).map(([status, count]) => ({
    name: status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
    statusKey: status,
    value: Number(count)
  })).filter((item) => item.value > 0);

  const recentRequests = dashboardData?.recent_requests || [];
  const recentOrders = dashboardData?.recent_orders || [];
  const fullBins = dashboardData?.full_bins || [];
  const recentFeedback = dashboardData?.recent_feedback || [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Top Welcome Title */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.65rem', fontWeight: 800, color: 'var(--text)' }}>
            System Operations Dashboard
          </h2>
          <p style={{ color: 'var(--muted)', fontSize: '0.92rem', marginTop: '0.2rem' }}>
            Real-time municipal waste operations, fleet dispatches, and circular compost metrics.
          </p>
        </div>

        <Button
          variant="primary"
          onClick={() => navigate('/admin/requests')}
          icon={<Clock size={16} />}
        >
          View Pending Requests ({counters.pending_requests || 0})
        </Button>
      </div>

      {/* 6 StatCards Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '1.25rem'
        }}
      >
        <StatCard
          icon={<Users size={22} />}
          label="Total Citizens"
          value={counters.total_users ?? 0}
          color="var(--primary)"
          onClick={() => navigate('/admin/users')}
        />

        <StatCard
          icon={<Truck size={22} />}
          label="Active Drivers"
          value={counters.total_drivers ?? 0}
          color="var(--info)"
          onClick={() => navigate('/admin/drivers')}
        />

        <StatCard
          icon={<Trash2 size={22} />}
          label="Registered Bins"
          value={counters.total_bins ?? 0}
          color="#0369a1"
          onClick={() => navigate('/admin/bins')}
        />

        <StatCard
          icon={<Clock size={22} />}
          label="Pending Requests"
          value={counters.pending_requests ?? 0}
          color="var(--warning)"
          onClick={() => navigate('/admin/requests')}
        />

        <StatCard
          icon={<Scale size={22} />}
          label="Total Waste"
          value={`${Number(counters.total_waste_kg || 0).toFixed(0)} kg`}
          color="#8b5cf6"
          onClick={() => navigate('/admin/waste')}
        />

        <StatCard
          icon={<Package size={22} />}
          label="Total Orders"
          value={counters.total_orders ?? 0}
          color="var(--primary)"
          onClick={() => navigate('/admin/orders')}
        />
      </div>

      {/* Charts Row: BarChart + 2 PieCharts */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '1.5rem'
        }}
      >
        {/* Monthly Waste BarChart */}
        <Card style={{ padding: '1.75rem' }}>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text)', marginBottom: '0.4rem' }}>
            Monthly Waste Collection (kg)
          </h3>
          <span style={{ fontSize: '0.8rem', color: 'var(--muted)', display: 'block', marginBottom: '1.25rem' }}>
            Last 6 months aggregate intake
          </span>

          <div style={{ width: '100%', height: 260 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyWaste} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#edf2ef" />
                <XAxis dataKey="label" stroke="var(--muted)" fontSize={12} tickLine={false} />
                <YAxis stroke="var(--muted)" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{
                    background: '#ffffff',
                    borderRadius: 12,
                    boxShadow: 'var(--shadow)',
                    border: 'none',
                    fontSize: '0.85rem'
                  }}
                  formatter={(val) => [`${Number(val).toFixed(1)} kg`, 'Waste Collected']}
                />
                <Bar dataKey="kg" fill="var(--primary)" radius={[6, 6, 0, 0]} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Waste by Type PieChart */}
        <Card style={{ padding: '1.75rem' }}>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text)', marginBottom: '0.4rem' }}>
            Waste Intake by Type
          </h3>
          <span style={{ fontSize: '0.8rem', color: 'var(--muted)', display: 'block', marginBottom: '1.25rem' }}>
            Proportion of categorized waste
          </span>

          <div style={{ width: '100%', height: 260 }}>
            {wasteByType.length === 0 ? (
              <div style={{ textAlign: 'center', paddingTop: '5rem', color: 'var(--muted)', fontSize: '0.9rem' }}>
                No waste records logged yet.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={wasteByType}
                    dataKey="kg"
                    nameKey="type"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    innerRadius={45}
                    paddingAngle={3}
                  >
                    {wasteByType.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_PALETTE[index % PIE_PALETTE.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: '#ffffff',
                      borderRadius: 12,
                      boxShadow: 'var(--shadow)',
                      border: 'none',
                      fontSize: '0.85rem'
                    }}
                    formatter={(val) => [`${Number(val).toFixed(1)} kg`, 'Volume']}
                  />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '0.8rem' }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>

        {/* Requests by Status PieChart */}
        <Card style={{ padding: '1.75rem' }}>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text)', marginBottom: '0.4rem' }}>
            Requests by Status
          </h3>
          <span style={{ fontSize: '0.8rem', color: 'var(--muted)', display: 'block', marginBottom: '1.25rem' }}>
            Current pipeline distribution
          </span>

          <div style={{ width: '100%', height: 260 }}>
            {requestsByStatus.length === 0 ? (
              <div style={{ textAlign: 'center', paddingTop: '5rem', color: 'var(--muted)', fontSize: '0.9rem' }}>
                No collection requests logged.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={requestsByStatus}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    innerRadius={45}
                    paddingAngle={3}
                  >
                    {requestsByStatus.map((entry, index) => (
                      <Cell
                        key={`status-cell-${index}`}
                        fill={STATUS_COLORS[entry.statusKey] || '#64748b'}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: '#ffffff',
                      borderRadius: 12,
                      boxShadow: 'var(--shadow)',
                      border: 'none',
                      fontSize: '0.85rem'
                    }}
                    formatter={(val) => [val, 'Count']}
                  />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '0.8rem' }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>
      </div>

      {/* Row: Recent Requests & Recent Orders */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
          gap: '1.5rem'
        }}
      >
        {/* Recent Requests Table */}
        <Card style={{ padding: '1.75rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text)' }}>
              Recent Collection Requests
            </h3>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => navigate('/admin/requests')}
              icon={<ArrowRight size={14} />}
            >
              All Requests
            </Button>
          </div>

          {recentRequests.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem 0', color: 'var(--muted)', fontSize: '0.9rem' }}>
              No recent collection requests.
            </div>
          ) : (
            <div className="table-responsive">
              <table className="sgms-table">
                <thead>
                  <tr>
                    <th>Req #</th>
                    <th>Citizen</th>
                    <th>Location</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recentRequests.map((r) => (
                    <tr
                      key={r.id}
                      onClick={() => navigate('/admin/requests')}
                      style={{ cursor: 'pointer' }}
                      title="Click to view in Requests"
                    >
                      <td><strong>#{r.id}</strong></td>
                      <td>{r.user_name}</td>
                      <td>{r.bin_location || 'Designated bin'}</td>
                      <td>
                        <Badge status={r.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {/* Recent Orders Table */}
        <Card style={{ padding: '1.75rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text)' }}>
              Recent Compost Orders
            </h3>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => navigate('/admin/orders')}
              icon={<ArrowRight size={14} />}
            >
              All Orders
            </Button>
          </div>

          {recentOrders.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem 0', color: 'var(--muted)', fontSize: '0.9rem' }}>
              No recent store orders.
            </div>
          ) : (
            <div className="table-responsive">
              <table className="sgms-table">
                <thead>
                  <tr>
                    <th>Order #</th>
                    <th>Customer</th>
                    <th>Total</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recentOrders.map((o) => (
                    <tr
                      key={o.id}
                      onClick={() => navigate('/admin/orders')}
                      style={{ cursor: 'pointer' }}
                      title="Click to view in Orders"
                    >
                      <td><strong>#{o.id}</strong></td>
                      <td>{o.user_name}</td>
                      <td>₹{Number(o.total_amount).toFixed(2)}</td>
                      <td>
                        <Badge status={o.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>

      {/* Row: Full Bins Alert List & Recent Feedback */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
          gap: '1.5rem'
        }}
      >
        {/* Full Bins Attention List */}
        <Card style={{ padding: '1.75rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text)' }}>
                Full Bins Requiring Pickup
              </h3>
              <span style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>
                Smart bins reaching 100% capacity
              </span>
            </div>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => navigate('/admin/bins')}
            >
              All Bins
            </Button>
          </div>

          {fullBins.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem 0', color: 'var(--muted)', fontSize: '0.9rem' }}>
              🎉 No full bins reported. All citizen bins have available capacity.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {fullBins.map((bin) => (
                <div
                  key={bin.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.75rem 1rem',
                    borderRadius: 'var(--radius-sm)',
                    background: 'var(--danger-soft)',
                    border: '1px solid #f9d5d5'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                    <AlertCircle size={18} color="var(--danger)" />
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text)' }}>
                        {bin.location}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>
                        Owner: {bin.owner_name} ({bin.owner_phone}) • {bin.capacity_kg} kg
                      </div>
                    </div>
                  </div>

                  <Badge status="full" />
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Recent Feedback & Complaints */}
        <Card style={{ padding: '1.75rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text)' }}>
                Recent Citizen Grievances & Feedback
              </h3>
              <span style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>
                Latest tickets logged by residents
              </span>
            </div>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => navigate('/admin/feedback')}
            >
              Support Desk
            </Button>
          </div>

          {recentFeedback.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem 0', color: 'var(--muted)', fontSize: '0.9rem' }}>
              No feedback or complaints submitted yet.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {recentFeedback.map((fb) => (
                <div
                  key={fb.id}
                  onClick={() => navigate('/admin/feedback')}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    padding: '0.75rem 1rem',
                    borderRadius: 'var(--radius-sm)',
                    background: 'var(--input-bg)',
                    border: '1px solid var(--border)',
                    cursor: 'pointer'
                  }}
                >
                  <div style={{ minWidth: 0, flex: 1, marginRight: '0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <span style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text)' }}>
                        {fb.user_name}
                      </span>
                      <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: 'var(--muted)' }}>
                        ({fb.type})
                      </span>
                    </div>
                    <div
                      style={{
                        fontSize: '0.82rem',
                        color: 'var(--muted)',
                        marginTop: '0.2rem',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}
                    >
                      {fb.message}
                    </div>
                  </div>

                  <Badge status={fb.status || 'open'} />
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default AdminDashboard;
