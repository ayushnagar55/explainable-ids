// pages/Predict.jsx - Manual single-row prediction + real-time simulation
import { useState } from 'react'
import { Zap, RefreshCw, AlertTriangle, CheckCircle } from 'lucide-react'
import { RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer } from 'recharts'
import toast from 'react-hot-toast'
import { predict } from '../utils/api'

// Default sample features for quick demo (subset of CICIDS2017 features)
const SAMPLE_BENIGN = {
  ' Destination Port': 80, ' Flow Duration': 91870, ' Total Fwd Packets': 6,
  ' Total Backward Packets': 4, ' Total Length of Fwd Packets': 4936,
  ' Total Length of Bwd Packets': 668, ' Fwd Packet Length Max': 1448,
  ' Fwd Packet Length Min': 0, ' Fwd Packet Length Mean': 822.67,
  ' Bwd Packet Length Max': 334, ' Flow Bytes/s': 61087.72,
  ' Flow Packets/s': 109.94, ' Flow IAT Mean': 9187.0,
  ' Fwd IAT Mean': 18374.0, ' Bwd IAT Mean': 30623.33,
}

const SAMPLE_ATTACK = {
  ' Destination Port': 443, ' Flow Duration': 120, ' Total Fwd Packets': 1000,
  ' Total Backward Packets': 0, ' Total Length of Fwd Packets': 52000,
  ' Total Length of Bwd Packets': 0, ' Fwd Packet Length Max': 52,
  ' Fwd Packet Length Min': 52, ' Fwd Packet Length Mean': 52,
  ' Bwd Packet Length Max': 0, ' Flow Bytes/s': 3466666.67,
  ' Flow Packets/s': 66666.67, ' Flow IAT Mean': 0.12,
  ' Fwd IAT Mean': 0.12, ' Bwd IAT Mean': 0,
}

