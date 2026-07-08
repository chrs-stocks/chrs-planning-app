import React, { useEffect, useRef, useState } from 'react';

export interface NavDropdownItem {
  key: string;
  label: string;
  onClick: () => void;
  isActive: boolean;
  className?: string;
}

interface NavDropdownProps {
  label: string;
  items: NavDropdownItem[];
  buttonClassName?: string;
}

const NavDropdown: React.FC<NavDropdownProps> = ({ label, items, buttonClassName }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const active = items.some(item => item.isActive);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(o => !o)}
        className={buttonClassName ?? `px-3 py-2 rounded ${active ? 'bg-msm-navy-dark' : 'hover:bg-msm-navy-dark'}`}
      >
        {label} <span className="text-xs ml-0.5">▾</span>
      </button>
      {open && (
        <div className="absolute left-0 mt-1 bg-white text-gray-800 rounded shadow-lg py-1 min-w-[220px] z-50">
          {items.map(item => (
            <button
              key={item.key}
              onClick={() => { item.onClick(); setOpen(false); }}
              className={`block w-full text-left px-4 py-2 text-sm hover:bg-msm-navy-light ${item.isActive ? 'bg-msm-navy-light font-semibold' : ''} ${item.className ?? ''}`}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default NavDropdown;
