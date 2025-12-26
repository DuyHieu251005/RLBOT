import { Users, Copy, Gift, CheckCircle, Share2, Sparkles, Trophy } from "lucide-react";
import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "./ui/button";

export function Referral() {
  const [copied, setCopied] = useState(false);
  const referralCode = "RLBOT-" + Math.random().toString(36).substring(2, 8).toUpperCase();
  const referralLink = `https://rlbot.app/invite/${referralCode}`;

  const handleCopy = () => {
    const textarea = document.createElement('textarea');
    textarea.value = referralLink;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    
    try {
      const successful = document.execCommand('copy');
      if (successful) {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch (err) {
      console.error('Failed to copy text: ', err);
    } finally {
      document.body.removeChild(textarea);
    }
  };

  const referralStats = [
    { label: "Total Invites", value: "0", icon: Users, color: "text-[#9D4EDD]" },
    { label: "Active Users", value: "0", icon: CheckCircle, color: "text-emerald-400" },
    { label: "Rewards Earned", value: "0 tokens", icon: Trophy, color: "text-amber-400" },
  ];

  return (
    <div className="flex-1 flex flex-col h-full bg-[#121212] overflow-hidden relative">
      {/* Background Glow */}
      <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-[#9D4EDD]/5 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-[#9D4EDD]/5 blur-[120px] rounded-full pointer-events-none" />

      {/* Decorative Elements */}
      <div className="absolute top-4 left-4 text-[#9D4EDD]/20 animate-pulse pointer-events-none">◈</div>
      <div className="absolute top-4 right-4 text-[#9D4EDD]/20 animate-pulse pointer-events-none delay-700">◈</div>
      <div className="absolute bottom-24 left-1/2 -translate-x-1/2 text-[#9D4EDD]/5 pointer-events-none text-8xl font-serif">ARCANUM</div>

      {/* Header Section */}
      <div className="px-8 py-10 border-b border-white/5 relative z-10">
        <div className="max-w-4xl mx-auto">
          <motion.h1 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="text-4xl font-black text-white tracking-tight mb-2"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            REFERRAL <span className="text-[#9D4EDD]">PROGRAM</span>
          </motion.h1>
          <p className="text-white/40 text-sm font-bold uppercase tracking-widest">Invite friends and earn mystical rewards together</p>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
        <div className="max-w-4xl mx-auto space-y-10">
          
          {/* Referral Link Card */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative group"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-[#9D4EDD]/20 to-[#C77DFF]/20 blur-2xl opacity-50 rounded-3xl" />
            <div className="relative bg-[#1A1A1A] border border-white/10 rounded-3xl p-8 shadow-2xl overflow-hidden">
              <div className="absolute top-0 right-0 p-8 opacity-5">
                <Share2 size={120} />
              </div>

              <div className="flex items-center gap-4 mb-8 relative z-10">
                <div className="w-14 h-14 rounded-2xl bg-[#9D4EDD]/10 border border-[#9D4EDD]/20 flex items-center justify-center">
                  <Gift className="w-8 h-8 text-[#9D4EDD]" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-white uppercase tracking-tight" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Your Invitation Link</h3>
                  <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest">Share this link to summon your allies</p>
                </div>
              </div>
              
              <div className="flex flex-col md:flex-row gap-3 relative z-10">
                <div className="flex-1 px-4 py-4 bg-white/5 border border-white/10 rounded-2xl text-white/80 font-mono text-sm truncate">
                  {referralLink}
                </div>
                <Button
                  onClick={handleCopy}
                  className={`px-8 h-full bg-[#9D4EDD] hover:bg-[#7B2CBF] text-white rounded-2xl font-black transition-all flex items-center justify-center gap-2 shadow-[0_4px_15px_rgba(157,78,221,0.3)] min-h-[56px]`}
                >
                  {copied ? (
                    <><CheckCircle className="w-5 h-5" /> COPIED</>
                  ) : (
                    <><Copy className="w-5 h-5" /> COPY LINK</>
                  )}
                </Button>
              </div>
            </div>
          </motion.div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {referralStats.map((stat, index) => {
              const Icon = stat.icon;
              return (
                <motion.div 
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 * index }}
                  className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:border-white/20 transition-all"
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div className={`w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center`}>
                      <Icon className={`w-5 h-5 ${stat.color}`} />
                    </div>
                    <span className="text-[10px] font-black text-white/20 uppercase tracking-widest">{stat.label}</span>
                  </div>
                  <p className="text-3xl font-black text-white tracking-tighter" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                    {stat.value}
                  </p>
                </motion.div>
              );
            })}
          </div>

          {/* How It Works */}
          <div className="space-y-6">
            <div className="flex items-center gap-3 mb-2 text-[#9D4EDD]">
              <Sparkles className="w-5 h-5" />
              <h2 className="text-sm font-black uppercase tracking-widest">How It Works</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                { step: "01", title: "SUMMON", desc: "Send your unique link to your fellow seekers." },
                { step: "02", title: "INITIATE", desc: "They establish their presence in the Arcanum." },
                { step: "03", title: "REWARD", desc: "Tokens of appreciation are granted to both." }
              ].map((item, index) => (
                <motion.div 
                  key={item.step}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.4 + (index * 0.1) }}
                  className="relative p-6 bg-white/5 border border-white/10 rounded-2xl"
                >
                  <span className="absolute top-4 right-4 text-4xl font-black text-white/5 leading-none">{item.step}</span>
                  <h4 className="text-white font-black tracking-tighter mb-2" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{item.title}</h4>
                  <p className="text-white/40 text-xs leading-relaxed">{item.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
