import React from 'react';
import type { NavTab } from '../../types/astra';

interface NavigationProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
}

interface NavItemConfig {
  id: NavTab;
  label: string;
}

const NAV_ITEMS: NavItemConfig[] = [
  { id: 'operations', label: 'Operations' },
  { id: 'session', label: 'Session' },
  { id: 'ground-support', label: 'Ground Support' },
  { id: 'settings', label: 'Engineering' },
];

export const Navigation: React.FC<NavigationProps> = ({ currentTab, onSelectTab }) => {
  return (
    <nav className="w-full bg-[#0a0e16] border-b border-[#1b2535] px-6 py-2 select-none">
      <div className="max-w-[1920px] mx-auto flex items-center gap-2">
        {NAV_ITEMS.map((item) => {
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`px-3.5 py-1.5 text-xs font-mono font-medium rounded transition-colors duration-150 ${
                isActive
                  ? 'bg-[#152033] text-sky-300 border border-sky-800/80'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-[#101724] border border-transparent'
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
