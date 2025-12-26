// Default RAG System Prompt
export const DEFAULT_RAG_INSTRUCTIONS = 
  'You are a helpful AI assistant. Your task is to answer the user\'s question based STRICTLY on the provided Context Information below.\n' +
  '- Do not use any outside knowledge.\n' +
  '- If the answer is not present in the context, simply reply: "I currently do not have enough information to answer this question based on the provided documents."\n' +
  '- Always respond in the same language as the user\'s question.';

// AI Models Configuration
export const AI_MODELS = {
  GEMINI: {
    id: 'gemini',
    name: 'Gemini Flash',
    provider: 'gemini',
    icon: '✨',
    description: 'Google Gemini Flash - Fast and intelligent'
  },
  DEEPSEEK: {
    id: 'deepseek-r1t2',
    name: 'DeepSeek R1T2 Chimera',
    provider: 'openrouter',
    model: 'tngtech/deepseek-r1t2-chimera:free',
    icon: '🤖',
    description: 'DeepSeek R1T2 - Advanced reasoning model'
  }
} as const;

export const AVAILABLE_MODELS = [
  AI_MODELS.GEMINI,
  AI_MODELS.DEEPSEEK,
] as const;

// LocalStorage keys
export const STORAGE_KEYS = {
  SESSIONS: 'rlbot_sessions',
  BOTS: 'rlbot_bots',
  KNOWLEDGE_BASES: 'rlbot_knowledge_bases',
  GROUPS: 'rlbot_groups',
  LAST_INSTRUCTIONS: 'rlbot_last_instructions', // Save last used instructions
} as const;

// API Configuration
export const API_CONFIG = {
  BASE_URL: import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000',
  TIMEOUT: 30000, // 30 seconds
  RETRY_ATTEMPTS: 3,
} as const;

// UI Configuration
export const UI_CONFIG = {
  // Animation durations (ms)
  ANIMATION_FAST: 200,
  ANIMATION_NORMAL: 300,
  ANIMATION_SLOW: 500,
  
  // Debounce/Throttle
  DEBOUNCE_DELAY: 300,
  THROTTLE_DELAY: 100,
  
  // Pagination
  DEFAULT_PAGE_SIZE: 20,
  
  // Polling intervals
  NOTIFICATION_POLL_INTERVAL: 15000, // 15 seconds
  
  // Max file sizes
  MAX_FILE_SIZE_MB: 10,
} as const;

// Message limits
export const LIMITS = {
  MAX_MESSAGE_LENGTH: 10000,
  MAX_BOT_NAME_LENGTH: 50,
  MAX_KB_NAME_LENGTH: 100,
  MAX_INSTRUCTIONS_LENGTH: 5000,
} as const;
