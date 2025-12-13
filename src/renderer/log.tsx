// src/renderer/Log.tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import LogConsole from './LogConsole'

ReactDOM.createRoot(document.getElementById('log-root')!).render(
  <React.StrictMode>
    <LogConsole />
  </React.StrictMode>
)