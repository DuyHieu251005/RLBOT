import { useState, memo, useMemo, useCallback, useEffect } from "react";
import {
  Search,
  Filter,
  Bot as BotIcon,
  MessageSquare,
  Edit2,
  Trash2,
  MoreVertical,
  Share2,
  Code,
  X,
  Sparkles,
  Users,
  ChevronRight,
  AlertTriangle
} from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Modal } from "./ui/Modal";
import { EmbedModal } from "./ui/EmbedModal";
import { CreateBotModal } from "./ui/CreateBotModal";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "./ui/dropdown-menu";

import { useAuth } from "../contexts/AuthContext";
import { BotData, KnowledgeBaseData, GroupData } from "../types";
import { shareBotWithUser, unshareBotWithUser, unshareBotWithGroup, leaveSharedBot } from "../services/api";
import { CreateKnowledgeModal } from "./ui/CreateKnowledgeModal";
import { motion, AnimatePresence } from "framer-motion";
import { formatTimeAgo } from "../utils/date";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "./ui/alert-dialog";

interface BotsProps {
  bots: BotData[];
  onCreateBot: (bot: BotData) => Promise<void> | void;
  onDeleteBot: (botId: string) => void;
  onUpdateBot: (bot: BotData) => Promise<void> | void;
  isAuthenticated: boolean;
  onChatWithBot?: (bot: BotData) => void;
  knowledgeBases: KnowledgeBaseData[];
  onCreateKB: (kb: KnowledgeBaseData) => Promise<void> | void;
  onUpdateKB: (kb: KnowledgeBaseData) => Promise<void> | void;
  groups: GroupData[];
}


