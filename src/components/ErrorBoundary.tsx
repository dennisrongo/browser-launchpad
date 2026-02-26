import React, { Component, ErrorInfo, ReactNode } from 'react'
import { AlertTriangle } from 'lucide-react'
import { logger } from '../utils/logger'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
}

/**
 * ErrorBoundary component that catches React component errors
 * and displays a friendly error message instead of crashing the app
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    }
  }

  static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error,
      errorInfo: null,
    }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log the error to console
    console.error('ErrorBoundary caught an error:', error)
    console.error('Error Info:', errorInfo)

    // Log to our logger utility
    logger.error('React Error Boundary caught error:', {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
    })

    // Update state with error info
    this.setState({
      error,
      errorInfo,
    })
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    })
  }

  handleReload = () => {
    window.location.reload()
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background px-4">
          <div className="max-w-md w-full bg-surface-elevated rounded-lg shadow-lg p-8 border border-border-subtle">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-500/10 mb-4">
                <AlertTriangle className="h-10 w-10 text-red-500" />
              </div>

              <h1 className="text-2xl font-bold text-text mb-2">
                Something went wrong
              </h1>

              <p className="text-text-secondary mb-6">
                The application encountered an unexpected error. You can try
                resetting the app or reloading the page.
              </p>

              {import.meta.env.DEV && this.state.error && (
                <details className="mb-6 text-left">
                  <summary className="cursor-pointer text-sm font-medium text-text-secondary hover:text-text mb-2">
                    Error Details (Development)
                  </summary>
                  <div className="bg-surface rounded p-3 text-xs font-mono text-text-secondary overflow-auto max-h-40 border border-border-subtle">
                    <div className="font-bold mb-1 text-text">{this.state.error.toString()}</div>
                    {this.state.error.stack && (
                      <pre className="whitespace-pre-wrap">{this.state.error.stack}</pre>
                    )}
                  </div>
                </details>
              )}

              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={this.handleReset}
                  className="flex-1 px-4 py-2 bg-primary hover:opacity-90 text-white font-medium rounded-button transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                >
                  Try Again
                </button>
                <button
                  onClick={this.handleReload}
                  className="flex-1 px-4 py-2 bg-surface hover:bg-surface/80 text-text font-medium rounded-button border border-border transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                >
                  Reload Page
                </button>
              </div>

              <p className="mt-6 text-sm text-text-muted">
                If this problem persists, you can try clearing your browser data
                or contact support.
              </p>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
