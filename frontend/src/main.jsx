// main.jsx - React entry point
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'

// Global reset styles (dark theme base)
const style = document.createElement('style')
style.textContent = `
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    background: #0a0f1e;
    color: #e2e8f0;
    -webkit-font-smoothing: antialiased;
  }
  input, select, textarea, button { font-family: inherit; }
  ::-webkit-scrollbar { width: 6px; height: 6px; }
  ::-webkit-scrollbar-track { background: #0a0f1e; }
  ::-webkit-scrollbar-thumb { background: #334155; border-radius: 3px; }
  ::-webkit-scrollbar-thumb:hover { background: #475569; }
`
document.head.appendChild(style)

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
