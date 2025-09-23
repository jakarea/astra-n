"use client"

import { Component, ReactNode } from 'react'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error?: Error
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('Error caught by boundary:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="min-h-screen flex items-center justify-center p-4" style={{backgroundColor: '#F8F9FA'}}>
          <div className="max-w-md w-full">
            <div className="bg-white rounded-lg shadow-lg p-6 text-center" style={{borderColor: '#EAEDF0'}}>
              <div className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center" style={{backgroundColor: 'rgba(239, 68, 68, 0.1)'}}>
                <AlertTriangle className="w-8 h-8" style={{color: '#DC2626'}} />
              </div>

              <h1 className="text-xl font-semibold mb-2" style={{color: '#11181C'}}>
                Something went wrong
              </h1>

              <p className="mb-6" style={{color: '#687076'}}>
                An unexpected error occurred. Try refreshing the page or return to the dashboard.
              </p>

              <div className="space-y-3">
                <button
                  onClick={() => window.location.reload()}
                  className="w-full flex items-center justify-center px-4 py-2 rounded-lg font-medium transition-colors"
                  style={{backgroundColor: '#3ECF8E', color: '#FFFFFF'}}
                  onMouseOver={(e) => e.target.style.backgroundColor = '#4CDF9D'}
                  onMouseOut={(e) => e.target.style.backgroundColor = '#3ECF8E'}
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Reload page
                </button>

                <button
                  onClick={() => window.location.href = '/'}
                  className="w-full flex items-center justify-center px-4 py-2 rounded-lg font-medium border transition-colors"
                  style={{borderColor: '#EAEDF0', color: '#687076', backgroundColor: '#FFFFFF'}}
                  onMouseOver={(e) => e.target.style.backgroundColor = '#F8F9FA'}
                  onMouseOut={(e) => e.target.style.backgroundColor = '#FFFFFF'}
                >
                  <Home className="w-4 h-4 mr-2" />
                  Back to Dashboard
                </button>
              </div>

              {process.env.NODE_ENV === 'development' && this.state.error && (
                <details className="mt-6 text-left">
                  <summary className="cursor-pointer text-sm font-medium" style={{color: '#687076'}}>
                    Error details (development only)
                  </summary>
                  <pre className="mt-2 p-3 text-xs rounded border overflow-auto" style={{backgroundColor: '#F8F9FA', color: '#DC2626'}}>
                    {this.state.error.stack}
                  </pre>
                </details>
              )}
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

export function withErrorBoundary<T extends {}>(Component: React.ComponentType<T>, fallback?: ReactNode) {
  return function WithErrorBoundaryComponent(props: T) {
    return (
      <ErrorBoundary fallback={fallback}>
        <Component {...props} />
      </ErrorBoundary>
    )
  }
}