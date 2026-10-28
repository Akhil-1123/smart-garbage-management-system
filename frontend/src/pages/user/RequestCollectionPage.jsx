import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Send,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ArrowRight,
  Trash2,
  CreditCard,
  MapPin,
  Clock
} from 'lucide-react';
import api from '../../api/axios';
import { useToast } from '../../context/ToastContext';
import Card from '../../components/Card';
import Button from '../../components/Button';
import FormField from '../../components/FormField';
import MapPicker from '../../components/MapPicker';
import Spinner from '../../components/Spinner';

const RequestCollectionPage = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [bins, setBins] = useState([]);
  const [hasActiveSub, setHasActiveSub] = useState(false);
  const [selectedBinId, setSelectedBinId] = useState('');

  // Form State
  const [formData, setFormData] = useState({
    waste_type: 'organic',
    address: '',
    latitude: 9.3159,
    longitude: 76.6151,
    remarks: ''
  });

  const fetchData = async () => {
    try {
      const [binsRes, subsRes] = await Promise.all([
        api.get('/bins/my'),
        api.get('/subscriptions/my')
      ]);

      let userBins = [];
      if (binsRes.data?.data) {
        // Only active bins
        userBins = binsRes.data.data.filter((b) => b.status === 'active');
        setBins(userBins);
      }

      if (subsRes.data?.data) {
        const active = subsRes.data.data.some((s) => s.is_current || s.status === 'active');
        setHasActiveSub(active);
      }

      // Default to first bin if available
      if (userBins.length > 0) {
        const first = userBins[0];
        setSelectedBinId(String(first.id));
        setFormData((prev) => ({
          ...prev,
          address: first.location || '',
          latitude: Number(first.latitude) || 9.3159,
          longitude: Number(first.longitude) || 76.6151
        }));
      }
    } catch (err) {
      showToast('Failed to load bin and subscription details', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const selectedBin = bins.find((b) => String(b.id) === String(selectedBinId));

  // Handle bin change in dropdown
  const handleBinChange = (e) => {
    const id = e.target.value;
    setSelectedBinId(id);
    const chosen = bins.find((b) => String(b.id) === String(id));
    if (chosen) {
      setFormData((prev) => ({
        ...prev,
        address: chosen.location || '',
        latitude: Number(chosen.latitude) || 9.3159,
        longitude: Number(chosen.longitude) || 76.6151
      }));
    }
  };

  // Status checks
  const checkSubscription = hasActiveSub;
  const checkFillStatus = selectedBin
    ? selectedBin.fill_status === 'half' || selectedBin.fill_status === 'full'
    : false;
  const checkNoOpenRequest = selectedBin ? !selectedBin.has_open_request : false;

  const allChecksPass = checkSubscription && checkFillStatus && checkNoOpenRequest && !!selectedBin;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!allChecksPass) return;
    if (!formData.address.trim()) {
      showToast('Collection address is required', 'error');
      return;
    }

    setSubmitting(true);
    try {
      await api.post('/collections', {
        bin_id: Number(selectedBinId),
        waste_type: formData.waste_type,
        address: formData.address.trim(),
        latitude: formData.latitude,
        longitude: formData.longitude,
        remarks: formData.remarks.trim() || undefined
      });

      showToast('Collection request submitted successfully!', 'success');
      navigate('/app/requests');
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to submit collection request', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 320 }}>
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem', maxWidth: 800 }}>
      {/* Header */}
      <div>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text)' }}>
          Request Waste Collection
        </h2>
        <p style={{ color: 'var(--muted)', fontSize: '0.9rem', marginTop: '0.2rem' }}>
          Schedule a municipal door-to-door pickup for your Half or Full smart bin.
        </p>
      </div>

      {/* Status Checker Box */}
      <Card
        style={{
          padding: '1.5rem',
          background: allChecksPass ? '#f4fbf6' : '#fff9f2',
          border: allChecksPass ? '1.5px solid var(--primary-soft)' : '1.5px solid #fce3c3'
        }}
      >
        <h4 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text)', marginBottom: '0.85rem' }}>
          Pre-requisite Status Check
        </h4>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {/* Check 1: Active Subscription */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              {checkSubscription ? (
                <CheckCircle2 size={18} color="var(--primary)" />
              ) : (
                <XCircle size={18} color="var(--danger)" />
              )}
              <span
                style={{
                  fontWeight: 600,
                  fontSize: '0.92rem',
                  color: checkSubscription ? 'var(--text)' : 'var(--danger)'
                }}
              >
                Active subscription
              </span>
            </div>
            {!checkSubscription && (
              <Button
                size="sm"
                variant="secondary"
                onClick={() => navigate('/app/subscription')}
                icon={<CreditCard size={14} />}
              >
                Subscribe Now
              </Button>
            )}
          </div>

          {/* Check 2: Bin is Half or Full */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              {checkFillStatus ? (
                <CheckCircle2 size={18} color="var(--primary)" />
              ) : (
                <XCircle size={18} color="var(--danger)" />
              )}
              <span
                style={{
                  fontWeight: 600,
                  fontSize: '0.92rem',
                  color: checkFillStatus ? 'var(--text)' : 'var(--danger)'
                }}
              >
                Bin is Half or Full
                {selectedBin && (
                  <span style={{ fontWeight: 400, color: 'var(--muted)', marginLeft: '0.4rem', fontSize: '0.82rem' }}>
                    (Current: {selectedBin.fill_status.toUpperCase()})
                  </span>
                )}
              </span>
            </div>
            {!checkFillStatus && (
              <Button
                size="sm"
                variant="secondary"
                onClick={() => navigate('/app/bins')}
                icon={<Trash2 size={14} />}
              >
                Update Bin Status
              </Button>
            )}
          </div>

          {/* Check 3: No Open Request for this Bin */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              {checkNoOpenRequest ? (
                <CheckCircle2 size={18} color="var(--primary)" />
              ) : (
                <XCircle size={18} color="var(--danger)" />
              )}
              <span
                style={{
                  fontWeight: 600,
                  fontSize: '0.92rem',
                  color: checkNoOpenRequest ? 'var(--text)' : 'var(--danger)'
                }}
              >
                No open request for this bin
                {selectedBin?.has_open_request && (
                  <span style={{ fontWeight: 400, color: 'var(--danger)', marginLeft: '0.4rem', fontSize: '0.82rem' }}>
                    (A collection is already scheduled)
                  </span>
                )}
              </span>
            </div>
            {!checkNoOpenRequest && (
              <Button
                size="sm"
                variant="secondary"
                onClick={() => navigate('/app/requests')}
                icon={<Clock size={14} />}
              >
                View Request
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* Form Container */}
      <Card style={{ padding: '2rem' }}>
        <form onSubmit={handleSubmit}>
          {/* Bin Select */}
          <FormField
            label="Select Smart Bin"
            name="selectedBin"
            type="select"
            value={selectedBinId}
            onChange={handleBinChange}
            options={
              bins.length > 0
                ? bins.map((b) => ({
                    value: String(b.id),
                    label: `${b.location} (${b.capacity_kg} kg) — Level: ${b.fill_status.toUpperCase()}${
                      b.has_open_request ? ' [Collection Requested]' : ''
                    }`
                  }))
                : [{ value: '', label: 'No active bins registered' }]
            }
            required
            helpText={bins.length === 0 ? 'You need to add a bin first under My Bins.' : ''}
          />

          {/* Waste Type Select */}
          <FormField
            label="Waste Type"
            name="waste_type"
            type="select"
            value={formData.waste_type}
            onChange={(e) => setFormData({ ...formData, waste_type: e.target.value })}
            options={[
              { value: 'organic', label: 'Organic Household Waste' },
              { value: 'kitchen_waste', label: 'Kitchen & Food Scraps' },
              { value: 'garden_waste', label: 'Garden & Yard Trimmings' },
              { value: 'biodegradable', label: 'Mixed Biodegradable Waste' }
            ]}
            required
          />

          {/* Address Text Input */}
          <FormField
            label="Collection Address / Landmark"
            name="address"
            type="text"
            value={formData.address}
            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            placeholder="House name, street number, gate location"
            required
          />

          {/* Map Location Picker */}
          <div style={{ marginBottom: '1.25rem' }}>
            <label className="form-label" style={{ marginBottom: '0.4rem', display: 'block' }}>
              Pickup Coordinates on Map
            </label>
            <MapPicker
              lat={formData.latitude}
              lng={formData.longitude}
              onChange={({ lat, lng }) =>
                setFormData((prev) => ({ ...prev, latitude: lat, longitude: lng }))
              }
            />
          </div>

          {/* Remarks Textarea */}
          <FormField
            label="Driver Pickup Remarks (Optional)"
            name="remarks"
            type="textarea"
            rows={2}
            value={formData.remarks}
            onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
            placeholder="e.g. Bin is placed near gate pillar, ring bell before opening gate."
          />

          {/* Submit Button & Disabled Reason Message */}
          <div style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {!allChecksPass && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  color: 'var(--danger)',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  background: 'var(--danger-soft)',
                  padding: '0.65rem 1rem',
                  borderRadius: 'var(--radius-sm)'
                }}
              >
                <AlertTriangle size={16} />
                <span>
                  {!checkSubscription
                    ? 'Submission disabled: Please activate an active subscription plan first.'
                    : !checkFillStatus
                    ? 'Submission disabled: Bin is empty. Please update the bin status to Half or Full.'
                    : !checkNoOpenRequest
                    ? 'Submission disabled: A collection request for this bin is already pending.'
                    : 'Submission disabled: Please check your bin selection.'}
                </span>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <Button
                variant="secondary"
                onClick={() => navigate('/app/requests')}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                disabled={!allChecksPass}
                loading={submitting}
                icon={<Send size={16} />}
              >
                Submit Collection Request
              </Button>
            </div>
          </div>
        </form>
      </Card>
    </div>
  );
};

export default RequestCollectionPage;
