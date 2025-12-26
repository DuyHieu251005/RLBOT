/**
 * API Module - Re-exports all service functions for backward compatibility
 * 
 * This file now serves as a barrel file that re-exports all functions
 * from individual service modules. This maintains backward compatibility
 * while the codebase is organized into smaller, focused modules.
 * 
 * Service Modules:
 * - apiHelpers.ts: Shared utilities (auth, language detection)
 * - botService.ts: Bot CRUD and sharing operations
 * - kbService.ts: Knowledge Base operations
 * - chatService.ts: AI chat and session management
 * - groupService.ts: Group operations
 * - notificationService.ts: Notification operations
 */

// ==================== API HELPERS ====================
export {
  BACKEND_URL,
  getAuthToken,
  getAuthHeaders,
  isUserAuthenticated,
  detectLanguage,
} from "./apiHelpers";

// ==================== BOT SERVICE ====================
export {
  createBotOnBackend,
  getUserBots,
  shareBotWithUser,
  updateBotOnBackend,
  deleteBotFromBackend,
  unshareBotWithUser,
  unshareBotWithGroup,
  leaveSharedBot,
} from "./botService";

// ==================== KNOWLEDGE BASE SERVICE ====================
export {
  getKnowledgeBasesFromBackend,
  createKnowledgeBaseOnBackend,
  updateKnowledgeBaseOnBackend,
  deleteKnowledgeBaseFromBackend,
  uploadPDFToBackend,
  uploadTextToBackend,
  deleteFileFromKnowledgeBase,
  getKnowledgeBaseFiles,
} from "./kbService";
export type { KBFile } from "./kbService";

// ==================== CHAT SERVICE ====================
export {
  getGeminiResponse,
  retrieveContextFromBackend,
  getAIProviders,
  getSessionMessages,
  getUserChatSessions,
  saveChatSession,
  updateChatSession,
  deleteChatSession,
  addMessageToSession,
} from "./chatService";
export type { AIProvider, ChatSessionData } from "./chatService";

// ==================== GROUP SERVICE ====================
export {
  getUserGroups,
  createGroup,
  deleteGroup,
  inviteUserToGroup,
  leaveGroup,
  removeMemberFromGroup,
} from "./groupService";
export type { GroupData } from "./groupService";

// ==================== NOTIFICATION SERVICE ====================
export {
  getUserNotifications,
  handleNotificationAction,
  subscribeToNotifications,
} from "./notificationService";
export type { Notification } from "./notificationService";

// ==================== DASHBOARD SERVICE ====================
export { getUserDashboard } from "./dashboardService";
export type { DashboardData } from "./dashboardService";
