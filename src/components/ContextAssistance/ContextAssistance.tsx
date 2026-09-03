import React from 'react';
import {
  Sparkles,
  HelpCircle,
  X,
  PauseCircle,
  BookOpen,
} from 'lucide-react';
import type {
  ActivityResult,
  ExperimentProfile,
  AstronautTrackingStatus,
  AssistanceState,
} from '../../types/astra';

interface ContextAssistanceProps {
  selectedExperiment?: ExperimentProfile | null;
  currentActivity?: ActivityResult | null;
  trackingStatus?: AstronautTrackingStatus;
  workspaceZone?: string;
  isDismissed: boolean;
  onAskAstra: (query: string) => void;
  onDismiss: () => void;
}

export const ContextAssistance: React.FC<ContextAssistanceProps> = ({
  selectedExperiment,
  currentActivity,
  trackingStatus = 'ACTIVE',
  workspaceZone,
  isDismissed,
  onAskAstra,
  onDismiss,
}) => {
  // Determine assistance state deterministically
  let state: AssistanceState = 'NO_ASSISTANCE';
  let pauseReason = '';

  const isTrackingActive = trackingStatus === 'ACTIVE';
  const hasExperiment = Boolean(selectedExperiment);
  const activityName = currentActivity?.activity;

  if (!hasExperiment) {
    state = 'NO_ASSISTANCE';
    pauseReason = 'Experiment context not selected.';
  } else if (!isTrackingActive) {
    state = 'ASSISTANCE_PAUSED';
    pauseReason = 'Stable astronaut context unavailable.';
  } else if (
    !activityName ||
    activityName === 'ACTIVITY UNCERTAIN' ||
    activityName === 'AWAITING ACTIVITY'
  ) {
    state = 'ASSISTANCE_PAUSED';
    pauseReason = 'Stable activity context not available.';
  } else if (isDismissed) {
    state = 'NO_ASSISTANCE';
    pauseReason = 'Assistance dismissed by operator.';
  } else if (
    activityName === 'WORKING AT WORKSPACE' ||
    activityName === 'POSITIONING AT WORKSPACE'
  ) {
    state = 'ASSISTANCE_AVAILABLE';
  } else if (activityName === 'REPOSITIONING') {
    state = 'ASSISTANCE_PAUSED';
    pauseReason = 'Repositioning in progress.';
  } else {
    state = 'NO_ASSISTANCE';
    pauseReason = 'Astronaut away from workspace.';
  }

  // If NO_ASSISTANCE and not dismissed, show a minimal subtle standby bar
  if (state === 'NO_ASSISTANCE' && isDismissed) {
    return (
      <div className="px-3 py-1.5 rounded bg-[#090e17] border border-[#141e2e] flex items-center justify-between text-[11px] font-mono text-slate-500">
        <span className="flex items-center gap-1.5">
          <Sparkles className="w-3 h-3 text-slate-600" />
          ASTRA ASSISTANCE: DISMISSED
        </span>
        <span className="text-[10px] text-slate-600">STANDBY FOR CONTEXT SHIFT</span>
      </div>
    );
  }

  if (state === 'NO_ASSISTANCE') {
    return (
      <div className="px-3 py-1.5 rounded bg-[#090e17] border border-[#141e2e] flex items-center justify-between text-[11px] font-mono text-slate-500">
        <span className="flex items-center gap-1.5">
          <Sparkles className="w-3 h-3 text-slate-600" />
          ASTRA ASSISTANCE: STANDBY
        </span>
        <span className="text-[10px] text-slate-600">{pauseReason}</span>
      </div>
    );
  }

  // If ASSISTANCE_PAUSED, show an informational, non-alarming status
  if (state === 'ASSISTANCE_PAUSED') {
    return (
      <div className="px-3 py-2 rounded bg-[#0b121e] border border-[#19273c] flex items-center justify-between text-xs font-mono text-slate-400">
        <div className="flex items-center gap-2">
          <PauseCircle className="w-3.5 h-3.5 text-amber-400/80" />
          <span className="font-bold text-slate-300">ASTRA ASSISTANCE</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-950/60 border border-amber-500/40 text-amber-300">
            PAUSED
          </span>
        </div>
        <span className="text-[11px] text-slate-500 font-sans">{pauseReason}</span>
      </div>
    );
  }

  // ASSISTANCE_AVAILABLE: Clean, subtle proactive assistance card
  return (
    <div className="bg-[#0a111c] border border-sky-900/60 rounded p-3 flex flex-col gap-2.5 shadow-xs transition-all">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#142338] pb-1.5">
        <div className="flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-sky-400" />
          <span className="font-mono text-xs font-bold text-slate-200 uppercase tracking-wider">
            ASTRA ASSISTANCE
          </span>
        </div>
        <span className="flex items-center gap-1.5 font-mono text-[10px] text-sky-300 font-semibold px-2 py-0.5 rounded bg-sky-950/80 border border-sky-500/50">
          <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse"></span>
          ASSISTANCE AVAILABLE
        </span>
      </div>

      {/* Body details */}
      <div className="flex flex-col gap-1 text-xs">
        <div className="flex items-baseline justify-between">
          <span className="font-mono text-[10px] text-slate-400">Context</span>
          <span className="font-semibold text-slate-200">
            {selectedExperiment?.name || 'Cytoskeleton'}
            {workspaceZone &&
            workspaceZone !== 'NO SPECIFIC ZONE' &&
            workspaceZone !== 'UNAVAILABLE'
              ? ` • ${workspaceZone
                  .toLowerCase()
                  .split(' ')
                  .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
                  .join(' ')}`
              : ''}
          </span>
        </div>

        <div className="flex flex-col gap-0.5 pt-1">
          <span className="font-mono text-[10px] text-slate-400">Relevant knowledge</span>
          <p className="text-[11px] text-slate-300 font-sans leading-snug">
            {workspaceZone === 'PREPARATION AREA'
              ? 'Preparation-related experiment knowledge available.'
              : workspaceZone === 'EQUIPMENT / STORAGE AREA'
              ? 'Equipment and module storage context available.'
              : 'Cell culture retrieval / preparation context available.'}
          </p>
        </div>

        <div className="flex items-center gap-1 text-[10px] text-slate-400 font-mono pt-0.5">
          <HelpCircle className="w-3 h-3 text-slate-500" />
          <span>Ask ASTRA for the relevant information.</span>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex items-center justify-end gap-2 pt-1 border-t border-[#142338]">
        <button
          type="button"
          onClick={onDismiss}
          className="px-2.5 py-1 rounded font-mono text-[11px] text-slate-400 hover:text-slate-200 hover:bg-[#131f30] border border-transparent hover:border-slate-700 transition-colors cursor-pointer flex items-center gap-1"
        >
          <X className="w-3 h-3" />
          DISMISS
        </button>

        <button
          type="button"
          onClick={() => onAskAstra('Current procedure')}
          className="px-3.5 py-1 rounded font-mono text-xs font-semibold text-white bg-sky-600 hover:bg-sky-500 transition-colors cursor-pointer shadow-xs flex items-center gap-1.5"
        >
          <BookOpen className="w-3.5 h-3.5" />
          ASK ASTRA
        </button>
      </div>
    </div>
  );
};
