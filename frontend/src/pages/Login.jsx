// pages/Login.jsx - Login & Signup page
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Shield, Eye, EyeOff } from 'lucide-react'
import toast from 'react-hot-toast'
import { login, signup } from '../utils/api'

export default function Login() {
  const navigate = useNavigate()
  const [isLogin, setIsLogin]     = useState(true)
  const [showPass, setShowPass]   = useState(false)
  const [loading, setLoading]     = useState(false)
  const [form, setForm] = useState({ username: '', email: '', password: '' })

  function handleChange(e) {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    try {
      if (isLogin) {
        const res = await login({ username: form.username, password: form.password })
        localStorage.setItem('xai_token', res.data.access_token)
        localStorage.setItem('xai_user', JSON.stringify(res.data.user))
        toast.success('Welcome back!')
        navigate('/')
      } else {
        await signup(form)
        toast.success('Account created! Please login.')
        setIsLogin(true)
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  const S = styles
  return (
    <div style={S.page}>
      <div style={S.card}>
        {/* Header */}
        <div style={S.header}>
          <Shield size={36} color="#38bdf8" />
          <h1 style={S.title}>XAI-IDS</h1>
          <p style={S.subtitle}>Explainable AI Intrusion Detection System</p>
        </div>

        {/* Toggle */}
        <div style={S.toggle}>
          <button style={S.toggleBtn(isLogin)}  onClick={() => setIsLogin(true)}>Login</button>
          <button style={S.toggleBtn(!isLogin)} onClick={() => setIsLogin(false)}>Sign Up</button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={S.form}>
          <div style={S.field}>
            <label style={S.label}>Username</label>
            <input name="username" value={form.username} onChange={handleChange}
              required placeholder="Enter username" style={S.input} />
          </div>

          {!isLogin && (
            <div style={S.field}>
              <label style={S.label}>Email</label>
              <input name="email" type="email" value={form.email} onChange={handleChange}
                required placeholder="Enter email" style={S.input} />
            </div>
          )}

          <div style={S.field}>
            <label style={S.label}>Password</label>
            <div style={{ position: 'relative' }}>
              <input name="password" type={showPass ? 'text' : 'password'}
                value={form.password} onChange={handleChange}
                required placeholder="Enter password"
                style={{ ...S.input, paddingRight: '44px' }} />
              <button type="button" onClick={() => setShowPass(p => !p)}
                style={S.eyeBtn}>
                {showPass ? <EyeOff size={16}/> : <Eye size={16}/>}
              </button>
            </div>
          </div>

          <button type="submit" disabled={loading} style={S.submit}>
            {loading ? 'Please wait...' : isLogin ? 'Login' : 'Create Account'}
          </button>
        </form>

        <p style={S.hint}>
          Default admin: <code style={{color:'#38bdf8'}}>admin / admin123</code>
        </p>
      </div>
    </div>
  )
}

const styles = {
  page: {
    minHeight: '100vh', background: '#0a0f1e',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontFamily: 'system-ui, sans-serif',
  },
  card: {
    background: '#0d1526', border: '1px solid #1e293b',
    borderRadius: '16px', padding: '40px 36px', width: '100%', maxWidth: '420px',
  },
  header: { textAlign: 'center', marginBottom: '28px' },
  title: { margin: '12px 0 4px', fontSize: '24px', fontWeight: 700, color: '#e2e8f0' },
  subtitle: { margin: 0, fontSize: '13px', color: '#64748b' },
  toggle: {
    display: 'flex', background: '#1e293b', borderRadius: '10px',
    padding: '4px', marginBottom: '24px', gap: '4px',
  },
  toggleBtn: (active) => ({
    flex: 1, padding: '8px', border: 'none', borderRadius: '8px', cursor: 'pointer',
    fontWeight: 500, fontSize: '14px', transition: 'all 0.2s',
    background: active ? '#38bdf8' : 'transparent',
    color: active ? '#0a0f1e' : '#94a3b8',
  }),
  form: { display: 'flex', flexDirection: 'column', gap: '16px' },
  field: { display: 'flex', flexDirection: 'column', gap: '6px' },
  label: { fontSize: '13px', color: '#94a3b8', fontWeight: 500 },
  input: {
    background: '#1e293b', border: '1px solid #334155', borderRadius: '8px',
    padding: '10px 14px', color: '#e2e8f0', fontSize: '14px', outline: 'none',
    width: '100%', boxSizing: 'border-box',
  },
  eyeBtn: {
    position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
    background: 'none', border: 'none', color: '#64748b', cursor: 'pointer',
  },
  submit: {
    marginTop: '8px', padding: '12px', background: '#38bdf8', color: '#0a0f1e',
    border: 'none', borderRadius: '10px', fontSize: '15px', fontWeight: 700,
    cursor: 'pointer', transition: 'opacity 0.2s',
  },
  hint: { textAlign: 'center', marginTop: '20px', fontSize: '12px', color: '#475569' },
}
