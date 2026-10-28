import React, { useState, useEffect } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid
} from 'recharts';
import {
  BarChart3,
  Scale,
  Recycle,
  Calendar,
  Printer,
  Sparkles,
  Leaf
} from 'lucide-react';
import api from '../../api/axios';
import { useToast } from '../../context/ToastContext';
import Card from '../../components/Card';
import StatCard from '../../components/StatCard';
import Button from '../../components/Button';
import Spinner from '../../components/Spinner';

const ReportsPage = () => {
  const { showToast } = useToast();

  const [months, setMonths] = useState(6);
  const [loading, setLoading] = useState(true);
  const [reportData, setReportData] = useState(null);

  const fetchReport = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/reports/my/monthly?months=${months}`);
      if (res.data?.data) {
        setReportData(res.data.data);
      }
    } catch (err) {
      showToast('Failed to load monthly waste report', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [months]);

  const handlePrint = () => {
    window.print();
  };

  if (loading && !reportData) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 320 }}>
        <Spinner size="lg" />
      </div>
    );
  }

  const monthlyList = reportData?.monthly || [];
  const totals = reportData?.totals || {
    total_kg: 0,
    total_collections: 0,
    compost_made_kg: 0,
    estimate_note: 'Approx. 40% organic waste conversion'
  };

  return (
    <div className="printable-report" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Top Header */}
      <div
        className="no-print"
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
            Monthly Waste & Compost Analytics
          </h2>
          <p style={{ color: 'var(--muted)', fontSize: '0.9rem', marginTop: '0.2rem' }}>
            Quantitative breakdown of collected solid waste and circular bio-compost yields.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {/* Months selector */}
          <div style={{ display: 'flex', background: '#ffffff', borderRadius: 10, padding: 3, border: '1px solid var(--border)' }}>
            {[3, 6, 12].map((m) => (
              <button
                key={m}
                onClick={() => setMonths(m)}
                style={{
                  padding: '0.4rem 0.85rem',
                  borderRadius: 8,
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  border: 'none',
                  background: months === m ? 'var(--primary)' : 'transparent',
                  color: months === m ? '#ffffff' : 'var(--muted)',
                  cursor: 'pointer',
                  transition: 'var(--transition)'
                }}
              >
                {m} Months
              </button>
            ))}
          </div>

          <Button
            variant="secondary"
            onClick={handlePrint}
            icon={<Printer size={16} />}
          >
            Print Report
          </Button>
        </div>
      </div>

      {/* StatCards Row */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '1.25rem'
        }}
      >
        <StatCard
          icon={<Scale size={24} />}
          label="Total Waste Collected"
          value={`${Number(totals.total_kg).toFixed(1)} kg`}
          subtext={`Over selected ${months} months`}
          color="var(--primary)"
        />

        <StatCard
          icon={<Recycle size={24} />}
          label="Doorstep Collections"
          value={totals.total_collections}
          subtext="Verified pickups logged"
          color="var(--info)"
        />

        <StatCard
          icon={<Leaf size={24} />}
          label="Estimated Compost Made"
          value={`${Number(totals.compost_made_kg).toFixed(1)} kg`}
          subtext={totals.estimate_note || 'Yield estimate (~40% conversion)'}
          color="#8b5cf6"
        />
      </div>

      {/* Chart Section */}
      <Card style={{ padding: '1.75rem' }}>
        <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text)' }}>
              Monthly Waste Generation Trend (kg)
            </h3>
            <span style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>
              Total organic waste collected per calendar month
            </span>
          </div>
        </div>

        <div style={{ width: '100%', height: 320 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthlyList} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#edf2ef" />
              <XAxis dataKey="month" stroke="var(--muted)" fontSize={12} tickLine={false} />
              <YAxis stroke="var(--muted)" fontSize={12} tickLine={false} axisLine={false} />
              <Tooltip
                contentStyle={{
                  background: '#ffffff',
                  borderRadius: 12,
                  boxShadow: 'var(--shadow)',
                  border: 'none',
                  fontSize: '0.85rem'
                }}
                formatter={(value) => [`${Number(value).toFixed(2)} kg`, 'Waste Collected']}
              />
              <Bar dataKey="total_kg" fill="var(--primary)" radius={[6, 6, 0, 0]} maxBarSize={45} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Monthly Breakdown Table */}
      <Card style={{ padding: '1.75rem' }}>
        <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text)', marginBottom: '1rem' }}>
          Monthly Ledger Breakdown
        </h3>

        <div className="table-responsive">
          <table className="sgms-table">
            <thead>
              <tr>
                <th>Calendar Month</th>
                <th>Collections Count</th>
                <th>Waste Collected (kg)</th>
                <th>Compost Yield Estimate (kg)</th>
              </tr>
            </thead>
            <tbody>
              {monthlyList.map((row) => (
                <tr key={row.month}>
                  <td>
                    <strong>{row.month}</strong>
                  </td>
                  <td>{row.collections_count} pickups</td>
                  <td>
                    <strong style={{ color: 'var(--primary)' }}>
                      {Number(row.total_kg).toFixed(2)} kg
                    </strong>
                  </td>
                  <td>
                    <span style={{ color: '#8b5cf6', fontWeight: 600 }}>
                      ~{Number(row.compost_made_kg || row.total_kg * 0.4).toFixed(2)} kg
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <style>{`
        @media print {
          body {
            background: #ffffff !important;
            color: #000000 !important;
          }
          .no-print, header, aside, .sidebar, .drawer-toggle-btn {
            display: none !important;
          }
          .printable-report {
            max-width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .sgms-card {
            box-shadow: none !important;
            border: 1px solid #ddd !important;
            page-break-inside: avoid;
          }
        }
      `}</style>
    </div>
  );
};

export default ReportsPage;
