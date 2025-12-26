import { useState, memo, useMemo } from "react";
import {
  MessageSquare,
  Bot,
  Database,
  Users,
  Gift,
  CreditCard,
  ChevronLeft,
  ChevronRight,
  Youtube,
  Instagram,
  Globe,
  Facebook,
  Mail
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import rlcraftLogo from "../assets/logo.svg";

interface SidebarProps {
  activeView: string;
  onViewChange: (view: string) => void;
}

export const Sidebar = memo(function Sidebar({
  activeView,
  onViewChange,
}: SidebarProps) {

  const [isCollapsed, setIsCollapsed] = useState(false);

  const menuItems = useMemo(() => [
    { id: "chat", icon: MessageSquare, label: "Chat" },
    { id: "bot", icon: Bot, label: "BOT" },
    { id: "data", icon: Database, label: "Data" },
    { id: "group", icon: Users, label: "Group" },
    { id: "referral", icon: Gift, label: "Referral" },
    { id: "subscription", icon: CreditCard, label: "Subscription" },
  ], []);

  return (
    <motion.div
      animate={{ width: isCollapsed ? 80 : 280 }}
      transition={{ type: "spring", damping: 20, stiffness: 100 }}
      className="stone-panel rusted-border flex flex-col relative z-20 h-full overflow-x-hidden"
    >
      {/* Header */}
      <div className={`p-4 flex items-center justify-between border-b border-[#5A4635]/50 ${isCollapsed ? "flex-col gap-4" : ""}`}>
        <div className="flex items-center gap-3 overflow-hidden">
          <motion.div
            whileHover={{ rotate: 15, scale: 1.1 }}
            className="w-10 h-10 flex-shrink-0 bg-[#9D4EDD]/10 rounded-xl p-2 border border-[#9D4EDD]/20"
          >
            <img src={rlcraftLogo} alt="Logo" className="w-full h-full object-contain" />
          </motion.div>
          {!isCollapsed && (
            <motion.span
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="text-xl font-black text-white tracking-tighter"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              RL<span className="text-[#9D4EDD]">BOT</span>
            </motion.span>
          )}
        </div>
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-2 text-white/50 hover:text-[#9D4EDD] hover:bg-white/5 rounded-lg transition-all"
        >
          {isCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
        </button>
      </div>

      {/* Menu Items */}
      <div className="flex-1 py-6 px-3 flex flex-col gap-2 overflow-y-auto overflow-x-hidden no-scrollbar relative">
        {menuItems.map((item) => {
          const isActive = activeView === item.id;
          const Icon = item.icon;

          return (
            <button
              key={item.id}
              onClick={() => onViewChange(item.id)}
              className={`
                group relative flex items-center p-3 rounded-xl transition-all duration-300
                ${isActive ? "text-white" : "text-white/50 hover:text-white hover:bg-white/5"}
                ${isCollapsed ? "justify-center" : "gap-4"}
              `}
            >
              {isActive && (
                <motion.div
                  layoutId="active-pill"
                  className="absolute inset-0 bg-gradient-to-r from-[#9D4EDD] to-[#7B2CBF] rounded-xl shadow-[0_4px_15px_rgba(157,78,221,0.4)]"
                  transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                />
              )}

              <div className="relative z-10">
                <Icon size={22} className={isActive ? "drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]" : "group-hover:scale-110 transition-transform"} />
              </div>

              {!isCollapsed && (
                <span className="relative z-10 text-sm font-bold tracking-wide uppercase">
                  {item.label}
                </span>
              )}

              {isCollapsed && (
                <div className="absolute left-full ml-4 px-3 py-2 bg-[#1A1A1A] border border-white/10 rounded-lg text-xs font-bold text-white opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap z-50">
                  {item.label}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Socials - 5 icons with smooth animation */}
      <motion.div
        className="p-4 border-t border-[#5A4635]/50"
        layout
        transition={{ duration: 0.3, ease: "easeInOut" }}
      >
        <motion.div
          className={`flex items-center ${isCollapsed ? "flex-col gap-3" : "justify-around"}`}
          layout
          transition={{ duration: 0.3, ease: "easeInOut" }}
        >
          <motion.a
            href="https://www.facebook.com"
            target="_blank"
            rel="noopener noreferrer"
            className="p-2.5 bg-white/5 rounded-lg hover:bg-[#1877F2]/20 hover:text-[#1877F2] transition-all duration-300 hover:scale-110"
            title="Facebook"
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.95 }}
          >
            <Facebook size={18} />
          </motion.a>
          <motion.a
            href="mailto:contact@rlbot.com"
            className="p-2.5 bg-white/5 rounded-lg hover:bg-[#EA4335]/20 hover:text-[#EA4335] transition-all duration-300 hover:scale-110"
            title="Email"
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.95 }}
          >
            <Mail size={18} />
          </motion.a>
          <motion.a
            href="https://scontent.fsgn8-3.fna.fbcdn.net/v/t39.30808-6/469351172_122150664842318389_3484383325735746550_n.jpg?stp=cp6_dst-jpg_tt6&_nc_cat=104&ccb=1-7&_nc_sid=a5f93a&_nc_ohc=5tnPCc4EdNUQ7kNvwFeM48N&_nc_oc=AdkrMp0o3k_TyZ-Kj6B8UreuieL-pfAqGGHrT2kKd_K8dXO8iZr6UJ01P9d06SeVgk4&_nc_zt=23&_nc_ht=scontent.fsgn8-3.fna&_nc_gid=HXn4PHjGimPD53XrWtk7tg&oh=00_AfmAJonNA8Qxs6U9AeJYdCQOnv6dhJFVwbLzmJaA9keb4A&oe=694DD967"
            target="_blank"
            rel="noopener noreferrer"
            className="p-2.5 bg-white/5 rounded-lg hover:bg-[#E4405F]/20 hover:text-[#E4405F] transition-all duration-300 hover:scale-110"
            title="Instagram"
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.95 }}
          >
            <Instagram size={18} />
          </motion.a>
          <motion.a
            href="https://youtu.be/IWg5si72wwA?t=86"
            target="_blank"
            rel="noopener noreferrer"
            className="p-2.5 bg-white/5 rounded-lg hover:bg-[#FF0000]/20 hover:text-[#FF0000] transition-all duration-300 hover:scale-110"
            title="YouTube"
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.95 }}
          >
            <Youtube size={18} />
          </motion.a>
          <motion.a
            href="https://scontent.fsgn8-3.fna.fbcdn.net/v/t39.30808-6/473082238_1967191327099028_7543498760530205221_n.jpg?stp=dst-jpg_p526x296_tt6&_nc_cat=109&ccb=1-7&_nc_sid=94e2a3&_nc_ohc=EcjAoxTdsJkQ7kNvwGI8Mcx&_nc_oc=Adms0PeGiZ3lvyzBdhQ5f1QmtsY3LVNKofpJ--fdGQAPtHs3AU9Wk2ifiYucPBaOFv0&_nc_zt=23&_nc_ht=scontent.fsgn8-3.fna&_nc_gid=Y3YxucVPDE58CERCzEOLFQ&oh=00_Aflg1D19wUHW6ZgECvjZv0gRFN2uF2Z1k4CKAUTytQKG-g&oe=694DC9C1"
            target="_blank"
            rel="noopener noreferrer"
            className="p-2.5 bg-white/5 rounded-lg hover:bg-[#9D4EDD]/20 hover:text-[#9D4EDD] transition-all duration-300 hover:scale-110"
            title="Website"
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.95 }}
          >
            <Globe size={18} />
          </motion.a>
        </motion.div>
      </motion.div>
    </motion.div>
  );
});
