// utils/api.js - Centralized API calls to Flask backend
import axios from 'axios'


const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: { 'Content-Type': 'application/json' }
})

// Attach JWT token to every request automatically
api.interceptors.request.use(config => {
  const token = localStorage.getItem('xai_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Auto-logout on 401
api.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('xai_token')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

// ---- Auth ----
export const login = (data)  => api.post('/api/auth/login', data)
export const signup = (data) => api.post('/api/auth/signup', data)
export const getMe = ()      => api.get('/api/auth/me')
// ---- Upload ----
export const uploadCSV = (formData) =>
  api.post('/upload-csv', formData, { headers: { 'Content-Type': 'multipart/form-data' } })
export const getUploads = () => api.get('/uploads')

// ---- Train ----
export const trainModel = (body) => api.post('/train-model', body)
export const getTrainingLogs = () => api.get('/training-logs')

// ---- Predict ----
export const predict = (body)       => api.post('/predict', body)
export const predictBatch = (body)  => api.post('/predict-batch', body)
export const getPredictions = ()    => api.get('/predictions')
export const getDashboardStats = () => api.get('/dashboard-stats')

// ---- Explain ----
export const getLimeExplanation = (body) => api.post('/get-explanation', body)
export const getShapGlobal = (model, samples = 100) =>
  api.get(`/shap-global?model=${model}&samples=${samples}`)
export const getPlotUrl = (filename) => `/api/plots/${filename}`

export default api
