import { useState, memo, useMemo } from "react";
import { Search, Database, Clock, Edit2, Trash2, MoreVertical, Database as DatabaseIcon, AlertTriangle } from "lucide-react";
import { Button } from "./ui/button";
import { CreateKnowledgeModal } from "./ui/CreateKnowledgeModal";
import { KnowledgeBaseData } from "../types";
import { toast } from "sonner";
import { motion } from "framer-motion";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
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

interface KnowledgeBasesProps {
  knowledgeBases: KnowledgeBaseData[];
  onCreateKB: (kb: KnowledgeBaseData) => Promise<void>;
  onDeleteKB: (kbId: string) => void;
  onUpdateKB: (kb: KnowledgeBaseData) => void;
  isAuthenticated: boolean;
}

export const KnowledgeBases = memo(function KnowledgeBases({
  knowledgeBases,
  onCreateKB,
  onDeleteKB,
  onUpdateKB,
  isAuthenticated
}: KnowledgeBasesProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [editingKB, setEditingKB] = useState<KnowledgeBaseData | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; kb: KnowledgeBaseData | null }>({
    open: false,
    kb: null,
  });

  const handleDelete = (kb: KnowledgeBaseData) => {
    if (!isAuthenticated) {
      toast.error('Please login to delete knowledge bases');
      return;
    }
    setDeleteConfirm({ open: true, kb });
  };

  const confirmDeleteKB = () => {
    if (deleteConfirm.kb) {
      onDeleteKB(deleteConfirm.kb.id);
    }
    setDeleteConfirm({ open: false, kb: null });
  };

  const handleEdit = (kb: KnowledgeBaseData) => {
    if (!isAuthenticated) {
      toast.error('Please login to edit knowledge bases');
      return;
    }
    setEditingKB(kb);
    setIsModalOpen(true);
  };

  const filteredKBs = useMemo(() =>
    knowledgeBases.filter(kb =>
      kb.name.toLowerCase().includes(searchTerm.toLowerCase())
    ),
    [knowledgeBases, searchTerm]
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
              KNOWLEDGE <span className="text-[#9D4EDD]">BASES</span>
            </motion.h1>
            <p className="text-white/40 text-sm font-bold uppercase tracking-widest">Organize your specialized intelligence data</p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="relative min-w-[240px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
              <input
                type="text"
                placeholder="Search archives..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/20 focus:border-[#9D4EDD] focus:outline-none transition-all"
              />
            </div>

            <Button
              onClick={() => isAuthenticated ? setIsModalOpen(true) : toast.error('Please login to create knowledge bases')}
              className="px-6 py-2.5 bg-[#9D4EDD] hover:bg-[#7B2CBF] text-white rounded-xl font-bold transition-all flex items-center gap-2 shadow-[0_4px_15px_rgba(157,78,221,0.3)]"
            >
              <DatabaseIcon className="w-4 h-4" />
              CREATE DATA
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
        <div className="max-w-7xl mx-auto">
          {filteredKBs.length > 0 ? (
            <motion.div
              initial="hidden"
              animate="show"
              variants={{
                hidden: { opacity: 0 },
                show: { opacity: 1, transition: { staggerChildren: 0.05 } }
              }}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
            >
              {filteredKBs.map((kb) => (
                <motion.div
                  key={kb.id}
                  variants={{
                    hidden: { opacity: 0, y: 20, scale: 0.95 },
                    show: { opacity: 1, y: 0, scale: 1 }
                  }}
                  whileHover={{ y: -5 }}
                  className="group bg-white/5 border border-white/10 rounded-2xl p-5 hover:border-[#9D4EDD]/50 transition-all relative flex flex-col"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-[#9D4EDD]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                  <div className="flex justify-between items-start mb-4 relative z-10">
                    <div className="w-12 h-12 rounded-2xl bg-[#9D4EDD]/10 border border-[#9D4EDD]/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <DatabaseIcon className="w-6 h-6 text-[#9D4EDD]" />
                    </div>

                    <div className="relative z-20">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="p-2 rounded-lg transition-all text-white/20 hover:text-white hover:bg-white/5 opacity-0 group-hover:opacity-100">
                            <MoreVertical size={18} />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-[#1A1A1A] border border-white/10 rounded-xl shadow-2xl p-1 min-w-[120px] z-50">
                          <DropdownMenuItem
                            onClick={() => handleEdit(kb)}
                            className="px-3 py-2 text-white/70 focus:bg-[#9D4EDD]/20 focus:text-white flex items-center gap-2 cursor-pointer rounded-lg"
                          >
                            <Edit2 className="w-3 h-3" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDelete(kb)}
                            className="px-3 py-2 text-red-400 focus:bg-red-400/10 focus:text-red-300 flex items-center gap-2 cursor-pointer rounded-lg"
                          >
                            <Trash2 className="w-3 h-3" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>

                  <div className="relative z-10 flex-1">
                    <h3 className="text-white font-bold text-lg mb-1 group-hover:text-[#9D4EDD] transition-colors">{kb.name}</h3>
                    <div className="flex items-center gap-2 mt-1 mb-4">
                      <span className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-[10px] font-black text-white/40 uppercase tracking-tighter">
                        {kb.fileCount} Files
                      </span>
                      <span className="text-[10px] font-bold text-white/20 uppercase tracking-widest">{kb.size}</span>
                    </div>
                  </div>

                  <div className="relative z-10 pt-4 border-t border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-1 text-[10px] font-bold text-white/20 uppercase tracking-widest">
                      <Clock className="w-3 h-3" />
                      <span>{formatTimeAgo(kb.createdAt)}</span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          ) : (
            <div className="h-[400px] flex flex-col items-center justify-center text-center opacity-20">
              <DatabaseIcon size={64} className="mb-4" />
              <p className="text-xl font-black uppercase tracking-tighter">No intelligence data found</p>
            </div>
          )}
        </div>
      </div>

      <CreateKnowledgeModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingKB(null);
        }}
        onCreateKB={onCreateKB}
        onUpdateKB={onUpdateKB}
        editingKB={editingKB}
      />

      {/* Delete KB Confirmation Dialog */}
      <AlertDialog open={deleteConfirm.open} onOpenChange={(open) => !open && setDeleteConfirm({ open: false, kb: null })}>
        <AlertDialogContent className="bg-[#1A1A1A] border border-white/10 rounded-2xl max-w-md">
          <AlertDialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-400" />
              </div>
              <AlertDialogTitle className="text-xl font-bold text-white">Delete Knowledge Base</AlertDialogTitle>
            </div>
            <AlertDialogDescription className="text-white/60 text-sm leading-relaxed">
              Are you sure you want to delete <span className="text-white font-semibold">"{deleteConfirm.kb?.name}"</span>?
              All associated files and data will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-3 mt-4">
            <AlertDialogCancel className="bg-white/5 border-white/10 text-white hover:bg-white/10 rounded-xl px-5">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteKB}
              className="bg-red-500 hover:bg-red-600 text-white border-0 rounded-xl px-5"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
});
