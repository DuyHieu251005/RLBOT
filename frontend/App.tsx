import { useState, useEffect, useCallback, lazy, Suspense } from "react";
import { Sidebar } from "./components/Sidebar";
import { Header } from "./components/Header";
import { NotificationDrawer, Notification } from "./components/NotificationDrawer";
import { MainChat } from "./components/MainChat";
import { HistoryDrawer } from "./components/HistoryDrawer";
import { AuthPage } from "./components/AuthPage";
import { AppProvider, useAppContext } from "./contexts/AppContext";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { Toaster } from "./components/ui/toaster";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { LogOut, User as UserIcon, LogIn, Bell, Loader2 } from "lucide-react";
import { BotData } from "./types";
import { logger } from "./utils/logger";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { WidgetPage } from "./components/WidgetPage";
import {
  getUserNotifications,
  handleNotificationAction,
  subscribeToNotifications,
  Notification as ApiNotification
} from "./services/api";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

// Lazy loaded components for code splitting
const Bots = lazy(() => import("./components/Bots").then(m => ({ default: m.Bots })));
const KnowledgeBases = lazy(() => import("./components/KnowledgeBases").then(m => ({ default: m.KnowledgeBases })));
const Groups = lazy(() => import("./components/Groups").then(m => ({ default: m.Groups })));
const Referral = lazy(() => import("./components/Referral").then(m => ({ default: m.Referral })));
const Subscription = lazy(() => import("./components/Subscription").then(m => ({ default: m.Subscription })));

// Loading fallback component
function LoadingFallback() {
  return (
    <div className="flex items-center justify-center h-full">
      <Loader2 className="w-8 h-8 text-[#9D4EDD] animate-spin" />
    </div>
  );
}

// Helper to map API notification to UI notification
function mapNotification(n: ApiNotification): Notification {
  return {
    id: n.id,
    type: n.type === 'group_invite' ? 'group_invite' : 'bot_share',
    title: n.type === 'group_invite' ? 'Group Invitation' : 'Bot Share Request',
    message: n.content,
    from: n.data?.inviter_email || n.data?.owner_name || 'Someone',
    groupId: n.data?.group_id,
    groupName: n.data?.group_name,
    botId: n.data?.bot_id,
    botName: n.data?.bot_name,
    timestamp: new Date(n.created_at),
    status: n.status as 'pending' | 'accepted' | 'rejected'
  };
}

// Supabase Realtime subscriber component
function NotificationSubscriber({
  isAuthenticated,
  user,
  notifications,
  setNotifications
}: {
  isAuthenticated: boolean,
  user: any,
  notifications: Notification[],
  setNotifications: React.Dispatch<React.SetStateAction<Notification[]>>
}) {
  useEffect(() => {
    if (!isAuthenticated || !user) {
      return;
    }

    // Initial load
    const loadInitialNotifications = async () => {
      try {
        const data = await getUserNotifications(user.id);
        const mappedNotifications = data.map(mapNotification);
        setNotifications(mappedNotifications);
      } catch (error) {
        logger.error("Failed to load notifications", error);
      }
    };

    loadInitialNotifications();

    // Subscribe to realtime updates
    const unsubscribe = subscribeToNotifications(
      user.id,
      // On INSERT
      (newNotification) => {
        const mapped = mapNotification(newNotification);
        setNotifications(prev => {
          // Check if already exists (avoid duplicates)
          if (prev.some(n => n.id === mapped.id)) {
            return prev;
          }
          // Show toast for new notification
          toast.info(`New ${mapped.type === 'group_invite' ? 'group invitation' : 'bot share'} from ${mapped.from}`);
          return [mapped, ...prev];
        });
      },
      // On UPDATE
      (updatedNotification) => {
        const mapped = mapNotification(updatedNotification);
        setNotifications(prev =>
          prev.map(n => n.id === mapped.id ? mapped : n)
        );
      },
      // On DELETE
      (deletedNotification) => {
        setNotifications(prev =>
          prev.filter(n => n.id !== deletedNotification.id)
        );
      }
    );

    return () => {
      unsubscribe();
    };
  }, [isAuthenticated, user?.id, setNotifications]);

  return null;
}


