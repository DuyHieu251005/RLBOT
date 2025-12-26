import { Search, Plus, Users, X, UserPlus, Mail, Info, ArrowRight, MoreVertical } from "lucide-react";
import { useState } from "react";
import { GroupData } from "../types";
import { useAuth } from "../contexts/AuthContext";
import { GroupDrawer } from "./GroupDrawer";
import { toast } from "sonner";
import { inviteUserToGroup } from "../services/api";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "./ui/button";

interface GroupsProps {
  groups: GroupData[];
  onCreateGroup: (group: GroupData) => Promise<GroupData | null>;
  onDeleteGroup: (groupId: string) => Promise<void>;
  isAuthenticated: boolean;
}

export function Groups({ groups, onCreateGroup, onDeleteGroup, isAuthenticated }: GroupsProps) {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupDescription, setNewGroupDescription] = useState("");
  const [newGroupMembers, setNewGroupMembers] = useState<string[]>([]);
  const [memberEmailInput, setMemberEmailInput] = useState("");
  const [selectedGroup, setSelectedGroup] = useState<GroupData | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const handleOpenDrawer = (group: GroupData) => {
    setSelectedGroup(group);
    setIsDrawerOpen(true);
  };

  const handleCloseDrawer = () => {
    setIsDrawerOpen(false);
  };

  const filteredGroups = groups.filter(group =>
    group.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCreateGroup = async () => {
    if (!isAuthenticated) {
      toast.error('Please login to create groups');
      setIsCreating(false);
      return;
    }
    if (!newGroupName.trim()) return;

    const newGroup: GroupData = {
      id: "",
      name: newGroupName,
      description: newGroupDescription,
      members: user ? [user.email] : [],
      memberCount: 1,
      botCount: 0,
      createdAt: new Date()
    };

    const createdGroup = await onCreateGroup(newGroup);

    if (createdGroup && newGroupMembers.length > 0) {
      let successCount = 0;
      for (const email of newGroupMembers) {
        const result = await inviteUserToGroup(createdGroup.id, email);
        if (result.success) {
          successCount++;
        }
      }
      if (successCount > 0) {
        toast.success(`Group created! ${successCount} invitation(s) sent.`);
      }
    } else if (createdGroup) {
      toast.success('Group created successfully!');
    }

    setNewGroupName("");
    setNewGroupDescription("");
    setNewGroupMembers([]);
    setMemberEmailInput("");
    setIsCreating(false);
  };

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
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <motion.h1
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="text-4xl font-black text-white tracking-tight mb-2"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              GUILD <span className="text-[#9D4EDD]">MANAGEMENT</span>
            </motion.h1>
            <p className="text-white/40 text-sm font-bold uppercase tracking-widest">Organize your circles and shared intelligence</p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="relative min-w-[240px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
              <input
                type="text"
                placeholder="Search guilds..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/20 focus:border-[#9D4EDD] focus:outline-none transition-all"
              />
            </div>
            <Button
              onClick={() => isAuthenticated ? setIsCreating(true) : toast.error('Please login to create groups')}
              className="px-6 py-2.5 bg-[#9D4EDD] hover:bg-[#7B2CBF] text-white rounded-xl font-bold transition-all flex items-center gap-2 shadow-[0_4px_15px_rgba(157,78,221,0.3)]"
            >
              <Plus className="w-4 h-4" />
              CREATE GUILD
            </Button>
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
        <div className="max-w-7xl mx-auto">
          {filteredGroups.length === 0 ? (
            <div className="h-[400px] flex flex-col items-center justify-center text-center opacity-20">
              <Users size={64} className="mb-4" />
              <p className="text-xl font-black uppercase tracking-tighter">No guilds found</p>
            </div>
          ) : (
            <motion.div
              initial="hidden"
              animate="show"
              variants={{
                hidden: { opacity: 0 },
                show: { opacity: 1, transition: { staggerChildren: 0.05 } }
              }}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
            >
              {filteredGroups.map((group, index) => (
                <motion.div
                  key={group.id}
                  variants={{
                    hidden: { opacity: 0, y: 20, scale: 0.95 },
                    show: { opacity: 1, y: 0, scale: 1 }
                  }}
                  whileHover={{ y: -5 }}
                  onClick={() => handleOpenDrawer(group)}
                  className="group bg-white/5 border border-white/10 rounded-2xl p-5 hover:border-[#9D4EDD]/50 transition-all relative overflow-hidden flex flex-col cursor-pointer"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-[#9D4EDD]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                  <div className="flex justify-between items-start mb-4 relative z-10">
                    <div className="w-12 h-12 rounded-2xl bg-[#9D4EDD]/10 border border-[#9D4EDD]/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Users className="w-6 h-6 text-[#9D4EDD]" />
                    </div>
                    <div className="px-2 py-1 rounded-lg bg-[#9D4EDD]/10 border border-[#9D4EDD]/20 text-[10px] font-black text-[#9D4EDD] uppercase tracking-tighter">
                      Admin
                    </div>
                  </div>

                  <div className="relative z-10 flex-1">
                    <h3 className="text-white font-bold text-lg mb-1 group-hover:text-[#9D4EDD] transition-colors">{group.name}</h3>
                    <p className="text-white/40 text-xs line-clamp-2 leading-relaxed mb-4">
                      {group.description || 'A gathering of mystical intelligence seekers.'}
                    </p>
                  </div>

                  <div className="relative z-10 pt-4 border-t border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="flex -space-x-2">
                        {[1, 2, 3].map((i) => (
                          <div key={i} className="w-6 h-6 rounded-full bg-[#1A1A1A] border border-white/10 flex items-center justify-center text-[8px] font-bold text-white/40">
                            {i}
                          </div>
                        ))}
                      </div>
                      <span className="text-[10px] font-bold text-white/20 uppercase tracking-widest">{group.memberCount} Members</span>
                    </div>
                    <ArrowRight className="w-4 h-4 text-white/20 group-hover:text-[#9D4EDD] group-hover:translate-x-1 transition-all" />
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}
        </div>
      </div>

      {/* Create Group Modal */}
      <AnimatePresence>
        {isCreating && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-[#1A1A1A] border border-white/10 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl"
            >
              <div className="p-8 border-b border-white/5 flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-black text-white tracking-tighter" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                    NEW <span className="text-[#9D4EDD]">GUILD</span>
                  </h2>
                  <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest">Establish a new center of intelligence</p>
                </div>
                <button
                  onClick={() => setIsCreating(false)}
                  className="p-2 text-white/20 hover:text-white hover:bg-white/5 rounded-xl transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-8 space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-white/40 uppercase tracking-widest px-1">Guild Name</label>
                  <input
                    type="text"
                    placeholder="Enter guild name..."
                    value={newGroupName}
                    onChange={(e) => setNewGroupName(e.target.value)}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/20 focus:border-[#9D4EDD] focus:outline-none transition-all"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-white/40 uppercase tracking-widest px-1">Description</label>
                  <textarea
                    placeholder="What is this guild's purpose?"
                    value={newGroupDescription}
                    onChange={(e) => setNewGroupDescription(e.target.value)}
                    rows={3}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/20 focus:border-[#9D4EDD] focus:outline-none transition-all resize-none"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-white/40 uppercase tracking-widest px-1">Invite Members</label>
                  <div className="flex gap-2">
                    <input
                      type="email"
                      placeholder="summoner@arcanum.io"
                      value={memberEmailInput}
                      onChange={(e) => setMemberEmailInput(e.target.value)}
                      className="flex-1 px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/20 focus:border-[#9D4EDD] focus:outline-none transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const email = memberEmailInput.trim();
                        if (email && !newGroupMembers.includes(email) && email !== user?.email) {
                          setNewGroupMembers(prev => [...prev, email]);
                          setMemberEmailInput("");
                        }
                      }}
                      className="px-4 bg-[#9D4EDD]/10 border border-[#9D4EDD]/30 text-[#9D4EDD] rounded-xl font-bold hover:bg-[#9D4EDD]/20 transition-all"
                    >
                      ADD
                    </button>
                  </div>

                  {newGroupMembers.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-3">
                      {newGroupMembers.map((email, idx) => (
                        <div key={idx} className="flex items-center gap-2 bg-[#9D4EDD]/10 border border-[#9D4EDD]/20 text-white/80 px-3 py-1 rounded-lg text-xs">
                          <span className="truncate max-w-[120px]">{email}</span>
                          <button onClick={() => setNewGroupMembers(prev => prev.filter((_, i) => i !== idx))}><X size={12} /></button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="p-8 border-t border-white/5 flex gap-3">
                <button
                  onClick={() => setIsCreating(false)}
                  className="flex-1 py-3 border border-white/10 text-white/40 rounded-xl font-bold hover:bg-white/5 hover:text-white transition-all"
                >
                  ABORT
                </button>
                <button
                  onClick={handleCreateGroup}
                  disabled={!newGroupName.trim()}
                  className="flex-1 py-3 bg-[#9D4EDD] text-white rounded-xl font-bold hover:bg-[#7B2CBF] transition-all disabled:opacity-30 shadow-[0_4px_15px_rgba(157,78,221,0.3)]"
                >
                  ESTABLISH
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {selectedGroup && (
        <GroupDrawer
          group={selectedGroup}
          isOpen={isDrawerOpen}
          onClose={handleCloseDrawer}
          onDelete={(groupId) => {
            onDeleteGroup(groupId);
            handleCloseDrawer();
          }}
        />
      )}
    </div>
  );
}
