/**
 * AppContext - Main application state provider
 * Refactored to use useDashboardData hook for bots, KBs, groups
 * Only sessions/chat logic remains here
 */
import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useCallback,
  useRef,
  useMemo,
} from "react";
import { toast } from "sonner";
import { logger } from "../utils/logger";
import {
  getGeminiResponse,
  getUserChatSessions,
  saveChatSession,
  updateChatSession,
  deleteChatSession,
  addMessageToSession,
  AIProvider,
} from "../services/api";
import { ChatSession, BotData, KnowledgeBaseData, GroupData } from "../types";
import { STORAGE_KEYS } from "../constants";
import { useAuth } from "./AuthContext";
import { useDashboardData } from "../hooks/useDashboardData";


interface AppContextType {
  // Chat state
  sessions: ChatSession[];
  activeSessionId: string | null;
  setActiveSessionId: (id: string | null) => void;
  createNewChat: () => void;
  handleSendMessage: (text: string, instructions?: string) => Promise<void>;
  handleDeleteSession: (sessionId: string) => void;

  // Bots state (from useDashboardData)
  bots: BotData[];
  activeBot: BotData | null;
  setActiveBot: (bot: BotData | null) => void;
  handleAddBot: (bot: BotData) => Promise<void>;
  handleDeleteBot: (botId: string) => Promise<void>;
  handleUpdateBot: (bot: BotData) => Promise<void>;

  // Knowledge bases state (from useDashboardData)
  knowledgeBases: KnowledgeBaseData[];
  handleAddKB: (kb: KnowledgeBaseData) => Promise<void>;
  handleDeleteKB: (kbId: string) => Promise<void>;
  handleUpdateKB: (kb: KnowledgeBaseData) => void;
  reloadKnowledgeBases: () => Promise<void>;

  // Groups state (from useDashboardData)
  groups: GroupData[];
  handleAddGroup: (group: GroupData) => Promise<GroupData | null>;
  handleDeleteGroup: (groupId: string) => Promise<void>;

  // Loading state
  isLoading: boolean;

  // Prompts Cache (from useDashboardData)
  promptsCache: Record<string, string[]>;
  updatePromptsCache: (botId: string, prompts: string[]) => void;

  // AI Provider
  aiProvider: AIProvider;
  setAIProvider: (provider: AIProvider) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const { user, isAuthenticated } = useAuth();

  // ============ USE DASHBOARD DATA HOOK ============
  // This hook manages bots, knowledge bases, groups, and their handlers
  const dashboard = useDashboardData({ isAuthenticated, user });

