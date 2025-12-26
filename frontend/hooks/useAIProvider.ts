/**
 * useAIProvider Hook - AI Provider and Prompts Cache Management
 */
import { useState, useCallback, useEffect } from 'react';
import { AIProvider } from '../services/api';

interface UseAIProviderReturn {
    aiProvider: AIProvider;
    setAIProvider: (provider: AIProvider) => void;
    promptsCache: Record<string, string[]>;
    updatePromptsCache: (botId: string, prompts: string[]) => void;
}

export function useAIProvider(): UseAIProviderReturn {
    // AI Provider State - persisted in localStorage
    const [aiProvider, setAIProviderState] = useState<AIProvider>(() => {
        return (localStorage.getItem('ai_provider') as AIProvider) || 'gemini';
    });

    // Prompts Cache State - simple in-memory cache, regenerates on reload
    const [promptsCache, setPromptsCache] = useState<Record<string, string[]>>({});

    // Save AI provider to localStorage when changed
    useEffect(() => {
        localStorage.setItem('ai_provider', aiProvider);
    }, [aiProvider]);

    const setAIProvider = useCallback((provider: AIProvider) => {
        setAIProviderState(provider);
    }, []);

    const updatePromptsCache = useCallback((botId: string, prompts: string[]) => {
        setPromptsCache((prev) => ({
            ...prev,
            [botId]: prompts,
        }));
    }, []);

    return {
        aiProvider,
        setAIProvider,
        promptsCache,
        updatePromptsCache,
    };
}