function AppContent() {
  const [activeView, setActiveView] = useState("chat");
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const { isAuthenticated, user, logout } = useAuth();


  const handleAcceptNotification = async (notificationId: string) => {
    try {
      const success = await handleNotificationAction(notificationId, 'accept');
      if (success) {
        setNotifications(prev => prev.map(n =>
          n.id === notificationId ? { ...n, status: 'accepted' as const } : n
        ));
        window.location.reload();
      }
    } catch (error) {
      logger.error("Failed to accept notification", error);
    }
  };

  const handleRejectNotification = async (notificationId: string) => {
    try {
      const success = await handleNotificationAction(notificationId, 'reject');
      if (success) {
        setNotifications(prev => prev.map(n =>
          n.id === notificationId ? { ...n, status: 'rejected' as const } : n
        ));
      }
    } catch (error) {
      logger.error("Failed to reject notification", error);
    }
  };

  const {
    sessions,
    activeSessionId,
    setActiveSessionId,
    createNewChat,
    handleSendMessage,
    handleDeleteSession,
    bots,
    activeBot,
    setActiveBot,
    handleAddBot,
    handleDeleteBot,
    handleUpdateBot,
    knowledgeBases,
    handleAddKB,
    handleDeleteKB,
    handleUpdateKB,
    groups,
    handleAddGroup,
    handleDeleteGroup,
  } = useAppContext();

  const activeSession = sessions.find(
    (s) => s.id === activeSessionId,
  );

  const handleChatWithBot = (bot: BotData) => {
    setActiveBot(bot);
    setActiveView("chat");
    createNewChat();
  };

  // Tự động chuyển về Chat khi đăng nhập thành công
  useEffect(() => {
    if (isAuthenticated && activeView === "auth") {
      setActiveView("chat");
    }
  }, [isAuthenticated]);

  return (
    <>
      {/* Realtime Notification Subscriber - uses Supabase Realtime */}
      <NotificationSubscriber
        isAuthenticated={isAuthenticated}
        user={user}
        notifications={notifications}
        setNotifications={setNotifications}
      />

      <div className="flex h-screen bg-[#1A1A1A] text-[#E8DCC8] relative overflow-hidden">
        {/* Sidebar with staggered reveal */}
        <motion.div
          initial={{ x: -300, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ type: "spring", damping: 20, stiffness: 100 }}
          className="relative z-20 h-full"
        >
          <Sidebar
            activeView={activeView === "auth" ? "" : activeView}
            onViewChange={setActiveView}
          />
        </motion.div>

        <div className="flex-1 flex flex-col relative z-10 overflow-hidden">
          {/* Header */}
          <motion.div
            initial={{ y: -100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            <Header>
              <div className="flex items-center gap-4">
                {isAuthenticated ? (
                  <>
                    <button
                      onClick={() => setIsNotificationOpen(true)}
                      className="p-2 text-[#E8DCC8] hover:text-[#9D4EDD] hover:bg-[#2B2B2B] rounded-full transition-all duration-300 hover:scale-110 relative group"
                      title="Thông báo"
                    >
                      <Bell className="w-5 h-5 group-hover:animate-swing" />
                      {notifications.filter(n => n.status === 'pending').length > 0 && (
                        <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-[#9D4EDD] rounded-full flex items-center justify-center text-[10px] text-white font-bold shadow-[0_0_8px_rgba(157,78,221,0.6)]">
                          {notifications.filter(n => n.status === 'pending').length}
                        </span>
                      )}
                    </button>
                    <div className="flex items-center gap-3 px-4 py-1.5 bg-[#2A1B35] border border-[#5A4635] rounded-full shadow-inner hover:border-[#9D4EDD] transition-colors group cursor-default">
                      <div className="w-6 h-6 rounded-full bg-[#9D4EDD]/20 flex items-center justify-center border border-[#9D4EDD]/30 group-hover:border-[#9D4EDD] transition-all">
                        <UserIcon className="w-3.5 h-3.5 text-[#9D4EDD]" />
                      </div>
                      <span className="text-[#E8DCC8] text-sm font-medium tracking-wide truncate max-w-[150px]">
                        {user?.name || user?.email}
                      </span>
                    </div>
                    <button
                      onClick={logout}
                      className="p-2 text-[#E8DCC8] hover:text-red-400 hover:bg-red-400/10 rounded-full transition-all duration-300 hover:scale-110"
                      title="Đăng xuất"
                    >
                      <LogOut className="w-5 h-5" />
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => setActiveView("auth")}
                    className="relative overflow-hidden group px-6 py-2 bg-[#9D4EDD]/10 border border-[#9D4EDD] text-[#9D4EDD] rounded-full hover:bg-[#9D4EDD] hover:text-[#1F1F1F] transition-all duration-500 font-bold tracking-wider uppercase text-xs"
                  >
                    <div className="absolute inset-0 w-1/4 h-full bg-white/20 -skew-x-[45deg] -translate-x-[150%] group-hover:translate-x-[400%] transition-transform duration-700"></div>
                    <div className="flex items-center gap-2">
                      <LogIn className="w-4 h-4" />
                      <span>Login</span>
                    </div>
                  </button>
                )}
              </div>
            </Header>
          </motion.div>

          {/* Main Content Area with Framer Motion Transition */}
          <main className="flex-1 overflow-hidden relative">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeView}
                initial={{ opacity: 0, y: 20, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -20, scale: 0.98 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
                className="h-full w-full"
              >
                {activeView === "auth" && (
                  <div className="h-full flex items-center justify-center p-4">
                    <AuthPage />
                  </div>
                )}

                {activeView === "chat" && (
                  <MainChat
                    session={activeSession}
                    onSendMessage={handleSendMessage}
                    onNewChat={createNewChat}
                    onToggleHistory={() => setIsHistoryOpen(!isHistoryOpen)}
                    isHistoryOpen={isHistoryOpen}
                    onCreateBot={handleAddBot}
                    isAuthenticated={isAuthenticated}
                    activeBot={activeBot}
                    bots={bots}
                    onSetActiveBot={setActiveBot}
                    knowledgeBases={knowledgeBases}
                    onCreateKB={handleAddKB}
                  />
                )}

                {activeView === "bot" && (
                  <Suspense fallback={<LoadingFallback />}>
                    <ErrorBoundary>
                      <Bots
                        bots={bots}
                        onCreateBot={handleAddBot}
                        onDeleteBot={handleDeleteBot}
                        onUpdateBot={handleUpdateBot}
                        isAuthenticated={isAuthenticated}
                        onChatWithBot={handleChatWithBot}
                        knowledgeBases={knowledgeBases}
                        onCreateKB={handleAddKB}
                        onUpdateKB={handleUpdateKB}
                        groups={groups}
                      />
                    </ErrorBoundary>
                  </Suspense>
                )}

                {activeView === "data" && (
                  <Suspense fallback={<LoadingFallback />}>
                    <ErrorBoundary>
                      <KnowledgeBases
                        knowledgeBases={knowledgeBases}
                        onCreateKB={handleAddKB}
                        onDeleteKB={handleDeleteKB}
                        onUpdateKB={handleUpdateKB}
                        isAuthenticated={isAuthenticated}
                      />
                    </ErrorBoundary>
                  </Suspense>
                )}

                {activeView === "group" && (
                  <Suspense fallback={<LoadingFallback />}>
                    <ErrorBoundary>
                      <Groups
                        groups={groups}
                        onCreateGroup={handleAddGroup}
                        onDeleteGroup={handleDeleteGroup}
                        isAuthenticated={isAuthenticated}
                      />
                    </ErrorBoundary>
                  </Suspense>
                )}

                {activeView === "referral" && (
                  <Suspense fallback={<LoadingFallback />}>
                    <ErrorBoundary>
                      <Referral />
                    </ErrorBoundary>
                  </Suspense>
                )}
                {activeView === "subscription" && (
                  <Suspense fallback={<LoadingFallback />}>
                    <ErrorBoundary>
                      <Subscription />
                    </ErrorBoundary>
                  </Suspense>
                )}
              </motion.div>
            </AnimatePresence>
          </main>
        </div>

        <HistoryDrawer
          isOpen={isHistoryOpen}
          onClose={() => setIsHistoryOpen(false)}
          sessions={activeBot ? sessions.filter(s => s.botId === activeBot.id) : sessions}
          onSelectSession={setActiveSessionId}
          onDeleteSession={handleDeleteSession}
          isAuthenticated={isAuthenticated}
          onLogin={() => setActiveView("auth")}
        />

        <NotificationDrawer
          isOpen={isNotificationOpen}
          onClose={() => setIsNotificationOpen(false)}
          notifications={notifications}
          onAccept={handleAcceptNotification}
          onReject={handleRejectNotification}
        />

        <Toaster />
      </div>
    </>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <AppProvider>
          <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <Routes>
              <Route path="/widget/:botId" element={
                <ErrorBoundary>
                  <WidgetRouteWrapper />
                </ErrorBoundary>
              } />
              <Route path="*" element={
                <ErrorBoundary>
                  <AppContent />
                </ErrorBoundary>
              } />
            </Routes>
          </Router>
        </AppProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}

function WidgetRouteWrapper() {
  const { bots } = useAppContext();
  return <WidgetPage bots={bots} />;
}