export default function Predict() {
  const [model, setModel]       = useState('random_forest')
  const [loading, setLoading]   = useState(false)
  const [result, setResult]     = useState(null)
  const [simulating, setSimulating] = useState(false)
  const [simLog, setSimLog]     = useState([])
  const [features, setFeatures] = useState(
    Object.entries(SAMPLE_BENIGN).map(([k, v]) => ({ key: k, value: v }))
  )

  function loadSample(type) {
    const sample = type === 'benign' ? SAMPLE_BENIGN : SAMPLE_ATTACK
    setFeatures(Object.entries(sample).map(([k, v]) => ({ key: k, value: v })))
    toast(`Loaded ${type} sample`)
  }

  function updateFeature(i, field, val) {
    setFeatures(f => f.map((row, idx) => idx === i ? { ...row, [field]: val } : row))
  }

  async function handlePredict() {
    setLoading(true)
    const featObj = {}
    features.forEach(({ key, value }) => { featObj[key] = parseFloat(value) || 0 })
    try {
      const res = await predict({ features: featObj, model })
      setResult(res.data)
      toast.success('Prediction done!')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Prediction failed. Train model first!')
    } finally {
      setLoading(false)
    }
  }

  // Real-time simulation: auto-predict every 2s with random noise
  async function toggleSimulation() {
    if (simulating) { setSimulating(false); return }
    setSimulating(true)
    setSimLog([])
    let count = 0
    const interval = setInterval(async () => {
      if (count >= 10) { clearInterval(interval); setSimulating(false); return }
      count++
      // Randomly pick benign or attack sample with noise
      const base = Math.random() > 0.4 ? SAMPLE_BENIGN : SAMPLE_ATTACK
      const noisy = {}
      for (const [k, v] of Object.entries(base)) {
        noisy[k] = parseFloat(v) * (0.9 + Math.random() * 0.2)
      }
      try {
        const res = await predict({ features: noisy, model })
        setSimLog(log => [{
          id: count, prediction: res.data.prediction,
          confidence: res.data.confidence, is_attack: res.data.is_attack,
          time: new Date().toLocaleTimeString()
        }, ...log].slice(0, 20))
      } catch (_) {}
    }, 2000)
  }

  // Radar chart data from top features
  const radarData = features.slice(0, 6).map(f => ({
    feature: f.key.trim().slice(0, 16),
    value: Math.min(100, Math.abs(parseFloat(f.value) / 100))
  }))

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif' }}>
      <h1 style={H1}>Predict Intrusion</h1>
      <p style={Sub}>Enter network flow features or load a sample to predict attack/benign</p>

      {/* Controls */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <select value={model} onChange={e => setModel(e.target.value)} style={SelectS}>
          <option value="random_forest">Random Forest</option>
          <option value="xgboost">XGBoost</option>
        </select>
        <button onClick={() => loadSample('benign')} style={BtnSecondary}>Load Benign Sample</button>
        <button onClick={() => loadSample('attack')} style={BtnRed}>Load Attack Sample</button>
        <button onClick={handlePredict} disabled={loading} style={BtnBlue}>
          <Zap size={14} /> {loading ? 'Predicting...' : 'Predict'}
        </button>
        <button onClick={toggleSimulation} style={simulating ? BtnRed : BtnGreen}>
          <RefreshCw size={14} style={{ animation: simulating ? 'spin 1s linear infinite' : 'none' }} />
          {simulating ? 'Stop Simulation' : 'Live Simulation'}
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        {/* Feature input table */}
        <div style={Card}>
          <h3 style={CardTitle}>Network Flow Features</h3>
          <div style={{ maxHeight: '380px', overflowY: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
              <thead style={{ position: 'sticky', top: 0, background: '#0d1526' }}>
                <tr>
                  <th style={ThS}>Feature</th>
                  <th style={ThS}>Value</th>
                </tr>
              </thead>
              <tbody>
                {features.map((f, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #0f172a' }}>
                    <td style={{ padding: '6px 10px', color: '#94a3b8' }}>{f.key.trim()}</td>
                    <td style={{ padding: '4px 6px' }}>
                      <input type="number" value={f.value}
                        onChange={e => updateFeature(i, 'value', e.target.value)}
                        style={{
                          background: '#1e293b', border: '1px solid #334155',
                          color: '#e2e8f0', padding: '4px 8px', borderRadius: '6px',
                          width: '100%', fontSize: '12px',
                        }} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Prediction result */}
          {result && (
            <div style={{
              ...Card, borderColor: result.is_attack ? '#ef444440' : '#22c55e40',
              borderLeft: `4px solid ${result.is_attack ? '#ef4444' : '#22c55e'}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                {result.is_attack
                  ? <AlertTriangle size={24} color="#ef4444" />
                  : <CheckCircle size={24} color="#22c55e" />}
                <div>
                  <div style={{ fontSize: '20px', fontWeight: 700, color: result.is_attack ? '#ef4444' : '#22c55e' }}>
                    {result.prediction}
                  </div>
                  <div style={{ fontSize: '12px', color: '#64748b' }}>
                    {result.is_attack ? '⚠️ ATTACK DETECTED' : '✅ Normal Traffic'}
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderTop: '1px solid #1e293b' }}>
                <span style={{ color: '#64748b', fontSize: '13px' }}>Confidence</span>
                <span style={{ color: '#e2e8f0', fontWeight: 600 }}>{(result.confidence * 100).toFixed(2)}%</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0' }}>
                <span style={{ color: '#64748b', fontSize: '13px' }}>Model</span>
                <span style={{ color: '#38bdf8', fontSize: '13px' }}>{result.model_used}</span>
              </div>
              {/* Probability bars */}
              {result.probabilities && (
                <div style={{ marginTop: '12px' }}>
                  <p style={{ color: '#475569', fontSize: '12px', marginBottom: '8px' }}>Class probabilities:</p>
                  {Object.entries(result.probabilities).slice(0, 5).map(([cls, prob]) => (
                    <div key={cls} style={{ marginBottom: '6px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                        <span style={{ fontSize: '11px', color: '#94a3b8' }}>{cls}</span>
                        <span style={{ fontSize: '11px', color: '#94a3b8' }}>{(prob * 100).toFixed(1)}%</span>
                      </div>
                      <div style={{ height: '4px', background: '#1e293b', borderRadius: '2px' }}>
                        <div style={{ height: '100%', width: `${prob * 100}%`, background: '#38bdf8', borderRadius: '2px' }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Radar */}
          <div style={Card}>
            <h3 style={CardTitle}>Feature Radar</h3>
            <ResponsiveContainer width="100%" height={180}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="#1e293b" />
                <PolarAngleAxis dataKey="feature" tick={{ fill: '#64748b', fontSize: 10 }} />
                <Radar name="value" dataKey="value" stroke="#38bdf8" fill="#38bdf8" fillOpacity={0.2} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Live simulation log */}
      {simLog.length > 0 && (
        <div style={{ ...Card, marginTop: '20px' }}>
          <h3 style={CardTitle}>Live Simulation Log</h3>
          <div style={{ maxHeight: '220px', overflowY: 'auto' }}>
            {simLog.map(s => (
              <div key={s.id} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '8px 12px', borderBottom: '1px solid #0f172a', fontSize: '13px',
              }}>
                <span style={{ color: '#475569' }}>#{s.id}</span>
                <span style={{
                  padding: '2px 10px', borderRadius: '20px', fontSize: '12px',
                  background: s.is_attack ? '#ef444420' : '#22c55e20',
                  color: s.is_attack ? '#ef4444' : '#22c55e',
                }}>{s.prediction}</span>
                <span style={{ color: '#94a3b8' }}>{(s.confidence * 100).toFixed(1)}%</span>
                <span style={{ color: '#475569' }}>{s.time}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

const H1 = { fontSize: '22px', fontWeight: 700, color: '#e2e8f0', marginBottom: '4px' }
const Sub = { color: '#64748b', fontSize: '13px', marginBottom: '24px' }
const Card = { background: '#0d1526', border: '1px solid #1e293b', borderRadius: '12px', padding: '18px' }
const CardTitle = { fontSize: '14px', fontWeight: 600, color: '#94a3b8', margin: '0 0 14px' }
const SelectS = { background: '#1e293b', border: '1px solid #334155', color: '#e2e8f0', padding: '9px 14px', borderRadius: '8px', fontSize: '13px' }
const BtnBlue = { background: '#38bdf8', color: '#0a0f1e', border: 'none', borderRadius: '8px', padding: '9px 18px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }
const BtnGreen = { background: '#22c55e', color: '#0a0f1e', border: 'none', borderRadius: '8px', padding: '9px 18px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }
const BtnRed = { background: '#ef444420', color: '#ef4444', border: '1px solid #ef444440', borderRadius: '8px', padding: '9px 18px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }
const BtnSecondary = { background: '#1e293b', color: '#94a3b8', border: '1px solid #334155', borderRadius: '8px', padding: '9px 18px', fontSize: '13px', cursor: 'pointer' }
const ThS = { padding: '8px 10px', textAlign: 'left', color: '#475569', fontWeight: 500, borderBottom: '1px solid #1e293b' }
