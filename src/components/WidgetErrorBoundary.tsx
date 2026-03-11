'use client';

import { Component, ReactNode } from 'react';

export class WidgetError extends Error {
  public readonly code: string;
  public readonly context: Record<string, unknown>;
  constructor(message: string, code: string, context: Record<string, unknown> = {}) {
    super(message);
    this.name = 'WidgetError';
    this.code = code;
    this.context = context;
  }
}

const MAX_RETRIES = 3;

/** Exponential backoff delay in ms: attempt 1→1s, 2→2s, 3→4s */
function backoffMs(attempt: number): number {
  return Math.min(1000 * Math.pow(2, attempt - 1), 8000);
}

interface Props {
  children: ReactNode;
  /** Optional widget display name shown in the error card */
  widgetName?: string;
}

interface State {
  hasError: boolean;
  attempt: number;
  retrying: boolean;
}

/**
 * Per-widget error boundary.
 * Isolates widget failures so sibling widgets remain functional.
 * Retries up to MAX_RETRIES (3) times with exponential backoff.
 * Never exposes stack traces to the user.
 */
export default class WidgetErrorBoundary extends Component<Props, State> {
  private retryTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, attempt: 0, retrying: false };
  }

  static getDerivedStateFromError(): Partial<State> {
    return { hasError: true, retrying: false };
  }

  componentDidCatch(error: Error) {
    if (process.env.NODE_ENV === 'development') {
      console.error(`[WidgetErrorBoundary:${this.props.widgetName ?? 'unknown'}]`, error.message);
    } else {
      console.error('[WidgetErrorBoundary] Widget error occurred.');
    }
  }

  componentWillUnmount() {
    if (this.retryTimer) clearTimeout(this.retryTimer);
  }

  handleRetry = () => {
    const nextAttempt = this.state.attempt + 1;
    if (nextAttempt > MAX_RETRIES) return;

    this.setState({ retrying: true });
    this.retryTimer = setTimeout(() => {
      this.setState({ hasError: false, attempt: nextAttempt, retrying: false });
    }, backoffMs(nextAttempt));
  };

  render() {
    const { hasError, attempt, retrying } = this.state;
    const { widgetName } = this.props;

    if (hasError) {
      const canRetry = attempt < MAX_RETRIES;
      return (
        <div
          role="alert"
          aria-live="polite"
          className="rounded-lg border border-red-200 bg-red-50 p-4 flex flex-col gap-2"
        >
          <p className="text-sm font-semibold text-red-700">
            {widgetName ? `${widgetName} failed to load.` : 'This widget failed to load.'}
          </p>
          <p className="text-xs text-red-600">
            Please try again. If the problem persists, reload the page.
          </p>
          {canRetry && (
            <button
              type="button"
              disabled={retrying}
              onClick={this.handleRetry}
              className="self-start text-xs font-medium text-red-700 underline hover:no-underline disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-1 rounded"
            >
              {retrying
                ? 'Retrying…'
                : `Retry${attempt > 0 ? ` (${MAX_RETRIES - attempt} left)` : ''}`}
            </button>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}
