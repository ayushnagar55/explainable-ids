// pages/Performance.jsx - Model metrics comparison + confusion matrix
import { useState, useEffect } from 'react'
import {
  RadarChart, PolarGrid, PolarAngleAxis, Radar, Legend,
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip
} from 'recharts'
import { BarChart3, Zap } from 'lucide-react'
import toast from 'react-hot-toast'
import { getTrainingLogs, trainModel, getPlotUrl } from '../utils/api'

const METRICS = ['accuracy', 'precision_score', 'recall_score', 'f1_score']
const METRIC_LABELS = { accuracy: 'Accuracy', precision_score: 'Precision', recall_score: 'Recall', f1_score: 'F1 Score' }

export default function Performance() {
  const [logs, setLogs]       = useState([])
  const [training, setTraining] = useState(false)
  const [datasetPath, setDatasetPath] = useState('')
  const [sampleSize, setSampleSize]   = useState(30000)
  const [loading, setLoading] = useState(true)

  async function fetchLogs() {
    try {
      const res = await getTrainingLogs()
      setLogs(res.data.logs)
    } catch (_) {
      setLogs([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchLogs() }, [])

  async function handleTrain() {
    if (!datasetPath) return toast.error('Enter dataset path!')
    setTraining(true)
    toast('Training started — this may take 2-5 minutes...', { duration: 5000 })
    try {
      const res = await trainModel({ dataset_path: datasetPath, sample_size: sampleSize })
      toast.success('Training complete!')
      fetchLogs()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Training failed')
    } finally {
      setTraining(false)
    }
  }

  // Group logs: latest RF and XGB
  const rfLog  = logs.find(l => l.model_name === 'Random Forest')
  const xgbLog = logs.find(l => l.model_name === 'XGBoost')

  // Radar chart data: compare both models
  const radarData = METRICS.map(m => ({
    metric: METRIC_LABELS[m],
    'Random Forest': rfLog  ? parseFloat(rfLog[m]  || 0) : 0,
    'XGBoost':       xgbLog ? parseFloat(xgbLog[m] || 0) : 0,
  }))

  // Bar chart data
  const barData = logs.slice(0, 10).map(l => ({
    name: `${l.model_name} #${l.id}`,
    accuracy: l.accuracy,
    f1_score: l.f1_score,
  }))

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif' }}>
      <h1 style={H1}>Model Performance</h1>
      <p style={Sub}>Train models and compare accuracy, F1, precision, recall</p>

      {/* Train panel */}
      <div style={{ ...Card, marginBottom: '24px' }}>
        <h3 style={CardTitle}><Zap size={15} style={{ verticalAlign: 'middle' }} /> Train Models</h3>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <input
            value={datasetPath}
            onChange={e => setDatasetPath(e.target.value)}
            placeholder="/absolute/path/to/cicids2017.csv"
            style={{ ...InputS, flex: 2 }} />
          <input
            type="number" value={sampleSize}
            onChange={e => setSampleSize(Number(e.target.value))}
            placeholder="Sample size"
            style={{ ...InputS, width: '130px' }} />
          <button onClick={handleTrain} disabled={training} style={BtnBlue}>
            {training ? '⏳ Training...' : '🚀 Train RF + XGBoost'}
          </button>
        </div>
        <p style={{ color: '#475569', fontSize: '12px', marginTop: '10px' }}>
          Tip: Use 30,000–50,000 sample size for B.Tech projects (faster training).
          Training runs SMOTE + RF + XGBoost sequentially.
        </p>
      </div>

      {loading ? <p style={{ color: '#475569' }}>Loading logs...</p> : (
        <>
          {/* Metric cards */}
          {(rfLog || xgbLog) && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px', marginBottom: '24px' }}>
              {METRICS.map(m => (
                <div key={m} style={{ ...Card, textAlign: 'center' }}>
                  <p style={{ color: '#64748b', fontSize: '12px', margin: '0 0 8px' }}>{METRIC_LABELS[m]}</p>
                  <div style={{ display: 'flex', justifyContent: 'center', gap: '16px' }}>
                    {rfLog && (
                      <div>
                        <div style={{ fontSize: '20px', fontWeight: 700, color: '#38bdf8' }}>
                          {(rfLog[m] * 100).toFixed(1)}%
                        </div>
                        <div style={{ fontSize: '10px', color: '#475569' }}>RF</div>
                      </div>
                    )}
                    {xgbLog && (
                      <div>
                        <div style={{ fontSize: '20px', fontWeight: 700, color: '#8b5cf6' }}>
                          {(xgbLog[m] * 100).toFixed(1)}%
                        </div>
                        <div style={{ fontSize: '10px', color: '#475569' }}>XGB</div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Charts */}
          {(rfLog || xgbLog) && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px' }}>
              {/* Radar */}
              <div style={Card}>
                <h3 style={CardTitle}>Model Comparison (Radar)</h3>
                <ResponsiveContainer width="100%" height={260}>
                  <RadarChart data={radarData}>
                    <PolarGrid stroke="#1e293b" />
                    <PolarAngleAxis dataKey="metric" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                    <Radar name="Random Forest" dataKey="Random Forest"
                      stroke="#38bdf8" fill="#38bdf8" fillOpacity={0.2} />
                    <Radar name="XGBoost" dataKey="XGBoost"
                      stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.2} />
                    <Legend wrapperStyle={{ color: '#94a3b8', fontSize: '12px' }} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>

              {/* Bar */}
              <div style={Card}>
                <h3 style={CardTitle}>Accuracy & F1 Over Runs</h3>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={barData} margin={{ bottom: 40, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 10 }}
                      angle={-30} textAnchor="end" />
                    <YAxis domain={[0, 1]} tick={{ fill: '#64748b', fontSize: 11 }} />
                    <Tooltip
                      contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', color: '#e2e8f0' }}
                      formatter={v => [(v * 100).toFixed(1) + '%']} />
                    <Bar dataKey="accuracy" fill="#38bdf8" name="Accuracy" radius={[4,4,0,0]} />
                    <Bar dataKey="f1_score" fill="#8b5cf6" name="F1 Score" radius={[4,4,0,0]} />
                    <Legend wrapperStyle={{ color: '#94a3b8', fontSize: '12px' }} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Confusion Matrix images */}
          {(rfLog || xgbLog) && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px' }}>
              <div style={Card}>
                <h3 style={CardTitle}>Confusion Matrix — Random Forest</h3>
                <img src={getPlotUrl('cm_random_forest.png')} alt="RF confusion matrix"
                  style={{ width: '100%', borderRadius: '8px' }}
                  onError={e => { e.target.replaceWith(Object.assign(document.createElement('p'), { textContent: 'Train model to generate', style: 'color:#475569;font-size:13px' })) }} />
              </div>
              <div style={Card}>
                <h3 style={CardTitle}>Confusion Matrix — XGBoost</h3>
                <img src={getPlotUrl('cm_xgboost.png')} alt="XGBoost confusion matrix"
                  style={{ width: '100%', borderRadius: '8px' }}
                  onError={e => { e.target.replaceWith(Object.assign(document.createElement('p'), { textContent: 'Train model to generate', style: 'color:#475569;font-size:13px' })) }} />
              </div>
            </div>
          )}

          {/* Feature importance images */}
          {(rfLog || xgbLog) && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              <div style={Card}>
                <h3 style={CardTitle}>Feature Importance — Random Forest</h3>
                <img src={getPlotUrl('fi_random_forest.png')} alt="RF feature importance"
                  style={{ width: '100%', borderRadius: '8px' }}
                  onError={() => {}} />
              </div>
              <div style={Card}>
                <h3 style={CardTitle}>Feature Importance — XGBoost</h3>
                <img src={getPlotUrl('fi_xgboost.png')} alt="XGB feature importance"
                  style={{ width: '100%', borderRadius: '8px' }}
                  onError={() => {}} />
              </div>
            </div>
          )}

          {/* Training log table */}
          <div style={{ ...Card, marginTop: '24px' }}>
            <h3 style={CardTitle}><BarChart3 size={14} style={{ verticalAlign: 'middle' }} /> Training History</h3>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #1e293b' }}>
                    {['Model','Accuracy','Precision','Recall','F1','Rows','Trained At'].map(h =>
                      <th key={h} style={ThS}>{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {logs.map(l => (
                    <tr key={l.id} style={{ borderBottom: '1px solid #0f172a' }}>
                      <td style={{ ...TdS, color: l.model_name === 'Random Forest' ? '#38bdf8' : '#8b5cf6', fontWeight: 600 }}>
                        {l.model_name}
                      </td>
                      {['accuracy','precision_score','recall_score','f1_score'].map(m =>
                        <td key={m} style={TdS}>{(l[m] * 100).toFixed(2)}%</td>)}
                      <td style={TdS}>{l.dataset_rows?.toLocaleString()}</td>
                      <td style={TdS}>{new Date(l.trained_at).toLocaleString()}</td>
                    </tr>
                  ))}
                  {logs.length === 0 && (
                    <tr><td colSpan={7} style={{ ...TdS, textAlign: 'center', color: '#475569', padding: '24px' }}>
                      No training runs yet. Train a model above!
                    </td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

const H1 = { fontSize: '22px', fontWeight: 700, color: '#e2e8f0', marginBottom: '4px' }
const Sub = { color: '#64748b', fontSize: '13px', marginBottom: '24px' }
const Card = { background: '#0d1526', border: '1px solid #1e293b', borderRadius: '12px', padding: '18px' }
const CardTitle = { fontSize: '14px', fontWeight: 600, color: '#94a3b8', margin: '0 0 14px', display: 'flex', alignItems: 'center', gap: '6px' }
const InputS = { background: '#1e293b', border: '1px solid #334155', color: '#e2e8f0', padding: '9px 14px', borderRadius: '8px', fontSize: '13px', flex: 1 }
const BtnBlue = { background: '#38bdf8', color: '#0a0f1e', border: 'none', borderRadius: '8px', padding: '9px 20px', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }
const ThS = { padding: '10px 12px', textAlign: 'left', color: '#64748b', fontWeight: 500 }
const TdS = { padding: '10px 12px', color: '#cbd5e1' }
