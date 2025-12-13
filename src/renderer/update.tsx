// src/renderer/Log.tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import UpdateScreen from './UpdateScreen'

ReactDOM.createRoot(document.getElementById('update-root')!).render(
  <React.StrictMode>
    <UpdateScreen />
  </React.StrictMode>
)