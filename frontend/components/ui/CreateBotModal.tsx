import { useState, useEffect, useCallback } from "react";
import { X, Bot as BotIcon, Loader2, Info } from "lucide-react";
import { BotData, KnowledgeBaseData, UploadedFile, AIProvider } from "../../types";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./select";
import { KnowledgeBaseSelector } from "./KnowledgeBaseSelector";
import { getAIProviders } from "../../services/api";
import { logger } from "../../utils/logger";

interface CreateBotModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateBot: (bot: BotData) => Promise<void> | void;
  onUpdateBot?: (bot: BotData) => Promise<void> | void;
  editingBot?: BotData | null;
  knowledgeBases: KnowledgeBaseData[];
  onCreateKB: (kb: KnowledgeBaseData) => Promise<void> | void;
  onUpdateKB?: (kb: KnowledgeBaseData) => void;
  userId?: string;
  isAuthenticated: boolean;
}


export function CreateBotModal({
  isOpen,
  onClose,
  onCreateBot,
  onUpdateBot,
  editingBot,
  knowledgeBases,
  onCreateKB,
  onUpdateKB,
  userId,
  isAuthenticated,
}: CreateBotModalProps) {
  const [botName, setBotName] = useState("");
  const [customInstructions, setCustomInstructions] = useState("");
  const [selectedKBIds, setSelectedKBIds] = useState<string[]>([]);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [aiProvider, setAIProvider] = useState<AIProvider>("gemini");
  const [availableProviders, setAvailableProviders] = useState<AIProvider[]>(["gemini"]);
  const [botType, setBotType] = useState<"chat" | "widget">("chat");  // Bot type selector
  const [formErrors, setFormErrors] = useState<{ name?: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCreateKBModalOpen, setIsCreateKBModalOpen] = useState(false);

  // Fetch available AI providers
  useEffect(() => {
    getAIProviders()
      .then((result) => {
        setAvailableProviders(result.providers || ["gemini"]);
      })
      .catch(console.error);
  }, []);

  // Load editing bot data
  useEffect(() => {
    if (isOpen && editingBot) {
      setBotName(editingBot.name);
      setCustomInstructions(editingBot.customInstructions || "");
      setSelectedKBIds(editingBot.knowledgeBaseIds || []);
      setUploadedFiles(editingBot.uploadedFiles || []);
      setAIProvider(editingBot.aiProvider || "gemini");
      setBotType(editingBot.isPublic ? "widget" : "chat");
    } else if (isOpen && !editingBot) {
      // Reset form for new bot
      setBotName("");
      setCustomInstructions("");
      setSelectedKBIds([]);
      setUploadedFiles([]);
      setAIProvider("gemini");
      setBotType("chat");
      setFormErrors({});
    }
  }, [isOpen, editingBot]);

  const handleSubmit = useCallback(async () => {
    // Prevent duplicate submissions
    if (isSubmitting) {
      logger.log("⚠️ Already submitting, ignoring duplicate request");
      return;
    }

    // Reset errors
    setFormErrors({});

    if (!isAuthenticated) {
      toast.error("Please login to save bots");
      return;
    }

    // Validate required fields
    if (!botName.trim()) {
      setFormErrors({ name: "Bot name is required" });
      toast.error("Please enter a bot name");
      return;
    }

    logger.log(
      "🚀 Creating/Updating Bot:",
      {
        name: botName,
        kbs: selectedKBIds.length,
        hasCustomInstructions: !!customInstructions,
        provider: aiProvider,
      }
    );

    setIsSubmitting(true);

    try {
      if (editingBot && onUpdateBot) {
        // Update existing bot
        const updatedBot: BotData = {
          ...editingBot,
          name: botName,
          customInstructions: customInstructions,
          knowledgeBaseIds: selectedKBIds,
          uploadedFiles: uploadedFiles,
          aiProvider: aiProvider,
          isPublic: botType === "widget",  // Widget Bot = true
          ownerId: editingBot.ownerId,
          sharedWith: editingBot.sharedWith,
        };
        logger.log("📤 Updating bot:", updatedBot);
        await onUpdateBot(updatedBot);
        logger.log("✅ Bot updated successfully");
        // toast.success("Bot updated successfully");
      } else {
        // Create new bot
        const newBot: BotData = {
          id: Date.now().toString(),
          name: botName,
          customInstructions: customInstructions,
          createdAt: new Date(),
          knowledgeBaseIds: selectedKBIds,
          uploadedFiles: uploadedFiles,
          aiProvider: aiProvider,
          isPublic: botType === "widget",  // Widget Bot = true
          ownerId: userId,
          sharedWith: [],
        };
        logger.log("📤 Creating bot:", newBot);
        await onCreateBot(newBot);
        logger.log("✅ Bot created successfully");
        toast.success("Bot created successfully");
      }

      // Close modal on success
      onClose();
    } catch (error) {
      logger.error("❌ Error creating/updating bot:", error);
      toast.error(
        `Failed to ${editingBot ? "update" : "create"} bot: ${error}`
      );
    } finally {
      setIsSubmitting(false);
    }
  }, [
    isSubmitting,
    isAuthenticated,
    botName,
    customInstructions,
    selectedKBIds,
    uploadedFiles,
    aiProvider,
    editingBot,
    onCreateBot,
    onUpdateBot,
    userId,
    onClose,
  ]);

  const handleClose = useCallback(() => {
    if (isSubmitting) {
      toast.warning("Please wait for the current operation to complete");
      return;
    }
    onClose();
  }, [isSubmitting, onClose]);

  const handleCreateKB = useCallback(
    async (newKB: KnowledgeBaseData) => {
      logger.log("🆕 Creating KB from bot modal:", newKB);
      await onCreateKB(newKB);
      setIsCreateKBModalOpen(false);
      // Auto-select the newly created KB
      setSelectedKBIds((prev) => {
        const updated = [...prev, newKB.id];
        logger.log("✅ Auto-selected KB:", newKB.id);
        return updated;
      });
      toast.success(`Knowledge Base "${newKB.name}" created and linked`);
    },
    [onCreateKB]
  );

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
        <div className="bg-[#1a1a1a] border border-[#5A4635] rounded-lg w-full max-w-2xl shadow-[0_0_50px_rgba(0,0,0,0.7)] overflow-hidden flex flex-col max-h-[90vh] relative">
          {/* Decorative corners */}
          <div className="absolute top-2 left-2 text-[#5A4635] opacity-30 text-xs">
            ◈
          </div>
          <div className="absolute top-2 right-2 text-[#5A4635] opacity-30 text-xs">
            ◈
          </div>

          {/* Header */}
          <div className="px-6 py-5 border-b border-[#5A4635] flex justify-between items-center bg-[#151515]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-md bg-[#2A1B35] border border-[#9D4EDD]/50 flex items-center justify-center">
                <BotIcon className="w-5 h-5 text-[#9D4EDD]" />
              </div>
              <h3
                className="text-lg font-bold text-[#E8DCC8] weathered-text tracking-wide"
                style={{ fontFamily: "Merriweather, serif" }}
              >
                {editingBot ? "Edit Bot" : "Create New Bot"}
              </h3>
            </div>
            <button
              onClick={handleClose}
              disabled={isSubmitting}
              className="text-[#9B9380] hover:text-[#9D4EDD] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6 overflow-y-auto custom-scrollbar">
            {/* Bot Name */}
            <div className="space-y-2">
              <label className="text-xs text-[#9B9380] uppercase tracking-widest font-bold">
                Bot Name <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={botName}
                onChange={(e) => {
                  setBotName(e.target.value);
                  if (formErrors.name) setFormErrors({});
                }}
                className={`w-full bg-[#0F0F0F] border ${formErrors.name ? "border-red-500" : "border-[#5A4635]"
                  } text-[#E8DCC8] focus:border-[#9D4EDD] focus:outline-none rounded-sm p-3 placeholder-[#4A3B2A] transition-colors`}
                placeholder="Enter a name for your bot (e.g., 'Customer Support Bot')"
                style={{ fontFamily: "Noto Serif, serif" }}
                disabled={isSubmitting}
              />
              {formErrors.name && (
                <p className="text-xs text-red-400">{formErrors.name}</p>
              )}
            </div>

            {/* Bot Type Selector */}
            <div className="space-y-3">
              <label className="text-xs text-[#9B9380] uppercase tracking-widest font-bold">
                Bot Type
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setBotType("chat")}
                  className={`p-4 rounded-lg border transition-all text-left ${botType === "chat"
                    ? "border-[#9D4EDD] bg-[#2A1B35]/50"
                    : "border-[#5A4635]/50 bg-[#0F0F0F] hover:border-[#5A4635]"
                    }`}
                  disabled={isSubmitting}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${botType === "chat" ? "border-[#9D4EDD]" : "border-[#5A4635]"
                      }`}>
                      {botType === "chat" && <div className="w-2 h-2 rounded-full bg-[#9D4EDD]" />}
                    </div>
                    <span className="text-[#E8DCC8] font-semibold">Chat Bot</span>
                  </div>
                  <p className="text-xs text-[#9B9380] ml-6">
                    Private bot • Saves chat history
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => setBotType("widget")}
                  className={`p-4 rounded-lg border transition-all text-left ${botType === "widget"
                    ? "border-[#9D4EDD] bg-[#2A1B35]/50"
                    : "border-[#5A4635]/50 bg-[#0F0F0F] hover:border-[#5A4635]"
                    }`}
                  disabled={isSubmitting}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${botType === "widget" ? "border-[#9D4EDD]" : "border-[#5A4635]"
                      }`}>
                      {botType === "widget" && <div className="w-2 h-2 rounded-full bg-[#9D4EDD]" />}
                    </div>
                    <span className="text-[#E8DCC8] font-semibold">Widget Bot</span>
                  </div>
                  <p className="text-xs text-[#9B9380] ml-6">
                    Public widget • No chat history
                  </p>
                </button>
              </div>
            </div>

            {/* Custom Instructions */}
            <div className="space-y-2">
              <label className="text-xs text-[#9B9380] uppercase tracking-widest font-bold flex items-center gap-2">
                Custom Instructions
                <span className="text-[#5A4635] text-[10px] normal-case font-normal">
                  (Optional)
                </span>
              </label>
              <textarea
                value={customInstructions}
                onChange={(e) => setCustomInstructions(e.target.value)}
                className="w-full h-32 bg-[#0F0F0F] border border-[#5A4635] rounded-sm p-3 text-[#E8DCC8] focus:outline-none focus:border-[#9D4EDD] placeholder-[#4A3B2A] resize-none text-sm overflow-y-auto custom-scrollbar"
                placeholder="Add personality or specific behavior to your bot...&#10;&#10;Examples:&#10;• Always respond with a friendly and encouraging tone&#10;• Focus on technical details and provide code examples&#10;• Keep responses concise and under 3 sentences"
                style={{ fontFamily: "Noto Serif, serif" }}
                disabled={isSubmitting}
              />
              <div className="flex items-start gap-2 p-3 bg-[#2A1B35]/20 border border-[#5A4635]/30 rounded-sm">
                <Info className="w-4 h-4 text-[#9D4EDD] mt-0.5 flex-shrink-0" />
                <p className="text-[10px] text-[#9B9380] leading-relaxed">
                  <strong className="text-[#E8DCC8]">Note:</strong> The system
                  prompt is handled automatically by the application. This field
                  is only for customizing your bot's personality, tone, or
                  adding extra guidelines. Your bot will always answer based on
                  the linked Knowledge Base.
                </p>
              </div>
            </div>

            {/* Knowledge Base */}
            <div className="space-y-2">
              <label className="text-xs text-[#9B9380] uppercase tracking-widest font-bold">
                Knowledge Base
                <span className="text-[#5A4635] text-[10px] normal-case font-normal ml-1">
                  (Optional)
                </span>
              </label>
              <p className="text-xs text-[#5A4635] mb-2">
                Link knowledge sources to make your bot smarter and more helpful.
              </p>
              <KnowledgeBaseSelector
                knowledgeBases={knowledgeBases}
                selectedKBIds={selectedKBIds}
                onKBSelect={setSelectedKBIds}
                uploadedFiles={uploadedFiles}
                onFilesUpload={setUploadedFiles}
                onFileRemove={(fileId) => {
                  setUploadedFiles((prev) => prev.filter((f) => f.id !== fileId));
                }}
                onCreateNewKB={() => setIsCreateKBModalOpen(true)}
              />
            </div>

            {/* AI Model */}
            <div className="space-y-2">
              <label className="text-xs text-[#9B9380] uppercase tracking-widest font-bold">
                AI Model
              </label>
              <Select
                value={aiProvider}
                onValueChange={(v) => setAIProvider(v as AIProvider)}
                disabled={isSubmitting}
              >
                <SelectTrigger className="w-full bg-[#0F0F0F] border-[#5A4635] text-[#E8DCC8] rounded-sm">
                  <SelectValue placeholder="Select AI Model" />
                </SelectTrigger>
                <SelectContent className="bg-[#1F1F1F] border-[#5A4635] text-[#E8DCC8]">
                  {availableProviders.includes("gemini") && (
                    <SelectItem value="gemini">
                      <div className="flex items-center gap-2">
                        <span className="text-blue-400">✦</span>
                        <span>Gemini Flash</span>
                      </div>
                    </SelectItem>
                  )}
                  {availableProviders.includes("openrouter") && (
                    <SelectItem value="openrouter">
                      <div className="flex items-center gap-2">
                        <span className="text-purple-400">◈</span>
                        <span>OpenRouter (DeepSeek)</span>
                      </div>
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Summary */}
            {(selectedKBIds.length > 0 || customInstructions.trim()) && (
              <div className="p-4 bg-[#0F0F0F] border border-[#5A4635]/50 rounded-sm space-y-2">
                <h4 className="text-xs text-[#9D4EDD] font-bold uppercase tracking-wider">
                  Configuration Summary
                </h4>
                <div className="space-y-1 text-xs text-[#9B9380]">
                  {selectedKBIds.length > 0 && (
                    <p>
                      • <strong>{selectedKBIds.length}</strong> Knowledge Base
                      {selectedKBIds.length > 1 ? "s" : ""} linked
                    </p>
                  )}
                  {customInstructions.trim() && (
                    <p>
                      • Custom instructions added (
                      {customInstructions.length} characters)
                    </p>
                  )}
                  <p>
                    • AI Model: <strong>{aiProvider === "gemini" ? "Gemini Flash" : "OpenRouter"}</strong>
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 bg-[#151515] border-t border-[#5A4635] flex justify-end gap-3">
            <button
              onClick={handleClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-sm text-[#9B9380] hover:text-[#E8DCC8] hover:bg-[#2B2B2B] transition-colors font-medium text-sm weathered-text disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={isSubmitting || !botName.trim()}
              className="px-5 py-2 rounded-sm bg-[#2A1B35] text-[#9D4EDD] border border-[#9D4EDD]/50 hover:bg-[#9D4EDD] hover:text-[#1a1a1a] transition-all shadow-[0_0_15px_rgba(157,78,221,0.15)] font-bold text-sm tracking-wide weathered-text flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {isSubmitting
                ? editingBot
                  ? "Updating..."
                  : "Creating..."
                : editingBot
                  ? "Update Bot"
                  : "Create Bot"}
            </button>
          </div>
        </div>
      </div>

      {/* Create KB Modal (nested) */}
      {isCreateKBModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm">
          {/* Import CreateKnowledgeModal here if needed */}
          {/* Or handle KB creation inline */}
        </div>
      )}
    </>
  );
}

