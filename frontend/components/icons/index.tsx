// Centralized icon exports for better tree-shaking and organization
export {
  // Navigation & Layout
  MessageSquare,
  Bot,
  Database,
  Users,
  Gift,
  CreditCard,
  ChevronLeft,
  ChevronRight,
  
  // Actions
  Send,
  Search,
  Plus,
  Edit2,
  Trash2,
  Copy,
  Check,
  CheckCircle,
  X,
  
  // Media & Attachments  
  Mic,
  Paperclip,
  Image,
  
  // UI Elements
  Smile,
  Clock,
  Sliders,
  Filter,
  MoreVertical,
  ArrowRight,
  Eye,
  EyeOff,
  
  // User & Auth
  User,
  LogOut,
  Mail,
  Lock,
  
  // Social
  Youtube,
  Instagram,
  Globe,
  
  // Special
  Sparkles,
  Zap,
  Crown,
  
  // Files & Data
  FileText,
  
  // Bot specific
  BotIcon as BotIconAlias,
} from "lucide-react";

// Custom SVG Icons
export { default as RLCraftLogo } from "../../assets/logo.svg";
export { default as GeminiLogoSVG } from "../../assets/gemini-logo.svg";

// Inline Gemini Logo Component (for dynamic coloring)
export function GeminiLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" fill="currentColor" opacity="0.3"/>
      <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" fill="url(#gemini-gradient)" fillOpacity="0.9"/>
      <circle cx="12" cy="12" r="4" fill="url(#innerGlow)" opacity="0.4"/>
      <defs>
        <linearGradient id="gemini-gradient" x1="2" y1="2" x2="22" y2="22" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#9D4EDD"/>
          <stop offset="50%" stopColor="#C77DFF"/>
          <stop offset="100%" stopColor="#7B2CBF"/>
        </linearGradient>
        <radialGradient id="innerGlow">
          <stop offset="0%" stopColor="#9D4EDD" stopOpacity="0.8"/>
          <stop offset="100%" stopColor="#9D4EDD" stopOpacity="0"/>
        </radialGradient>
      </defs>
    </svg>
  );
}
