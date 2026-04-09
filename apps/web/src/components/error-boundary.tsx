import { Component, type ErrorInfo, type ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
}

// Layout-level error boundary. Catches any render-time exception thrown
// by a page or widget and renders a fallback so a single broken widget
// can't blank the whole app. The "Reload" action forces a full page
// refresh which also clears React Query cache.

export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    // eslint-disable-next-line no-console
    console.error('[lifeos] render error caught by ErrorBoundary:', error, info);
  }

  private handleReset = (): void => {
    this.setState({ error: null });
  };

  private handleReload = (): void => {
    window.location.reload();
  };

  override render(): ReactNode {
    if (this.state.error) {
      return (
        <div className="flex min-h-[400px] items-center justify-center p-6">
          <div className="max-w-md rounded-lg border border-red-200 bg-red-50 p-6 shadow-sm">
            <h2 className="text-base font-semibold text-red-900">
              Something went wrong
            </h2>
            <p className="mt-1 text-sm text-red-700">
              A UI component crashed while rendering. Your data is safe — the
              backend hasn't been touched. Try reloading the page.
            </p>
            <details className="mt-3 text-xs text-red-800">
              <summary className="cursor-pointer font-medium">
                Technical details
              </summary>
              <pre className="mt-2 max-h-32 overflow-auto whitespace-pre-wrap rounded bg-red-100 p-2">
                {this.state.error.message}
                {'\n\n'}
                {this.state.error.stack ?? ''}
              </pre>
            </details>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={this.handleReset}
                className="rounded-md border border-red-300 bg-white px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50"
              >
                Try again
              </button>
              <button
                type="button"
                onClick={this.handleReload}
                className="rounded-md bg-red-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-800"
              >
                Reload page
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
