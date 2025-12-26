import { useState, useRef, useEffect } from "react";
import { Send, Clock, Plus, ArrowRight, Bot as BotIcon, Sparkles, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import rlcraftLogo from "../assets/logo.svg";
import {
  ChatSession,
  BotData,
  KnowledgeBaseData,
} from "../types";
import { MarkdownRenderer } from "./MarkdownRenderer";
import { CreateBotModal } from "./ui/CreateBotModal";
import { CreateKnowledgeModal } from "./ui/CreateKnowledgeModal";
import { CustomSelect } from "./ui/CustomSelect";
import {
  getGeminiResponse,
  getSessionMessages,
} from "../services/api";
import { useAppContext } from "../contexts/AppContext";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../supabaseClient";
import { motion, AnimatePresence } from "framer-motion";

// Typing Indicator Component - 3 bouncing dots
const TypingIndicator = () => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -10 }}
    className="flex gap-4 justify-start"
  >
    <div className="w-9 h-9 rounded-xl bg-[#9D4EDD]/10 border border-[#9D4EDD]/20 flex items-center justify-center flex-shrink-0">
      <div className="w-5 h-5 rounded-full bg-[#9D4EDD]/30 animate-pulse" />
    </div>
    <div className="bg-white/5 border border-white/10 rounded-2xl rounded-tl-none p-5 flex items-center gap-1.5">
      <motion.span
        animate={{ y: [0, -6, 0] }}
        transition={{ duration: 0.6, repeat: Infinity, delay: 0 }}
        className="w-2.5 h-2.5 bg-[#9D4EDD] rounded-full"
      />
      <motion.span
        animate={{ y: [0, -6, 0] }}
        transition={{ duration: 0.6, repeat: Infinity, delay: 0.15 }}
        className="w-2.5 h-2.5 bg-[#9D4EDD] rounded-full"
      />
      <motion.span
        animate={{ y: [0, -6, 0] }}
        transition={{ duration: 0.6, repeat: Infinity, delay: 0.3 }}
        className="w-2.5 h-2.5 bg-[#9D4EDD] rounded-full"
      />
    </div>
  </motion.div>
);

interface MainChatProps {
  session?: ChatSession;
  onSendMessage: (text: string, instructions?: string) => void;
  onNewChat: () => void;
  onToggleHistory: () => void;
  isHistoryOpen: boolean;
  onCreateBot: (bot: BotData) => void;
  isAuthenticated: boolean;
  activeBot?: BotData | null;
  bots: BotData[];
  onSetActiveBot: (bot: BotData | null) => void;
  knowledgeBases: KnowledgeBaseData[];
  onCreateKB: (kb: KnowledgeBaseData) => void;
}

