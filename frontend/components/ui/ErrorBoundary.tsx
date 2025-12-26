import { Component, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from './button';

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
    errorInfo: React.ErrorInfo | null;
}

/**
 * Error Boundary Component
 * 
 * Catches JavaScript errors anywhere in child component tree,
 * logs errors, and displays a fallback UI instead of crashing.
 */
export class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error: Error): Partial<State> {
        // Update state so next render shows fallback UI
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        // Log error to console (in production, send to error tracking service)
        console.error('ErrorBoundary caught an error:', error, errorInfo);
        this.setState({ errorInfo });
    }

    handleRetry = () => {
        this.setState({ hasError: false, error: null, errorInfo: null });
    };

    render() {
        if (this.state.hasError) {
            // Custom fallback if provided
            if (this.props.fallback) {
                return this.props.fallback;
            }

            // Default fallback UI
            return (
                <div className="flex flex-col items-center justify-center min-h-[400px] p-8 text-center">
                    <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mb-4">
                        <AlertTriangle className="w-8 h-8 text-red-500" />
                    </div>

                    <h2 className="text-xl font-semibold text-[#E8DCC8] mb-2">
                        Đã xảy ra lỗi
                    </h2>

                    <p className="text-[#A89F91] mb-6 max-w-md">
                        Một lỗi không mong muốn đã xảy ra. Vui lòng thử tải lại trang hoặc liên hệ hỗ trợ nếu lỗi tiếp tục.
                    </p>

                    {/* Error details in dev mode */}
                    {import.meta.env.DEV && this.state.error && (
                        <details className="mb-6 text-left w-full max-w-lg">
                            <summary className="text-sm text-[#9D4EDD] cursor-pointer hover:underline">
                                Chi tiết lỗi (Dev only)
                            </summary>
                            <pre className="mt-2 p-4 bg-[#2B2B2B] rounded-lg text-xs text-red-400 overflow-auto max-h-40">
                                {this.state.error.toString()}
                                {this.state.errorInfo?.componentStack}
                            </pre>
                        </details>
                    )}

                    <div className="flex gap-3">
                        <Button
                            onClick={this.handleRetry}
                            className="bg-[#9D4EDD] hover:bg-[#7B2CBF] text-white"
                        >
                            <RefreshCw className="w-4 h-4 mr-2" />
                            Thử lại
                        </Button>

                        <Button
                            onClick={() => window.location.reload()}
                            variant="outline"
                            className="border-[#5A4635] text-[#E8DCC8] hover:bg-[#2B2B2B]"
                        >
                            Tải lại trang
                        </Button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
