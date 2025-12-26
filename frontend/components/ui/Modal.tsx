import React from "react";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  onConfirm: () => void;
  confirmText?: string;
}

export function Modal({ isOpen, onClose, title, children, onConfirm, confirmText = "Create" }: ModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-[#1a1a1a] border border-[#9D4EDD]/50 rounded-xl w-full max-w-md shadow-[0_0_30px_rgba(157,78,221,0.15)] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#9D4EDD]/20 flex justify-between items-center">
          <h3 className="text-xl font-bold text-[#E0E0E0]">{title}</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">✕</button>
        </div>
        
        {/* Body */}
        <div className="p-6 max-h-[60vh] overflow-y-auto custom-scrollbar">
          {children}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-[#151515] flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors font-medium text-sm">
            Cancel
          </button>
          <button onClick={onConfirm} className="px-4 py-2 rounded-lg bg-[#9D4EDD]/20 text-[#9D4EDD] border border-[#9D4EDD]/50 hover:bg-[#9D4EDD] hover:text-white transition-all shadow-[0_0_10px_rgba(157,78,221,0.2)] font-medium text-sm">
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}