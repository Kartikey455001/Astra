import React from 'react';
import type { GroundSupportStatus } from '../../types/astra';

interface HeaderProps {
  groundSupportStatus?: GroundSupportStatus;
}

export const Header: React.FC<HeaderProps> = ({ groundSupportStatus = 'NO_REQUEST' }) => {
  return (
    <header className="w-full bg-[#0c111a] border-b border-[#1b2535] px-6 py-3 select-none">
      <div className="max-w-[1920px] mx-auto flex items-center justify-between">
        {/* Left: Branding & Definition */}
        <div>
          <h1 className="font-mono text-base sm:text-lg font-bold tracking-widest text-slate-100">
            ASTRA
          </h1>
          <p className="text-xs text-slate-400 font-sans">
            Adaptive Space Task Recognition & Assistance
          </p>
        </div>

        {/* Right: Operational Status */}
        <div className="flex items-center gap-3">
          {/* Subtle Ground Support Status Badge */}
          {groundSupportStatus === 'REQUESTED' ? (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-amber-950/70 border border-amber-500/60 font-mono text-xs text-amber-300 font-semibold animate-pulse">
              <span className="w-2 h-2 rounded-full bg-amber-400"></span>
              <span>GROUND SUPPORT REQUESTED</span>
            </div>
          ) : groundSupportStatus === 'ACKNOWLEDGED' ? (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-sky-950/70 border border-sky-500/60 font-mono text-xs text-sky-300 font-semibold">
              <span className="w-2 h-2 rounded-full bg-sky-400"></span>
              <span>GROUND SUPPORT ACKNOWLEDGED</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#0e1624] border border-[#1a2538] font-mono text-xs text-slate-400">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-600"></span>
              <span>GROUND SUPPORT STANDBY</span>
            </div>
          )}

          <div className="px-2.5 py-1 rounded bg-[#0a1f18] border border-emerald-900/60 font-mono text-xs font-semibold text-emerald-400 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
            LOCAL PROCESSING ACTIVE
          </div>
        </div>
      </div>
    </header>
  );
};
