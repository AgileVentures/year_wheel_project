import { useState, useRef, useEffect } from 'react';

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

  return (
    <div className="relative" ref={dropdownRef}>
      <div onClick={() => setIsOpen(!isOpen)}>
        {trigger}
      </div>
      
      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 bg-white rounded-sm shadow-lg border border-gray-200 py-1 z-50">
          {children}
        </div>
      )}
    </div>
  );
}

export function DropdownItem({ icon: Icon, label, onClick, variant = 'default' }) {
  const variants = {
    default: 'text-gray-700 hover:bg-gray-50',
    danger: 'text-red-600 hover:bg-red-50',
  };

  return (
    <button
      onClick={onClick}
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
