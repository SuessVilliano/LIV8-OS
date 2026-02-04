import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
    errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error: Error): Partial<State> {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('ErrorBoundary caught an error:', error, errorInfo);
        this.setState({ error, errorInfo });
    }

    handleRefresh = () => {
        this.setState({ hasError: false, error: null, errorInfo: null });
        window.location.reload();
    };

    handleGoHome = () => {
        this.setState({ hasError: false, error: null, errorInfo: null });
        window.location.href = '/dashboard';
    };

    handleRetry = () => {
        this.setState({ hasError: false, error: null, errorInfo: null });
    };

    render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }

            return (
                <div className="min-h-full bg-[var(--os-bg)] flex items-center justify-center p-6">
                    <div className="max-w-md w-full text-center">
                        <div className="h-20 w-20 rounded-3xl bg-red-500/10 flex items-center justify-center mx-auto mb-6">
                            <AlertTriangle className="h-10 w-10 text-red-500" />
                        </div>

                        <h1 className="text-2xl font-black text-[var(--os-text)] mb-3">
                            Something went wrong
                        </h1>

                        <p className="text-[var(--os-text-muted)] text-sm mb-6">
                            An unexpected error occurred while loading this page.
                            This has been logged for review.
                        </p>

                        {this.state.error && (
                            <div className="bg-[var(--os-surface)] border border-[var(--os-border)] rounded-xl p-4 mb-6 text-left">
                                <p className="text-xs font-mono text-red-400 break-words">
                                    {this.state.error.message}
                                </p>
                            </div>
                        )}

                        <div className="flex gap-3 justify-center">
                            <button
                                onClick={this.handleRetry}
                                className="px-5 py-3 bg-neuro text-white rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-neuro/90 transition-all"
                            >
                                <RefreshCw className="h-4 w-4" />
                                Try Again
                            </button>
                            <button
                                onClick={this.handleGoHome}
                                className="px-5 py-3 bg-[var(--os-surface)] border border-[var(--os-border)] text-[var(--os-text)] rounded-xl font-bold text-sm flex items-center gap-2 hover:border-neuro transition-all"
                            >
                                <Home className="h-4 w-4" />
                                Go Home
                            </button>
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
