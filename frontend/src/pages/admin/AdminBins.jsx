import React, { useState, useEffect } from 'react';
import { Trash2, Filter, MapPin, Clock, AlertTriangle } from 'lucide-react';
import api from '../../api/axios';
import { useToast } from '../../context/ToastContext';
import Card from '../../components/Card';
import Badge from '../../components/Badge';
import Spinner from '../../components/Spinner';
import EmptyState from '../../components/EmptyState';

const AdminBins = () => {
  const { showToast } = useToast();

  const [bins, setBins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fillFilter, setFillFilter] = useState('all'); // 'all' | 'empty' | 'half' | 'full'

  const fetchBins = async () => {
    try {
      const res = await api.get('/admin/bins');
      if (res.data?.data) {
        setBins(res.data.data);
      }
    } catch (err) {
      showToast('Could not load bins directory', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBins();
  }, []);

  const filteredBins = bins.filter((b) => {
    if (fillFilter === 'all') return true;
    return b.fill_status === fillFilter;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      {/* Top Header & Filter Chips */}
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
            System Smart Bins Directory
          </h2>
          <p style={{ color: 'var(--muted)', fontSize: '0.9rem', marginTop: '0.2rem' }}>
            Monitor real-time capacity and fill status across all registered citizen bins.
          </p>
        </div>

        {/* Fill Status Filter Buttons */}
        <div style={{ display: 'flex', gap: '0.5rem', background: '#ffffff', padding: 4, borderRadius: 12, border: '1px solid var(--border)' }}>
          {['all', 'empty', 'half', 'full'].map((status) => (
            <button
              key={status}
              onClick={() => setFillFilter(status)}
              style={{
                padding: '0.4rem 0.85rem',
                borderRadius: 8,
                fontSize: '0.85rem',
                fontWeight: 600,
                border: 'none',
                background: fillFilter === status ? 'var(--primary)' : 'transparent',
                color: fillFilter === status ? '#ffffff' : 'var(--muted)',
                cursor: 'pointer',
                textTransform: 'capitalize',
                transition: 'var(--transition)'
              }}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* Bins Table */}
      <Card style={{ padding: '1.75rem' }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
            <Spinner size="lg" />
          </div>
        ) : filteredBins.length === 0 ? (
          <EmptyState
            icon={<Trash2 size={48} strokeWidth={1.5} color="var(--primary)" />}
            title="No Bins Match Filter"
            message={`No smart bins found with fill status "${fillFilter}".`}
          />
        ) : (
          <div className="table-responsive">
            <table className="sgms-table">
              <thead>
                <tr>
                  <th>Bin #</th>
                  <th>Citizen Owner</th>
                  <th>Location Landmark</th>
                  <th>Coordinates</th>
                  <th>Capacity</th>
                  <th>Fill Level</th>
                  <th>Status</th>
                  <th>Last Update</th>
                </tr>
              </thead>
              <tbody>
                {filteredBins.map((b) => (
                  <tr key={b.id}>
                    <td><strong>#{b.id}</strong></td>
                    <td>
                      <div>
                        <strong>{b.owner_name || 'Unassigned'}</strong>
                        <div style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>
                          {b.owner_email}
                        </div>
                      </div>
                    </td>
                    <td>{b.location}</td>
                    <td style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>
                      {Number(b.latitude).toFixed(3)}, {Number(b.longitude).toFixed(3)}
                    </td>
                    <td>{b.capacity_kg} kg</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 100 }}>
                        <div className="progress-bar" style={{ flex: 1, margin: 0 }}>
                          <div
                            className={`progress-fill ${b.fill_status}`}
                            style={{ width: `${b.current_level}%` }}
                          />
                        </div>
                        <span style={{ fontSize: '0.8rem', fontWeight: 700 }}>
                          {b.current_level}%
                        </span>
                      </div>
                    </td>
                    <td>
                      <Badge status={b.fill_status} />
                    </td>
                    <td style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>
                      {b.last_updated
                        ? new Date(b.last_updated).toLocaleString([], {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })
                        : 'Installed'}
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

export default AdminBins;
