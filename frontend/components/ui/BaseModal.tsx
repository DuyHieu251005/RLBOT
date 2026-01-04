import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { cn } from "../../utils/cn";

interface BaseModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: React.ReactNode;
    description?: string;
    children: React.ReactNode;
    className?: string; // For maximizing width if needed
    maxWidth?: string;
}

export function BaseModal({
    isOpen,
    onClose,
    title,
    description,
    children,
    className,
    maxWidth = "max-w-md"
}: BaseModalProps) {
    // Close on Escape key
    React.useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        if (isOpen) document.addEventListener("keydown", handleEscape);
        return () => document.removeEventListener("keydown", handleEscape);
    }, [isOpen, onClose]);

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                    />

                    {/* Modal Content */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 10 }}
                        transition={{ type: "spring", duration: 0.5, bounce: 0.3 }}
                        className={cn(
                            "relative w-full bg-[#1A1A1A] border border-[#5A4635] rounded-xl shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col max-h-[90vh]",
                            maxWidth,
                            className
                        )}
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between p-6 border-b border-[#5A4635]/30 bg-[#1A1A1A]/50">
                            <div>
                                <h2 className="text-xl font-bold text-[#E8DCC8] tracking-tight font-serif">
                                    {title}
                                </h2>
                                {description && (
                                    <p className="text-xs text-[#9B9380] mt-1 font-medium tracking-wide uppercase">
                                        {description}
                                    </p>
                                )}
                            </div>
                            <button
                                onClick={onClose}
                                className="p-2 text-[#9B9380] hover:text-[#E8DCC8] hover:bg-[#9D4EDD]/10 rounded-lg transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Body */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                            {children}
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}

// Sub-components for structure if needed (optional)
export function ModalFooter({ children, className }: { children: React.ReactNode; className?: string }) {
    return (
        <div className={cn("p-6 border-t border-[#5A4635]/30 bg-[#1A1A1A]/30 flex gap-3", className)}>
            {children}
        </div>
    );
}
