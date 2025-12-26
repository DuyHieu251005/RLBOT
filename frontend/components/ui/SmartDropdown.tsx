import { useState, useRef, useEffect, ReactNode } from "react";
import { MoreVertical } from "lucide-react";

interface SmartDropdownProps {
  children: ReactNode;
  className?: string;
  buttonClassName?: string;
  menuClassName?: string;
}

export function SmartDropdown({ children, className = "", buttonClassName = "", menuClassName = "" }: SmartDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState<{ top?: number; bottom?: number; left?: number; right?: number }>({});
  const buttonRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && buttonRef.current && menuRef.current) {
      const buttonRect = buttonRef.current.getBoundingClientRect();
      const menuRect = menuRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      const newPosition: { top?: number; bottom?: number; left?: number; right?: number } = {};

      // Calculate horizontal position
      // Try to position on the right first
      if (buttonRect.right + menuRect.width <= viewportWidth) {
        // Enough space on the right
        newPosition.left = 0;
      } else if (buttonRect.left - menuRect.width >= 0) {
        // Not enough space on right, try left
        newPosition.right = 0;
      } else {
        // Not enough space on either side, align to viewport edge
        if (buttonRect.left > viewportWidth / 2) {
          newPosition.right = 0;
        } else {
          newPosition.left = 0;
        }
      }

      // Calculate vertical position
      // Try to position below first
      if (buttonRect.bottom + menuRect.height <= viewportHeight) {
        // Enough space below
        newPosition.top = buttonRect.height;
      } else if (buttonRect.top - menuRect.height >= 0) {
        // Not enough space below, try above
        newPosition.bottom = buttonRect.height;
      } else {
        // Not enough space above or below, position to fit viewport
        if (buttonRect.top > viewportHeight / 2) {
          newPosition.bottom = buttonRect.height;
        } else {
          newPosition.top = buttonRect.height;
        }
      }

      setPosition(newPosition);
    }
  }, [isOpen]);

  const handleMouseEnter = () => {
    setIsOpen(true);
  };

  const handleMouseLeave = () => {
    setIsOpen(false);
  };

  const positionStyle: React.CSSProperties = {
    position: 'absolute',
    ...position
  };

  return (
    <div 
      ref={buttonRef}
      className={`relative ${className}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <button 
        className={`text-[#9B9380] hover:text-[#E8DCC8] transition-colors ${buttonClassName}`}
      >
        <MoreVertical className="w-4 h-4" />
      </button>
      
      {isOpen && (
        <div 
          ref={menuRef}
          style={positionStyle}
          className={`bg-[#1F1F1F] border border-[#5A4635] rounded-sm shadow-xl min-w-[120px] overflow-hidden z-20 ${menuClassName}`}
        >
          {children}
        </div>
      )}
    </div>
  );
}
