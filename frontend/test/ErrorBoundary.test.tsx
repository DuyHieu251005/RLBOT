/**
 * ErrorBoundary Component Tests
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ErrorBoundary } from '../components/ErrorBoundary'

// Component that throws an error
const ThrowError = ({ shouldThrow }: { shouldThrow: boolean }) => {
    if (shouldThrow) {
        throw new Error('Test error message')
    }
    return <div>Child component rendered</div>
}

describe('ErrorBoundary', () => {
    // Suppress console.error for error boundary tests
    const originalConsoleError = console.error
    beforeEach(() => {
        console.error = vi.fn()
    })
    afterEach(() => {
        console.error = originalConsoleError
    })

    it('renders children when there is no error', () => {
        render(
            <ErrorBoundary>
                <ThrowError shouldThrow={false} />
            </ErrorBoundary>
        )

        expect(screen.getByText('Child component rendered')).toBeInTheDocument()
    })

    it('renders fallback UI when there is an error', () => {
        render(
            <ErrorBoundary>
                <ThrowError shouldThrow={true} />
            </ErrorBoundary>
        )

        expect(screen.getByText('Something went wrong')).toBeInTheDocument()
    })

    it('renders custom fallback when provided', () => {
        render(
            <ErrorBoundary fallback={<div>Custom fallback</div>}>
                <ThrowError shouldThrow={true} />
            </ErrorBoundary>
        )

        expect(screen.getByText('Custom fallback')).toBeInTheDocument()
    })

    it('calls onError callback when error occurs', () => {
        const onError = vi.fn()

        render(
            <ErrorBoundary onError={onError}>
                <ThrowError shouldThrow={true} />
            </ErrorBoundary>
        )

        expect(onError).toHaveBeenCalled()
    })
})
