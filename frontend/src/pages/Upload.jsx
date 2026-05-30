// pages/Upload.jsx - Upload CSV & trigger batch prediction
import { useState, useRef } from 'react'
import { Upload as UploadIcon, FileText, CheckCircle, AlertTriangle, Play } from 'lucide-react'
import toast from 'react-hot-toast'
import { uploadCSV, predictBatch } from '../utils/api'

export default function Upload() {
  const [file, setFile]           = useState(null)
  const [uploading, setUploading] = useState(false)
  const [predicting, setPredicting] = useState(false)
  const [uploadResult, setUploadResult] = useState(null)
  const [batchResult, setBatchResult]   = useState(null)
  const [model, setModel]         = useState('random_forest')
  const inputRef = useRef()

  function handleDrop(e) {
    e.preventDefault()
    const f = e.dataTransfer.files[0]
    if (f?.name.endsWith('.csv')) setFile(f)
    else toast.error('Only CSV files allowed!')
  }

  async function handleUpload() {
    if (!file) return toast.error('Select a file first!')
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await uploadCSV(fd)
      setUploadResult(res.data)
      toast.success(`Uploaded: ${res.data.rows} rows`)
    } catch (err) {
      toast.error(err.response?.data?.error || 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  async function handlePredict() {
    if (!uploadResult) return toast.error('Upload a file first!')
    setPredicting(true)
    try {
      const res = await predictBatch({ upload_id: uploadResult.upload_id, model })
      setBatchResult(res.data)
      toast.success('Batch prediction done!')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Prediction failed')
    } finally {
      setPredicting(false)
    }
  }

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', maxWidth: '800px' }}>
      <h1 style={H1}>Upload Dataset</h1>
      <p style={Sub}>Upload a CICIDS2017-format CSV for batch prediction</p>

      {/* Drop zone */}
      <div
        onDrop={handleDrop} onDragOver={e => e.preventDefault()}
        onClick={() => inputRef.current.click()}
        style={{
          border: `2px dashed ${file ? '#38bdf8' : '#334155'}`,
          borderRadius: '12px', padding: '48px 24px', textAlign: 'center',
          cursor: 'pointer', transition: 'border 0.2s', marginBottom: '20px',
          background: file ? 'rgba(56,189,248,0.04)' : '#0d1526',
        }}>
        <input ref={inputRef} type="file" accept=".csv" style={{ display: 'none' }}
          onChange={e => setFile(e.target.files[0])} />
        <UploadIcon size={36} color={file ? '#38bdf8' : '#334155'} style={{ marginBottom: '12px' }} />
        {file ? (
          <div>
            <p style={{ color: '#38bdf8', fontWeight: 600 }}>{file.name}</p>
            <p style={{ color: '#64748b', fontSize: '13px' }}>
              {(file.size / 1024 / 1024).toFixed(2)} MB — Click to change
            </p>
          </div>
        ) : (
          <div>
            <p style={{ color: '#94a3b8', fontWeight: 500 }}>Drag & drop CSV here</p>
            <p style={{ color: '#475569', fontSize: '13px' }}>or click to browse</p>
          </div>
        )}
      </div>

      {/* Model selector + Upload button */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
        <select value={model} onChange={e => setModel(e.target.value)} style={SelectS}>
          <option value="random_forest">Random Forest</option>
          <option value="xgboost">XGBoost</option>
        </select>
        <button onClick={handleUpload} disabled={!file || uploading} style={BtnBlue}>
          {uploading ? 'Uploading...' : 'Upload CSV'}
        </button>
        <button onClick={handlePredict} disabled={!uploadResult || predicting} style={BtnGreen}>
          <Play size={14} /> {predicting ? 'Running...' : 'Run Prediction'}
        </button>
      </div>

      {/* Upload result */}
      {uploadResult && (
        <InfoCard icon={<CheckCircle size={18} color="#22c55e"/>} title="Upload Successful" color="#22c55e">
          <p>File: <b style={{color:'#e2e8f0'}}>{uploadResult.filename}</b></p>
          <p>Rows detected: <b style={{color:'#e2e8f0'}}>{uploadResult.rows}</b></p>
          <p>Upload ID: <code style={{color:'#38bdf8'}}>{uploadResult.upload_id}</code></p>
        </InfoCard>
      )}

      {/* Batch result */}
      {batchResult && (
        <div style={{ marginTop: '20px' }}>
          <InfoCard icon={<AlertTriangle size={18} color="#f59e0b"/>} title="Batch Prediction Results" color="#f59e0b">
            <p>Total rows: <b style={{color:'#e2e8f0'}}>{batchResult.total_rows}</b></p>
            <p>Attacks detected: <b style={{color:'#ef4444'}}>{batchResult.total_attacks}</b></p>
            <div style={{ marginTop: '12px' }}>
              <p style={{ color: '#64748b', marginBottom: '8px', fontSize: '13px' }}>Attack breakdown:</p>
              {Object.entries(batchResult.attack_summary || {}).map(([k, v]) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid #1e293b' }}>
                  <span style={{ color: k.toUpperCase() === 'BENIGN' ? '#22c55e' : '#f87171', fontSize: '13px' }}>{k}</span>
                  <span style={{ color: '#e2e8f0', fontWeight: 600 }}>{v}</span>
                </div>
              ))}
            </div>
          </InfoCard>

          {/* Preview table */}
          <div style={TableCard}>
            <h3 style={TableTitle}>Sample Results (first 20 rows)</h3>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #1e293b' }}>
                    {['Row','Prediction','Confidence','Attack?'].map(h =>
                      <th key={h} style={ThS}>{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {batchResult.results.slice(0, 20).map(r => (
                    <tr key={r.row} style={{ borderBottom: '1px solid #0f172a' }}>
                      <td style={TdS}>{r.row + 1}</td>
                      <td style={TdS}>
                        <span style={{
                          padding: '2px 8px', borderRadius: '20px', fontSize: '12px',
                          background: r.is_attack ? '#ef444420' : '#22c55e20',
                          color: r.is_attack ? '#ef4444' : '#22c55e',
                        }}>{r.prediction}</span>
                      </td>
                      <td style={TdS}>{(r.confidence * 100).toFixed(1)}%</td>
                      <td style={TdS}>{r.is_attack ? '⚠️ Yes' : '✅ No'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Sample format */}
      <div style={{ marginTop: '28px', padding: '16px 20px', background: '#0d1526', border: '1px solid #1e293b', borderRadius: '12px' }}>
        <p style={{ color: '#64748b', fontSize: '12px', marginBottom: '8px', fontWeight: 600 }}>EXPECTED CSV FORMAT (CICIDS2017 columns):</p>
        <code style={{ color: '#94a3b8', fontSize: '11px', lineHeight: 1.8 }}>
          Destination Port, Flow Duration, Total Fwd Packets, Total Backward Packets,<br/>
          Total Length of Fwd Packets, Total Length of Bwd Packets, ..., Label
        </code>
      </div>
    </div>
  )
}

function InfoCard({ icon, title, color, children }) {
  return (
    <div style={{
      background: '#0d1526', border: `1px solid ${color}30`,
      borderLeft: `3px solid ${color}`, borderRadius: '10px',
      padding: '16px 20px', marginBottom: '12px', fontSize: '13px', color: '#94a3b8', lineHeight: 1.8,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
        {icon}
        <span style={{ fontWeight: 600, color: '#e2e8f0' }}>{title}</span>
      </div>
      {children}
    </div>
  )
}

const H1  = { fontSize: '22px', fontWeight: 700, color: '#e2e8f0', marginBottom: '4px' }
const Sub = { color: '#64748b', fontSize: '13px', marginBottom: '24px' }
const SelectS = {
  background: '#1e293b', border: '1px solid #334155', color: '#e2e8f0',
  padding: '10px 14px', borderRadius: '8px', fontSize: '13px', cursor: 'pointer',
}
const BtnBlue = {
  background: '#38bdf8', color: '#0a0f1e', border: 'none', borderRadius: '8px',
  padding: '10px 20px', fontSize: '13px', fontWeight: 600, cursor: 'pointer',
}
const BtnGreen = {
  background: '#22c55e', color: '#0a0f1e', border: 'none', borderRadius: '8px',
  padding: '10px 20px', fontSize: '13px', fontWeight: 600, cursor: 'pointer',
  display: 'flex', alignItems: 'center', gap: '6px',
}
const TableCard  = { background: '#0d1526', border: '1px solid #1e293b', borderRadius: '12px', padding: '20px', marginTop: '16px' }
const TableTitle = { fontSize: '14px', fontWeight: 600, color: '#94a3b8', marginBottom: '14px', margin: '0 0 14px' }
const ThS = { padding: '10px 12px', textAlign: 'left', color: '#64748b', fontWeight: 500 }
const TdS = { padding: '10px 12px', color: '#cbd5e1' }
