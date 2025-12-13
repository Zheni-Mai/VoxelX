// src/renderer/splash.tsx
import ReactDOM from 'react-dom/client'
import SplashScreen from './SplashScreen'

const onReady = () => {
  window.electronAPI.ipcRenderer.send('splash-ready')
}

ReactDOM.createRoot(document.getElementById('splash-root')!).render(
  <SplashScreen onReady={onReady} />
)