import React, { useState, useEffect } from 'react';
import {
  Recycle,
  Plus,
  CheckCircle2,
  Package,
  Layers,
  Building,
  Scale,
  Calendar,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import api from '../../api/axios';
import { useToast } from '../../context/ToastContext';
import Card from '../../components/Card';
import Button from '../../components/Button';
import Badge from '../../components/Badge';
import Modal from '../../components/Modal';
import FormField from '../../components/FormField';
import Spinner from '../../components/Spinner';
import EmptyState from '../../components/EmptyState';

const AdminComposting = () => {
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState('batches'); // 'units' | 'create' | 'batches'
  const [loading, setLoading] = useState(true);

  // Units State
  const [units, setUnits] = useState([]);
  const [unitModalOpen, setUnitModalOpen] = useState(false);
  const [editingUnit, setEditingUnit] = useState(null);
  const [unitForm, setUnitForm] = useState({ name: '', location: '', capacity_kg: 500 });
  const [savingUnit, setSavingUnit] = useState(false);

  // Pending Waste State (Create Batch)
  const [pendingWaste, setPendingWaste] = useState([]);
  const [selectedWasteIds, setSelectedWasteIds] = useState(new Set());
  const [selectedBatchUnitId, setSelectedBatchUnitId] = useState('');
  const [creatingBatch, setCreatingBatch] = useState(false);

  // Batches State
  const [batches, setBatches] = useState([]);
  const [products, setProducts] = useState([]);
  const [completeModalOpen, setCompleteModalOpen] = useState(false);
  const [batchToComplete, setBatchToComplete] = useState(null);
  const [outputWeight, setOutputWeight] = useState('');
  const [selectedProductId, setSelectedProductId] = useState('');
  const [completingBatch, setCompletingBatch] = useState(false);

  const fetchAllData = async () => {
    try {
      const [unitsRes, pendingRes, batchesRes, prodRes] = await Promise.all([
        api.get('/admin/composting/units'),
        api.get('/admin/composting/pending-waste'),
        api.get('/admin/composting/batches'),
        api.get('/admin/products')
      ]);

      if (unitsRes.data?.data) {
        setUnits(unitsRes.data.data);
        if (unitsRes.data.data.length > 0 && !selectedBatchUnitId) {
          setSelectedBatchUnitId(String(unitsRes.data.data[0].id));
        }
      }
      if (pendingRes.data?.data) {
        setPendingWaste(pendingRes.data.data);
      }
      if (batchesRes.data?.data) {
        setBatches(batchesRes.data.data);
      }
      if (prodRes.data?.data) {
        setProducts(prodRes.data.data);
        if (prodRes.data.data.length > 0 && !selectedProductId) {
          setSelectedProductId(String(prodRes.data.data[0].id));
        }
      }
    } catch (err) {
      showToast('Could not load composting facilities data', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  // 1. Units Logic
  const handleOpenAddUnit = () => {
    setEditingUnit(null);
    setUnitForm({ name: '', location: '', capacity_kg: 500 });
    setUnitModalOpen(true);
  };

  const handleOpenEditUnit = (u) => {
    setEditingUnit(u);
    setUnitForm({ name: u.name, location: u.location, capacity_kg: u.capacity_kg || 500 });
    setUnitModalOpen(true);
  };

  const handleSaveUnit = async (e) => {
    e.preventDefault();
    if (!unitForm.name.trim() || !unitForm.location.trim()) {
      showToast('Unit name and location are required', 'error');
      return;
    }

    setSavingUnit(true);
    try {
      if (editingUnit) {
        await api.put(`/admin/composting/units/${editingUnit.id}`, {
          name: unitForm.name.trim(),
          location: unitForm.location.trim(),
          capacity_kg: Number(unitForm.capacity_kg)
        });
        showToast('Facility updated successfully.', 'success');
      } else {
        await api.post('/admin/composting/units', {
          name: unitForm.name.trim(),
          location: unitForm.location.trim(),
          capacity_kg: Number(unitForm.capacity_kg)
        });
        showToast('New composting unit registered!', 'success');
      }
      setUnitModalOpen(false);
      fetchAllData();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to save composting unit', 'error');
    } finally {
      setSavingUnit(false);
    }
  };

  // 2. Create Batch Logic
  const handleToggleWasteCheckbox = (id) => {
    setSelectedWasteIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectAllWaste = () => {
    if (selectedWasteIds.size === pendingWaste.length) {
      setSelectedWasteIds(new Set());
    } else {
      setSelectedWasteIds(new Set(pendingWaste.map((w) => w.id)));
    }
  };

  const totalInputKg = pendingWaste
    .filter((w) => selectedWasteIds.has(w.id))
    .reduce((sum, w) => sum + Number(w.weight_kg || 0), 0);

  const handleCreateBatch = async () => {
    if (selectedWasteIds.size === 0) {
      showToast('Please select at least one pending waste record.', 'error');
      return;
    }
    if (!selectedBatchUnitId) {
      showToast('Please select a target composting unit.', 'error');
      return;
    }

    setCreatingBatch(true);
    try {
      await api.post('/admin/composting/batches', {
        unit_id: Number(selectedBatchUnitId),
        waste_record_ids: Array.from(selectedWasteIds)
      });
      showToast(`Batch created with ${totalInputKg.toFixed(1)} kg organic waste!`, 'success');
      setSelectedWasteIds(new Set());
      setActiveTab('batches');
      fetchAllData();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to create composting batch', 'error');
    } finally {
      setCreatingBatch(false);
    }
  };

  // 3. Complete Batch Logic
  const handleOpenComplete = (b) => {
    setBatchToComplete(b);
    // Suggest standard ~40% output estimate
    const estimated = Math.round(Number(b.input_weight_kg || 0) * 0.4);
    setOutputWeight(String(estimated > 0 ? estimated : 20));
    setCompleteModalOpen(true);
  };

  const handleConfirmComplete = async (e) => {
    e.preventDefault();
    if (!batchToComplete || !selectedProductId || isNaN(Number(outputWeight)) || Number(outputWeight) <= 0) {
      showToast('Please provide a valid output weight and product selection.', 'error');
      return;
    }

    setCompletingBatch(true);
    try {
      await api.put(`/admin/composting/batches/${batchToComplete.id}/complete`, {
        output_weight_kg: Number(outputWeight),
        output_compost_kg: Number(outputWeight),
        product_id: Number(selectedProductId)
      });

      const selectedProd = products.find((p) => String(p.id) === String(selectedProductId));
      showToast(
        `Batch #${batchToComplete.batch_code || batchToComplete.id} completed! Added ${outputWeight} kg to ${selectedProd?.name || 'product'}.`,
        'success'
      );
      setCompleteModalOpen(false);
      setBatchToComplete(null);
      fetchAllData();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to complete batch', 'error');
    } finally {
      setCompletingBatch(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 340 }}>
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      {/* Header */}
      <div>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text)' }}>
          Composting & Batch Management
        </h2>
        <p style={{ color: 'var(--muted)', fontSize: '0.9rem', marginTop: '0.2rem' }}>
          Batch organic waste intake into municipal units and convert matured batches into product inventory.
        </p>
      </div>

      {/* 3 Tabs Row */}
      <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.25rem' }}>
        <button
          onClick={() => setActiveTab('batches')}
          style={{
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'batches' ? '3px solid var(--primary)' : '3px solid transparent',
            padding: '0.65rem 1.25rem',
            fontWeight: 700,
            fontSize: '0.95rem',
            color: activeTab === 'batches' ? 'var(--primary)' : 'var(--muted)',
            cursor: 'pointer',
            transition: 'var(--transition)'
          }}
        >
          Compost Batches ({batches.length})
        </button>

        <button
          onClick={() => setActiveTab('create')}
          style={{
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'create' ? '3px solid var(--primary)' : '3px solid transparent',
            padding: '0.65rem 1.25rem',
            fontWeight: 700,
            fontSize: '0.95rem',
            color: activeTab === 'create' ? 'var(--primary)' : 'var(--muted)',
            cursor: 'pointer',
            transition: 'var(--transition)'
          }}
        >
          Create Batch ({pendingWaste.length} Pending Records)
        </button>

        <button
          onClick={() => setActiveTab('units')}
          style={{
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'units' ? '3px solid var(--primary)' : '3px solid transparent',
            padding: '0.65rem 1.25rem',
            fontWeight: 700,
            fontSize: '0.95rem',
            color: activeTab === 'units' ? 'var(--primary)' : 'var(--muted)',
            cursor: 'pointer',
            transition: 'var(--transition)'
          }}
        >
          Facilities & Units ({units.length})
        </button>
      </div>

      {/* TAB 1: BATCHES */}
      {activeTab === 'batches' && (
        <Card style={{ padding: '1.75rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text)' }}>
              Compost Processing Batches
            </h3>
            <Button
              size="sm"
              variant="primary"
              onClick={() => setActiveTab('create')}
              icon={<Plus size={14} />}
            >
              Start New Batch
            </Button>
          </div>

          {batches.length === 0 ? (
            <EmptyState
              icon={<Recycle size={48} strokeWidth={1.5} color="var(--primary)" />}
              title="No Batches Created"
              message="Select pending organic waste records under 'Create Batch' to initialize a batch."
            />
          ) : (
            <div className="table-responsive">
              <table className="sgms-table">
                <thead>
                  <tr>
                    <th>Batch Code</th>
                    <th>Unit Facility</th>
                    <th>Input Waste</th>
                    <th>Output Compost</th>
                    <th>Started Date</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {batches.map((b) => {
                    const isProcessing = b.status === 'processing';
                    return (
                      <tr key={b.id}>
                        <td>
                          <strong>{b.batch_code || `#${b.id}`}</strong>
                        </td>
                        <td>{b.unit_name || 'Compost Facility'}</td>
                        <td>
                          <strong>{Number(b.input_weight_kg || 0).toFixed(1)} kg</strong>
                        </td>
                        <td>
                          {b.output_compost_kg !== null && b.output_compost_kg !== undefined ? (
                            <strong style={{ color: 'var(--primary)' }}>
                              {Number(b.output_compost_kg).toFixed(1)} kg
                            </strong>
                          ) : (
                            <span style={{ color: 'var(--muted)', fontSize: '0.82rem' }}>Processing</span>
                          )}
                        </td>
                        <td style={{ fontSize: '0.82rem', color: 'var(--muted)' }}>
                          {new Date(b.created_at || b.start_date).toLocaleDateString()}
                        </td>
                        <td>
                          <Badge status={b.status} />
                        </td>
                        <td>
                          {isProcessing ? (
                            <Button
                              size="sm"
                              variant="primary"
                              onClick={() => handleOpenComplete(b)}
                              icon={<CheckCircle2 size={13} />}
                            >
                              Complete
                            </Button>
                          ) : (
                            <span style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>Matured & In Stock</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* TAB 2: CREATE BATCH */}
      {activeTab === 'create' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Batch Configuration Bar */}
          <Card style={{ padding: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
              <div style={{ minWidth: 220 }}>
                <label className="form-label" style={{ fontSize: '0.8rem', marginBottom: '0.35rem' }}>
                  Target Composting Facility Unit
                </label>
                <select
                  className="form-select"
                  value={selectedBatchUnitId}
                  onChange={(e) => setSelectedBatchUnitId(e.target.value)}
                >
                  {units.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.location})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <div style={{ fontSize: '0.78rem', color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase' }}>
                  Live Total Input Weight
                </div>
                <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--primary)', lineHeight: 1.1 }}>
                  {totalInputKg.toFixed(1)} kg
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>
                  {selectedWasteIds.size} records selected
                </div>
              </div>
            </div>

            <Button
              variant="primary"
              disabled={selectedWasteIds.size === 0 || !selectedBatchUnitId}
              loading={creatingBatch}
              onClick={handleCreateBatch}
              icon={<Recycle size={16} />}
            >
              Create Compost Batch
            </Button>
          </Card>

          {/* Pending Waste Table */}
          <Card style={{ padding: '1.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text)' }}>
                Unbatched Organic Waste Pickups
              </h3>
              {pendingWaste.length > 0 && (
                <Button size="sm" variant="secondary" onClick={handleSelectAllWaste}>
                  {selectedWasteIds.size === pendingWaste.length ? 'Deselect All' : 'Select All'}
                </Button>
              )}
            </div>

            {pendingWaste.length === 0 ? (
              <EmptyState
                icon={<CheckCircle2 size={44} color="var(--primary)" />}
                title="All Organic Waste Batched"
                message="There are no pending unbatched organic waste records. New collections will appear here upon driver pickup."
              />
            ) : (
              <div className="table-responsive">
                <table className="sgms-table">
                  <thead>
                    <tr>
                      <th style={{ width: 40 }}>Select</th>
                      <th>Record #</th>
                      <th>Waste Weight</th>
                      <th>Waste Type</th>
                      <th>Collection Address</th>
                      <th>Recorded Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingWaste.map((w) => {
                      const isChecked = selectedWasteIds.has(w.id);
                      return (
                        <tr
                          key={w.id}
                          onClick={() => handleToggleWasteCheckbox(w.id)}
                          style={{
                            background: isChecked ? '#f4fbf6' : 'transparent',
                            cursor: 'pointer'
                          }}
                        >
                          <td>
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => handleToggleWasteCheckbox(w.id)}
                              onClick={(e) => e.stopPropagation()}
                            />
                          </td>
                          <td><strong>#{w.id}</strong></td>
                          <td>
                            <strong style={{ color: 'var(--primary)', fontSize: '0.95rem' }}>
                              {Number(w.weight_kg).toFixed(2)} kg
                            </strong>
                          </td>
                          <td style={{ textTransform: 'capitalize' }}>{w.waste_type || 'organic'}</td>
                          <td>{w.address || w.bin_location || 'Designated Home Bin'}</td>
                          <td style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>
                            {new Date(w.recorded_at).toLocaleDateString()}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* TAB 3: UNITS */}
      {activeTab === 'units' && (
        <Card style={{ padding: '1.75rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text)' }}>
              Composting Facility Units
            </h3>
            <Button
              size="sm"
              variant="primary"
              onClick={handleOpenAddUnit}
              icon={<Plus size={14} />}
            >
              Register Unit
            </Button>
          </div>

          <div className="table-responsive">
            <table className="sgms-table">
              <thead>
                <tr>
                  <th>Unit Name</th>
                  <th>Facility Location</th>
                  <th>Capacity</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {units.map((u) => (
                  <tr key={u.id}>
                    <td><strong>{u.name}</strong></td>
                    <td>{u.location}</td>
                    <td>{u.capacity_kg ? `${u.capacity_kg} kg` : '500 kg'}</td>
                    <td>
                      <Badge status={u.is_active ? 'active' : 'inactive'} />
                    </td>
                    <td>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleOpenEditUnit(u)}
                      >
                        Edit Unit
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Add / Edit Unit Modal */}
      <Modal
        isOpen={unitModalOpen}
        onClose={() => setUnitModalOpen(false)}
        title={editingUnit ? 'Edit Composting Unit' : 'Register New Composting Unit'}
        maxWidth="460px"
      >
        <form onSubmit={handleSaveUnit}>
          <FormField
            label="Unit Facility Name"
            name="unit_name"
            value={unitForm.name}
            onChange={(e) => setUnitForm({ ...unitForm, name: e.target.value })}
            placeholder="e.g. Chengannur Municipal Unit A"
            required
          />

          <FormField
            label="Facility Physical Location"
            name="unit_location"
            value={unitForm.location}
            onChange={(e) => setUnitForm({ ...unitForm, location: e.target.value })}
            placeholder="Ward 4, Municipal Depot Compound"
            required
          />

          <FormField
            label="Processing Capacity (kg)"
            name="unit_capacity"
            type="number"
            min={100}
            max={10000}
            value={unitForm.capacity_kg}
            onChange={(e) => setUnitForm({ ...unitForm, capacity_kg: e.target.value })}
            required
          />

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.25rem' }}>
            <Button variant="secondary" onClick={() => setUnitModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={savingUnit}>
              Save Facility
            </Button>
          </div>
        </form>
      </Modal>

      {/* Complete Batch Modal */}
      <Modal
        isOpen={completeModalOpen}
        onClose={() => setCompleteModalOpen(false)}
        title={`Complete Batch: ${batchToComplete?.batch_code || `#${batchToComplete?.id}`}`}
        maxWidth="480px"
      >
        <form onSubmit={handleConfirmComplete}>
          <p style={{ color: 'var(--muted)', fontSize: '0.88rem', marginBottom: '1.25rem' }}>
            Input waste: <strong>{Number(batchToComplete?.input_weight_kg || 0).toFixed(1)} kg</strong>.
            Record the matured organic compost output and credit the quantity directly to marketplace inventory.
          </p>

          <FormField
            label="Output Compost Weight (kg)"
            name="outputWeight"
            type="number"
            step="0.1"
            min="1"
            max="10000"
            value={outputWeight}
            onChange={(e) => setOutputWeight(e.target.value)}
            required
          />

          <div className="form-group">
            <label className="form-label" htmlFor="productSelect">
              Add Directly to Marketplace Product Stock
            </label>
            <select
              id="productSelect"
              className="form-select"
              value={selectedProductId}
              onChange={(e) => setSelectedProductId(e.target.value)}
              required
            >
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} (Current Stock: {p.stock_quantity} {p.unit || 'kg'})
                </option>
              ))}
            </select>
          </div>

          <div
            style={{
              background: 'var(--primary-soft)',
              padding: '0.75rem 1rem',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.82rem',
              color: 'var(--primary)',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              marginBottom: '1.25rem'
            }}
          >
            <Sparkles size={16} />
            <span>Adds {outputWeight || 0} kg directly to selected product stock!</span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
            <Button variant="secondary" onClick={() => setCompleteModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={completingBatch}>
              Complete & Stock Compost
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default AdminComposting;
