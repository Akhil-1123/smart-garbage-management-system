import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CreditCard,
  Trash2,
  Clock,
  Scale,
  ArrowRight,
  PlusCircle,
  Calendar,
  AlertCircle
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axios';
import Card from '../../components/Card';
import StatCard from '../../components/StatCard';
import Badge from '../../components/Badge';
import Button from '../../components/Button';
import Spinner from '../../components/Spinner';
import EmptyState from '../../components/EmptyState';

const UserDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState(null);
  const [bins, setBins] = useState([]);
  const [requests, setRequests] = useState([]);
  const [totalKg, setTotalKg] = useState(0);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [subRes, binsRes, reqRes, repRes] = await Promise.allSettled([
          api.get('/subscriptions/my'),
          api.get('/bins/my'),
          api.get('/collections/my'),
          api.get('/reports/my/monthly')
        ]);

        // 1. Subscription
        if (subRes.status === 'fulfilled' && subRes.value.data?.data) {
          const list = subRes.value.data.data;
          const activeSub = list.find((s) => s.is_current || s.status === 'active');
          if (activeSub) {
            const daysLeft = Math.max(
              0,
              Math.ceil((new Date(activeSub.end_date) - new Date()) / (1000 * 60 * 60 * 24))
            );
            setSubscription({ ...activeSub, daysLeft });
          } else {
            setSubscription(null);
          }
        }

        // 2. Bins
        if (binsRes.status === 'fulfilled' && binsRes.value.data?.data) {
          setBins(binsRes.value.data.data);
        }

        // 3. Requests
        if (reqRes.status === 'fulfilled' && reqRes.value.data?.data) {
          setRequests(reqRes.value.data.data);
        }

        // 4. Report totals
        if (repRes.status === 'fulfilled' && repRes.value.data?.data) {
          setTotalKg(repRes.value.data.data.totals?.total_kg || 0);
        }
      } catch (err) {
        console.error('Error fetching dashboard metrics', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 300 }}>
        <Spinner size="lg" />
      </div>
    );
  }

  const openRequestsCount = requests.filter((r) =>
    ['pending', 'approved', 'driver_assigned'].includes(r.status)
  ).length;

  const latestThreeRequests = requests.slice(0, 3);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Welcome Banner */}
      <div
        style={{
          background: 'linear-gradient(135deg, #ffffff 0%, #f7faf8 100%)',
          padding: '1.75rem 2rem',
          borderRadius: 'var(--radius)',
          boxShadow: 'var(--shadow)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem'
        }}
      >
        <div>
          <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text)' }}>
            Welcome back, {user?.name || 'Citizen'}!
          </h2>
          <p style={{ color: 'var(--muted)', fontSize: '0.95rem', marginTop: '0.25rem' }}>
            Here is what is happening with your bins and waste collections today.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => navigate('/app/bins')}
            icon={<Trash2 size={16} />}
          >
            Manage Bins
          </Button>
          {!subscription && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => navigate('/app/subscription')}
              icon={<CreditCard size={16} />}
            >
              Subscribe Now
            </Button>
          )}
        </div>
      </div>

      {/* 4 StatCards Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))',
          gap: '1.25rem'
        }}
      >
        <StatCard
          icon={<CreditCard size={24} />}
          label="Active Subscription"
          value={subscription ? subscription.plan_name : 'No Plan'}
          subtext={
            subscription
              ? `${subscription.daysLeft} days remaining`
              : 'Tap to activate door collections'
          }
          color="var(--primary)"
          onClick={() => navigate('/app/subscription')}
        />

        <StatCard
          icon={<Trash2 size={24} />}
          label="Total Bins"
          value={bins.length}
          subtext={bins.length > 0 ? `${bins.filter((b) => b.fill_status === 'full').length} currently full` : 'No bins added'}
          color="var(--info)"
          onClick={() => navigate('/app/bins')}
        />

        <StatCard
          icon={<Clock size={24} />}
          label="Open Requests"
          value={openRequestsCount}
          subtext={openRequestsCount > 0 ? 'Collection in progress' : 'No pending pickups'}
          color="var(--warning)"
          onClick={() => navigate('/app/requests')}
        />

        <StatCard
          icon={<Scale size={24} />}
          label="Waste Collected"
          value={`${Number(totalKg).toFixed(1)} kg`}
          subtext="Total lifetime collected"
          color="#8b5cf6"
          onClick={() => navigate('/app/report')}
        />
      </div>

      {/* Two Column Section: Quick Bins & Latest Requests */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
          gap: '1.5rem'
        }}
      >
        {/* Quick Bins List */}
        <Card style={{ padding: '1.75rem' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '1.25rem'
            }}
          >
            <div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text)' }}>
                My Bins Status
              </h3>
              <span style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>
                Overview of current fill levels
              </span>
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => navigate('/app/bins')}
              icon={<ArrowRight size={14} />}
            >
              All Bins
            </Button>
          </div>

          {bins.length === 0 ? (
            <EmptyState
              title="No Bins Registered"
              message="Add your first smart bin to monitor waste levels and schedule pickups."
              action={
                <Button
                  size="sm"
                  variant="primary"
                  onClick={() => navigate('/app/bins')}
                  icon={<PlusCircle size={16} />}
                >
                  Add Bin
                </Button>
              }
            />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              {bins.map((bin) => (
                <div
                  key={bin.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.85rem 1rem',
                    background: 'var(--input-bg)',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div
                      style={{
                        width: 38,
                        height: 38,
                        borderRadius: 10,
                        background: 'var(--card)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color:
                          bin.fill_status === 'full'
                            ? 'var(--danger)'
                            : bin.fill_status === 'half'
                            ? 'var(--warning)'
                            : 'var(--primary)',
                        border: '1px solid var(--border)'
                      }}
                    >
                      <Trash2 size={20} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.92rem', color: 'var(--text)' }}>
                        {bin.location || 'Home Bin'}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>
                        Capacity: {bin.capacity_kg} kg • Type: {bin.bin_type || 'Organic'}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    {bin.has_open_request ? (
                      <span
                        style={{
                          fontSize: '0.72rem',
                          color: 'var(--info)',
                          fontWeight: 600,
                          background: 'var(--info-soft)',
                          padding: '0.2rem 0.5rem',
                          borderRadius: 8
                        }}
                      >
                        Collection requested
                      </span>
                    ) : null}
                    <Badge status={bin.fill_status} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* 3 Latest Requests */}
        <Card style={{ padding: '1.75rem' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '1.25rem'
            }}
          >
            <div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text)' }}>
                Recent Requests
              </h3>
              <span style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>
                Latest 3 collection dispatches
              </span>
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => navigate('/app/requests')}
              icon={<ArrowRight size={14} />}
            >
              View All
            </Button>
          </div>

          {latestThreeRequests.length === 0 ? (
            <EmptyState
              title="No Collection Requests"
              message="When your bin is Half or Full, request a doorstep collection."
            />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              {latestThreeRequests.map((req) => (
                <div
                  key={req.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.85rem 1rem',
                    background: 'var(--input-bg)',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div
                      style={{
                        width: 38,
                        height: 38,
                        borderRadius: 10,
                        background: 'var(--card)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'var(--primary)',
                        border: '1px solid var(--border)'
                      }}
                    >
                      <Clock size={18} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.92rem', color: 'var(--text)' }}>
                        Request #{req.id}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>
                        {req.requested_at ? new Date(req.requested_at).toLocaleDateString() : 'Recent'} • {req.waste_type || 'organic'}
                      </div>
                    </div>
                  </div>

                  <Badge status={req.status} />
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default UserDashboard;
