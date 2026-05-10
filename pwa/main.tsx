// PWA entry point. Installs the window.api shim before any Vault renderer
// code runs, then mounts the existing Vault React app exactly as Electron does.
// Mobile-only overrides (safe-area + bottom nav) are applied via mobile.css
// and the MobileNav component, sibling of <App /> inside the Router.

import { installApi } from './api/shim'
installApi()

import React from 'react'
import ReactDOM from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import App from '@renderer/App'
import '@renderer/index.css'
import './mobile.css'
import MobileNav from './MobileNav'
import UpdateButton from './UpdateButton'

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <HashRouter>
      <App />
      <MobileNav />
      <UpdateButton />
    </HashRouter>
  </React.StrictMode>,
)