export const Bots = memo(function Bots({
  bots,
  onCreateBot,
  onDeleteBot,
  onUpdateBot,
  isAuthenticated,
  onChatWithBot,
  knowledgeBases,
  onCreateKB,
  onUpdateKB,
  groups,
}: BotsProps) {
  const { user } = useAuth();

  const [isBotModalOpen, setIsBotModalOpen] = useState(false);
  const [isCreateKBModalOpen, setIsCreateKBModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [editingBot, setEditingBot] = useState<BotData | null>(null);
  const [sharingBot, setSharingBot] = useState<BotData | null>(null);
  const [embedBot, setEmbedBot] = useState<BotData | null>(null);

  const [shareEmail, setShareEmail] = useState("");
  const [shareType, setShareType] = useState<"user" | "group">("user");
  const [selectedGroupId, setSelectedGroupId] = useState<string>("");

  // Confirmation dialog state
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; bot: BotData | null }>({
    open: false,
    bot: null,
  });
  const [leaveConfirm, setLeaveConfirm] = useState<{ open: boolean; bot: BotData | null }>({
    open: false,
    bot: null,
  });

  const handleEdit = useCallback((bot: BotData) => {
    setEditingBot(bot);
    setIsBotModalOpen(true);
  }, []);

  const handleShare = useCallback((bot: BotData) => {
    // Always use latest bot data from props
    const latestBot = bots.find(b => b.id === bot.id) || bot;
    setSharingBot(latestBot);
    setShareEmail("");
    setShareType("user");
    setSelectedGroupId("");
    setIsShareModalOpen(true);
  }, [bots]);

  // Keep sharingBot synced with latest data from props
  useEffect(() => {
    if (sharingBot && isShareModalOpen) {
      const latestBot = bots.find(b => b.id === sharingBot.id);
      if (latestBot && JSON.stringify(latestBot.sharedWith) !== JSON.stringify(sharingBot.sharedWith)) {
        setSharingBot(latestBot);
      }
    }
  }, [bots, sharingBot?.id, isShareModalOpen]);

  const confirmShare = useCallback(async () => {
    if (!sharingBot) return;

    if (shareType === "user") {
      if (!shareEmail.trim()) return;
      try {
        const result = await shareBotWithUser(sharingBot.id, shareEmail.trim());
        if (!result.success) {
          toast.error(result.message || "Failed to share bot");
          return;
        }
        setIsShareModalOpen(false);
        setSharingBot(null);
        setShareEmail("");
        toast.success(`Share request sent to ${shareEmail.trim()}`);
      } catch (error) {
        toast.error("Failed to share bot");
      }
    } else {
      if (!selectedGroupId) return;
      if (sharingBot.sharedWithGroups?.includes(selectedGroupId)) {
        toast.error("Bot is already shared with this group");
        return;
      }
      try {
        const result = await shareBotWithUser(sharingBot.id, undefined, selectedGroupId);
        if (!result.success) {
          toast.error(result.message || "Failed to share bot with group");
          return;
        }
        const updatedBot: BotData = {
          ...sharingBot,
          sharedWithGroups: [...(sharingBot.sharedWithGroups || []), selectedGroupId],
        };
        await onUpdateBot(updatedBot);
        setIsShareModalOpen(false);
        setSharingBot(null);
        toast.success(`Bot shared with group`);
      } catch (error) {
        toast.error("Failed to share bot with group");
      }
    }
  }, [sharingBot, shareEmail, shareType, selectedGroupId, onUpdateBot]);

  const handleUnshare = useCallback(async (userId: string, isGroup: boolean = false) => {
    if (!sharingBot) return;

    try {
      let result;
      if (isGroup) {
        result = await unshareBotWithGroup(sharingBot.id, userId);
      } else {
        result = await unshareBotWithUser(sharingBot.id, userId);
      }

      if (!result.success) {
        toast.error(result.message || "Failed to remove access");
        return;
      }

      const updatedBot: BotData = {
        ...sharingBot,
        sharedWith: isGroup ? sharingBot.sharedWith : (sharingBot.sharedWith || []).filter(id => id !== userId),
        sharedWithGroups: isGroup ? (sharingBot.sharedWithGroups || []).filter(id => id !== userId) : sharingBot.sharedWithGroups,
      };
      onUpdateBot(updatedBot);
      setSharingBot(updatedBot);
      toast.success("Access removed successfully");
    } catch (error) {
      toast.error("Failed to remove access");
    }
  }, [sharingBot, onUpdateBot]);

  const handleDelete = useCallback((bot: BotData) => {
    if (!isAuthenticated) { toast.error("Login required"); return; }
    setDeleteConfirm({ open: true, bot });
  }, [isAuthenticated]);

  const confirmDeleteBot = useCallback(() => {
    if (deleteConfirm.bot) {
      onDeleteBot(deleteConfirm.bot.id);
    }
    setDeleteConfirm({ open: false, bot: null });
  }, [deleteConfirm.bot, onDeleteBot]);

  const handleLeave = useCallback((bot: BotData) => {
    if (!isAuthenticated || !user) {
      toast.error("Login required");
      return;
    }
    setLeaveConfirm({ open: true, bot });
  }, [isAuthenticated, user]);

  const confirmLeaveBot = useCallback(async () => {
    if (!leaveConfirm.bot) return;

    try {
      const result = await leaveSharedBot(leaveConfirm.bot.id);
      if (result.success) {
        toast.success(`Left "${leaveConfirm.bot.name}" successfully`);
        window.location.reload();
      } else {
        toast.error(result.message || "Failed to leave bot");
      }
    } catch (error) {
      toast.error("Failed to leave bot");
    } finally {
      setLeaveConfirm({ open: false, bot: null });
    }
  }, [leaveConfirm.bot]);

  const filteredBots = useMemo(() =>
    bots.filter((bot) => {
      const matchesSearch = bot.name.toLowerCase().includes(searchTerm.toLowerCase());
      if (isAuthenticated && user) {
        const isOwner = bot.ownerId === user.id || !bot.ownerId;
        const isSharedDirectly = bot.sharedWith?.includes(user.id) || bot.sharedWith?.includes(user.email);
        const isSharedViaGroup = bot.sharedWithGroups?.some((groupId) => groups.some((ug) => ug.id === groupId)) || false;
        return matchesSearch && (isOwner || isSharedDirectly || isSharedViaGroup);
      }
      return matchesSearch;
    }),
    [bots, searchTerm, isAuthenticated, user, groups]
  );

  return (
    <div className="flex-1 flex flex-col h-full bg-[#121212] overflow-hidden relative">
      <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-[#9D4EDD]/5 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-[#9D4EDD]/5 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute top-4 left-4 text-[#9D4EDD]/20 animate-pulse pointer-events-none">◈</div>
      <div className="absolute top-4 right-4 text-[#9D4EDD]/20 animate-pulse pointer-events-none delay-700">◈</div>
      <div className="absolute bottom-24 left-1/2 -translate-x-1/2 text-[#9D4EDD]/5 pointer-events-none text-8xl font-serif">ARCANUM</div>

      <div className="px-8 py-10 border-b border-white/5 relative z-10">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <motion.h1
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="text-4xl font-black text-white tracking-tight mb-2"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              BOT <span className="text-[#9D4EDD]">LIBRARY</span>
            </motion.h1>
            <p className="text-white/40 text-sm font-bold uppercase tracking-widest">Manage your mystical AI constructs</p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="relative min-w-[240px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
              <input
                type="text"
                placeholder="Search bots..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/20 focus:border-[#9D4EDD] focus:outline-none transition-all"
              />
            </div>
            <Button
              onClick={() => isAuthenticated ? setIsBotModalOpen(true) : toast.error("Login required")}
              className="px-6 py-2.5 bg-[#9D4EDD] hover:bg-[#7B2CBF] text-white rounded-xl font-bold transition-all flex items-center gap-2 shadow-[0_4px_15px_rgba(157,78,221,0.3)]"
            >
              <Sparkles className="w-4 h-4" />
              CREATE BOT
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
        <div className="max-w-7xl mx-auto">
          {filteredBots.length > 0 ? (
            <motion.div
              initial="hidden"
              animate="show"
              variants={{
                hidden: { opacity: 0 },
                show: { opacity: 1, transition: { staggerChildren: 0.05 } }
              }}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
            >
              {filteredBots.map((bot) => (
                <motion.div
                  key={bot.id}
                  variants={{
                    hidden: { opacity: 0, y: 20, scale: 0.95 },
                    show: { opacity: 1, y: 0, scale: 1 }
                  }}
                  whileHover={{ y: -5 }}
                  className="group bg-white/5 border border-white/10 rounded-2xl p-5 hover:border-[#9D4EDD]/50 transition-all relative flex flex-col hover:z-50"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-[#9D4EDD]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                  <div className="flex justify-between items-start mb-4 relative z-10">
                    <div className="w-12 h-12 rounded-2xl bg-[#9D4EDD]/10 border border-[#9D4EDD]/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <BotIcon className="w-6 h-6 text-[#9D4EDD]" />
                    </div>

                    <div className="relative z-20">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button
                            className="p-2 rounded-lg transition-all text-white/20 hover:text-white hover:bg-white/10 opacity-0 group-hover:opacity-100"
                          >
                            <MoreVertical size={18} />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-[#1A1A1A] border-white/20 rounded-xl shadow-2xl p-1.5 min-w-[160px] z-[100]">
                          {(bot.ownerId === user?.id || !bot.ownerId) && (
                            <>
                              <DropdownMenuItem
                                onClick={() => handleEdit(bot)}
                                className="px-3 py-2.5 text-white/80 focus:bg-[#9D4EDD]/20 focus:text-white flex items-center gap-2 cursor-pointer rounded-lg"
                              >
                                <Edit2 size={14} /> Edit
                              </DropdownMenuItem>
                              {/* Hide Share for Widget Bots */}
                              {!bot.isPublic && (
                                <DropdownMenuItem
                                  onClick={() => handleShare(bot)}
                                  className="px-3 py-2.5 text-white/80 focus:bg-[#9D4EDD]/20 focus:text-white flex items-center gap-2 cursor-pointer rounded-lg"
                                >
                                  <Share2 size={14} /> Share
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem
                                onClick={() => setEmbedBot(bot)}
                                className="px-3 py-2.5 text-white/80 focus:bg-[#9D4EDD]/20 focus:text-white flex items-center gap-2 cursor-pointer rounded-lg"
                              >
                                <Code size={14} /> Embed
                              </DropdownMenuItem>
                              <DropdownMenuSeparator className="bg-white/10" />
                              <DropdownMenuItem
                                onClick={() => handleDelete(bot)}
                                className="px-3 py-2.5 text-red-400 focus:bg-red-400/10 focus:text-red-300 flex items-center gap-2 cursor-pointer rounded-lg"
                              >
                                <Trash2 size={14} /> Delete
                              </DropdownMenuItem>
                            </>
                          )}
                          {bot.ownerId && bot.ownerId !== user?.id && (
                            <DropdownMenuItem
                              onClick={() => handleLeave(bot)}
                              className="px-3 py-2.5 text-orange-400 focus:bg-orange-400/10 focus:text-orange-300 flex items-center gap-2 cursor-pointer rounded-lg"
                            >
                              <X size={14} /> Leave Bot
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>

                  <div className="relative z-10 flex-1">
                    <h3 className="text-white font-bold text-lg mb-1 group-hover:text-[#9D4EDD] transition-colors">{bot.name}</h3>
                    <div className="flex gap-2 mb-3">
                      <span className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-[10px] font-black text-white/40 uppercase tracking-tighter">{bot.aiProvider || "gemini"}</span>
                      {bot.ownerId !== user?.id && bot.ownerId && <span className="px-2 py-0.5 rounded-md bg-[#9D4EDD]/10 border border-[#9D4EDD]/20 text-[10px] font-black text-[#9D4EDD] uppercase tracking-tighter">Shared</span>}
                    </div>
                    <p className="text-white/40 text-xs line-clamp-2 leading-relaxed mb-4">{bot.customInstructions || "No additional instructions provided for this construct."}</p>
                  </div>

                  <div className="relative z-10 pt-4 border-t border-white/5 flex items-center justify-between">
                    <span className="text-[10px] font-bold text-white/20 uppercase tracking-widest">{formatTimeAgo(bot.createdAt)}</span>
                    {/* Hide Chat for Widget Bots - show Embed link instead */}
                    {bot.isPublic ? (
                      <motion.button
                        whileHover={{ x: 3 }}
                        onClick={() => setEmbedBot(bot)}
                        className="text-[10px] font-black text-[#9D4EDD] uppercase tracking-tighter flex items-center gap-1 group/btn"
                      >
                        Embed Widget <Code size={12} className="group-hover/btn:translate-x-1 transition-transform" />
                      </motion.button>
                    ) : (
                      <motion.button
                        whileHover={{ x: 3 }}
                        onClick={() => onChatWithBot?.(bot)}
                        className="text-[10px] font-black text-[#9D4EDD] uppercase tracking-tighter flex items-center gap-1 group/btn"
                      >
                        Summon Construct <ChevronRight size={12} className="group-hover/btn:translate-x-1 transition-transform" />
                      </motion.button>
                    )}
                  </div>
                </motion.div>
              ))}
            </motion.div>
          ) : (
            <div className="h-[400px] flex flex-col items-center justify-center text-center opacity-20">
              <BotIcon size={64} className="mb-4" />
              <p className="text-xl font-black uppercase tracking-tighter">No constructs found</p>
            </div>
          )}
        </div>
      </div>

      <CreateBotModal
        isOpen={isBotModalOpen}
        onClose={() => { setIsBotModalOpen(false); setEditingBot(null); }}
        onCreateBot={onCreateBot}
        onUpdateBot={onUpdateBot}
        editingBot={editingBot}
        knowledgeBases={knowledgeBases}
        onCreateKB={onCreateKB}
        onUpdateKB={onUpdateKB}
        userId={user?.id}
        isAuthenticated={isAuthenticated}
      />

      <CreateKnowledgeModal
        isOpen={isCreateKBModalOpen}
        onClose={() => setIsCreateKBModalOpen(false)}
        onCreateKB={onCreateKB}
        onUpdateKB={onUpdateKB}
      />

      <Modal
        isOpen={isShareModalOpen}
        onClose={() => { setIsShareModalOpen(false); setSharingBot(null); }}
        title="Share Construct"
        onConfirm={confirmShare}
      >
        <div className="space-y-6">
          <div className="flex gap-4 border-b border-white/10">
            <button className={`pb-2 text-xs font-black uppercase tracking-widest ${shareType === 'user' ? 'text-[#9D4EDD] border-b-2 border-[#9D4EDD]' : 'text-white/20'}`} onClick={() => setShareType('user')}>USER</button>
            <button className={`pb-2 text-xs font-black uppercase tracking-widest ${shareType === 'group' ? 'text-[#9D4EDD] border-b-2 border-[#9D4EDD]' : 'text-white/20'}`} onClick={() => setShareType('group')}>GROUP</button>
          </div>

          {shareType === 'user' ? (
            <div className="space-y-2">
              <label className="text-[10px] font-black text-white/20 uppercase tracking-widest">Target Email</label>
              <Input value={shareEmail} onChange={(e) => setShareEmail(e.target.value)} className="bg-white/5 border-white/10 rounded-xl h-12" placeholder="summoner@arcanum.io" />
            </div>
          ) : (
            <div className="space-y-2">
              <label className="text-[10px] font-black text-white/20 uppercase tracking-widest">Select Group</label>
              <Select value={selectedGroupId} onValueChange={setSelectedGroupId}>
                <SelectTrigger className="bg-white/5 border-white/10 rounded-xl h-12"><SelectValue placeholder="Choose a guild" /></SelectTrigger>
                <SelectContent className="bg-[#1A1A1A] border-white/10 text-white">
                  {groups.map((g) => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}

          {sharingBot && ((sharingBot.sharedWith?.length || 0) > 0 || (sharingBot.sharedWithGroups?.length || 0) > 0) && (
            <div className="space-y-3 pt-4 border-t border-white/10">
              <label className="text-[10px] font-black text-white/20 uppercase tracking-widest">Currently Shared With</label>
              {sharingBot.sharedWith?.map((userId) => (
                <div key={userId} className="flex items-center justify-between bg-white/5 rounded-lg px-3 py-2">
                  <div className="flex items-center gap-2">
                    <Users size={14} className="text-[#9D4EDD]" />
                    <span className="text-sm text-white/80 truncate max-w-[180px]">{userId}</span>
                  </div>
                  <button
                    onClick={() => handleUnshare(userId, false)}
                    className="text-red-400 hover:text-red-300 hover:bg-red-400/10 p-1.5 rounded-lg transition-colors"
                    title="Remove access"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
              {sharingBot.sharedWithGroups?.map((groupId) => {
                const group = groups.find(g => g.id === groupId);
                return (
                  <div key={groupId} className="flex items-center justify-between bg-white/5 rounded-lg px-3 py-2">
                    <div className="flex items-center gap-2">
                      <Users size={14} className="text-[#9D4EDD]" />
                      <span className="text-sm text-white/80">{group?.name || groupId}</span>
                      <span className="text-[10px] text-white/30 uppercase">Group</span>
                    </div>
                    <button
                      onClick={() => handleUnshare(groupId, true)}
                      className="text-red-400 hover:text-red-300 hover:bg-red-400/10 p-1.5 rounded-lg transition-colors"
                      title="Remove access"
                    >
                      <X size={14} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </Modal>

      {embedBot && <EmbedModal isOpen={!!embedBot} onClose={() => setEmbedBot(null)} bot={embedBot} />}

      {/* Delete Bot Confirmation Dialog */}
      <AlertDialog open={deleteConfirm.open} onOpenChange={(open) => !open && setDeleteConfirm({ open: false, bot: null })}>
        <AlertDialogContent className="bg-[#1A1A1A] border border-white/10 rounded-2xl max-w-md">
          <AlertDialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-400" />
              </div>
              <AlertDialogTitle className="text-xl font-bold text-white">Delete Bot</AlertDialogTitle>
            </div>
            <AlertDialogDescription className="text-white/60 text-sm leading-relaxed">
              Are you sure you want to delete <span className="text-white font-semibold">"{deleteConfirm.bot?.name}"</span>?
              This action cannot be undone and all associated data will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-3 mt-4">
            <AlertDialogCancel className="bg-white/5 border-white/10 text-white hover:bg-white/10 rounded-xl px-5">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteBot}
              className="bg-red-500 hover:bg-red-600 text-white border-0 rounded-xl px-5"
            >
              Delete Bot
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Leave Shared Bot Confirmation Dialog */}
      <AlertDialog open={leaveConfirm.open} onOpenChange={(open) => !open && setLeaveConfirm({ open: false, bot: null })}>
        <AlertDialogContent className="bg-[#1A1A1A] border border-white/10 rounded-2xl max-w-md">
          <AlertDialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center">
                <X className="w-5 h-5 text-orange-400" />
              </div>
              <AlertDialogTitle className="text-xl font-bold text-white">Leave Bot</AlertDialogTitle>
            </div>
            <AlertDialogDescription className="text-white/60 text-sm leading-relaxed">
              Are you sure you want to leave <span className="text-white font-semibold">"{leaveConfirm.bot?.name}"</span>?
              You will no longer have access to this bot. The owner can share it with you again if needed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-3 mt-4">
            <AlertDialogCancel className="bg-white/5 border-white/10 text-white hover:bg-white/10 rounded-xl px-5">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmLeaveBot}
              className="bg-orange-500 hover:bg-orange-600 text-white border-0 rounded-xl px-5"
            >
              Leave Bot
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
});
