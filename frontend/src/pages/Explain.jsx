// pages/Explain.jsx - SHAP global + LIME local explanation page
import { useState } from 'react'
import { BrainCircuit, BarChart2, AlertCircle } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import toast from 'react-hot-toast'
import { getShapGlobal, getLimeExplanation, getPlotUrl } from '../utils/api'

const SAMPLE_FEATURES = {
  ' Destination Port': 80, ' Flow Duration': 91870,
  ' Total Fwd Packets': 6, ' Total Backward Packets': 4,
  ' Total Length of Fwd Packets': 4936, ' Total Length of Bwd Packets': 668,
  ' Fwd Packet Length Max': 1448, ' Fwd Packet Length Min': 0,
  ' Fwd Packet Length Mean': 822.67, ' Bwd Packet Length Max': 334,
  ' Flow Bytes/s': 61087.72, ' Flow Packets/s': 109.94,
  ' Flow IAT Mean': 9187.0, ' Fwd IAT Mean': 18374.0, ' Bwd IAT Mean': 30623.33,
}

export default function Explain() {
  const [model, setModel]       = useState('random_forest')
  const [shapData, setShapData] = useState(null)
  const [limeData, setLimeData] = useState(null)
  const [shapLoading, setShapLoading] = useState(false)
  const [limeLoading, setLimeLoading] = useState(false)
  const [shapPlots, setShapPlots]     = useState({})

  async function loadSHAP() {
    setShapLoading(true)
    try {
      const res = await getShapGlobal(model, 100)
      setShapData(res.data)
      setShapPlots({
        bar: getPlotUrl(res.data.bar_plot),
        dot: getPlotUrl(res.data.dot_plot),
      })
      toast.success('SHAP computed!')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Run /train-model first!')
    } finally {
      setShapLoading(false)
    }
  }

  async function loadLIME() {
    setLimeLoading(true)
    try {
      const res = await getLimeExplanation({ features: SAMPLE_FEATURES, model })
      setLimeData(res.data)
      toast.success('LIME explanation ready!')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Run /train-model first!')
    } finally {
      setLimeLoading(false)
    }
  }

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif' }}>
      <h1 style={H1}>Explainability (XAI)</h1>
      <p style={Sub}>Understand WHY the model makes each prediction — globally (SHAP) and locally (LIME)</p>

      {/* Controls */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '24px' }}>
        <select value={model} onChange={e => setModel(e.target.value)} style={SelectS}>
          <option value="random_forest">Random Forest</option>
          <option value="xgboost">XGBoost</option>
        </select>
        <button onClick={loadSHAP} disabled={shapLoading} style={BtnBlue}>
          <BarChart2 size={14} /> {shapLoading ? 'Computing...' : 'Load SHAP (Global)'}
        </button>
        <button onClick={loadLIME} disabled={limeLoading} style={BtnPurple}>
          <BrainCircuit size={14} /> {limeLoading ? 'Explaining...' : 'Load LIME (Local)'}
        </button>
      </div>

      {/* Explanation banners */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
        <InfoBanner color="#38bdf8" title="SHAP — Global Explanation"
          text="Shows which features affect ALL predictions overall. The longer the bar, the more important the feature across the dataset." />
        <InfoBanner color="#8b5cf6" title="LIME — Local Explanation"
          text="Explains THIS specific prediction. Green bars push towards the predicted class; red bars push away from it." />
      </div>

      {/* SHAP Section */}
      {shapData && (
        <div style={{ marginBottom: '24px' }}>
          <SectionHeader>SHAP Feature Importance (Top 15)</SectionHeader>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            {/* Recharts bar */}
            <div style={Card}>
              <h3 style={CardTitle}>Interactive Bar Chart</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  data={shapData.feature_importances.slice(0, 15)}
                  layout="vertical"
                  margin={{ left: 20, right: 20, top: 0, bottom: 0 }}>
                  <XAxis type="number" tick={{ fill: '#64748b', fontSize: 11 }} />
                  <YAxis type="category" dataKey="feature" tick={{ fill: '#94a3b8', fontSize: 10 }}
                    width={160} />
                  <Tooltip
                    contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', color: '#e2e8f0' }}
                    formatter={v => [v.toFixed(5), 'SHAP importance']} />
                  <Bar dataKey="shap_importance" radius={[0, 4, 4, 0]}>
                    {shapData.feature_importances.slice(0, 15).map((_, i) => (
                      <Cell key={i} fill={`hsl(${200 + i * 8}, 80%, ${60 - i * 2}%)`} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* SHAP bar plot from matplotlib */}
            <div style={Card}>
              <h3 style={CardTitle}>SHAP Summary (Bar) — from Python</h3>
              <img src={shapPlots.bar} alt="SHAP bar plot"
                style={{ width: '100%', borderRadius: '8px', border: '1px solid #1e293b' }}
                onError={e => { e.target.style.display = 'none' }} />
            </div>

            {/* SHAP dot/beeswarm plot */}
            <div style={{ ...Card, gridColumn: '1/-1' }}>
              <h3 style={CardTitle}>SHAP Beeswarm Plot (Feature value impact)</h3>
              <img src={shapPlots.dot} alt="SHAP dot plot"
                style={{ width: '100%', maxHeight: '320px', objectFit: 'contain', borderRadius: '8px' }}
                onError={e => { e.target.style.display = 'none' }} />
              <p style={{ color: '#475569', fontSize: '12px', marginTop: '8px' }}>
                Each dot = one prediction. Red = high feature value, Blue = low. X-axis = SHAP impact.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* LIME Section */}
      {limeData && (
        <div>
          <SectionHeader>LIME Local Explanation</SectionHeader>

          {/* Prediction summary */}
          <div style={{
            ...Card,
            borderLeft: `4px solid ${limeData.predicted_class?.toUpperCase() === 'BENIGN' ? '#22c55e' : '#ef4444'}`,
            marginBottom: '16px',
          }}>
            <div style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
              <div>
                <p style={{ color: '#64748b', fontSize: '12px', margin: '0 0 4px' }}>Predicted Class</p>
                <p style={{ color: '#e2e8f0', fontWeight: 700, fontSize: '18px', margin: 0 }}>
                  {limeData.predicted_class}
                </p>
              </div>
              <div>
                <p style={{ color: '#64748b', fontSize: '12px', margin: '0 0 4px' }}>Confidence</p>
                <p style={{ color: '#38bdf8', fontWeight: 700, fontSize: '18px', margin: 0 }}>
                  {(limeData.confidence * 100).toFixed(2)}%
                </p>
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            {/* Supporting features */}
            <div style={Card}>
              <h3 style={{ ...CardTitle, color: '#22c55e' }}>✅ Supporting Features</h3>
              <p style={{ color: '#475569', fontSize: '11px', marginBottom: '12px' }}>
                These pushed towards "{limeData.predicted_class}"
              </p>
              {limeData.supporting_features?.slice(0, 8).map((f, i) => (
                <div key={i} style={{ marginBottom: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                    <span style={{ fontSize: '12px', color: '#94a3b8' }}>{f.condition}</span>
                    <span style={{ fontSize: '12px', color: '#22c55e', fontWeight: 600 }}>
                      +{f.weight.toFixed(4)}
                    </span>
                  </div>
                  <div style={{ height: '4px', background: '#1e293b', borderRadius: '2px' }}>
                    <div style={{ height: '100%', width: `${Math.min(100, f.weight * 200)}%`, background: '#22c55e', borderRadius: '2px' }} />
                  </div>
                </div>
              ))}
            </div>

            {/* Contradicting features */}
            <div style={Card}>
              <h3 style={{ ...CardTitle, color: '#ef4444' }}>❌ Contradicting Features</h3>
              <p style={{ color: '#475569', fontSize: '11px', marginBottom: '12px' }}>
                These pushed AWAY from "{limeData.predicted_class}"
              </p>
              {limeData.contradicting_features?.slice(0, 8).map((f, i) => (
                <div key={i} style={{ marginBottom: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                    <span style={{ fontSize: '12px', color: '#94a3b8' }}>{f.condition}</span>
                    <span style={{ fontSize: '12px', color: '#ef4444', fontWeight: 600 }}>
                      {f.weight.toFixed(4)}
                    </span>
                  </div>
                  <div style={{ height: '4px', background: '#1e293b', borderRadius: '2px' }}>
                    <div style={{ height: '100%', width: `${Math.min(100, Math.abs(f.weight) * 200)}%`, background: '#ef4444', borderRadius: '2px' }} />
                  </div>
                </div>
              ))}
            </div>

            {/* LIME plot from Python */}
            <div style={{ ...Card, gridColumn: '1/-1' }}>
              <h3 style={CardTitle}>LIME Explanation Plot (from Python)</h3>
              <img
                src={getPlotUrl('lime_explanation.png')}
                alt="LIME explanation"
                style={{ width: '100%', borderRadius: '8px', border: '1px solid #1e293b' }}
                onError={e => { e.target.style.display='none' }} />
            </div>
          </div>
        </div>
      )}

      {/* Empty state */}
      {!shapData && !limeData && (
        <div style={{ textAlign: 'center', padding: '60px', color: '#475569' }}>
          <AlertCircle size={40} color="#334155" style={{ marginBottom: '12px' }} />
          <p>Click "Load SHAP" or "Load LIME" to generate explanations.</p>
          <p style={{ fontSize: '13px' }}>Make sure model is trained first!</p>
        </div>
      )}
    </div>
  )
}

function SectionHeader({ children }) {
  return <h2 style={{ fontSize: '16px', fontWeight: 600, color: '#e2e8f0', margin: '0 0 16px', paddingBottom: '8px', borderBottom: '1px solid #1e293b' }}>{children}</h2>
}

function InfoBanner({ color, title, text }) {
  return (
    <div style={{ background: '#0d1526', border: `1px solid ${color}30`, borderLeft: `3px solid ${color}`, borderRadius: '10px', padding: '14px 18px' }}>
      <p style={{ color, fontWeight: 600, fontSize: '13px', margin: '0 0 6px' }}>{title}</p>
      <p style={{ color: '#64748b', fontSize: '12px', margin: 0, lineHeight: 1.6 }}>{text}</p>
    </div>
  )
}

const H1 = { fontSize: '22px', fontWeight: 700, color: '#e2e8f0', marginBottom: '4px' }
const Sub = { color: '#64748b', fontSize: '13px', marginBottom: '24px' }
const Card = { background: '#0d1526', border: '1px solid #1e293b', borderRadius: '12px', padding: '18px' }
const CardTitle = { fontSize: '14px', fontWeight: 600, color: '#94a3b8', margin: '0 0 14px' }
const SelectS = { background: '#1e293b', border: '1px solid #334155', color: '#e2e8f0', padding: '9px 14px', borderRadius: '8px', fontSize: '13px' }
const BtnBlue = { background: '#38bdf8', color: '#0a0f1e', border: 'none', borderRadius: '8px', padding: '9px 18px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }
const BtnPurple = { background: '#8b5cf620', color: '#8b5cf6', border: '1px solid #8b5cf640', borderRadius: '8px', padding: '9px 18px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }
