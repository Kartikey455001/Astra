import React from 'react';
import { Activity, Clock, History } from 'lucide-react';
import type { ActivityResult, ActivityHistoryItem } from '../../types/astra';

interface ActivityPanelProps {
  activity?: ActivityResult | null;
  history?: ActivityHistoryItem[];
  workspaceZone?: string;
}

export const ActivityPanel: React.FC<ActivityPanelProps> = ({
  activity,
  history = [],
  workspaceZone = 'NO SPECIFIC ZONE',
}) => {
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getActivityColor = (act: string) => {
    switch (act) {
      case 'WORKING AT WORKSPACE':
        return 'text-emerald-400';
      case 'POSITIONING AT WORKSPACE':
      case 'POSITIONING':
        return 'text-sky-300';
      case 'APPROACHING WORKSPACE':
        return 'text-amber-300';
      case 'REPOSITIONING':
        return 'text-indigo-300';
      case 'AWAY / IDLE':
        return 'text-slate-400';
      default:
        return 'text-slate-300';
    }
  };

  // Only show a valid recognized activity (not transient perception states)
  const DISPLAY_VALID_ACTIVITIES = new Set([
    'WORKING AT WORKSPACE',
    'POSITIONING AT WORKSPACE',
    'POSITIONING',
    'REACHING',
    'APPROACHING WORKSPACE',
    'REPOSITIONING',
    'AWAY / IDLE',
  ]);

  const isDynamic = Boolean(
    activity &&
    activity.activity &&
    DISPLAY_VALID_ACTIVITIES.has(activity.activity)
  );

  return (
    <section className="bg-[#0b1018] border border-[#1b2535] rounded overflow-hidden flex flex-col shadow-xs">
      {/* Current Activity Header */}
      <div className="flex items-center justify-between px-3.5 py-2 bg-[#0e1522] border-b border-[#1b2535] select-none">
        <div className="flex items-center gap-2">
          <Activity className="w-3.5 h-3.5 text-slate-400" />
          <h2 className="font-mono text-xs font-bold tracking-wider text-slate-200 uppercase">
            CURRENT ACTIVITY
          </h2>
        </div>
        {isDynamic && (
          <span className="flex items-center gap-1 font-mono text-[10px] text-emerald-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            ACTIVE
          </span>
        )}
        {!isDynamic && activity?.activity && (
          <span className="flex items-center gap-1 font-mono text-[10px] text-amber-400/80">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
            CLASSIFYING
          </span>
        )}
      </div>

      {/* Current Activity Details */}
      <div className="p-3.5 bg-[#090e16] border-b border-[#151f2e]">
        {isDynamic ? (
          <div>
            <div className={`text-sm font-bold font-mono tracking-wide ${getActivityColor(activity!.activity)}`}>
              {activity!.activity}
            </div>
            <div className="text-xs text-slate-300 font-sans mt-1.5 leading-relaxed">
              {activity!.description}
            </div>

            {/* Metrics Row: Elapsed Activity Duration without fake score */}
            <div className="flex items-center gap-2 mt-3 pt-2.5 border-t border-[#141c2b] text-[11px] font-mono text-slate-400">
              <Clock className="w-3 h-3 text-slate-500" />
              <span className="text-emerald-400/90 font-medium">ACTIVE</span>
              <span className="text-slate-600">·</span>
              <span className="text-slate-200 font-semibold">{formatDuration(activity!.duration)}</span>
            </div>
          </div>
        ) : activity?.activity && (
          // Uncertain/transient state: show what classifier returned without embellishment
          <div>
            <div className="text-xs font-mono font-semibold text-amber-400/80 tracking-wide">
              {activity.activity}
            </div>
            <div className="text-[11px] text-slate-400 font-sans mt-1">
              Awaiting stable activity context.
            </div>
          </div>
        ) || (
          <div>
            <div className="text-xs font-mono font-semibold text-slate-400 tracking-wide">
              AWAITING ACTIVITY
            </div>
            <div className="text-[11px] text-slate-500 font-sans mt-1">
              Activity recognition will appear once tracking is stable.
            </div>
          </div>
        )}
      </div>

      {/* Workspace Zone Field (Part 13 Visual Grounding) */}
      <div className="px-3.5 py-2 bg-[#090f18] border-b border-[#151f2e] flex items-center justify-between text-xs font-mono">
        <span className="text-slate-400 text-[11px]">WORKSPACE ZONE</span>
        <span
          className={`font-semibold tracking-wide text-[11px] ${
            workspaceZone === 'UNAVAILABLE'
              ? 'text-slate-500'
              : workspaceZone && workspaceZone !== 'NO SPECIFIC ZONE'
              ? 'text-sky-300'
              : 'text-slate-400'
          }`}
        >
          {workspaceZone}
        </span>
      </div>

      {/* Recent Activity History Section */}
      <div className="bg-[#080d14] p-3">
        <div className="flex items-center gap-1.5 mb-2 select-none">
          <History className="w-3 h-3 text-slate-500" />
          <h3 className="font-mono text-[10px] font-semibold tracking-wider text-slate-400 uppercase">
            RECENT ACTIVITY
          </h3>
        </div>

        {history.length > 0 ? (
          <div className="space-y-1.5">
            {history.slice(0, 4).map((item) => (
              <div
                key={item.id}
                className="flex items-baseline justify-between text-[11px] font-mono py-1 px-1.5 rounded bg-[#0b121c]/80 border border-[#141f2e]"
              >
                <span className="text-slate-300 font-medium truncate max-w-[170px] sm:max-w-[200px]">
                  {item.activity}
                </span>
                <span className="text-slate-500 text-[10px] shrink-0 ml-2">
                  {item.timestamp}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-[11px] font-mono text-slate-500 italic py-1">
            No previous transitions recorded
          </div>
        )}
      </div>
    </section>
  );
};
