import React, { useState, useEffect } from 'react';
import {
  Clock,
  CheckCircle2,
  Scale,
  Star,
  MapPin,
  Calendar,
  Phone,
  Search
} from 'lucide-react';
import api from '../../api/axios';
import { useToast } from '../../context/ToastContext';
import Card from '../../components/Card';
import StatCard from '../../components/StatCard';
import Badge from '../../components/Badge';
import Spinner from '../../components/Spinner';
import EmptyState from '../../components/EmptyState';

const DriverHistory = () => {
  const { showToast } = useToast();

  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const res = await api.get('/driver/history');
      if (res.data?.data) {
        setHistory(res.data.data);
      }
    } catch (err) {
      showToast('Could not load collection history', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  // Filter history by search term (customer name, address, notes)
  const filteredHistory = history.filter((item) => {
    const term = search.toLowerCase().trim();
    if (!term) return true;
    return (
      (item.customer_name && item.customer_name.toLowerCase().includes(term)) ||
      (item.address && item.address.toLowerCase().includes(term)) ||
      (item.waste_type && item.waste_type.toLowerCase().includes(term)) ||
      (item.notes && item.notes.toLowerCase().includes(term))
    );
  });

  // Calculate metrics
  const totalKg = history.reduce((sum, item) => sum + Number(item.weight_kg || 0), 0);
  const totalPickups = history.length;
  const ratedItems = history.filter((item) => item.rating != null && item.rating > 0);
  const avgRating =
    ratedItems.length > 0
      ? (ratedItems.reduce((sum, item) => sum + Number(item.rating), 0) / ratedItems.length).toFixed(1)
      : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      {/* Page Title */}
      <div>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text)' }}>
          Completed Collection History
        </h2>
        <p style={{ color: 'var(--muted)', fontSize: '0.9rem', marginTop: '0.2rem' }}>
          Historical ledger of all verified waste pickups completed on your routes.
        </p>
      </div>

      {/* Summary of Total kg & Performance on Top */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '1rem'
        }}
      >
        <StatCard
          icon={<Scale size={24} />}
          label="Total Waste Collected"
          value={`${totalKg.toFixed(1)} kg`}
        />
        <StatCard
          icon={<CheckCircle2 size={24} />}
          label="Total Collections"
          value={totalPickups}
        />
        <StatCard
          icon={<Star size={24} />}
          label="Average Customer Rating"
          value={avgRating ? `${avgRating} ★ (${ratedItems.length})` : 'Not yet rated'}
        />
      </div>

      {/* Search Toolbar */}
      <Card style={{ padding: '1rem 1.25rem' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '1rem'
          }}
        >
          <div style={{ position: 'relative', width: '100%', maxWidth: 320 }}>
            <Search
              size={18}
              style={{
                position: 'absolute',
                left: 12,
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--muted)'
              }}
            />
            <input
              type="text"
              placeholder="Search customer, address..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: '100%',
                padding: '0.55rem 0.75rem 0.55rem 2.4rem',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border)',
                background: 'var(--input-bg)',
                fontSize: '0.88rem'
              }}
            />
          </div>

          <span style={{ fontSize: '0.88rem', color: 'var(--muted)', fontWeight: 600 }}>
            Showing {filteredHistory.length} recorded pickups
          </span>
        </div>
      </Card>

      {/* Collection Records Table */}
      <Card style={{ padding: '1.75rem' }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
            <Spinner size="lg" />
          </div>
        ) : filteredHistory.length === 0 ? (
          <EmptyState
            icon={<Clock size={48} strokeWidth={1.5} color="var(--primary)" />}
            title="No Collections Recorded"
            message={
              search
                ? 'No past pickups match your search query.'
                : 'You have not completed any waste collections yet. Completed dispatches will be archived here.'
            }
          />
        ) : (
          <div className="table-responsive">
            <table className="sgms-table">
              <thead>
                <tr>
                  <th>Date & Time</th>
                  <th>Customer</th>
                  <th>Pickup Address</th>
                  <th>Waste Type</th>
                  <th>Weight (kg)</th>
                  <th>Customer Rating</th>
                </tr>
              </thead>
              <tbody>
                {filteredHistory.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--text)' }}>
                        <Calendar size={14} color="var(--muted)" />
                        <span style={{ fontWeight: 600 }}>
                          {item.collected_at
                            ? new Date(item.collected_at).toLocaleDateString([], {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric'
                              })
                            : 'N/A'}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: '0.15rem' }}>
                        {item.collected_at
                          ? new Date(item.collected_at).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit'
                            })
                          : ''}
                      </div>
                    </td>

                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--text)' }}>
                        {item.customer_name}
                      </div>
                      {item.customer_phone && (
                        <div style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>
                          {item.customer_phone}
                        </div>
                      )}
                    </td>

                    <td style={{ maxWidth: 260 }}>
                      <div
                        style={{
                          fontSize: '0.88rem',
                          color: 'var(--text)',
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: '0.35rem'
                        }}
                      >
                        <MapPin size={14} color="var(--primary)" style={{ flexShrink: 0, marginTop: 2 }} />
                        <span>{item.address}</span>
                      </div>
                      {item.notes && (
                        <div
                          style={{
                            fontSize: '0.75rem',
                            color: 'var(--muted)',
                            fontStyle: 'italic',
                            marginTop: '0.2rem'
                          }}
                        >
                          Notes: {item.notes}
                        </div>
                      )}
                    </td>

                    <td>
                      <Badge status={item.waste_type || 'organic'} />
                    </td>

                    <td>
                      <span style={{ fontWeight: 800, color: 'var(--primary)', fontSize: '0.95rem' }}>
                        {Number(item.weight_kg || 0).toFixed(1)} kg
                      </span>
                    </td>

                    <td>
                      {item.rating != null && item.rating > 0 ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          {[1, 2, 3, 4, 5].map((s) => (
                            <Star
                              key={s}
                              size={15}
                              fill={s <= item.rating ? '#f0a830' : 'none'}
                              color={s <= item.rating ? '#f0a830' : '#cbd5e1'}
                            />
                          ))}
                          <span
                            style={{
                              marginLeft: '0.35rem',
                              fontWeight: 700,
                              fontSize: '0.85rem',
                              color: 'var(--text)'
                            }}
                          >
                            {item.rating}/5
                          </span>
                        </div>
                      ) : (
                        <span style={{ fontSize: '0.82rem', color: 'var(--muted)', fontStyle: 'italic' }}>
                          Not rated
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
};

export default DriverHistory;
