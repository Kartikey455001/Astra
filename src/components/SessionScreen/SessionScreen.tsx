import React, { useState } from 'react';
import {
  FileText,
  Clock,
  Filter,
  Trash2,
  PlusCircle,
  ArrowLeft,
  AlertCircle,
} from 'lucide-react';
import type {
  SessionTraceEvent,
  SessionEventCategory,
  ExperimentProfile,
} from '../../types/astra';

interface SessionScreenProps {
  events: SessionTraceEvent[];
  selectedExperiment?: ExperimentProfile | null;
  onClearTrace: () => void;
  onNewSession: () => void;
  onReturnToOperations: () => void;
}

const CATEGORIES: { id: SessionEventCategory; label: string }[] = [
  { id: 'ALL', label: 'ALL' },
  { id: 'ACTIVITY', label: 'ACTIVITY' },
  { id: 'ASSISTANT', label: 'ASSISTANT' },
  { id: 'GROUND_SUPPORT', label: 'GROUND SUPPORT' },
  { id: 'SYSTEM', label: 'SYSTEM' },
];

export const SessionScreen: React.FC<SessionScreenProps> = ({
  events,
  selectedExperiment,
  onClearTrace,
  onNewSession,
  onReturnToOperations,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<SessionEventCategory>('ALL');
  const [showConfirmClear, setShowConfirmClear] = useState<boolean>(false);

  const filteredEvents = events.filter((ev) => {
    if (selectedCategory === 'ALL') return true;
    return ev.category === selectedCategory;
  });

  const getEventBadgeStyle = (type: SessionTraceEvent['type']) => {
    switch (type) {
      case 'SESSION_STARTED':
      case 'SESSION_ENDED':
        return 'bg-blue-950/80 border-blue-700/80 text-blue-300';
      case 'EXPERIMENT_CONTEXT_SELECTED':
        return 'bg-sky-950/80 border-sky-700/80 text-sky-300';
      case 'ACTIVITY_CHANGED':
        return 'bg-emerald-950/80 border-emerald-700/80 text-emerald-300';
      case 'WORKSPACE_ZONE_CHANGED':
        return 'bg-violet-950/80 border-violet-600/80 text-violet-300';
      case 'ASSISTANT_QUERY':
        return 'bg-purple-950/80 border-purple-700/80 text-purple-300';
      case 'ASSISTANT_RESPONSE':
        return 'bg-indigo-950/80 border-indigo-700/80 text-indigo-300';
      case 'GROUND_SUPPORT_REQUESTED':
        return 'bg-amber-950/80 border-amber-600/80 text-amber-300';
      case 'GROUND_SUPPORT_ACKNOWLEDGED':
        return 'bg-sky-950/80 border-sky-600/80 text-sky-300';
      case 'GROUND_SUPPORT_RESOLVED':
        return 'bg-emerald-950/80 border-emerald-600/80 text-emerald-300';
      case 'GROUND_SUPPORT_CANCELLED':
        return 'bg-slate-800 border-slate-600 text-slate-300';
      case 'ASSISTANCE_AVAILABLE':
        return 'bg-teal-950/80 border-teal-600/80 text-teal-300';
      case 'PROCEDURE_CONTEXT_VIEWED':
        return 'bg-cyan-950/80 border-cyan-700/80 text-cyan-300';
      default:
        return 'bg-slate-800 border-slate-700 text-slate-300';
    }
  };

  const handleConfirmClear = () => {
    onClearTrace();
    setShowConfirmClear(false);
  };

  return (
    <div className="flex-1 flex flex-col gap-3.5 max-w-[1920px] w-full mx-auto font-sans">
      {/* Top Session Navigation & Context Bar */}
      <div className="flex items-center justify-between px-3.5 py-2.5 bg-[#0b1018] border border-[#1b2535] rounded select-none">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onReturnToOperations}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#101826] hover:bg-[#162338] border border-[#1e2d42] hover:border-sky-500/50 text-xs font-mono text-slate-300 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-sky-400" />
            RETURN TO OPERATIONS
          </button>
          <div className="h-4 w-px bg-slate-800" />
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-sky-400" />
            <span className="font-mono text-xs font-bold tracking-wider text-slate-200 uppercase">
              SESSION EVIDENCE & OPERATIONAL TRACE
            </span>
            <span className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-slate-800/80 border border-slate-700 text-slate-400">
              LOCAL AUDIT
            </span>
          </div>
        </div>

        {/* Global Session Actions */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onNewSession}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#0e1929] hover:bg-[#14233a] border border-[#1d304a] text-xs font-mono text-sky-300 transition-colors cursor-pointer"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            NEW SESSION
          </button>

          <button
            type="button"
            onClick={() => setShowConfirmClear(true)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#170e14] hover:bg-[#24131e] border border-[#3b1c2b] text-xs font-mono text-rose-300 transition-colors cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            CLEAR SESSION TRACE
          </button>
        </div>
      </div>

      {/* Session Metadata Card */}
      <div className="bg-[#0b1018] border border-[#1b2535] rounded p-3.5 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3 font-mono text-xs">
        <div className="flex flex-col gap-0.5 border-r border-[#152030] pr-2">
          <span className="text-[10px] text-slate-500 uppercase">Session Status</span>
          <div className="flex items-center gap-1.5 text-emerald-400 font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            ACTIVE
          </div>
        </div>

        <div className="flex flex-col gap-0.5 border-r border-[#152030] pr-2">
          <span className="text-[10px] text-slate-500 uppercase">Experiment</span>
          <span className="text-slate-200 font-medium truncate">
            {selectedExperiment?.name || 'Not selected'}
          </span>
        </div>

        <div className="flex flex-col gap-0.5 border-r border-[#152030] pr-2">
          <span className="text-[10px] text-slate-500 uppercase">Mission / Env</span>
          <span className="text-slate-200 font-medium">
            {selectedExperiment?.mission || 'Cosmic Kiss'} ({selectedExperiment?.environment || 'ISS'})
          </span>
        </div>

        <div className="flex flex-col gap-0.5 border-r border-[#152030] pr-2">
          <span className="text-[10px] text-slate-500 uppercase">Camera</span>
          <span className="text-slate-200 font-medium">
            {selectedExperiment?.camera || 'CAMERA 01'}
          </span>
        </div>

        <div className="flex flex-col gap-0.5">
          <span className="text-[10px] text-slate-500 uppercase">Recorded Events</span>
          <span className="text-sky-300 font-bold">{events.length}</span>
        </div>
      </div>

      {/* Operational Trace Section */}
      <div className="bg-[#0b1018] border border-[#1b2535] rounded overflow-hidden flex flex-col flex-1">
        {/* Header with Filter Buttons */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2.5 bg-[#0e1522] border-b border-[#1b2535]">
          <div className="flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <h2 className="font-mono text-xs font-bold tracking-wider text-slate-200 uppercase">
              OPERATIONAL TRACE
            </h2>
            <span className="text-[11px] font-mono text-slate-500">
              ({filteredEvents.length} {selectedCategory === 'ALL' ? 'events' : selectedCategory.toLowerCase()})
            </span>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1">
            <Filter className="w-3 h-3 text-slate-500 mr-1" />
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-2 py-0.5 rounded font-mono text-[10px] uppercase tracking-wider transition-colors cursor-pointer border ${
                  selectedCategory === cat.id
                    ? 'bg-sky-600 text-white border-sky-400 font-semibold'
                    : 'bg-[#0a121e] text-slate-400 hover:text-slate-200 border-[#1a273b]'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Trace Stream Container */}
        <div className="p-3.5 flex flex-col gap-2 overflow-y-auto max-h-[620px] flex-1">
          {filteredEvents.length > 0 ? (
            filteredEvents.map((ev) => (
              <div
                key={ev.id}
                className="p-2.5 rounded bg-[#080d16] border border-[#152132] hover:border-[#1e3048] flex items-start justify-between gap-3 font-mono transition-colors text-xs"
              >
                <div className="flex items-start gap-3">
                  <span className="text-[11px] text-slate-500 shrink-0 pt-0.5">
                    {ev.timestamp}
                  </span>

                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[10px] font-semibold px-1.5 py-0.2 rounded border ${getEventBadgeStyle(
                          ev.type
                        )}`}
                      >
                        {ev.type}
                      </span>
                      <span className="text-slate-200 font-medium font-sans">
                        {ev.summary}
                      </span>
                    </div>

                    {ev.details && (
                      <p className="text-[11px] text-slate-400 font-sans leading-relaxed">
                        {ev.details}
                      </p>
                    )}

                    {/* Metadata details if available */}
                    {ev.metadata && Object.keys(ev.metadata).length > 0 && (
                      <div className="flex flex-wrap gap-2 text-[10px] text-slate-500 pt-0.5">
                        {ev.metadata.experiment && (
                          <span>Exp: <strong className="text-slate-400">{ev.metadata.experiment}</strong></span>
                        )}
                        {ev.metadata.previousActivity && (
                          <span>From: <strong className="text-slate-400">{ev.metadata.previousActivity}</strong></span>
                        )}
                        {ev.metadata.activity && (
                          <span>Activity: <strong className="text-slate-300">{ev.metadata.activity}</strong></span>
                        )}
                        {ev.metadata.reason && (
                          <span>Reason: <strong className="text-amber-300/80">{ev.metadata.reason}</strong></span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <span className="text-[9px] text-slate-600 uppercase shrink-0 pt-0.5">
                  {ev.category}
                </span>
              </div>
            ))
          ) : (
            <div className="flex flex-col items-center justify-center p-12 text-center text-slate-500 gap-2">
              <AlertCircle className="w-6 h-6 text-slate-600 mb-1" />
              <span className="font-mono text-xs font-semibold text-slate-400">
                No session events recorded.
              </span>
              <p className="text-xs text-slate-500 max-w-sm">
                System events, physical activity transitions, assistant queries, and ground support escalations will appear here.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Clear Confirmation Modal */}
      {showConfirmClear && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#0b1018] border border-[#25354c] rounded max-w-md w-full p-4 flex flex-col gap-3 shadow-xl">
            <div className="flex items-center gap-2 text-rose-400 font-mono text-xs font-bold uppercase tracking-wider">
              <AlertCircle className="w-4 h-4" />
              CONFIRM CLEAR SESSION TRACE
            </div>
            <p className="text-xs text-slate-300 font-sans leading-relaxed">
              Are you sure you want to clear the operational trace? This will reset the logged event history for the current session. Camera feed, experiment context, and CV tracking will not be affected.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#152132]">
              <button
                type="button"
                onClick={() => setShowConfirmClear(false)}
                className="px-3 py-1 rounded font-mono text-xs text-slate-400 hover:text-slate-200 border border-[#202e42] transition-colors cursor-pointer"
              >
                CANCEL
              </button>
              <button
                type="button"
                onClick={handleConfirmClear}
                className="px-3 py-1 rounded font-mono text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 transition-colors cursor-pointer"
              >
                CONFIRM CLEAR
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
