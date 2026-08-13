import React from 'react';

interface Props {
  children: React.ReactNode;
  /** Optional label shown in the error card (e.g. "Admin Portal") */
  portalLabel?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * PortalErrorBoundary
 * -------------------
 * Class-based error boundary that catches any unhandled render / lifecycle
 * error thrown by its children and displays a contained error card instead
 * of crashing the entire application.
 *
 * Usage:
 *   <PortalErrorBoundary portalLabel="Admin Portal">
 *     <AdminDashboardView />
 *   </PortalErrorBoundary>
 */
export class PortalErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // Log to console so devtools / Sentry can pick it up
    console.error('[PortalErrorBoundary] Caught render error:', error, info.componentStack);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    const label = this.props.portalLabel ?? 'Portal';
    const msg = this.state.error?.message ?? 'Unknown error';

    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '60vh',
          padding: '40px 24px',
          fontFamily: 'Inter, system-ui, sans-serif',
        }}
      >
        <div
          style={{
            maxWidth: '520px',
            width: '100%',
            backgroundColor: '#FFFFFF',
            border: '1.5px solid #FCA5A5',
            borderRadius: '20px',
            padding: '36px 32px',
            boxShadow: '0 12px 40px rgba(239,68,68,0.10)',
            textAlign: 'center',
          }}
        >
          {/* Icon */}
          <div style={{ fontSize: '3.4286rem', marginBottom: '16px' }}>⚠️</div>

          {/* Title */}
          <h2
            style={{
              fontSize: '1.15rem',
              fontWeight: 900,
              color: '#0F172A',
              margin: '0 0 8px 0',
            }}
          >
            {label} — Screen Error
          </h2>

          {/* Subtitle */}
          <p style={{ fontSize: '0.9286rem', color: '#64748B', margin: '0 0 20px 0' }}>
            This screen encountered an unexpected error. The rest of the portal
            is unaffected. You can retry or navigate to another section.
          </p>

          {/* Error detail */}
          <pre
            style={{
              background: '#FEF2F2',
              border: '1px solid #FECACA',
              borderRadius: '10px',
              padding: '12px 14px',
              fontSize: '0.7857rem',
              color: '#B91C1C',
              textAlign: 'left',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              marginBottom: '24px',
              maxHeight: '140px',
              overflowY: 'auto',
            }}
          >
            {msg}
          </pre>

          {/* Retry button */}
          <button
            onClick={this.handleRetry}
            style={{
              padding: '10px 28px',
              borderRadius: '12px',
              border: 'none',
              backgroundColor: '#0F172A',
              color: '#FFFFFF',
              fontWeight: 800,
              fontSize: '0.9286rem',
              cursor: 'pointer',
              letterSpacing: '0.01em',
            }}
          >
            🔄 Retry this Screen
          </button>
        </div>
      </div>
    );
  }
}
