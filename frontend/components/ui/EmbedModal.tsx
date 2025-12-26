import { Copy, X, Check } from "lucide-react";
import { useState } from "react";
import { BotData } from "../../types";

interface EmbedModalProps {
  isOpen: boolean;
  onClose: () => void;
  bot: BotData;
}

export function EmbedModal({ isOpen, onClose, bot }: EmbedModalProps) {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  // Lấy URL hiện tại của web
  const baseUrl = window.location.origin;
  const embedUrl = `${baseUrl}/widget/${bot.id}`;
  
  const embedCode = `<iframe
  src="${embedUrl}"
  width="400"
  height="600"
  style="border: none; border-radius: 12px; box-shadow: 0 4px 24px rgba(0,0,0,0.2);"
  title="${bot.name}"
></iframe>`;

  const handleCopy = () => {
    navigator.clipboard.writeText(embedCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl bg-[#1a1a1a] border border-[#5A4635] rounded-lg shadow-2xl relative overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-[#5A4635] flex justify-between items-center bg-[#2A1B35]">
          <h3 className="text-[#E8DCC8] font-serif font-bold">Embed Widget</h3>
          <button onClick={onClose} className="text-[#9B9380] hover:text-[#E8DCC8]">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <p className="text-[#9B9380] text-sm">
            Copy the code below and paste it into your website's HTML where you want the chat widget to appear.
          </p>

          <div className="relative group">
            <pre className="bg-[#0F0F0F] border border-[#5A4635] p-4 rounded-md text-[#E8DCC8] text-xs overflow-x-auto font-mono scrollbar-thin">
              {embedCode}
            </pre>
            <button
              onClick={handleCopy}
              className="absolute top-2 right-2 p-2 bg-[#2A2A2A] border border-[#5A4635] rounded hover:border-[#9D4EDD] transition-colors"
            >
              {copied ? (
                <Check className="w-4 h-4 text-green-500" />
              ) : (
                <Copy className="w-4 h-4 text-[#9B9380]" />
              )}
            </button>
          </div>

          <div className="bg-[#2A2A2A] p-3 rounded border border-[#5A4635]/50">
            <h4 className="text-[#E8DCC8] text-xs font-bold mb-1">Preview:</h4>
            <div className="text-[#9B9380] text-xs">
              The widget will display as a 400x600px chat window. You can adjust the width and height in the iframe code.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
