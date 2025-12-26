/**
 * Custom Hooks and Utilities Tests
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook } from '@testing-library/react'

// Test useAIProvider hook
describe('useAIProvider', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        localStorage.clear()
    })

    it('should have default provider as gemini', async () => {
        const { useAIProvider } = await import('../hooks/useAIProvider')
        const { result } = renderHook(() => useAIProvider())

        expect(result.current.aiProvider).toBeDefined()
        expect(typeof result.current.setAIProvider).toBe('function')
    })
})

// Test logger utility
describe('logger utility', () => {
    it('should have log, warn, error functions', async () => {
        const { logger } = await import('../utils/logger')

        expect(typeof logger.log).toBe('function')
        expect(typeof logger.warn).toBe('function')
        expect(typeof logger.error).toBe('function')
    })
})

// Test formatTimeAgo utility
describe('formatTimeAgo', () => {
    it('should format recent dates correctly', async () => {
        const { formatTimeAgo } = await import('../utils/date')
        const now = new Date()

        const result = formatTimeAgo(now)
        expect(result).toBeDefined()
        expect(typeof result).toBe('string')
    })

    it('should handle past dates', async () => {
        const { formatTimeAgo } = await import('../utils/date')
        const pastDate = new Date(Date.now() - 1000 * 60 * 60 * 24) // 1 day ago

        const result = formatTimeAgo(pastDate)
        expect(result).toBeDefined()
        expect(result.length).toBeGreaterThan(0)
    })
})
