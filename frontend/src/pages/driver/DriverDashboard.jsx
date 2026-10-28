import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Truck,
  CheckCircle2,
  Scale,
  Star,
  MapPin,
  Clock,
  ArrowRight,
  Power,
  Phone,
  AlertCircle
} from 'lucide-react';
import api from '../../api/axios';
import { useToast } from '../../context/ToastContext';
import Card from '../../components/Card';
import StatCard from '../../components/StatCard';
import Badge from '../../components/Badge';
import Button from '../../components/Button';
import Spinner from '../../components/Spinner';
import EmptyState from '../../components/EmptyState';

const DriverDashboard = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [profileData, setProfileData] = useState(null);
  const [assignedJobs, setAssignedJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [togglingAvailability, setTogglingAvailability] = useState(false);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const [profRes, colRes] = await Promise.all([
        api.get('/driver/profile'),
        api.get('/driver/collections')
      ]);

      if (profRes.data?.data) {
        setProfileData(profRes.data.data);
      }
      if (colRes.data?.data) {
        setAssignedJobs(colRes.data.data);
      }
    } catch (err) {
      showToast('Could not load driver operational data', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleToggleAvailability = async () => {
    if (!profileData?.driver) return;
    const newStatus = !profileData.driver.is_available;
    setTogglingAvailability(true);

    try {
      const res = await api.put('/driver/availability', { is_available: newStatus });
      setProfileData((prev) => ({
        ...prev,
        driver: {
          ...prev.driver,
          is_available: newStatus
        }
      }));
      showToast(
        newStatus
          ? 'You are now marked Available for collection dispatches'
          : 'You are now marked Offline / Unavailable',
        'success'
      );
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to update availability status', 'error');
    } finally {
      setTogglingAvailability(false);
    }
  };

  const stats = profileData?.stats || {
    assigned_now: 0,
    collected_total: 0,
    total_kg: 0,
    average_rating: 0
  };
  const driver = profileData?.driver || {};
  const isAvailable = Boolean(driver.is_available);
  const nextThreeJobs = assignedJobs.slice(0, 3);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      {/* Top Banner: Driver Greeting & Availability Toggle */}
      <Card
        style={{
          padding: '1.75rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1.25rem',
          background: isAvailable
            ? 'linear-gradient(135deg, #ffffff 0%, #f0fdf4 100%)'
            : 'linear-gradient(135deg, #ffffff 0%, #fef2f2 100%)',
          border: `1px solid ${isAvailable ? 'rgba(46, 125, 79, 0.2)' : 'rgba(217, 83, 79, 0.2)'}`
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: 16,
              background: isAvailable ? 'var(--primary)' : 'var(--muted)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: 'var(--shadow)'
            }}
          >
            <Truck size={28} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text)' }}>
                {driver.name || 'Driver'}
              </h2>
              <span
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  padding: '0.2rem 0.6rem',
                  borderRadius: 12,
                  background: isAvailable ? 'var(--primary-soft)' : '#fee2e2',
                  color: isAvailable ? 'var(--primary)' : 'var(--danger)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem'
                }}
              >
                <span
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: '50%',
                    background: isAvailable ? 'var(--primary)' : 'var(--danger)'
                  }}
                />
                {isAvailable ? 'Online & Ready for Dispatches' : 'Offline / Unavailable'}
              </span>
            </div>
            <p style={{ color: 'var(--muted)', fontSize: '0.85rem', marginTop: '0.2rem' }}>
              Vehicle: <strong>{driver.vehicle_no || 'Unassigned'}</strong> &bull; Area:{' '}
              <strong>{driver.service_area || 'Zone Wide'}</strong>
            </p>
          </div>
        </div>

        {/* Availability Toggle Switch */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text)' }}>
            Available for collection:
          </span>
          <button
            onClick={handleToggleAvailability}
            disabled={togglingAvailability}
            style={{
              width: 54,
              height: 28,
              borderRadius: 14,
              background: isAvailable ? 'var(--primary)' : '#cbd5e1',
              border: 'none',
              cursor: togglingAvailability ? 'not-allowed' : 'pointer',
              position: 'relative',
              transition: 'background 0.3s ease',
              display: 'flex',
              alignItems: 'center',
              padding: 2
            }}
            title={isAvailable ? 'Toggle Offline' : 'Toggle Online'}
          >
            <div
              style={{
                width: 24,
                height: 24,
                borderRadius: '50%',
                background: '#ffffff',
                boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                transform: isAvailable ? 'translateX(26px)' : 'translateX(0px)',
                transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
              }}
            />
          </button>
        </div>
      </Card>

      {/* 4 StatCards: assigned now, collected total, total kg, average rating */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
          gap: '1rem'
        }}
      >
        <StatCard
          icon={<Truck size={24} />}
          label="Assigned Now"
          value={stats.assigned_now}
        />
        <StatCard
          icon={<CheckCircle2 size={24} />}
          label="Collected Total"
          value={stats.collected_total}
        />
        <StatCard
          icon={<Scale size={24} />}
          label="Total Waste Collected"
          value={`${stats.total_kg} kg`}
        />
        <StatCard
          icon={<Star size={24} />}
          label="Average Rating"
          value={stats.average_rating > 0 ? `${stats.average_rating} ★` : 'No reviews'}
        />
      </div>

      {/* Next 3 Assigned Collections Section */}
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
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text)' }}>
              Next Assigned Pickups
            </h3>
            <p style={{ color: 'var(--muted)', fontSize: '0.82rem', marginTop: '0.15rem' }}>
              Highest priority pending dispatches currently assigned to your route
            </p>
          </div>
          {assignedJobs.length > 0 && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => navigate('/driver/collections')}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              View All ({assignedJobs.length})
              <ArrowRight size={14} />
            </Button>
          )}
        </div>

        {nextThreeJobs.length === 0 ? (
          <EmptyState
            icon={<CheckCircle2 size={48} strokeWidth={1.5} color="var(--primary)" />}
            title="All Caught Up!"
            message="You have no pending collection assignments right now. New dispatches from municipal admins will appear here automatically."
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {nextThreeJobs.map((job) => (
              <div
                key={job.id}
                style={{
                  padding: '1.1rem 1.25rem',
                  borderRadius: 'var(--radius-sm)',
                  background: '#f8faf9',
                  border: '1px solid var(--border)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '1rem'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.85rem' }}>
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 12,
                      background: 'var(--primary-soft)',
                      color: 'var(--primary)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}
                  >
                    <Truck size={20} />
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text)' }}>
                        {job.customer_name}
                      </span>
                      <Badge status={job.waste_type || 'organic'} />
                      <Badge status={job.bin_fill_status || 'full'} />
                    </div>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        color: 'var(--muted)',
                        fontSize: '0.82rem',
                        marginTop: '0.3rem'
                      }}
                    >
                      <MapPin size={14} color="var(--primary)" />
                      <span>{job.address}</span>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  {job.customer_phone && (
                    <a
                      href={`tel:${job.customer_phone}`}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        padding: '0.45rem 0.8rem',
                        borderRadius: 8,
                        background: '#ffffff',
                        border: '1px solid var(--border)',
                        color: 'var(--text)',
                        fontSize: '0.82rem',
                        fontWeight: 600,
                        textDecoration: 'none'
                      }}
                    >
                      <Phone size={13} color="var(--primary)" />
                      {job.customer_phone}
                    </a>
                  )}

                  <Button
                    size="sm"
                    onClick={() => navigate('/driver/collections')}
                  >
                    View Job
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};

export default DriverDashboard;
