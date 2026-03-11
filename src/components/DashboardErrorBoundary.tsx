'use client';

import { Component, ReactNode } from 'react';

export class DashboardError extends Error {
  public readonly code: string;
  public readonly context: Record<string, unknown>;
  constructor(message: string, code: string, context: Record<string, unknown> = {}) {
    super(message);
    this.name = 'DashboardError';
    this.code = code;
    this.context = context;
  }
}

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

/**
 * Application-level error boundary.
 * Catches fatal errors and shows a full-page fallback with a reload CTA.
 * Never exposes stack traces or internal state to the user in the UI.
 */
export default class DashboardErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    // Structured logging — no PII, no sensitive paths in production log output
    if (process.env.NODE_ENV === 'development') {
      console.error('[DashboardErrorBoundary]', { message: error.message, componentStack: info.componentStack });
    } else {
      console.error('[DashboardErrorBoundary] A fatal error occurred.');
      // Hook point for external error tracker (e.g. Sentry.captureException(error))
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          role="alert"
          aria-live="assertive"
          className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-8 text-center"
        >
          <div className="max-w-md bg-white rounded-xl shadow-lg p-8 space-y-4">
            <h1 className="text-2xl font-bold text-red-700">Something went wrong</h1>
            <p className="text-gray-600 text-sm">
              An unexpected error occurred. Please reload the page to continue.
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-4 inline-flex items-center justify-center px-6 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Reload page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
