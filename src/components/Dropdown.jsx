import { useState, useRef, useEffect, cloneElement, Children } from 'react';

function Dropdown({ trigger, children }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  // Clone children and inject closeDropdown function
  const childrenWithClose = Children.map(children, child => {
    if (child?.type === DropdownItem) {
      return cloneElement(child, { closeDropdown: () => setIsOpen(false) });
    }
    return child;
  });

  return (
    <div className="relative" ref={dropdownRef}>
      <div onClick={() => setIsOpen(!isOpen)}>
        {trigger}
      </div>
      
      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 bg-white rounded-sm shadow-lg border border-gray-200 py-1 z-50">
          {childrenWithClose}
        </div>
      )}
    </div>
  );
}

export function DropdownItem({ icon: Icon, label, onClick, variant = 'default', closeDropdown }) {
  const variants = {
    default: 'text-gray-700 hover:bg-gray-50',
    danger: 'text-red-600 hover:bg-red-50',
  };

  const handleClick = () => {
    onClick?.();
    closeDropdown?.();
  };

  return (
    <button
      onClick={handleClick}
      className={`w-full flex items-center gap-3 px-4 py-2 text-sm text-left transition-colors ${variants[variant]}`}
    >
      {Icon && <Icon size={16} />}
      <span>{label}</span>
    </button>
  );
}

export function DropdownDivider() {
  return <div className="my-1 border-t border-gray-200" />;
}

export default Dropdown;
