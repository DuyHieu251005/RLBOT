import { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import { Send, Bot as BotIcon } from "lucide-react";
import { BotData, Message } from "../types";
import { MarkdownRenderer } from "./MarkdownRenderer";
import { getGeminiResponse } from "../services/api";
import { BACKEND_URL } from "../services/apiHelpers";
import rlcraftLogo from "../assets/logo.svg";

interface WidgetPageProps {
  bots: BotData[];
}

export function WidgetPage({ bots }: WidgetPageProps) {
  const { botId } = useParams();
  const [bot, setBot] = useState<BotData | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loadBot = async () => {
      if (!botId) return;

      // 1. Try to find in props first (if logged in)
      if (bots.length > 0) {
        const foundBot = bots.find((b) => b.id === botId);
        if (foundBot) {
          setBot(foundBot);
          setMessages([
            {
              id: "welcome",
              role: "assistant",
              content: `Hello! I am ${foundBot.name}. How can I help you today?`,
              timestamp: new Date(),
            },
          ]);
          return;
        }
      }

      // 2. If not found in props, fetch from public API
      try {
        const response = await fetch(`${BACKEND_URL}/api/public/bots/${botId}`);
        if (response.ok) {
          const botData = await response.json();
          // Convert snake_case to camelCase
          const mappedBot = {
            ...botData,
            knowledgeBaseIds: botData.knowledge_base_ids || [],
            uploadedFiles: botData.uploaded_files || [],
            aiProvider: botData.ai_provider || 'gemini',
            ownerId: botData.owner_id,
            sharedWith: botData.shared_with || [],
            sharedWithGroups: botData.shared_with_groups || [],
            createdAt: botData.created_at ? new Date(botData.created_at) : new Date(),
          };
          setBot(mappedBot);
          setMessages([
            {
              id: "welcome",
              role: "assistant",
              content: `Hello! I am ${mappedBot.name}. How can I help you today?`,
              timestamp: new Date(),
            },
          ]);
        } else {
          console.error("Failed to fetch bot");
        }
      } catch (error) {
        console.error("Error fetching bot:", error);
      }
    };

    loadBot();
  }, [botId, bots]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || !bot) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    try {
      // Use backend retrieval with bot.id for proper context
      const responseText = await getGeminiResponse(
        userMsg.content,
        bot.customInstructions || bot.instructions,
        undefined,  // Let backend retrieve context
        bot.knowledgeBaseIds,
        true,  // enableKeywordExpansion
        true,  // autoDetectLanguage
        bot.id,  // Pass bot.id for file content retrieval
        bot.aiProvider || 'gemini'
      );

      const botMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: responseText,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, botMsg]);
    } catch (error) {
      console.error("Widget Error:", error);
      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "Sorry, I encountered an error. Please try again.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  if (!bot) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#1a1a1a] text-[#E8DCC8]">
        Bot not found or loading...
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-[#1a1a1a] overflow-hidden">
      {/* Header */}
      <div className="p-3 bg-[#2A1B35] border-b border-[#5A4635] flex items-center gap-2 shadow-md">
        <div className="w-8 h-8 rounded-full bg-[#9D4EDD]/20 flex items-center justify-center border border-[#9D4EDD]/50">
          <img src={rlcraftLogo} alt="Bot" className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-[#E8DCC8] font-bold text-sm font-serif">{bot.name}</h3>
          <span className="text-[#9B9380] text-xs flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
            Online
          </span>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-secondary scrollbar-track-transparent">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[85%] p-3 rounded-lg text-sm ${msg.role === "user"
                ? "bg-[#9D4EDD]/20 border border-[#9D4EDD]/50 text-[#E8DCC8]"
                : "bg-[#2A2A2A] border border-[#5A4635] text-[#E8DCC8]"
                }`}
            >
              <MarkdownRenderer content={msg.content} />
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-[#2A2A2A] border border-[#5A4635] p-3 rounded-lg">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-[#9B9380] rounded-full animate-bounce"></span>
                <span className="w-2 h-2 bg-[#9B9380] rounded-full animate-bounce delay-75"></span>
                <span className="w-2 h-2 bg-[#9B9380] rounded-full animate-bounce delay-150"></span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-3 bg-[#2A2A2A] border-t border-[#5A4635]">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder="Type a message..."
            className="flex-1 bg-[#1a1a1a] border border-[#5A4635] rounded-md px-3 py-2 text-[#E8DCC8] text-sm focus:outline-none focus:border-[#9D4EDD]"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="p-2 bg-[#9D4EDD]/20 text-[#9D4EDD] border border-[#9D4EDD]/50 rounded-md hover:bg-[#9D4EDD]/30 disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
        <div className="text-center mt-1">
          <span className="text-[10px] text-[#5A4635]">Powered by RLBot</span>
        </div>
      </div>
    </div>
  );
}
