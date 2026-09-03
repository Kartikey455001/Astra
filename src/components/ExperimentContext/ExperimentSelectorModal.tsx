import React, { useState, useEffect } from 'react';
import { X, Check, FlaskConical, Radio, Cpu, Layers } from 'lucide-react';
import type { ExperimentProfile } from '../../types/astra';
import { EXPERIMENT_PROFILES } from '../../data/experiments';

interface ExperimentSelectorModalProps {
  isOpen: boolean;
  currentExperiment: ExperimentProfile | null;
  onSelect: (experiment: ExperimentProfile) => void;
  onClose: () => void;
}

export const ExperimentSelectorModal: React.FC<ExperimentSelectorModalProps> = ({
  isOpen,
  currentExperiment,
  onSelect,
  onClose,
}) => {
  const [selectedId, setSelectedId] = useState<string>(
    currentExperiment?.id || EXPERIMENT_PROFILES[0].id
  );

  useEffect(() => {
    if (currentExperiment) {
      setSelectedId(currentExperiment.id);
    }
  }, [currentExperiment, isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const selectedProfile = EXPERIMENT_PROFILES.find((p) => p.id === selectedId) || EXPERIMENT_PROFILES[0];

  const handleConfirm = () => {
    onSelect(selectedProfile);
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs select-none"
    >
      <div
        className="w-full max-w-lg bg-[#0c121d] border border-[#213047] rounded-md shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-[#0e1624] border-b border-[#213047]">
          <div className="flex items-center gap-2">
            <FlaskConical className="w-4 h-4 text-sky-400" />
            <h2 className="font-mono text-xs font-bold tracking-wider text-slate-100 uppercase">
              EXPERIMENT CONFIGURATION
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 p-1 rounded hover:bg-slate-800/50 transition-colors"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 flex flex-col gap-4 text-xs font-sans">
          <p className="text-slate-400 text-[11px] leading-relaxed">
            Select the active scientific experiment profile to establish operational context for onboard assistance.
          </p>

          {/* Profile Selection Cards */}
          <div className="flex flex-col gap-2">
            <span className="font-mono text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              AVAILABLE EXPERIMENT PROFILES
            </span>

            <div className="space-y-1.5">
              {EXPERIMENT_PROFILES.map((profile) => {
                const isSelected = profile.id === selectedId;
                return (
                  <button
                    key={profile.id}
                    type="button"
                    onClick={() => setSelectedId(profile.id)}
                    className={`w-full text-left p-3 rounded border transition-all flex items-start justify-between gap-3 ${
                      isSelected
                        ? 'bg-[#101c2e] border-sky-500/80 shadow-xs'
                        : 'bg-[#090f18] border-[#182436] hover:border-slate-600 hover:bg-[#0c1420]'
                    }`}
                  >
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-slate-200 text-xs font-sans">
                          {profile.name}
                        </span>
                        <span className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-sky-950/60 border border-sky-800/60 text-sky-300">
                          {profile.payload}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 leading-snug line-clamp-2">
                        {profile.description}
                      </p>
                    </div>

                    <div className="shrink-0 pt-0.5">
                      <div
                        className={`w-4 h-4 rounded-full border flex items-center justify-center transition-colors ${
                          isSelected
                            ? 'border-sky-400 bg-sky-500 text-slate-950'
                            : 'border-slate-600 bg-transparent'
                        }`}
                      >
                        {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Operational Fields Summary Box */}
          <div className="bg-[#080d16] border border-[#172335] rounded p-3 flex flex-col gap-2 font-mono text-[11px]">
            <div className="flex items-center justify-between pb-1.5 border-b border-[#141f2e]">
              <span className="text-slate-400 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-slate-500" />
                EXPERIMENT
              </span>
              <span className="text-slate-200 font-semibold">{selectedProfile.name}</span>
            </div>

            {selectedProfile.mission && (
              <div className="flex items-center justify-between pb-1.5 border-b border-[#141f2e]">
                <span className="text-slate-400">MISSION</span>
                <span className="text-slate-200 font-semibold">{selectedProfile.mission}</span>
              </div>
            )}

            {selectedProfile.environment && (
              <div className="flex items-center justify-between pb-1.5 border-b border-[#141f2e]">
                <span className="text-slate-400">ENVIRONMENT</span>
                <span className="text-slate-200 font-semibold">{selectedProfile.environment}</span>
              </div>
            )}

            {selectedProfile.astronaut && (
              <div className="flex items-center justify-between pb-1.5 border-b border-[#141f2e]">
                <span className="text-slate-400">ASTRONAUT</span>
                <span className="text-sky-300 font-semibold">{selectedProfile.astronaut}</span>
              </div>
            )}

            <div className="flex items-center justify-between pb-1.5 border-b border-[#141f2e]">
              <span className="text-slate-400 flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5 text-slate-500" />
                PAYLOAD
              </span>
              <span className="text-sky-300 font-semibold">{selectedProfile.payload}</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-400 flex items-center gap-1.5">
                <Radio className="w-3.5 h-3.5 text-slate-500" />
                CAMERA
              </span>
              <span className="text-emerald-400 font-semibold flex items-center gap-1">
                <span>{selectedProfile.camera}</span>
                <span className="text-[9px] px-1 py-0.2 rounded bg-emerald-950/80 border border-emerald-800/80 text-emerald-300 ml-1">
                  ASSIGNED
                </span>
              </span>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-2 px-4 py-2.5 bg-[#090f18] border-t border-[#1c2a3d]">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 rounded font-mono text-xs text-slate-400 hover:text-slate-200 border border-[#213047] hover:border-slate-600 transition-colors uppercase tracking-wider"
          >
            CANCEL
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="px-3.5 py-1.5 rounded font-mono text-xs font-semibold text-sky-950 bg-sky-400 hover:bg-sky-300 border border-sky-400 transition-colors uppercase tracking-wider flex items-center gap-1.5 shadow-xs"
          >
            <Check className="w-3.5 h-3.5 stroke-[2.5]" />
            CONFIRM ASSIGNMENT
          </button>
        </div>
      </div>
    </div>
  );
};
