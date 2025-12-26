import { useState, useRef, useEffect } from "react";
import { ChevronDown } from "lucide-react";

interface CustomSelectOption {
  value: string;
  label: string;
  icon?: React.ReactNode;
}

interface CustomSelectGroup {
  label: string;
  options: CustomSelectOption[];
}

interface CustomSelectProps {
  value: string;
  onChange: (value: string) => void;
  options?: CustomSelectOption[];
  groups?: CustomSelectGroup[];
  placeholder?: string;
  className?: string;
  icon?: React.ReactNode;
}

export function CustomSelect({ value, onChange, options, groups, placeholder, className = "", icon }: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Find selected option from either options or groups
  const selectedOption = options?.find(opt => opt.value === value) || 
    groups?.flatMap(g => g.options).find(opt => opt.value === value);

  return (
    <div ref={dropdownRef} className={`relative ${className}`}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-3 py-2 text-[#E8DCC8] rounded-lg weathered-text tracking-wide cursor-pointer bg-[#2A2A2A] border border-[#5A4635]/50 hover:border-[#9D4EDD]/50 transition-all duration-200 focus:outline-none focus:ring-0 shadow-[0_2px_8px_rgba(0,0,0,0.3)] hover:shadow-[0_2px_12px_rgba(157,78,221,0.15)] text-left flex items-center gap-2"
        style={{
          fontFamily: "Merriweather, serif",
          fontSize: "13px",
        }}
      >
        {icon && <span className="text-[#9D4EDD] flex-shrink-0">{icon}</span>}
        <span className="flex-1">{selectedOption?.label || placeholder || "Select..."}</span>
        <ChevronDown 
          className={`w-3.5 h-3.5 text-[#9B9380] transition-all duration-200 flex-shrink-0 ${
            isOpen ? "rotate-180 text-[#9D4EDD]" : ""
          }`} 
        />
      </button>

        {/* Dropdown Menu */}
        {isOpen && (
          <div 
            className="absolute z-[9999] bottom-full left-0 mb-2 bg-[#2A2A2A] border border-[#5A4635]/50 rounded-lg shadow-[0_-8px_24px_rgba(0,0,0,0.5)] overflow-hidden"
            style={{
              animation: "slideUp 0.15s ease-out",
              minWidth: "280px",
              width: "max-content",
              maxWidth: "400px",
            }}
          >
          <div className="max-h-[400px] overflow-y-auto scrollbar-thin scrollbar-thumb-secondary scrollbar-track-transparent py-2">
            {/* Render grouped options */}
            {groups ? (
              groups.map((group, groupIndex) => (
                <div key={groupIndex}>
                  {/* Group Label */}
                  <div 
                    className="px-3 py-1.5 text-[#9B9380] text-[11px] font-semibold tracking-wider uppercase"
                    style={{ fontFamily: "Merriweather, serif" }}
                  >
                    {group.label}
                  </div>
                  
                  {/* Group Options */}
                  {group.options.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => {
                        onChange(option.value);
                        setIsOpen(false);
                      }}
                      className={`w-full px-4 py-3 text-left transition-all duration-100 flex items-center gap-3 ${
                        value === option.value
                          ? "bg-[#9D4EDD]/20 text-[#9D4EDD]"
                          : "text-[#E8DCC8] hover:bg-[#3A3A3A] hover:text-[#9D4EDD]"
                      }`}
                      style={{
                        fontFamily: "Merriweather, serif",
                        fontSize: "14px",
                      }}
                    >
                      {option.icon && (
                        <span className="text-[#9D4EDD] flex-shrink-0">{option.icon}</span>
                      )}
                      {value === option.value && !option.icon && (
                        <span className="text-[#9D4EDD] text-xs">★</span>
                      )}
                      <span className={value === option.value || option.icon ? "" : "ml-5"}>
                        {option.label}
                      </span>
                    </button>
                  ))}
                  
                  {/* Divider between groups (except last) */}
                  {groupIndex < groups.length - 1 && (
                    <div className="border-t border-[#5A4635]/30 my-1"></div>
                  )}
                </div>
              ))
            ) : (
              /* Render simple options */
              options?.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    onChange(option.value);
                    setIsOpen(false);
                  }}
                  className={`w-full px-4 py-3 text-left transition-all duration-100 flex items-center gap-3 ${
                    value === option.value
                      ? "bg-[#9D4EDD]/20 text-[#9D4EDD]"
                      : "text-[#E8DCC8] hover:bg-[#3A3A3A] hover:text-[#9D4EDD]"
                  }`}
                  style={{
                    fontFamily: "Merriweather, serif",
                    fontSize: "14px",
                  }}
                >
                  {value === option.value && (
                    <span className="text-[#9D4EDD] text-xs">★</span>
                  )}
                  <span className={value === option.value ? "" : "ml-5"}>{option.label}</span>
                </button>
              ))
            )}
          </div>
        </div>
      )}

        {/* Animation keyframes */}
        <style>{`
          @keyframes slideUp {
            from {
              opacity: 0;
              transform: translateY(8px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
        `}</style>
    </div>
  );
}
