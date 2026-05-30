// pages/Dashboard.jsx - Main dashboard with attack distribution stats
import { useState, useEffect } from 'react'
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts'
import { Shield, AlertTriangle, CheckCircle, Activity } from 'lucide-react'
import { getDashboardStats, getPredictions } from '../utils/api'
import toast from 'react-hot-toast'

const COLORS = ['#22c55e','#ef4444','#f59e0b','#8b5cf6','#06b6d4','#f97316','#ec4899','#14b8a6']

function StatCard({ icon: Icon, label, value, color }) {
  return (
    <div style={{
      background: '#0d1526', border: '1px solid #1e293b', borderRadius: '12px',
      padding: '20px 24px', display: 'flex', alignItems: 'center', gap: '16px',
    }}>
      <div style={{
        width: 48, height: 48, borderRadius: '12px',
        background: `${color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Icon size={22} color={color} />
      </div>
      <div>
        <div style={{ fontSize: '26px', fontWeight: 700, color: '#e2e8f0' }}>{value}</div>
        <div style={{ fontSize: '13px', color: '#64748b' }}>{label}</div>
      </div>
    </div>
  )
}

export default function Dashboard() {
  const [stats, setStats]   = useState(null)
  const [preds, setPreds]   = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const [s, p] = await Promise.all([getDashboardStats(), getPredictions()])
        setStats(s.data)
        setPreds(p.data.predictions)
      } catch (err) {
        // If no data yet, show empty state
        setStats({ distribution: [], total_predictions: 0, total_attacks: 0, total_benign: 0 })
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  if (loading) return <Loader />

  const dist = stats?.distribution || []

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif' }}>
      <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#e2e8f0', marginBottom: '4px' }}>
        Security Dashboard
      </h1>
      <p style={{ color: '#64748b', fontSize: '13px', marginBottom: '24px' }}>
        Real-time attack detection overview
      </p>

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '28px' }}>
        <StatCard icon={Activity}      label="Total Predictions" value={stats?.total_predictions || 0} color="#38bdf8" />
        <StatCard icon={AlertTriangle} label="Attacks Detected"  value={stats?.total_attacks || 0}    color="#ef4444" />
        <StatCard icon={CheckCircle}   label="Benign Traffic"    value={stats?.total_benign || 0}      color="#22c55e" />
        <StatCard icon={Shield}        label="Attack Types"
          value={dist.filter(d => d.label.toUpperCase() !== 'BENIGN').length} color="#8b5cf6" />
      </div>

      {dist.length === 0 ? (
        <EmptyState />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          {/* Pie chart */}
          <ChartCard title="Attack Distribution">
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={dist} dataKey="count" nameKey="label"
                  cx="50%" cy="50%" outerRadius={100} label={({ label, percent }) =>
                    `${label} ${(percent*100).toFixed(0)}%`}>
                  {dist.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', color: '#e2e8f0' }} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* Bar chart */}
          <ChartCard title="Count by Category">
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={dist} margin={{ top: 5, right: 20, left: 0, bottom: 60 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="label" tick={{ fill: '#94a3b8', fontSize: 11 }}
                  angle={-35} textAnchor="end" interval={0} />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', color: '#e2e8f0' }} />
                <Bar dataKey="count" radius={[4,4,0,0]}>
                  {dist.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* Recent predictions table */}
          <ChartCard title="Recent Predictions" style={{ gridColumn: '1 / -1' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #1e293b' }}>
                    {['ID','Prediction','Confidence','Model','Time'].map(h => (
                      <th key={h} style={{ padding: '10px 12px', textAlign: 'left', color: '#64748b', fontWeight: 500 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {preds.slice(0, 10).map(p => (
                    <tr key={p.id} style={{ borderBottom: '1px solid #0f172a' }}>
                      <td style={tdS}>{p.id}</td>
                      <td style={tdS}>
                        <span style={{
                          padding: '3px 10px', borderRadius: '20px', fontSize: '12px',
                          background: p.prediction?.toUpperCase() === 'BENIGN' ? '#22c55e20' : '#ef444420',
                          color: p.prediction?.toUpperCase() === 'BENIGN' ? '#22c55e' : '#ef4444',
                        }}>{p.prediction}</span>
                      </td>
                      <td style={tdS}>{(p.confidence * 100).toFixed(1)}%</td>
                      <td style={tdS}>{p.model_used}</td>
                      <td style={tdS}>{new Date(p.predicted_at).toLocaleString()}</td>
                    </tr>
                  ))}
                  {preds.length === 0 && (
                    <tr><td colSpan={5} style={{ ...tdS, textAlign: 'center', color: '#475569', padding: '24px' }}>
                      No predictions yet. Upload data and run predict!
                    </td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </ChartCard>
        </div>
      )}
    </div>
  )
}

function ChartCard({ title, children, style }) {
  return (
    <div style={{
      background: '#0d1526', border: '1px solid #1e293b',
      borderRadius: '12px', padding: '20px', ...style,
    }}>
      <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#94a3b8', marginBottom: '16px', margin: '0 0 16px' }}>
        {title}
      </h3>
      {children}
    </div>
  )
}

function EmptyState() {
  return (
    <div style={{
      textAlign: 'center', padding: '60px 20px',
      background: '#0d1526', border: '1px solid #1e293b',
      borderRadius: '12px', color: '#475569',
    }}>
      <Shield size={48} color="#1e293b" style={{ marginBottom: '16px' }} />
      <p style={{ fontSize: '15px', color: '#64748b' }}>No data yet.</p>
      <p style={{ fontSize: '13px' }}>Upload a CSV → Run Predict to see stats here.</p>
    </div>
  )
}

function Loader() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', color: '#64748b' }}>
      Loading dashboard...
    </div>
  )
}

const tdS = { padding: '10px 12px', color: '#cbd5e1' }
