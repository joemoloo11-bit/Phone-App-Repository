// PWA entry point. Installs the window.api shim before any Vault renderer
// code runs, then mounts the existing Vault React app exactly as Electron does.

import { installApi } from './api/shim'
installApi()

import React from 'react'
import ReactDOM from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import App from '@renderer/App'
import '@renderer/index.css'

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </React.StrictMode>,
)
