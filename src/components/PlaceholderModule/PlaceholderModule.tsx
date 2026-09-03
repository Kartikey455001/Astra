import React from 'react';
import { Construction, ArrowLeft } from 'lucide-react';

interface PlaceholderModuleProps {
  moduleName: string;
  onReturnToOperations: () => void;
}

export const PlaceholderModule: React.FC<PlaceholderModuleProps> = ({
  moduleName,
  onReturnToOperations,
}) => {
  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="max-w-md w-full bg-[#0c121d] border border-[#1e293b] rounded p-8 text-center shadow-lg">
        <div className="w-12 h-12 rounded-full bg-[#141d2c] border border-[#223147] flex items-center justify-center mx-auto mb-4 text-slate-400">
          <Construction className="w-6 h-6 text-sky-400" />
        </div>
        <div className="text-[10px] font-mono uppercase tracking-widest text-sky-400 mb-1">
          ASTRA MODULE
        </div>
        <h2 className="text-base font-mono font-bold text-slate-100 mb-3 uppercase tracking-wider">
          {moduleName}
        </h2>
        <div className="p-3.5 rounded bg-[#090e18] border border-[#172233] text-xs text-slate-400 font-sans mb-6">
          Module will be implemented in a later development phase.
        </div>
        <button
          onClick={onReturnToOperations}
          className="inline-flex items-center gap-2 px-4 py-2 rounded bg-[#131d2e] hover:bg-[#19273f] text-slate-200 border border-[#233550] text-xs font-mono font-medium transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Return to Operations</span>
        </button>
      </div>
    </div>
  );
};
