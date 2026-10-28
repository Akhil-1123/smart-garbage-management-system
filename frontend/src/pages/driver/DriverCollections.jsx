import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import {
  Truck,
  MapPin,
  Phone,
  Clock,
  ExternalLink,
  CheckCircle2,
  Scale,
  FileText,
  AlertCircle
} from 'lucide-react';
import api from '../../api/axios';
import { useToast } from '../../context/ToastContext';
import Card from '../../components/Card';
import Badge from '../../components/Badge';
import Button from '../../components/Button';
import Modal from '../../components/Modal';
import Spinner from '../../components/Spinner';
import EmptyState from '../../components/EmptyState';

const DriverCollections = () => {
  const { showToast } = useToast();

  const [collections, setCollections] = useState([]);
  const [loading, setLoading] = useState(true);

  // Mark as Collected Modal State
  const [selectedJob, setSelectedJob] = useState(null);
  const [collectModalOpen, setCollectModalOpen] = useState(false);
  const [weightKg, setWeightKg] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [validationError, setValidationError] = useState('');

  const fetchCollections = async () => {
    setLoading(true);
    try {
      const res = await api.get('/driver/collections');
      if (res.data?.data) {
        setCollections(res.data.data);
      }
    } catch (err) {
      showToast('Could not load assigned collections', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCollections();
  }, []);

  const openCollectModal = (job) => {
    setSelectedJob(job);
    setWeightKg('');
    setNotes('');
    setValidationError('');
    setCollectModalOpen(true);
  };

  const handleCollectSubmit = async (e) => {
    e.preventDefault();
    if (!selectedJob) return;

    const numWeight = parseFloat(weightKg);
    if (isNaN(numWeight) || numWeight <= 0 || numWeight > 500) {
      setValidationError('Waste weight must be a valid number between 0.1 and 500 kg');
      return;
    }

    setSubmitting(true);
    setValidationError('');

    try {
      await api.put(`/driver/collections/${selectedJob.id}/collect`, {
        weight_kg: numWeight,
        notes: notes ? notes.trim() : undefined
      });

      showToast(`Collection #${selectedJob.id} recorded (${numWeight} kg). User notified.`, 'success');
      // Remove collected card from state
      setCollections((prev) => prev.filter((c) => c.id !== selectedJob.id));
      setCollectModalOpen(false);
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to record waste collection';
      setValidationError(msg);
      showToast(msg, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      {/* Page Header */}
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
            Assigned Collection Pickups
          </h2>
          <p style={{ color: 'var(--muted)', fontSize: '0.9rem', marginTop: '0.2rem' }}>
            Active municipal waste dispatches awaiting collection on your route.
          </p>
        </div>

        <Badge
          status="approved"
          label={`${collections.length} ${collections.length === 1 ? 'Dispatch Pending' : 'Dispatches Pending'}`}
          style={{ fontSize: '0.85rem', padding: '0.4rem 0.85rem' }}
        />
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
          <Spinner size="lg" />
        </div>
      ) : collections.length === 0 ? (
        <Card style={{ padding: '3.5rem 1.5rem', textAlign: 'center' }}>
          <EmptyState
            icon={<CheckCircle2 size={54} strokeWidth={1.5} color="var(--primary)" />}
            title="No assigned collections"
            message="You currently have no active collection jobs on your route. New assignments dispatched by municipal admins will appear here."
          />
        </Card>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))',
            gap: '1.5rem'
          }}
        >
          {collections.map((job) => {
            const hasCoords =
              job.latitude != null &&
              job.longitude != null &&
              !isNaN(Number(job.latitude)) &&
              !isNaN(Number(job.longitude));

            return (
              <Card
                key={job.id}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  overflow: 'hidden',
                  padding: 0
                }}
              >
                {/* Card Map Header (height 180px) */}
                <div style={{ height: 180, width: '100%', position: 'relative', background: '#e2e8f0' }}>
                  {hasCoords ? (
                    <MapContainer
                      center={[Number(job.latitude), Number(job.longitude)]}
                      zoom={14}
                      scrollWheelZoom={false}
                      zoomControl={false}
                      style={{ height: '100%', width: '100%' }}
                    >
                      <TileLayer
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        attribution='&copy; OpenStreetMap'
                      />
                      <Marker position={[Number(job.latitude), Number(job.longitude)]}>
                        <Popup>{job.address}</Popup>
                      </Marker>
                    </MapContainer>
                  ) : (
                    <div
                      style={{
                        height: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'var(--muted)',
                        fontSize: '0.85rem'
                      }}
                    >
                      Map coordinates unavailable
                    </div>
                  )}

                  {/* Waste Type Pill on top of Map */}
                  <div style={{ position: 'absolute', top: 12, right: 12, zIndex: 400 }}>
                    <Badge status={job.waste_type || 'organic'} />
                  </div>
                </div>

                {/* Card Body */}
                <div
                  style={{
                    padding: '1.25rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.75rem',
                    flex: 1
                  }}
                >
                  {/* Customer Info & Fill Status */}
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start'
                    }}
                  >
                    <div>
                      <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text)' }}>
                        {job.customer_name}
                      </h3>
                      {job.customer_phone ? (
                        <a
                          href={`tel:${job.customer_phone}`}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                            color: 'var(--primary)',
                            fontWeight: 600,
                            fontSize: '0.88rem',
                            textDecoration: 'none',
                            marginTop: '0.2rem'
                          }}
                        >
                          <Phone size={14} />
                          {job.customer_phone}
                        </a>
                      ) : (
                        <span style={{ fontSize: '0.82rem', color: 'var(--muted)' }}>
                          No phone provided
                        </span>
                      )}
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <span
                        style={{
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          color: 'var(--muted)',
                          display: 'block'
                        }}
                      >
                        Bin Level
                      </span>
                      <Badge status={job.bin_fill_status || 'full'} />
                    </div>
                  </div>

                  {/* Address */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '0.45rem',
                      color: 'var(--text)',
                      fontSize: '0.88rem',
                      lineHeight: 1.4
                    }}
                  >
                    <MapPin size={16} color="var(--primary)" style={{ flexShrink: 0, marginTop: 2 }} />
                    <span>{job.address}</span>
                  </div>

                  {/* Remarks */}
                  {job.remarks && (
                    <div
                      style={{
                        padding: '0.65rem 0.85rem',
                        borderRadius: 'var(--radius-sm)',
                        background: 'var(--input-bg)',
                        border: '1px solid var(--border)',
                        fontSize: '0.82rem',
                        color: 'var(--muted)',
                        fontStyle: 'italic',
                        lineHeight: 1.3
                      }}
                    >
                      "{job.remarks}"
                    </div>
                  )}

                  {/* Assignment Timestamp */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      fontSize: '0.78rem',
                      color: 'var(--muted)',
                      marginTop: 'auto',
                      paddingTop: '0.5rem'
                    }}
                  >
                    <Clock size={13} />
                    <span>
                      Assigned:{' '}
                      {job.assigned_at
                        ? new Date(job.assigned_at).toLocaleString([], {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })
                        : 'Recently'}
                    </span>
                  </div>
                </div>

                {/* Card Actions Footer */}
                <div
                  style={{
                    padding: '1rem 1.25rem',
                    borderTop: '1px solid var(--border)',
                    background: '#f8faf9',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem'
                  }}
                >
                  {/* Open in Google Maps */}
                  <a
                    href={job.google_maps_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      flex: 1,
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.4rem',
                      padding: '0.6rem 0.75rem',
                      borderRadius: 'var(--radius-sm)',
                      background: '#ffffff',
                      border: '1px solid var(--border)',
                      color: 'var(--text)',
                      fontSize: '0.85rem',
                      fontWeight: 600,
                      textDecoration: 'none',
                      transition: 'var(--transition)'
                    }}
                  >
                    <ExternalLink size={15} />
                    Open Maps
                  </a>

                  {/* Mark as Collected */}
                  <Button
                    style={{ flex: 1.3 }}
                    onClick={() => openCollectModal(job)}
                  >
                    <CheckCircle2 size={16} />
                    Mark Collected
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Mark as Collected Modal */}
      {collectModalOpen && selectedJob && (
        <Modal
          title={`Confirm Waste Collection #${selectedJob.id}`}
          isOpen={collectModalOpen}
          onClose={() => setCollectModalOpen(false)}
        >
          <form
            onSubmit={handleCollectSubmit}
            style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}
          >
            {/* Pickup Summary Card */}
            <div
              style={{
                background: '#f8faf9',
                padding: '1rem',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border)'
              }}
            >
              <div style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--text)' }}>
                {selectedJob.customer_name}
              </div>
              <div style={{ fontSize: '0.85rem', color: 'var(--muted)', marginTop: '0.2rem' }}>
                {selectedJob.address}
              </div>
              <div
                style={{
                  display: 'flex',
                  gap: '0.5rem',
                  marginTop: '0.5rem',
                  alignItems: 'center'
                }}
              >
                <Badge status={selectedJob.waste_type || 'organic'} />
                <span style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>
                  Bin: #{selectedJob.bin_id} ({selectedJob.bin_fill_status})
                </span>
              </div>
            </div>

            {/* Weight Input (number, >0, <=500) */}
            <div>
              <label
                style={{
                  display: 'block',
                  fontWeight: 600,
                  fontSize: '0.88rem',
                  marginBottom: '0.35rem',
                  color: 'var(--text)'
                }}
              >
                Verified Weight (kg) <span style={{ color: 'var(--danger)' }}>*</span>
              </label>
              <div style={{ position: 'relative' }}>
                <Scale
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
                  type="number"
                  step="0.1"
                  min="0.1"
                  max="500"
                  required
                  placeholder="e.g. 8.5"
                  value={weightKg}
                  onChange={(e) => setWeightKg(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.75rem 0.65rem 2.5rem',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border)',
                    background: 'var(--input-bg)',
                    fontSize: '1rem',
                    fontWeight: 700,
                    color: 'var(--text)'
                  }}
                  autoFocus
                />
              </div>
              <span style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: '0.25rem', display: 'block' }}>
                Weight scale reading between 0.1 and 500 kilograms.
              </span>
            </div>

            {/* Optional Notes */}
            <div>
              <label
                style={{
                  display: 'block',
                  fontWeight: 600,
                  fontSize: '0.88rem',
                  marginBottom: '0.35rem',
                  color: 'var(--text)'
                }}
              >
                Driver Notes (Optional)
              </label>
              <textarea
                rows={3}
                placeholder="e.g. Segregated organic waste collected cleanly from backyard bin."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border)',
                  background: 'var(--input-bg)',
                  fontSize: '0.88rem',
                  resize: 'vertical'
                }}
              />
            </div>

            {/* Validation Error Banner */}
            {validationError && (
              <div
                style={{
                  padding: '0.75rem',
                  borderRadius: 'var(--radius-sm)',
                  background: '#fef2f2',
                  border: '1px solid #fecaca',
                  color: 'var(--danger)',
                  fontSize: '0.85rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
              >
                <AlertCircle size={16} />
                <span>{validationError}</span>
              </div>
            )}

            {/* Modal Actions */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '0.75rem',
                marginTop: '0.5rem'
              }}
            >
              <Button
                type="button"
                variant="secondary"
                onClick={() => setCollectModalOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" loading={submitting}>
                Complete Collection
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};

export default DriverCollections;
