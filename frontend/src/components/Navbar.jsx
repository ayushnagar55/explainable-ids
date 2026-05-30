// components/Navbar.jsx - Navigation sidebar
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { LayoutDashboard, Upload, Zap, BrainCircuit, BarChart3, LogOut, Shield } from 'lucide-react'

const navItems = [
  { path: '/',           icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/upload',     icon: Upload,          label: 'Upload Data' },
  { path: '/predict',    icon: Zap,             label: 'Predict' },
  { path: '/explain',    icon: BrainCircuit,    label: 'Explainability' },
  { path: '/performance',icon: BarChart3,       label: 'Model Performance' },
]

export default function Navbar() {
  const location = useLocation()
  const navigate  = useNavigate()

  function logout() {
    localStorage.removeItem('xai_token')
    navigate('/login')
  }

  return (
    <nav style={{
      background: '#0d1526',
      borderBottom: '1px solid #1e293b',
      padding: '0 24px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      height: '60px',
      position: 'sticky',
      top: 0,
      zIndex: 100,
    }}>
      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <Shield size={22} color="#38bdf8" />
        <span style={{ fontWeight: 700, fontSize: '16px', color: '#38bdf8', fontFamily: 'monospace' }}>
          XAI-IDS
        </span>
      </div>

      {/* Nav Links */}
      <div style={{ display: 'flex', gap: '4px' }}>
        {navItems.map(({ path, icon: Icon, label }) => {
          const active = location.pathname === path
          return (
            <Link key={path} to={path} style={{ textDecoration: 'none' }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                padding: '6px 14px', borderRadius: '8px',
                fontSize: '13px', fontWeight: active ? 600 : 400,
                color: active ? '#38bdf8' : '#94a3b8',
                background: active ? 'rgba(56,189,248,0.1)' : 'transparent',
                transition: 'all 0.2s',
                cursor: 'pointer',
              }}>
                <Icon size={15} />
                {label}
              </div>
            </Link>
          )
        })}
      </div>

      {/* Logout */}
      <button onClick={logout} style={{
        display: 'flex', alignItems: 'center', gap: '6px',
        background: 'transparent', border: '1px solid #334155',
        color: '#94a3b8', padding: '6px 14px', borderRadius: '8px',
        cursor: 'pointer', fontSize: '13px',
      }}>
        <LogOut size={14} /> Logout
      </button>
    </nav>
  )
}
