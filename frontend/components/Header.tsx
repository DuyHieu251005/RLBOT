import { ReactNode } from "react";
import rlcraftLogo from "../assets/logo.svg";
import { motion } from "framer-motion";

interface HeaderProps {
  children?: ReactNode;
}

export function Header({ children }: HeaderProps) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="border-b border-[#5A4635]/50 bg-[#1A1A1A]/80 backdrop-blur-md relative z-20"
    >
      <div className="px-6 py-4 flex justify-between items-center">
        {/* Left side - Logo and Branding */}
        <div className="flex items-center gap-3">
          <motion.img 
            animate={{ rotate: [0, 5, -5, 0] }}
            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
            src={rlcraftLogo} 
            alt="RLcraft Logo" 
            className="w-8 h-8 object-contain filter drop-shadow-[0_0_12px_rgba(157,78,221,0.5)]" 
          />
          <div>
            <h1 
              className="text-white font-black tracking-tighter" 
              style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '18px' }}
            >
              RL<span className="text-[#9D4EDD]">BOT</span>
            </h1>
            <p 
              className="text-white/30 font-bold uppercase tracking-[0.2em]" 
              style={{ fontSize: '9px' }}
            >
              Arcanum Interface
            </p>
          </div>
        </div>

        {/* Right side - User Account/Actions */}
        <div className="flex items-center gap-3">
          {children}
        </div>
      </div>
    </motion.div>
  );
}
