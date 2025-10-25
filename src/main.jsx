import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import NetworkErrorBoundary from './components/NetworkErrorBoundary'
import './index.css'
import './i18n'
import 'driver.js/dist/driver.css'
import './driver-custom.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <NetworkErrorBoundary>
    <App />
  </NetworkErrorBoundary>
)
