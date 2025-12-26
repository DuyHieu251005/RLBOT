import { Check, Zap, Crown, Sparkles, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "./ui/button";

export function Subscription() {
  const plans = [
    {
      name: "Initiate",
      icon: Sparkles,
      price: "0",
      period: "forever",
      description: "For seekers beginning their journey into the Arcanum",
      features: [
        "10 signals per day",
        "Basic construct creation",
        "Community support",
        "Standard latency"
      ],
      current: true,
      buttonText: "ACTIVE STATUS",
      highlighted: false
    },
    {
      name: "Sorcerer",
      icon: Zap,
      price: "9.99",
      period: "month",
      description: "For power users and professional mages",
      features: [
        "Unlimited signals",
        "Advanced construct tuning",
        "Priority support",
        "Accelerated latency",
        "Custom knowledge bases",
        "API access"
      ],
      current: false,
      buttonText: "ASCEND NOW",
      highlighted: true
    },
    {
      name: "Archon",
      icon: Crown,
      price: "29.99",
      period: "month",
      description: "For circles and high-level organizations",
      features: [
        "Everything in Sorcerer",
        "Unlimited guild members",
        "Advanced analytics",
        "Dedicated archon support",
        "Custom integrations",
        "White-label options"
      ],
      current: false,
      buttonText: "CONTACT ARCHONS",
      highlighted: false
    }
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
        <div className="max-w-6xl mx-auto">
          <motion.h1 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="text-4xl font-black text-white tracking-tight mb-2"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            SUBSCRIPTION <span className="text-[#9D4EDD]">PLANS</span>
          </motion.h1>
          <p className="text-white/40 text-sm font-bold uppercase tracking-widest">Choose your level of power within the Arcanum</p>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
            {plans.map((plan, index) => {
              const Icon = plan.icon;
              return (
                <motion.div 
                  key={plan.name}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  className={`group relative p-8 rounded-[2.5rem] transition-all flex flex-col ${
                    plan.highlighted 
                      ? 'bg-[#1A1A1A] border-2 border-[#9D4EDD] shadow-[0_20px_50px_rgba(157,78,221,0.2)] scale-105 z-10'
                      : 'bg-white/5 border border-white/10 hover:border-white/20'
                  }`}
                >
                  {plan.highlighted && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1.5 bg-[#9D4EDD] rounded-full text-white text-[10px] font-black uppercase tracking-widest z-20 shadow-lg">
                      MOST POPULAR
                    </div>
                  )}

                  <div className="mb-6">
                    <div className={`w-16 h-16 rounded-3xl flex items-center justify-center border transition-transform group-hover:scale-110 duration-500 ${
                      plan.highlighted 
                        ? 'bg-[#9D4EDD]/10 border-[#9D4EDD]/20'
                        : 'bg-white/5 border-white/10'
                    }`}>
                      <Icon className={`w-8 h-8 ${plan.highlighted ? 'text-[#9D4EDD]' : 'text-white/40'}`} />
                    </div>
                  </div>

                  <h3 className="text-2xl font-black text-white uppercase tracking-tighter mb-2" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                    {plan.name}
                  </h3>
                  <p className="text-white/40 text-xs leading-relaxed mb-8 h-10">
                    {plan.description}
                  </p>

                  <div className="mb-8">
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-black text-white tracking-tighter" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                        ${plan.price}
                      </span>
                      <span className="text-white/20 text-sm font-bold uppercase tracking-widest">
                        /{plan.period}
                      </span>
                    </div>
                  </div>

                  <ul className="space-y-4 flex-1 mb-8">
                    {plan.features.map((feature, i) => (
                      <li key={i} className="flex items-start gap-3">
                        <div className="mt-1 w-4 h-4 rounded-full bg-[#9D4EDD]/20 flex items-center justify-center flex-shrink-0">
                          <Check className="w-2.5 h-2.5 text-[#9D4EDD]" />
                        </div>
                        <span className="text-white/60 text-xs font-medium leading-tight">
                          {feature}
                        </span>
                      </li>
                    ))}
                  </ul>

                  <Button
                    disabled={plan.current}
                    className={`w-full py-6 rounded-2xl font-black uppercase tracking-widest transition-all text-xs ${
                      plan.current
                        ? 'bg-white/5 text-white/20 border border-white/5 cursor-not-allowed'
                        : plan.highlighted
                        ? 'bg-[#9D4EDD] text-white hover:bg-[#7B2CBF] shadow-[0_4px_15px_rgba(157,78,221,0.4)]'
                        : 'bg-white/10 text-white hover:bg-white/20'
                    }`}
                  >
                    {plan.buttonText}
                  </Button>
                </motion.div>
              );
            })}
          </div>

          {/* Footer Info */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="mt-16 p-8 bg-white/5 border border-white/10 rounded-[2rem] flex flex-col md:flex-row items-center justify-around gap-6"
          >
            {[
              "End-to-end encryption",
              "Cancel anytime",
              "24/7 Archon Support"
            ].map((item, index) => (
              <div key={index} className="flex items-center gap-3">
                <Check className="w-5 h-5 text-[#9D4EDD]" />
                <span className="text-white/40 text-xs font-bold uppercase tracking-widest">
                  {item}
                </span>
              </div>
            ))}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