export function MainChat({
  session,
  onSendMessage,
  onNewChat,
  onToggleHistory,
  isHistoryOpen,
  onCreateBot,
  isAuthenticated,
  activeBot,
  bots,
  onSetActiveBot,
  knowledgeBases,
  onCreateKB,
}: MainChatProps) {
  const [input, setInput] = useState("");
  const [isBotModalOpen, setIsBotModalOpen] = useState(false);
  const [isCreateKBModalOpen, setIsCreateKBModalOpen] = useState(false);
  const [messages, setMessages] = useState<any[]>(session?.messages || []);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    if (session?.id) {
      if (session.messages && session.messages.length > 0) {
        setMessages(session.messages);
      }

      setLoadingMessages(true);
      getSessionMessages(session.id)
        .then((msgs) => {
          if (msgs && msgs.length > 0) {
            setMessages((prev) => {
              if (prev.length > msgs.length) return prev;
              return msgs;
            });
          }
        })
        .catch((err) => console.error("Failed to load messages", err))
        .finally(() => setLoadingMessages(false));
    } else {
      setMessages([]);
    }
  }, [session?.id]);

  useEffect(() => {
    if (session?.messages && session.messages.length > messages.length) {
      setMessages(session.messages);
    }
  }, [session?.messages]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { promptsCache, updatePromptsCache } = useAppContext()!;
  const [prompts, setPrompts] = useState<string[]>([]);
  const [isLoadingPrompts, setIsLoadingPrompts] = useState(false);
  const generatingForBot = useRef<string | null>(null);

  const fetchPrompts = async (force: boolean = false) => {
    if (!activeBot) {
      setPrompts([]);
      generatingForBot.current = null;
      return;
    }

    if (!force && generatingForBot.current === activeBot.id) return;

    // Cache key includes file and KB count to invalidate when they change
    const fileCount = activeBot.uploadedFiles?.length || 0;
    const kbCount = activeBot.knowledgeBaseIds?.length || 0;
    const cacheKey = `${activeBot.id}_f${fileCount}_kb${kbCount}`;

    if (!force && promptsCache && promptsCache[cacheKey]) {
      setPrompts(promptsCache[cacheKey]);
      return;
    }

    generatingForBot.current = activeBot.id;
    const hasFiles = activeBot.uploadedFiles && activeBot.uploadedFiles.length > 0;
    const hasKBs = activeBot.knowledgeBaseIds && activeBot.knowledgeBaseIds.length > 0;


    if (hasFiles || hasKBs) {
      setIsLoadingPrompts(true);
      if (force) setPrompts([]);

      try {
        // Use backend retrieval instead of frontend content
        // Pass botId to let backend retrieve context from files and KBs
        const response = await getGeminiResponse(
          "Generate 4 short, interesting questions in the same language as the context. Return ONLY the questions, one per line.",
          "Assistant",
          undefined, // Let backend retrieve context
          activeBot.knowledgeBaseIds || [],
          false,
          false,
          activeBot.id, // Pass botId for file retrieval
          activeBot.aiProvider || "gemini"
        );
        const newPrompts = response.split("\n").map(l => l.replace(/^\d+\.\s*/, "").replace(/^-\s*/, "").trim()).filter(l => l.length > 0).slice(0, 4);
        if (newPrompts.length > 0) {
          setPrompts(newPrompts);
          // Use same cacheKey format for storage
          const fileCnt = activeBot.uploadedFiles?.length || 0;
          const kbCnt = activeBot.knowledgeBaseIds?.length || 0;
          updatePromptsCache(`${activeBot.id}_f${fileCnt}_kb${kbCnt}`, newPrompts);
        }
      } catch (e) { console.error(e); } finally {
        setIsLoadingPrompts(false);
        generatingForBot.current = null;
      }
    } else {
      setPrompts([]);
      generatingForBot.current = null;
    }
  };


  useEffect(() => {
    fetchPrompts();
  }, [activeBot?.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = Math.min(textarea.scrollHeight, 200) + "px";
    }
  }, [input]);

  const handleSend = () => {
    if (!input.trim() || !activeBot) return;
    onSendMessage(input, activeBot.customInstructions || "");
    setInput("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex-1 flex flex-col relative z-10 h-full overflow-hidden bg-[#121212]">
      {/* Decorative Runes */}
      <div className="absolute top-4 left-4 text-[#9D4EDD]/20 animate-pulse pointer-events-none">◈</div>
      <div className="absolute top-4 right-4 text-[#9D4EDD]/20 animate-pulse pointer-events-none delay-700">◈</div>
      <div className="absolute bottom-24 left-1/2 -translate-x-1/2 text-[#9D4EDD]/5 pointer-events-none text-8xl font-serif">RLCRAFT</div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
        <div className="max-w-4xl mx-auto h-full flex flex-col">
          <AnimatePresence mode="wait">
            {messages.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.05 }}
                className="flex-1 flex flex-col justify-center items-center pb-20"
              >
                <motion.div
                  animate={{ y: [0, -10, 0] }}
                  transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                  className="mb-12 relative"
                >
                  <div className="absolute inset-0 bg-[#9D4EDD]/20 blur-3xl rounded-full" />
                  <img src={rlcraftLogo} alt="Logo" className="w-24 h-24 relative z-10 drop-shadow-[0_0_20px_rgba(157,78,221,0.5)]" />
                </motion.div>

                <motion.h1
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="text-4xl md:text-5xl font-black text-white mb-4 tracking-tighter text-center"
                  style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                >
                  Welcome back, <span className="text-[#9D4EDD] italic">{user?.name || "onii-chan"}</span>
                </motion.h1>

                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 0.7 }}
                  transition={{ delay: 0.5 }}
                  className="text-[#E8DCC8] text-lg mb-12 text-center max-w-md font-light"
                >
                  I'm your personal AI maid, ready to assist you with anything.
                </motion.p>

                {(prompts.length > 0 || isLoadingPrompts) && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.7 }}
                    className="w-full max-w-2xl"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2 text-[#9D4EDD]">
                        <Sparkles className="w-4 h-4" />
                        <span className="text-sm font-bold uppercase tracking-widest">Suggested Prompts</span>
                      </div>
                      <button
                        onClick={() => fetchPrompts(true)}
                        disabled={isLoadingPrompts}
                        className="p-1.5 rounded-lg bg-white/5 border border-white/10 text-white/50 hover:text-[#9D4EDD] hover:border-[#9D4EDD]/30 transition-all disabled:opacity-50"
                        title="Regenerate Prompts"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${isLoadingPrompts ? "animate-spin" : ""}`} />
                      </button>
                    </div>
                    <div className="flex flex-col gap-3">
                      {isLoadingPrompts ? (
                        Array.from({ length: 4 }).map((_, i) => (
                          <div key={i} className="h-14 rounded-xl bg-white/5 animate-pulse border border-white/10" />
                        ))
                      ) : (
                        prompts.map((p, i) => (
                          <motion.button
                            key={i}
                            whileHover={{ scale: 1.01, backgroundColor: "rgba(157, 78, 221, 0.1)" }}
                            whileTap={{ scale: 0.99 }}
                            onClick={() => onSendMessage(p, activeBot?.customInstructions || "")}
                            className="text-left p-4 rounded-xl bg-white/5 border border-white/10 hover:border-[#9D4EDD]/50 transition-all flex items-center justify-between group w-full"
                          >
                            <span className="text-sm text-[#E8DCC8] line-clamp-1 flex-1">{p}</span>
                            <ArrowRight className="w-4 h-4 text-white/20 group-hover:text-[#9D4EDD] transition-colors ml-4 flex-shrink-0" />
                          </motion.button>
                        ))
                      )}
                    </div>
                  </motion.div>
                )}
              </motion.div>
            ) : (
              <div className="flex flex-col gap-8 pb-10">
                {messages.map((msg, i) => (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    key={msg.id}
                    className={`flex gap-4 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    {msg.role === "assistant" && (
                      <div className="w-9 h-9 rounded-xl bg-[#9D4EDD]/10 border border-[#9D4EDD]/20 flex items-center justify-center flex-shrink-0">
                        <img src={rlcraftLogo} alt="Bot" className="w-5 h-5 drop-shadow-[0_0_8px_rgba(157,78,221,0.4)]" />
                      </div>
                    )}
                    <div className={`
                      max-w-[85%] p-5 rounded-2xl relative
                      ${msg.role === "user"
                        ? "bg-[#9D4EDD] text-white rounded-tr-none shadow-[0_4px_20px_rgba(157,78,221,0.2)]"
                        : "bg-white/5 border border-white/10 text-[#E8DCC8] rounded-tl-none"}
                    `}>
                      <MarkdownRenderer content={msg.content} />
                    </div>
                  </motion.div>
                ))}
                {/* Typing Indicator */}
                <AnimatePresence>
                  {session?.isTyping && <TypingIndicator />}
                </AnimatePresence>
                <div ref={messagesEndRef} />
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Input Area */}
      <div className="p-6 bg-gradient-to-t from-[#121212] via-[#121212] to-transparent">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-4 gap-3">
            <div className="flex items-center gap-2 pb-1">
              <CustomSelect
                value={activeBot?.id || ""}
                onChange={(id) => {
                  const bot = id === "gemini-pro" ? { id, name: "Gemini Pro", aiProvider: "gemini" } :
                    id === "deepseek-r1t2" ? { id, name: "DeepSeek R1T2", aiProvider: "openrouter" } :
                      bots.find(b => b.id === id);
                  onSetActiveBot(bot as BotData);
                }}
                groups={[
                  {
                    label: "AI Models", options: [
                      { value: "gemini-pro", label: "Gemini Pro", icon: "✨" },
                      { value: "deepseek-r1t2", label: "DeepSeek R1T2", icon: "🤖" }
                    ]
                  },
                  { label: "Your Bots", options: bots.filter(b => !b.isPublic).map(b => ({ value: b.id, label: b.name, icon: <BotIcon className="w-3 h-3" /> })) }
                ]}
                placeholder="Select Bot"
              />
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => isAuthenticated ? setIsBotModalOpen(true) : toast.error("Login required")}
                className="whitespace-nowrap px-4 py-2 bg-[#9D4EDD]/10 border border-[#9D4EDD]/30 text-[#9D4EDD] rounded-full text-xs font-bold hover:bg-[#9D4EDD]/20 transition-all flex items-center gap-2"
              >
                <Plus className="w-3 h-3" />
                CREATE BOT
              </motion.button>
            </div>

            <div className="flex items-center gap-2">
              <button onClick={onToggleHistory} className={`p-2 rounded-full transition-all ${isHistoryOpen ? "bg-[#9D4EDD] text-white" : "bg-white/5 text-white/50 hover:text-white"}`}>
                <Clock className="w-5 h-5" />
              </button>
              <button onClick={onNewChat} className="p-2 rounded-full bg-white/5 text-white/50 hover:text-white hover:bg-white/10 transition-all">
                <Plus className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="relative group">
            <div className="absolute inset-0 bg-gradient-to-r from-[#9D4EDD]/20 to-[#C77DFF]/20 blur-xl opacity-0 group-focus-within:opacity-100 transition-opacity rounded-3xl" />
            <div
              className="relative bg-[#1A1A1A] border border-white/10 rounded-2xl p-2 group-focus-within:border-[#9D4EDD]/50 transition-all cursor-text"
              onClick={() => textareaRef.current?.focus()}
            >
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Message RLBot..."
                className="w-full bg-transparent p-3 resize-none focus:outline-none text-white placeholder-white/20 min-h-[56px] max-h-[200px]"
                rows={1}
              />
              <div className="flex justify-end p-2 border-t border-white/5">
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={(e) => { e.stopPropagation(); handleSend(); }}
                  disabled={!input.trim() || !activeBot}
                  className="p-3 bg-[#9D4EDD] text-white rounded-xl disabled:opacity-30 disabled:grayscale transition-all shadow-[0_4px_12px_rgba(157,78,221,0.4)]"
                >
                  <Send className="w-5 h-5" />
                </motion.button>
              </div>
            </div>
          </div>
          <p className="text-[10px] text-white/20 text-center mt-4 tracking-widest uppercase">Powered by RLcraft Arcanum</p>
        </div>
      </div>

      <CreateBotModal
        isOpen={isBotModalOpen}
        onClose={() => setIsBotModalOpen(false)}
        onCreateBot={async (bot) => { await onCreateBot(bot); setIsBotModalOpen(false); }}
        editingBot={null}
        knowledgeBases={knowledgeBases}
        onCreateKB={async (kb) => { await onCreateKB(kb); setIsCreateKBModalOpen(false); }}
        userId={activeBot?.ownerId}
        isAuthenticated={isAuthenticated}
      />
      <CreateKnowledgeModal
        isOpen={isCreateKBModalOpen}
        onClose={() => setIsCreateKBModalOpen(false)}
        onCreateKB={async (kb) => { await onCreateKB(kb); setIsCreateKBModalOpen(false); }}
      />
    </div>
  );
}
