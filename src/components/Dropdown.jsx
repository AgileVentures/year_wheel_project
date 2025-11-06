import { useState, useRef, useEffect, cloneElement, Children } from 'react';

function Dropdown({ trigger, children }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const triggerRef = useRef(null);

  const closeDropdown = () => {
    setIsOpen(false);
    if (triggerRef.current && typeof triggerRef.current.focus === 'function') {
      triggerRef.current.focus();
    }
  };

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        closeDropdown();
      }
    }

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        closeDropdown();
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside, true);
      document.addEventListener('keydown', handleKeyDown);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside, true);
        document.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [isOpen]);

  const enhancedTrigger = cloneElement(trigger, {
    onClick: (event) => {
      trigger.props?.onClick?.(event);
      if (event?.defaultPrevented) return;
      setIsOpen(prev => !prev);
    },
    type: trigger.props?.type ?? 'button',
    ref: (node) => {
      triggerRef.current = node;
      const { ref } = trigger;
      if (typeof ref === 'function') {
        ref(node);
      } else if (ref && typeof ref === 'object') {
        ref.current = node;
      }
    },
    'aria-haspopup': trigger.props?.['aria-haspopup'] ?? 'menu',
    'aria-expanded': isOpen,
  });

  // Clone children and inject closeDropdown function
  const childrenWithClose = Children.map(children, child => {
    if (child?.type === DropdownItem) {
      return cloneElement(child, { closeDropdown });
    }
    return child;
  });

  return (
    <div className="relative" ref={dropdownRef}>
      {enhancedTrigger}
      
      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 bg-white rounded-sm shadow-lg border border-gray-200 py-1 z-50" role="menu">
          {childrenWithClose}
        </div>
      )}
    </div>
  );
}

export function DropdownItem({ icon: Icon, label, onClick, variant = 'default', closeDropdown, disabled = false }) {
  const variants = {
    default: 'text-gray-700 hover:bg-gray-50 focus:bg-gray-50',
    danger: 'text-red-600 hover:bg-red-50 focus:bg-red-50',
  };

  const handleClick = (event) => {
    if (disabled) {
      event.preventDefault();
      return;
    }
    onClick?.();
    closeDropdown?.();
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      onKeyDown={(event) => {
        if ((event.key === 'Enter' || event.key === ' ') && !disabled) {
          event.preventDefault();
          handleClick(event);
        }
      }}
      disabled={disabled}
      className={`w-full flex items-center gap-3 px-4 py-2 text-sm text-left transition-colors outline-none ${variants[variant]} ${disabled ? 'opacity-40 cursor-not-allowed hover:bg-transparent focus:bg-transparent' : ''}`}
      role="menuitem"
      tabIndex={-1}
      aria-disabled={disabled}
    >
      {Icon && <Icon size={16} aria-hidden="true" />}
      <span>{label}</span>
    </button>
  );
}

export function DropdownDivider() {
  return <div className="my-1 border-t border-gray-200" role="separator" />;
}

export default Dropdown;
