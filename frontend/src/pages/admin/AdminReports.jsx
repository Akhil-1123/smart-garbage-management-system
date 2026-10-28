import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  Calendar,
  Download,
  Printer,
  Trash2,
  Scale,
  CreditCard,
  Package,
  ShieldCheck,
  Recycle,
  Truck,
  Layers
} from 'lucide-react';
import api from '../../api/axios';
import { useToast } from '../../context/ToastContext';
import Card from '../../components/Card';
import StatCard from '../../components/StatCard';
import Button from '../../components/Button';
import Spinner from '../../components/Spinner';
import EmptyState from '../../components/EmptyState';

const AdminReports = () => {
  const { showToast } = useToast();

  // Current month in YYYY-MM format
  const getInitialMonth = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  };

  const [selectedMonth, setSelectedMonth] = useState(getInitialMonth());
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  const fetchReport = async (month) => {
    setLoading(true);
    try {
      const res = await api.get(`/admin/reports/monthly?month=${month}`);
      if (res.data?.data) {
        setReport(res.data.data);
      }
    } catch (err) {
      showToast('Could not generate monthly report', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport(selectedMonth);
  }, [selectedMonth]);

  const handleDownloadCsv = async () => {
    setExporting(true);
    try {
      const res = await api.get(`/admin/reports/export?month=${selectedMonth}`, {
        responseType: 'blob'
      });
      const blob = new Blob([res.data], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `sgms-report-${selectedMonth}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      showToast('Monthly report downloaded as CSV', 'success');
    } catch (err) {
      showToast('Failed to export CSV report', 'error');
    } finally {
      setExporting(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      {/* Header & Controls Bar */}
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
            Municipal Operations & Waste Reports
          </h2>
          <p style={{ color: 'var(--muted)', fontSize: '0.9rem', marginTop: '0.2rem' }}>
            Comprehensive analytics, driver throughput, and circular economy metrics.
          </p>
        </div>

        {/* Toolbar: Month Picker + CSV Download + Print */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              background: '#ffffff',
              padding: '0.4rem 0.75rem',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border)'
            }}
          >
            <Calendar size={18} color="var(--primary)" />
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              style={{
                border: 'none',
                background: 'transparent',
                fontWeight: 600,
                color: 'var(--text)',
                fontSize: '0.9rem',
                outline: 'none',
                cursor: 'pointer'
              }}
            />
          </div>

          <Button
            variant="secondary"
            onClick={handleDownloadCsv}
            loading={exporting}
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
          >
            <Download size={16} />
            Download CSV
          </Button>

          <Button
            variant="secondary"
            onClick={handlePrint}
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
          >
            <Printer size={16} />
            Print
          </Button>
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
          <Spinner size="lg" />
        </div>
      ) : !report ? (
        <Card style={{ padding: '3rem' }}>
          <EmptyState
            icon={<BarChart3 size={48} color="var(--primary)" />}
            title="No Report Data"
            message={`Unable to retrieve report data for month ${selectedMonth}.`}
          />
        </Card>
      ) : (
        <>
          {/* StatCards: Collections, Total kg, Revenue, Orders, Subscriptions, Compost kg */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: '1rem'
            }}
          >
            <StatCard
              icon={<Trash2 size={24} />}
              label="Collections"
              value={report.collections_count || 0}
            />
            <StatCard
              icon={<Scale size={24} />}
              label="Total Waste"
              value={`${report.total_kg || 0} kg`}
            />
            <StatCard
              icon={<CreditCard size={24} />}
              label="Total Revenue"
              value={`₹${Number(report.revenue || 0).toFixed(2)}`}
            />
            <StatCard
              icon={<Package size={24} />}
              label="Store Orders"
              value={report.orders_count || 0}
            />
            <StatCard
              icon={<ShieldCheck size={24} />}
              label="Subscriptions"
              value={report.subscriptions_count || 0}
            />
            <StatCard
              icon={<Recycle size={24} />}
              label="Compost Output"
              value={`${report.compost_output_kg || 0} kg`}
            />
          </div>

          {/* Dual Column: By Waste Type List & By Driver Table */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))',
              gap: '1.5rem'
            }}
          >
            {/* List By Waste Type */}
            <Card style={{ padding: '1.75rem' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  marginBottom: '1.25rem'
                }}
              >
                <Layers size={20} color="var(--primary)" />
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text)' }}>
                  Waste Breakdown By Type
                </h3>
              </div>

              {!report.by_type || report.by_type.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem 0', color: 'var(--muted)' }}>
                  No waste collected during {selectedMonth}.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {report.by_type.map((t) => {
                    const percent =
                      report.total_kg > 0
                        ? Math.round((t.total_kg / report.total_kg) * 100)
                        : 0;

                    return (
                      <div
                        key={t.waste_type}
                        style={{
                          padding: '1rem',
                          borderRadius: 'var(--radius-sm)',
                          background: '#f8faf9',
                          border: '1px solid var(--border)'
                        }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: '0.4rem'
                          }}
                        >
                          <div>
                            <span
                              style={{
                                fontWeight: 700,
                                textTransform: 'capitalize',
                                color: 'var(--text)',
                                fontSize: '0.95rem'
                              }}
                            >
                              {t.waste_type}
                            </span>
                            <span
                              style={{
                                fontSize: '0.8rem',
                                color: 'var(--muted)',
                                marginLeft: '0.5rem'
                              }}
                            >
                              ({t.count} {t.count === 1 ? 'batch' : 'batches'})
                            </span>
                          </div>
                          <div style={{ fontWeight: 800, color: 'var(--primary)', fontSize: '1rem' }}>
                            {t.total_kg} kg{' '}
                            <span style={{ fontSize: '0.8rem', color: 'var(--muted)', fontWeight: 500 }}>
                              ({percent}%)
                            </span>
                          </div>
                        </div>

                        {/* Progress Bar */}
                        <div
                          style={{
                            width: '100%',
                            height: 8,
                            borderRadius: 4,
                            background: '#e2e8f0',
                            overflow: 'hidden'
                          }}
                        >
                          <div
                            style={{
                              width: `${percent}%`,
                              height: '100%',
                              background:
                                t.waste_type === 'organic'
                                  ? 'var(--primary)'
                                  : t.waste_type === 'recyclable'
                                  ? '#3b82c4'
                                  : '#f0a830',
                              borderRadius: 4,
                              transition: 'width 0.4s ease'
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>

            {/* Table By Driver */}
            <Card style={{ padding: '1.75rem' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  marginBottom: '1.25rem'
                }}
              >
                <Truck size={20} color="var(--primary)" />
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text)' }}>
                  Driver Performance & Throughput
                </h3>
              </div>

              {!report.by_driver || report.by_driver.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem 0', color: 'var(--muted)' }}>
                  No driver collections recorded for {selectedMonth}.
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="sgms-table">
                    <thead>
                      <tr>
                        <th>Driver</th>
                        <th>Pickups</th>
                        <th>Waste Collected</th>
                        <th>Share</th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.by_driver.map((d) => {
                        const driverPercent =
                          report.total_kg > 0
                            ? Math.round((d.kg / report.total_kg) * 100)
                            : 0;

                        return (
                          <tr key={d.driver_id}>
                            <td>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <div
                                  style={{
                                    width: 32,
                                    height: 32,
                                    borderRadius: '50%',
                                    background: 'var(--primary-soft)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: 'var(--primary)',
                                    fontWeight: 700,
                                    fontSize: '0.85rem'
                                  }}
                                >
                                  {d.driver ? d.driver.charAt(0).toUpperCase() : 'D'}
                                </div>
                                <span style={{ fontWeight: 600, color: 'var(--text)' }}>
                                  {d.driver}
                                </span>
                              </div>
                            </td>
                            <td>
                              <span style={{ fontWeight: 700, color: 'var(--text)' }}>
                                {d.count}
                              </span>
                            </td>
                            <td>
                              <span style={{ fontWeight: 700, color: 'var(--primary)' }}>
                                {d.kg} kg
                              </span>
                            </td>
                            <td>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <div
                                  style={{
                                    width: 50,
                                    height: 6,
                                    borderRadius: 3,
                                    background: '#e2e8f0',
                                    overflow: 'hidden'
                                  }}
                                >
                                  <div
                                    style={{
                                      width: `${driverPercent}%`,
                                      height: '100%',
                                      background: 'var(--primary)',
                                      borderRadius: 3
                                    }}
                                  />
                                </div>
                                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--muted)' }}>
                                  {driverPercent}%
                                </span>
                              </div>
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
        </>
      )}
    </div>
  );
};

export default AdminReports;
