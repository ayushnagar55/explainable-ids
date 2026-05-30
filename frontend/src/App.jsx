// App.jsx - Main application with routing & auth guard
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import Navbar from './components/Navbar'
import Dashboard from './pages/Dashboard'
import Upload from './pages/Upload'
import Predict from './pages/Predict'
import Explain from './pages/Explain'
import Performance from './pages/Performance'
import Login from './pages/Login'

// Auth guard: redirect to login if no token
function PrivateRoute({ children }) {
  const token = localStorage.getItem('xai_token')
  return token ? children : <Navigate to="/login" replace />
}

function Layout({ children }) {
  return (
    <div style={{ minHeight: '100vh', background: '#0a0f1e', color: '#e2e8f0' }}>
      <Navbar />
      <main style={{ padding: '24px', maxWidth: '1280px', margin: '0 auto' }}>
        {children}
      </main>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Toaster
        position="top-right"
        toastOptions={{
          style: { background: '#1e293b', color: '#e2e8f0', border: '1px solid #334155' }
        }}
      />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={
          <PrivateRoute>
            <Layout><Dashboard /></Layout>
          </PrivateRoute>
        } />
        <Route path="/upload" element={
          <PrivateRoute>
            <Layout><Upload /></Layout>
          </PrivateRoute>
        } />
        <Route path="/predict" element={
          <PrivateRoute>
            <Layout><Predict /></Layout>
          </PrivateRoute>
        } />
        <Route path="/explain" element={
          <PrivateRoute>
            <Layout><Explain /></Layout>
          </PrivateRoute>
        } />
        <Route path="/performance" element={
          <PrivateRoute>
            <Layout><Performance /></Layout>
          </PrivateRoute>
        } />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
