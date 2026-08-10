import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/index.css'
import App from './App.tsx'
import { PortalErrorBoundary } from './components/common/PortalErrorBoundary'

// Each portal is individually wrapped inside App, but the shell around them —
// routing, navigation context, the public portfolio and the login screen — was
// not. A throw in any of those took the whole page to a blank screen. This
// outermost boundary is the backstop for everything.
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <PortalErrorBoundary portalLabel="Inspire ERP">
      <App />
    </PortalErrorBoundary>
  </StrictMode>,
)
