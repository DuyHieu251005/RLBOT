// Chat and Message Types
export interface Message {
  id: string;
  content: string;
  role: "user" | "assistant";
  timestamp: Date;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  createdAt: Date;
  updatedAt: Date;
  isTyping?: boolean;
  botId?: string;  // Link session to specific bot
}

// AI Provider Type
export type AIProvider = 'gemini' | 'openrouter';

// Bot Types
export interface BotData {
  id: string;
  name: string;
  customInstructions?: string; // Only custom instructions now
  // Legacy fields for compatibility
  systemInstructions?: string;
  instructions?: string;
  type?: string;

  createdAt: Date;
  knowledgeBaseIds?: string[];
  uploadedFiles?: UploadedFile[];
  aiProvider?: AIProvider;
  isPublic?: boolean;  // true = Widget Bot (no history), false = Chat Bot
  ownerId?: string;
  sharedWith?: string[];
  sharedWithGroups?: string[];
}

// Knowledge Base Types
export interface KnowledgeBaseData {
  id: string;
  name: string;
  description?: string;
  fileCount: number;
  size: string;
  type: string;
  createdAt: Date;
  content?: string; // Added content field
}

// Uploaded File Type
export interface UploadedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  uploadedAt: Date;
  content?: string;
}

// Group Types
export interface GroupData {
  id: string;
  name: string;
  description?: string;
  members?: string[];
  ownerId?: string;
  memberCount: number;
  botCount: number;
  createdAt: Date;
}

// User Types
export interface User {
  id: string;
  email: string;
  name?: string;
  createdAt: Date;
}

// Auth Types
export interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  token: string | null;
}