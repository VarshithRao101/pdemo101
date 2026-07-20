import React from 'react'
import { createRoot } from 'react-dom/client'
import '../src/styles/theme.css'
import '../src/styles/index.css'
import '../src/styles/animations.css'
import '../src/styles/glass.css'
import App from '../src/App.tsx'

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App forcedRole="admin1" />
  </React.StrictMode>,
)
