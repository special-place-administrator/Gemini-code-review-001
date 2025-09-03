import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(_: Error): State {
    // Update state so the next render will show the fallback UI.
    return { hasError: true };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gray-900 text-white flex flex-col justify-center items-center p-4 text-center">
            <h1 className="text-4xl font-bold text-red-500 mb-4">Something went wrong.</h1>
            <p className="text-gray-400 mb-8">An unexpected error occurred. Please try reloading the application.</p>
            <button
                onClick={() => window.location.reload()}
                className="px-8 py-3 bg-cyan-600 text-white font-bold rounded-lg hover:bg-cyan-700 transition"
            >
                Reload
            </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
