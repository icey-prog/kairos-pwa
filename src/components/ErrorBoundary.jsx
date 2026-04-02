import { Component } from 'react'

/**
 * Catches render-time JS errors in the subtree and shows a recovery UI.
 * Wrap heavy async components (Arena, SpacedRepetition …) to prevent a single
 * bad SWR payload from blanking the entire app.
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, message: '' }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, message: error?.message ?? 'Erreur inconnue' }
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary]', error, info?.componentStack)
  }

  reset = () => this.setState({ hasError: false, message: '' })

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: '60vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px',
            padding: '32px',
            textAlign: 'center',
            fontFamily: 'inherit',
          }}
        >
          <span style={{ fontSize: 40 }}>⚠️</span>
          <p style={{ fontWeight: 700, fontSize: 18, margin: 0 }}>
            Quelque chose s'est mal passé
          </p>
          <p style={{ fontSize: 13, opacity: 0.6, margin: 0, maxWidth: 320 }}>
            {this.state.message}
          </p>
          <button
            onClick={this.reset}
            style={{
              marginTop: 8,
              padding: '10px 24px',
              borderRadius: 12,
              border: 'none',
              background: '#007AFF',
              color: '#fff',
              fontWeight: 600,
              cursor: 'pointer',
              fontSize: 14,
            }}
          >
            Réessayer
          </button>
        </div>
      )
    }

    return this.props.children
  }
}
