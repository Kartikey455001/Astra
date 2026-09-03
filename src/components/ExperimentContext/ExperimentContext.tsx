import React, { useState } from 'react';
import { FlaskConical, SlidersHorizontal, Radio, BookOpen } from 'lucide-react';
import type { ExperimentProfile } from '../../types/astra';
import { ExperimentSelectorModal } from './ExperimentSelectorModal';

interface ExperimentContextProps {
  selectedExperiment?: ExperimentProfile | null;
  onSelectExperiment?: (experiment: ExperimentProfile) => void;
}

export const ExperimentContext: React.FC<ExperimentContextProps> = ({
  selectedExperiment = null,
  onSelectExperiment,
}) => {
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  const isContextReady = Boolean(selectedExperiment);

  const handleSelect = (exp: ExperimentProfile) => {
    if (onSelectExperiment) {
      onSelectExperiment(exp);
    }
  };

  return (
    <>
      <section className="bg-[#0b1018] border border-[#1b2535] rounded overflow-hidden flex flex-col shadow-xs">
        {/* Header */}
        <div className="flex items-center justify-between px-3.5 py-2 bg-[#0e1522] border-b border-[#1b2535] select-none">
          <div className="flex items-center gap-2">
            <FlaskConical className="w-3.5 h-3.5 text-slate-400" />
            <h2 className="font-mono text-xs font-bold tracking-wider text-slate-200 uppercase">
              EXPERIMENT CONTEXT
            </h2>
          </div>

          <div className="flex items-center gap-2">
            {isContextReady ? (
              <>
                <span className="flex items-center gap-1 font-mono text-[10px] text-emerald-400 font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  CONTEXT READY
                </span>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(true)}
                  className="font-mono text-[10px] text-slate-400 hover:text-sky-300 border border-slate-700/80 hover:border-sky-500/60 px-1.5 py-0.5 rounded transition-colors uppercase tracking-wider"
                >
                  CHANGE
                </button>
              </>
            ) : (
              <span className="flex items-center gap-1 font-mono text-[10px] text-amber-400/90 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                CONTEXT NOT SET
              </span>
            )}
          </div>
        </div>

        {/* Context Information List */}
        <div className="p-3.5 bg-[#090e16] flex flex-col gap-2.5 text-xs font-sans">
          {/* Experiment Field */}
          <div className="flex items-baseline justify-between border-b border-[#141c2b] pb-2">
            <span className="font-mono text-[11px] text-slate-400">Experiment</span>
            {isContextReady ? (
              <span className="text-slate-100 font-medium text-right max-w-[190px] truncate">
                {selectedExperiment!.name}
              </span>
            ) : (
              <span className="text-slate-400 italic">Not selected</span>
            )}
          </div>

          {/* Mission Field */}
          <div className="flex items-baseline justify-between border-b border-[#141c2b] pb-2">
            <span className="font-mono text-[11px] text-slate-400">Mission</span>
            {isContextReady ? (
              <span className="text-slate-200 font-medium">
                {selectedExperiment!.mission || 'Cosmic Kiss'}
              </span>
            ) : (
              <span className="text-slate-400 italic">Not selected</span>
            )}
          </div>

          {/* Environment Field */}
          <div className="flex items-baseline justify-between border-b border-[#141c2b] pb-2">
            <span className="font-mono text-[11px] text-slate-400">Environment</span>
            {isContextReady ? (
              <span className="text-slate-200 font-mono font-medium">
                {selectedExperiment!.environment || 'ISS'}
              </span>
            ) : (
              <span className="text-slate-400 italic">Not selected</span>
            )}
          </div>

          {/* Camera Field */}
          <div className="flex items-baseline justify-between border-b border-[#141c2b] pb-2">
            <span className="font-mono text-[11px] text-slate-400">Camera</span>
            {isContextReady ? (
              <span className="text-slate-200 font-mono flex items-center gap-1.5">
                <Radio className="w-3 h-3 text-emerald-400" />
                <span>{selectedExperiment!.camera}</span>
                <span className="text-[9px] px-1 py-0.2 rounded bg-emerald-950/80 border border-emerald-800/80 text-emerald-300">
                  ASSIGNED
                </span>
              </span>
            ) : (
              <span className="text-slate-300 font-mono">CAMERA 01</span>
            )}
          </div>

          {/* Optional Knowledge Pack Label */}
          {isContextReady && (
            <div className="flex items-center justify-between pt-0.5 text-[10px] font-mono text-slate-500">
              <span className="flex items-center gap-1 text-slate-400">
                <BookOpen className="w-3 h-3 text-sky-400" />
                DEMO KNOWLEDGE PACK
              </span>
              <span className="text-[9px] px-1.5 py-0.2 rounded bg-[#0e1726] border border-[#1b2a40] text-slate-400">
                NON-FLIGHT
              </span>
            </div>
          )}

          {/* Initial Action Button when no experiment is selected */}
          {!isContextReady && (
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="mt-1 w-full py-1.5 px-3 rounded bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/30 hover:border-sky-500/60 font-mono text-xs font-semibold text-sky-300 flex items-center justify-center gap-1.5 transition-colors uppercase tracking-wider cursor-pointer"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              SELECT EXPERIMENT
            </button>
          )}
        </div>
      </section>

      {/* Configuration Selector Modal */}
      <ExperimentSelectorModal
        isOpen={isModalOpen}
        currentExperiment={selectedExperiment}
        onSelect={handleSelect}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  );
};
