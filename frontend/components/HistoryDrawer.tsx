import { X, AlertTriangle, Clock, MessageSquare, Calendar } from "lucide-react";
import { ChatSession } from "../types";
import { useMemo } from "react";
import { motion } from "framer-motion";

interface HistoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  sessions: ChatSession[];
  onSelectSession: (id: string) => void;
  onDeleteSession: (id: string) => void;
  isAuthenticated: boolean;
  onLogin: () => void;
}

export function HistoryDrawer({ 
  isOpen, 
  onClose, 
  sessions, 
  onSelectSession, 
  onDeleteSession,
  isAuthenticated,
  onLogin
}: HistoryDrawerProps) {

  // Logic phân nhóm lịch sử theo thời gian
  const groupedSessions = useMemo(() => {
    const today: ChatSession[] = [];
    const yesterday: ChatSession[] = [];
    const older: ChatSession[] = [];

    const now = new Date();
    const todayStr = now.toDateString();
    const yesterdayDate = new Date();
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    const yesterdayStr = yesterdayDate.toDateString();

    // Sắp xếp mới nhất lên đầu
    const sortedSessions = [...sessions].sort((a, b) => 
      new Date(b.updatedAt || b.messages[b.messages.length - 1]?.timestamp).getTime() - 
      new Date(a.updatedAt || a.messages[a.messages.length - 1]?.timestamp).getTime()
    );

    sortedSessions.forEach(session => {
      // Lấy thời gian update cuối hoặc tin nhắn cuối
      const dateObj = new Date(session.updatedAt || session.messages[session.messages.length - 1]?.timestamp);
      const dateStr = dateObj.toDateString();

      if (dateStr === todayStr) {
        today.push(session);
      } else if (dateStr === yesterdayStr) {
        yesterday.push(session);
      } else {
        older.push(session);
      }
    });

    return { today, yesterday, older };
  }, [sessions]);

  // Component hiển thị từng dòng chat item
  const ChatItem = ({ session, index }: { session: ChatSession; index: number }) => (
    <motion.div
      initial={{ opacity: 0, x: 15 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.2, delay: index * 0.03 }}
      className="group relative w-full text-left p-3 rounded-lg hover:bg-[#2B2B2B] transition-all border border-transparent hover:border-[#5A4635] flex items-center gap-3 cursor-pointer"
      onClick={() => {
        onSelectSession(session.id);
        onClose();
      }}
    >
      <MessageSquare className="w-4 h-4 text-[#5A4635] group-hover:text-[#9D4EDD] transition-colors" />
      <div className="flex-1 overflow-hidden">
        <div className="font-medium text-[#E8DCC8] truncate weathered-text text-sm" style={{ fontFamily: 'Noto Serif, serif' }}>
          {session.title}
        </div>
        <div className="text-xs text-[#9B9380] truncate opacity-60 mt-0.5">
            {session.messages[session.messages.length - 1]?.content.substring(0, 40)}...
        </div>
      </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDeleteSession(session.id);
          }}
          className="opacity-0 group-hover:opacity-100 p-1.5 rounded-sm hover:bg-[#8A1C1C]/20 text-[#9B9380] hover:text-[#8A1C1C] transition-all"
          title="Delete chat"
        >
          <X className="w-4 h-4" />
        </button>
      </motion.div>
    );

  return (
    <>
      {/* Backdrop */}
      <div 
        className={`fixed inset-0 bg-black/60 z-40 transition-opacity duration-300 backdrop-blur-sm ${
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={onClose}
      />

      {/* Drawer Panel */}
      <div 
        className={`fixed top-0 right-0 h-full w-[350px] sm:w-[400px] bg-[#1a1a1a] border-l border-[#5A4635] shadow-[-20px_0_50px_rgba(0,0,0,0.7)] z-50 transform transition-transform duration-300 ease-in-out flex flex-col ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[#5A4635] flex-shrink-0">
          <div className="flex items-center gap-3">
            <Clock className="w-5 h-5 text-[#9D4EDD]" />
            <h2 className="text-xl text-[#E8DCC8] font-bold weathered-text tracking-wide" style={{ fontFamily: 'Merriweather, serif' }}>
              History
            </h2>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-[#9B9380] hover:text-[#E8DCC8] hover:bg-[#2B2B2B] rounded-sm transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Warning Banner - Chỉ hiện khi CHƯA đăng nhập */}
        {!isAuthenticated && (
            <div className="bg-[#FFC107]/5 border-b border-[#FFC107]/20 p-4 flex gap-3 items-start animate-in fade-in slide-in-from-top-2">
                <AlertTriangle className="w-5 h-5 text-[#FFC107] flex-shrink-0 mt-0.5" />
                <p className="text-sm text-[#E8DCC8]/90 font-sans leading-relaxed">
                    History is only saved locally. <br/>
                    <button 
                        onClick={() => {
                            onClose();
                            onLogin();
                        }}
                        className="text-[#9D4EDD] hover:text-[#C77DFF] font-bold hover:underline"
                    >
                        Login to RLbot
                    </button> to sync your chats across devices.
                </p>
            </div>
        )}

        {/* List Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6 scrollbar-thin scrollbar-thumb-secondary scrollbar-track-transparent">
          {sessions.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-6 opacity-60">
              <Calendar className="w-12 h-12 text-[#5A4635] mb-3" />
              <p className="text-[#E8DCC8] weathered-text" style={{ fontFamily: 'Merriweather, serif' }}>
                No history yet
              </p>
              <p className="text-[#9B9380] text-sm mt-2" style={{ fontFamily: 'Noto Serif, serif' }}>
                Your conversations will appear here
              </p>
            </div>
          ) : (
            <>
                {/* Today */}
                {groupedSessions.today.length > 0 && (
                  <div>
                    <h3 className="text-xs text-[#9B9380] uppercase tracking-wider mb-3 px-2 font-bold ancient-rune">
                      Today
                    </h3>
                    <div className="space-y-1">
                      {groupedSessions.today.map((session, index) => (
                        <ChatItem key={session.id} session={session} index={index} />
                      ))}
                    </div>
                  </div>
                )}

                {/* Yesterday */}
                {groupedSessions.yesterday.length > 0 && (
                  <div>
                    <h3 className="text-xs text-[#9B9380] uppercase tracking-wider mb-3 px-2 font-bold ancient-rune">
                      Yesterday
                    </h3>
                    <div className="space-y-1">
                      {groupedSessions.yesterday.map((session, index) => (
                        <ChatItem key={session.id} session={session} index={index} />
                      ))}
                    </div>
                  </div>
                )}

                {/* Older */}
                {groupedSessions.older.length > 0 && (
                  <div>
                    <h3 className="text-xs text-[#9B9380] uppercase tracking-wider mb-3 px-2 font-bold ancient-rune">
                      Older
                    </h3>
                    <div className="space-y-1">
                      {groupedSessions.older.map((session, index) => (
                        <ChatItem key={session.id} session={session} index={index} />
                      ))}
                    </div>
                  </div>
                )}
            </>
          )}
        </div>
      </div>
    </>
  );
}
