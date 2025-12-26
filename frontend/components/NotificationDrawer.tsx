import { X, Bell, Check, XIcon, Users, Bot, Clock } from "lucide-react";
import { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";

export interface Notification {
  id: string;
  type: 'group_invite' | 'bot_share';
  title: string;
  message: string;
  from: string;
  groupId?: string;
  groupName?: string;
  botId?: string;
  botName?: string;
  timestamp: Date;
  status: 'pending' | 'accepted' | 'rejected';
}

interface NotificationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: Notification[];
  onAccept: (notificationId: string) => void;
  onReject: (notificationId: string) => void;
}

export function NotificationDrawer({
  isOpen,
  onClose,
  notifications,
  onAccept,
  onReject
}: NotificationDrawerProps) {
  const { user } = useAuth();
  const [isAnimating, setIsAnimating] = useState(false);
  const [shouldRender, setShouldRender] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setShouldRender(true);
      setTimeout(() => setIsAnimating(true), 10);
    } else {
      setIsAnimating(false);
      const timer = setTimeout(() => setShouldRender(false), 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  if (!shouldRender) return null;

  const pendingNotifications = notifications.filter(n => n.status === 'pending');

  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - new Date(date).getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  return (
    <>
      {/* Overlay */}
      <div
        className={`fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300 z-40 ${isAnimating ? "opacity-100" : "opacity-0"
          }`}
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        className={`fixed top-0 right-0 h-full w-full max-w-md bg-[#1F1F1F] border-l-2 border-[#5A4635] shadow-[-20px_0_50px_rgba(0,0,0,0.7)] z-50 transform transition-all duration-300 ease-in-out flex flex-col ${isAnimating ? "translate-x-0" : "translate-x-full"
          }`}
        style={{ willChange: 'transform' }}
      >
        {/* Header */}
        <div className="p-6 border-b-2 border-[#5A4635] flex items-center justify-between bg-gradient-to-r from-[#1F1F1F] to-[#2B2B2B]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#9D4EDD]/30 to-[#5A4635]/30 flex items-center justify-center border-2 border-[#9D4EDD]/40 relative">
              <Bell className="w-5 h-5 text-[#9D4EDD]" />
              {pendingNotifications.length > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-xs text-white font-bold">
                  {pendingNotifications.length}
                </span>
              )}
            </div>
            <div>
              <h2
                className="text-[#E8DCC8] text-xl font-bold weathered-text"
                style={{ fontFamily: 'Merriweather, serif' }}
              >
                Notifications
              </h2>
              <p className="text-muted-foreground text-sm weathered-text" style={{ fontFamily: 'Noto Serif, serif' }}>
                {pendingNotifications.length} pending
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-[#E8DCC8] transition-colors p-2 hover:bg-[#2B2B2B] rounded-none"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Notifications List */}
        <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-secondary scrollbar-track-transparent">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-20 h-20 rounded-full bg-[#2B2B2B] flex items-center justify-center mb-4">
                <Bell className="w-10 h-10 text-[#5A4635]" />
              </div>
              <h3
                className="text-[#E8DCC8] weathered-text mb-2"
                style={{ fontFamily: 'Merriweather, serif' }}
              >
                No notifications
              </h3>
              <p
                className="text-muted-foreground text-sm weathered-text"
                style={{ fontFamily: 'Noto Serif, serif' }}
              >
                You're all caught up!
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {notifications.map(notification => (
                <div
                  key={notification.id}
                  className={`p-4 border rounded-md transition-all ${notification.status === 'pending'
                    ? 'bg-[#2B2B2B]/80 border-[#9D4EDD]/30'
                    : 'bg-[#2B2B2B]/30 border-[#5A4635]/50 opacity-60'
                    }`}
                >
                  <div className="flex items-start gap-3 mb-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#9D4EDD]/30 to-[#5A4635]/30 flex items-center justify-center border border-[#9D4EDD]/20 flex-shrink-0">
                      {notification.type === 'group_invite' ? (
                        <Users className="w-5 h-5 text-[#9D4EDD]" />
                      ) : (
                        <Bot className="w-5 h-5 text-[#9D4EDD]" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4
                        className="text-[#E8DCC8] font-medium weathered-text mb-1"
                        style={{ fontFamily: 'Noto Serif, serif' }}
                      >
                        {notification.title}
                      </h4>
                      <p
                        className="text-muted-foreground text-sm weathered-text mb-2"
                        style={{ fontFamily: 'Noto Serif, serif' }}
                      >
                        {notification.message}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-[#5A4635]">
                        <Clock className="w-3 h-3" />
                        <span>{formatTime(notification.timestamp)}</span>
                      </div>
                    </div>
                  </div>

                  {notification.status === 'pending' && (
                    <div className="flex gap-2 mt-3">
                      <button
                        onClick={() => onAccept(notification.id)}
                        className="flex-1 px-4 py-2 bg-[#9D4EDD]/20 text-[#9D4EDD] border border-[#9D4EDD]/40 rounded-md hover:bg-[#9D4EDD] hover:text-white transition-all flex items-center justify-center gap-2"
                        style={{ fontFamily: 'Noto Serif, serif' }}
                      >
                        <Check className="w-4 h-4" />
                        Accept
                      </button>
                      <button
                        onClick={() => onReject(notification.id)}
                        className="flex-1 px-4 py-2 bg-[#2B2B2B] text-muted-foreground border border-[#5A4635] rounded-md hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/30 transition-all flex items-center justify-center gap-2"
                        style={{ fontFamily: 'Noto Serif, serif' }}
                      >
                        <XIcon className="w-4 h-4" />
                        Reject
                      </button>
                    </div>
                  )}

                  {notification.status === 'accepted' && (
                    <div className="mt-3 px-3 py-2 bg-green-500/10 border border-green-500/30 rounded-md text-green-400 text-sm text-center">
                      ✓ Accepted
                    </div>
                  )}

                  {notification.status === 'rejected' && (
                    <div className="mt-3 px-3 py-2 bg-red-500/10 border border-red-500/30 rounded-md text-red-400 text-sm text-center">
                      ✗ Rejected
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
