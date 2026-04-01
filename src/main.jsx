import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'

// Style global (ancien _app.js remanié pour Vite)
import '../styles/globals.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
