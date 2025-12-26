/**
 * Retry Utility - Smart retry with exponential backoff
 * Used by dashboard and notification services
 */

/**
 * Retry a function with exponential backoff
 * Retries on 401 errors (session not yet established) or network errors
 */
export async function fetchWithRetry<T>(
    fn: () => Promise<T>,
    options: {
        maxRetries?: number;
        baseDelay?: number;
        onRetry?: (attempt: number, delay: number) => void;
    } = {}
): Promise<T> {
    const { maxRetries = 3, baseDelay = 100, onRetry } = options;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            return await fn();
        } catch (error: any) {
            lastError = error;

            // Only retry on 401 (auth not ready) or network errors
            const isRetryable =
                error?.status === 401 ||
                error?.message?.includes('401') ||
                error?.message?.includes('Failed to fetch');

            if (!isRetryable || attempt >= maxRetries - 1) {
                throw error;
            }

            // Exponential backoff: 100ms, 200ms, 400ms
            const delay = baseDelay * Math.pow(2, attempt);

            if (onRetry) {
                onRetry(attempt + 1, delay);
            }

            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }

    throw lastError;
}

/**
 * Check if response is a 401 error and throw appropriately
 */
export function checkAuthError(response: Response): void {
    if (response.status === 401) {
        const error = new Error(`Auth failed: ${response.status}`);
        (error as any).status = 401;
        throw error;
    }
}