  // ============ SESSIONS STATE (local to AppContext) ============
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [sessionsLoaded, setSessionsLoaded] = useState(false);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);

  // ============ AI PROVIDER STATE ============
  const [aiProvider, setAIProvider] = useState<AIProvider>(() => {
    return (localStorage.getItem("ai_provider") as AIProvider) || "gemini";
  });

  useEffect(() => {
    localStorage.setItem("ai_provider", aiProvider);
  }, [aiProvider]);

  // ============ LOAD SESSIONS ============
  const loadedUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    const loadSessions = async () => {
      if (isAuthenticated && user?.id) {
        if (loadedUserIdRef.current === user.id) return;

        logger.log("🔄 Loading sessions for user:", user.id);
        loadedUserIdRef.current = user.id;

        try {
          const backendSessions = await getUserChatSessions(user.id);
          if (backendSessions.length > 0) {
            const mappedSessions: ChatSession[] = backendSessions.map((s: any) => ({
              id: s.id,
              title: s.title,
              messages: s.messages.map((m: any) => ({
                ...m,
                timestamp: new Date(m.timestamp),
              })),
              createdAt: new Date(s.created_at),
              updatedAt: new Date(s.updated_at),
              isTyping: false,
              botId: s.bot_id,
            }));

            setSessions((prev) => {
              const prevSessionsMap = new Map(prev.map((s) => [s.id, s]));
              return mappedSessions.map((backendSession) => {
                const localSession = prevSessionsMap.get(backendSession.id);
                if (localSession && localSession.messages.length > backendSession.messages.length) {
                  return { ...backendSession, messages: localSession.messages, isTyping: localSession.isTyping };
                }
                return backendSession;
              });
            });
          } else {
            const storageKey = `${STORAGE_KEYS.SESSIONS}_${user.id}`;
            const saved = localStorage.getItem(storageKey);
            if (saved) {
              try {
                const parsed = JSON.parse(saved);
                const hydrated = parsed.map((s: any) => ({
                  ...s,
                  createdAt: new Date(s.createdAt),
                  updatedAt: new Date(s.updatedAt),
                  messages: s.messages.map((m: any) => ({ ...m, timestamp: new Date(m.timestamp) })),
                }));
                setSessions(hydrated);
              } catch (e) {
                logger.error("Error parsing saved sessions:", e);
              }
            }
          }
        } catch (error) {
          logger.error("Error loading sessions:", error);
        } finally {
          setSessionsLoaded(true);
        }
      } else {
        if (loadedUserIdRef.current !== null) {
          logger.log("🧹 Clearing sessions on logout");
          setSessions([]);
          setActiveSessionId(null);
          setSessionsLoaded(false);
          loadedUserIdRef.current = null;
        }
      }
    };

    loadSessions();
  }, [isAuthenticated, user?.id]);

  // ============ LOCALSTORAGE SYNC ============
  useEffect(() => {
    if (isAuthenticated && user && dashboard.kbLoaded) {
      try {
        const storageKey = `${STORAGE_KEYS.KNOWLEDGE_BASES}_${user.id}`;
        localStorage.setItem(storageKey, JSON.stringify(dashboard.knowledgeBases));
      } catch (error) {
        logger.error("Error saving knowledge bases:", error);
      }
    }
  }, [dashboard.knowledgeBases, isAuthenticated, user, dashboard.kbLoaded]);

  useEffect(() => {
    if (isAuthenticated && user && dashboard.groupsLoaded) {
      try {
        const storageKey = `${STORAGE_KEYS.GROUPS}_${user.id}`;
        localStorage.setItem(storageKey, JSON.stringify(dashboard.groups));
      } catch (error) {
        logger.error("Error saving groups:", error);
      }
    }
  }, [dashboard.groups, isAuthenticated, user, dashboard.groupsLoaded]);

  // ============ CHAT HANDLERS ============
  const createNewChat = useCallback(() => {
    setActiveSessionId(null);
  }, []);

  const handleSendMessage = useCallback(
    async (text: string, instructions?: string) => {
      logger.log("📨 handleSendMessage called. ActiveSessionId:", activeSessionId);

      const { activeBot, knowledgeBases } = dashboard;

      // Merge instructions
      let finalInstructions = instructions;
      if (activeBot) {
        if (activeBot.systemInstructions || activeBot.customInstructions) {
          const systemPart = activeBot.systemInstructions || "";
          const customPart = activeBot.customInstructions || "";
          finalInstructions = systemPart + (customPart ? "\n\n" + customPart : "");
        } else if (activeBot.instructions) {
          finalInstructions = activeBot.instructions;
        }
      }

      const newUserMsg = {
        id: Date.now().toString(),
        role: "user" as const,
        content: text,
        timestamp: new Date(),
      };

      let targetSessionId = activeSessionId;
      let currentSession = sessions.find((s) => s.id === targetSessionId);
      let isNewSession = false;

      if (!targetSessionId || !currentSession) {
        logger.log("✨ Creating NEW session");
        isNewSession = true;
        const tempId = Date.now().toString();
        targetSessionId = tempId;

        const newSession: ChatSession = {
          id: tempId,
          title: text.length > 30 ? text.slice(0, 30) + "..." : text,
          messages: [newUserMsg],
          createdAt: new Date(),
          updatedAt: new Date(),
          isTyping: true,
          botId: activeBot?.id,
        };

        setSessions((prev) => [newSession, ...prev]);
        setActiveSessionId(tempId);

        if (isAuthenticated && user && !activeBot?.isPublic) {
          try {
            const result = await saveChatSession({
              title: newSession.title,
              messages: newSession.messages.map((m) => ({
                ...m,
                timestamp: m.timestamp.toISOString(),
              })),
              owner_id: user.id,
              bot_id: activeBot?.id,
            });

            if (result.success && result.id) {
              logger.log(`✅ Session created. TempID [${tempId}] -> RealID [${result.id}]`);
              const realId = result.id;
              targetSessionId = realId;
              setSessions((prev) => prev.map((s) => (s.id === tempId ? { ...s, id: realId } : s)));
              setActiveSessionId(realId);
            }
          } catch (error) {
            logger.error("Failed to save new session:", error);
          }
        }
      } else {
        logger.log("📝 Appending to EXISTING session:", targetSessionId);
        setSessions((prev) =>
          prev.map((session) =>
            session.id === targetSessionId
              ? { ...session, messages: [...session.messages, newUserMsg], updatedAt: new Date(), isTyping: true }
              : session
          )
        );

        if (isAuthenticated && user) {
          // Append-only: just add the user message
          addMessageToSession(targetSessionId, newUserMsg.role, newUserMsg.content);
        }
      }

      // AI Response
      try {
        const botAIProvider = activeBot?.aiProvider || aiProvider;

        const aiResponseText = await getGeminiResponse(
          text,
          finalInstructions,
          undefined,  // context handled by backend
          activeBot?.knowledgeBaseIds || [],
          true,
          true,
          activeBot?.id,
          botAIProvider
        );

        const botMsg = {
          id: (Date.now() + 1).toString(),
          role: "assistant" as const,
          content: aiResponseText,
          timestamp: new Date(),
        };

        setSessions((prev) =>
          prev.map((s) => (s.id === targetSessionId ? { ...s, messages: [...s.messages, botMsg], isTyping: false } : s))
        );

        if (isAuthenticated && user) {
          // Append-only: just add the bot message
          addMessageToSession(targetSessionId, botMsg.role, botMsg.content);
        }
      } catch (error) {
        logger.error("AI Error:", error);
        toast.error("Failed to get AI response. Please check your API key and try again.");
        setSessions((prev) => prev.map((s) => (s.id === targetSessionId ? { ...s, isTyping: false } : s)));
      }
    },
    [activeSessionId, sessions, dashboard.activeBot, dashboard.knowledgeBases, aiProvider, isAuthenticated, user]
  );

  const handleDeleteSession = useCallback(
    async (sessionId: string) => {
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
      if (activeSessionId === sessionId) setActiveSessionId(null);

      if (isAuthenticated && user) {
        try {
          const result = await deleteChatSession(sessionId);
          if (!result.success) {
            logger.error("Failed to delete session:", result.message);
            toast.error("Failed to delete session from server");
          } else {
            logger.log("✅ Session deleted:", sessionId);
          }
        } catch (error) {
          logger.error("Error deleting session:", error);
        }
      }
    },
    [activeSessionId, isAuthenticated, user]
  );

  // ============ CONTEXT VALUE ============
  const value = useMemo(
    () => ({
      // Sessions
      sessions,
      activeSessionId,
      setActiveSessionId,
      createNewChat,
      handleSendMessage,
      handleDeleteSession,
      // Bots (from dashboard hook)
      bots: dashboard.bots,
      activeBot: dashboard.activeBot,
      setActiveBot: dashboard.setActiveBot,
      handleAddBot: dashboard.handleAddBot,
      handleDeleteBot: dashboard.handleDeleteBot,
      handleUpdateBot: dashboard.handleUpdateBot,
      // Knowledge Bases (from dashboard hook)
      knowledgeBases: dashboard.knowledgeBases,
      handleAddKB: dashboard.handleAddKB,
      handleDeleteKB: dashboard.handleDeleteKB,
      handleUpdateKB: dashboard.handleUpdateKB,
      reloadKnowledgeBases: dashboard.reloadKnowledgeBases,
      // Groups (from dashboard hook)
      groups: dashboard.groups,
      handleAddGroup: dashboard.handleAddGroup,
      handleDeleteGroup: dashboard.handleDeleteGroup,
      // Loading & Cache
      isLoading: dashboard.isLoading,
      promptsCache: dashboard.promptsCache,
      updatePromptsCache: dashboard.updatePromptsCache,
      // AI Provider
      aiProvider,
      setAIProvider,
    }),
    [
      sessions, activeSessionId, createNewChat, handleSendMessage, handleDeleteSession,
      dashboard.bots, dashboard.activeBot, dashboard.setActiveBot, dashboard.handleAddBot,
      dashboard.handleDeleteBot, dashboard.handleUpdateBot, dashboard.knowledgeBases,
      dashboard.handleAddKB, dashboard.handleDeleteKB, dashboard.handleUpdateKB,
      dashboard.reloadKnowledgeBases, dashboard.groups, dashboard.handleAddGroup,
      dashboard.handleDeleteGroup, dashboard.isLoading, dashboard.promptsCache,
      dashboard.updatePromptsCache, aiProvider
    ]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppContext() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error("useAppContext must be used within an AppProvider");
  }
  return context;
}
