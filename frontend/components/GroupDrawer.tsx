import { X, Users, UserPlus, Search, Mail, Trash2, LogOut } from "lucide-react";
import { GroupData } from "../types";
import { useAuth } from "../contexts/AuthContext";
import { useState, useEffect } from "react";
import { inviteUserToGroup, leaveGroup, removeMemberFromGroup } from "../services/api";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "./ui/alert-dialog";

interface GroupDrawerProps {
  group: GroupData;
  isOpen: boolean;
  onClose: () => void;
  onDelete: (groupId: string) => void;
}

export function GroupDrawer({ group, isOpen, onClose, onDelete }: GroupDrawerProps) {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [isAnimating, setIsAnimating] = useState(false);
  const [shouldRender, setShouldRender] = useState(false);
  const [isInviting, setIsInviting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setShouldRender(true);
      // Small delay to trigger animation
      setTimeout(() => setIsAnimating(true), 10);
    } else {
      setIsAnimating(false);
      // Wait for animation to complete before unmounting
      const timer = setTimeout(() => setShouldRender(false), 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  if (!shouldRender) return null;

  const filteredMembers = group.members?.filter(email =>
    email.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const handleInvite = async () => {
    if (!inviteEmail.trim()) return;

    setIsInviting(true);
    try {
      const result = await inviteUserToGroup(group.id, inviteEmail);
      if (result.success) {
        toast.success("Invitation sent", {
          description: `Invitation sent to ${inviteEmail}`,
        });
        setInviteEmail("");
      } else {
        toast.error("Failed to invite", {
          description: result.message || "An error occurred",
        });
      }
    } catch (error) {
      toast.error("Error", {
        description: "Failed to send invitation",
      });
    } finally {
      setIsInviting(false);
    }
  };

  const isGroupOwner = user && group.ownerId === user.id;

  return (
    <>
      {/* Overlay */}
      <div
        className={`fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300 z-40 ${isAnimating ? "opacity-100" : "opacity-0"
          }`}
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        className={`fixed top-0 right-0 h-full w-full max-w-2xl bg-[#1F1F1F] border-l-2 border-[#5A4635] shadow-[-20px_0_50px_rgba(0,0,0,0.7)] z-50 transform transition-all duration-300 ease-in-out flex flex-col ${isAnimating ? "translate-x-0" : "translate-x-full"
          }`}
        style={{ willChange: 'transform' }}
      >
        {/* Header */}
        <div className="p-6 border-b-2 border-[#5A4635] flex items-center justify-between bg-gradient-to-r from-[#1F1F1F] to-[#2B2B2B]">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#9D4EDD]/30 to-[#5A4635]/30 flex items-center justify-center border-2 border-[#9D4EDD]/40">
              <Users className="w-6 h-6 text-[#9D4EDD]" />
            </div>
            <div>
              <h2
                className="text-[#E8DCC8] text-xl font-bold weathered-text mb-1"
                style={{ fontFamily: 'Merriweather, serif' }}
              >
                {group.name}
              </h2>
              <p
                className="text-[#9B9380] text-sm weathered-text"
                style={{ fontFamily: 'Noto Serif, serif' }}
              >
                {group.description || 'No description'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-[#9B9380] hover:text-[#E8DCC8] transition-colors p-2 hover:bg-[#2B2B2B] rounded-none"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Search and Invite */}
        <div className="p-6 border-b border-[#5A4635]/50 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9B9380]" />
            <input
              type="text"
              placeholder="Search members..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-[#2B2B2B] border border-[#5A4635] rounded-md text-[#E8DCC8] placeholder:text-[#5A4635] focus:outline-none focus:border-[#9D4EDD]/50 transition-colors"
              style={{ fontFamily: 'Noto Serif, serif' }}
            />
          </div>

          <div className="flex gap-2">
            <div className="relative flex-1">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9B9380]" />
              <input
                type="email"
                placeholder="Enter email to invite..."
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleInvite()}
                className="w-full pl-10 pr-4 py-2.5 bg-[#2B2B2B] border border-[#5A4635] rounded-md text-[#E8DCC8] placeholder:text-[#5A4635] focus:outline-none focus:border-[#9D4EDD]/50 transition-colors"
                style={{ fontFamily: 'Noto Serif, serif' }}
              />
            </div>
            <button
              onClick={handleInvite}
              disabled={!inviteEmail.trim() || isInviting}
              className="px-4 py-2.5 bg-[#7C3AED] text-white rounded-md hover:bg-[#6D28D9] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              style={{ fontFamily: 'Noto Serif, serif' }}
            >
              <UserPlus className="w-4 h-4" />
              {isInviting ? 'Inviting...' : 'Invite'}
            </button>
          </div>
        </div>

        {/* Members List */}
        <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-secondary scrollbar-track-transparent">
          <div className="flex items-center justify-between mb-4">
            <h3
              className="text-[#E8DCC8] font-semibold weathered-text"
              style={{ fontFamily: 'Merriweather, serif' }}
            >
              Members ({filteredMembers.length})
            </h3>
          </div>

          <div className="space-y-2">
            {filteredMembers.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-[#9B9380] weathered-text" style={{ fontFamily: 'Noto Serif, serif' }}>
                  No members found
                </p>
              </div>
            ) : (
              filteredMembers.map((email, index) => {
                const isOwner = index === 0;
                const isCurrentUser = user?.email === email;
                const isCurrentUserOwner = user?.email === filteredMembers[0];

                return (
                  <div
                    key={index}
                    className="flex items-center gap-3 p-4 bg-[#2B2B2B]/50 border border-[#5A4635]/50 rounded-md hover:border-[#9D4EDD]/30 transition-all group"
                  >
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#9D4EDD]/30 to-[#5A4635]/30 flex items-center justify-center border border-[#9D4EDD]/20 flex-shrink-0">
                      <span
                        className="text-[#E8DCC8] font-bold text-lg"
                        style={{ fontFamily: 'Merriweather, serif' }}
                      >
                        {email.charAt(0).toUpperCase()}
                      </span>
                    </div>

                    <div className="flex-1 min-w-0">
                      <h4
                        className="text-[#E8DCC8] font-medium weathered-text truncate"
                        style={{ fontFamily: 'Noto Serif, serif' }}
                      >
                        {isCurrentUser ? `${user?.name || email} (You)` : email.split('@')[0]}
                      </h4>
                      <p
                        className="text-[#9B9380] text-sm weathered-text truncate"
                        style={{ fontFamily: 'Noto Serif, serif' }}
                      >
                        {email}
                      </p>
                    </div>

                    {isOwner && (
                      <span className="px-2 py-1 bg-[#9D4EDD]/20 text-[#9D4EDD] text-xs rounded-sm border border-[#9D4EDD]/30 flex-shrink-0">
                        Admin
                      </span>
                    )}

                    {/* Owner can kick non-owner members */}
                    {!isOwner && isCurrentUserOwner && (
                      <button
                        onClick={async () => {
                          const result = await removeMemberFromGroup(group.id, email);
                          if (result.success) {
                            toast.success('Member removed successfully');
                            window.location.reload();
                          } else {
                            toast.error(result.message || 'Failed to remove member');
                          }
                        }}
                        className="opacity-0 group-hover:opacity-100 text-[#9B9380] hover:text-red-400 transition-all p-2 hover:bg-[#1F1F1F] rounded-none"
                        title="Remove member"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}

                    {!isOwner && isCurrentUser && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <button
                            className="opacity-0 group-hover:opacity-100 text-[#9B9380] hover:text-red-400 transition-all p-2 hover:bg-[#1F1F1F] rounded-none"
                            title="Leave group"
                          >
                            <LogOut className="w-4 h-4" />
                          </button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="bg-[#1F1F1F] border-[#5A4635]">
                          <AlertDialogHeader>
                            <AlertDialogTitle className="text-[#E8DCC8] weathered-text">Leave Group?</AlertDialogTitle>
                            <AlertDialogDescription className="text-[#9B9380] weathered-text">
                              Are you sure you want to leave "{group.name}"?
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel className="bg-transparent text-[#E8DCC8] border-[#5A4635] hover:bg-[#2B2B2B] hover:text-[#E8DCC8] weathered-text">Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={async () => {
                                const result = await leaveGroup(group.id);
                                if (result.success) {
                                  toast.success("Left group successfully");
                                  onClose();
                                  window.location.reload();
                                } else {
                                  toast.error("Failed to leave group", { description: result.message });
                                }
                              }}
                              className="bg-red-500/20 text-red-400 border border-red-500/50 hover:bg-red-500/30 weathered-text"
                            >
                              Leave
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-6 border-t-2 border-[#5A4635] bg-gradient-to-r from-[#1F1F1F] to-[#2B2B2B]">
          <div className="flex gap-3">
            {isGroupOwner && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <button
                    className="flex-1 px-4 py-2.5 bg-red-500/10 text-red-400 border border-red-500/30 rounded-md hover:bg-red-500/20 transition-all flex items-center justify-center gap-2"
                    style={{ fontFamily: 'Noto Serif, serif' }}
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete Group
                  </button>
                </AlertDialogTrigger>
                <AlertDialogContent className="bg-[#1F1F1F] border-[#5A4635]">
                  <AlertDialogHeader>
                    <AlertDialogTitle className="text-[#E8DCC8] weathered-text">Delete Group?</AlertDialogTitle>
                    <AlertDialogDescription className="text-[#9B9380] weathered-text">
                      Are you sure you want to delete "{group.name}"? This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel className="bg-transparent text-[#E8DCC8] border-[#5A4635] hover:bg-[#2B2B2B] hover:text-[#E8DCC8] weathered-text">Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => { onDelete(group.id); onClose(); }}
                      className="bg-red-500/20 text-red-400 border border-red-500/50 hover:bg-red-500/30 weathered-text"
                    >
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
            <button
              onClick={onClose}
              className={`px-6 py-2.5 bg-[#2B2B2B] text-[#E8DCC8] border border-[#5A4635] rounded-md hover:bg-[#3B3B3B] transition-all ${!isGroupOwner ? 'w-full' : ''}`}
              style={{ fontFamily: 'Noto Serif, serif' }}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
