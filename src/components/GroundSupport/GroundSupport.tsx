import React from 'react';
import {
  Radio,
  CheckCircle2,
  AlertTriangle,
  ArrowLeft,
  Activity,
  FlaskConical,
  MessageSquare,
  ShieldCheck,
  Clock,
  Check,
  X,
  ListOrdered,
} from 'lucide-react';
import type {
  ActivityResult,
  ExperimentProfile,
  ProcedureState,
  GroundSupportState,
  AssistantInteraction,
} from '../../types/astra';

interface GroundSupportProps {
  currentActivity?: ActivityResult | null;
  selectedExperiment?: ExperimentProfile | null;
  procedureState?: ProcedureState;
  groundSupportState: GroundSupportState;
  assistantHistory: AssistantInteraction[];
  workspaceZone?: string;
  onAcknowledge: () => void;
  onResolve: () => void;
  onCancel?: () => void;
  onReturnToOperations: () => void;
}

export const GroundSupport: React.FC<GroundSupportProps> = ({
  currentActivity,
  selectedExperiment,
  procedureState,
  groundSupportState,
  assistantHistory,
  workspaceZone,
  onAcknowledge,
  onResolve,
  onCancel,
  onReturnToOperations,
}) => {
  const isRequested = groundSupportState.status === 'REQUESTED';
  const isAcknowledged = groundSupportState.status === 'ACKNOWLEDGED';
  const isResolved = groundSupportState.status === 'RESOLVED';
  const hasActiveRequest = isRequested || isAcknowledged || isResolved;

  const currentStageNum = procedureState?.currentStage ?? 1;
  const currentStage = selectedExperiment?.demoProcedure?.find(
    (s) => s.stageNumber === currentStageNum
  );
  const nextStage = selectedExperiment?.demoProcedure?.find(
    (s) => s.stageNumber === currentStageNum + 1
  );

  return (
    <div className="flex-1 flex flex-col gap-3.5 max-w-[1920px] w-full mx-auto">
      {/* Top Banner Navigation & Status */}
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
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span className="font-mono text-xs font-bold tracking-wider text-slate-200 uppercase">
              GROUND SUPPORT WORKSTATION
            </span>
            <span className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-slate-800/80 border border-slate-700 text-slate-400">
              LOCAL ESCALATION LAYER
            </span>
          </div>
        </div>

        {/* Global Support State Badge */}
        <div className="flex items-center gap-2">
          {isRequested && (
            <span className="flex items-center gap-1.5 font-mono text-xs font-semibold px-2.5 py-0.5 rounded bg-amber-950/70 border border-amber-500/60 text-amber-300 animate-pulse">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
              GROUND SUPPORT REQUESTED
            </span>
          )}
          {isAcknowledged && (
            <span className="flex items-center gap-1.5 font-mono text-xs font-semibold px-2.5 py-0.5 rounded bg-sky-950/70 border border-sky-500/60 text-sky-300">
              <Check className="w-3.5 h-3.5 text-sky-400" />
              GROUND SUPPORT REQUEST ACKNOWLEDGED
            </span>
          )}
          {isResolved && (
            <span className="flex items-center gap-1.5 font-mono text-xs font-semibold px-2.5 py-0.5 rounded bg-emerald-950/70 border border-emerald-500/60 text-emerald-300">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              GROUND SUPPORT REQUEST RESOLVED
            </span>
          )}
          {!hasActiveRequest && (
            <span className="flex items-center gap-1.5 font-mono text-xs font-medium px-2 py-0.5 rounded bg-[#0a1320] border border-[#17253b] text-slate-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
              STANDBY • NO ACTIVE REQUESTS
            </span>
          )}
        </div>
      </div>

      {/* Main Ground Support Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 flex-1 items-stretch">
        {/* Left Column (7 cols): Camera View & Support Request Action Card */}
        <div className="lg:col-span-7 flex flex-col gap-3.5">
          {/* CAMERA 01 Live Feed Display */}
          <div className="bg-[#0b1018] border border-[#1b2535] rounded overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-3 py-1.5 bg-[#0e1522] border-b border-[#1b2535] select-none">
              <div className="flex items-center gap-2">
                <Radio className="w-3.5 h-3.5 text-slate-400" />
                <span className="font-mono text-xs font-bold text-slate-200 uppercase">
                  CAMERA 01 • REFERENCE
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1 font-mono text-[10px] text-slate-400 font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-500"></span>
                  LOCAL FEED
                </span>
              </div>
            </div>

            {/* Video container without player controls */}
            <div className="relative aspect-16/10 bg-black flex items-center justify-center overflow-hidden">
              <video
                src="/experiment.mp4"
                autoPlay
                loop
                muted
                playsInline
                className="w-full h-full object-cover select-none pointer-events-none"
              />
              <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-black/60 backdrop-blur-xs border border-white/10 font-mono text-[10px] text-slate-300 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>CAMERA 01 • LIVE</span>
              </div>
              <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded bg-black/60 backdrop-blur-xs border border-white/10 font-mono text-[10px] text-slate-300">
                ASTRONAUT: {selectedExperiment?.astronaut || 'Matthias Maurer'}
              </div>
            </div>
          </div>

          {/* Support Request Management Section */}
          <div className="bg-[#0b1018] border border-[#1b2535] rounded overflow-hidden flex flex-col flex-1">
            <div className="flex items-center justify-between px-3 py-2 bg-[#0e1522] border-b border-[#1b2535]">
              <div className="flex items-center gap-2">
                <AlertTriangle
                  className={`w-3.5 h-3.5 ${
                    isRequested
                      ? 'text-amber-400'
                      : isAcknowledged
                      ? 'text-sky-400'
                      : isResolved
                      ? 'text-emerald-400'
                      : 'text-slate-500'
                  }`}
                />
                <span className="font-mono text-xs font-bold text-slate-200 uppercase">
                  GROUND SUPPORT REQUEST
                </span>
              </div>
              <span className="font-mono text-[10px] font-semibold text-slate-400">
                {groundSupportState.status}
              </span>
            </div>

            <div className="p-3.5 flex flex-col gap-3 flex-1 justify-between">
              {hasActiveRequest && groundSupportState.snapshot ? (
                <div className="flex flex-col gap-2.5">
                  {/* Status Banner */}
                  <div
                    className={`p-2.5 rounded border flex items-start justify-between ${
                      isRequested
                        ? 'bg-amber-950/30 border-amber-500/40 text-amber-200'
                        : isAcknowledged
                        ? 'bg-sky-950/30 border-sky-500/40 text-sky-200'
                        : 'bg-emerald-950/30 border-emerald-500/40 text-emerald-200'
                    }`}
                  >
                    <div className="flex flex-col gap-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold uppercase tracking-wider">
                          {isRequested
                            ? 'GROUND SUPPORT REQUEST • REQUESTED'
                            : isAcknowledged
                            ? 'GROUND SUPPORT REQUEST • ACKNOWLEDGED'
                            : 'GROUND SUPPORT REQUEST • RESOLVED'}
                        </span>
                      </div>
                      <p className="text-xs font-sans text-slate-300">
                        Reason:{' '}
                        <span className="font-medium text-slate-100">
                          {groundSupportState.snapshot.requestReason}
                        </span>
                      </p>
                    </div>
                    <div className="flex items-center gap-1 font-mono text-[10px] text-slate-400 shrink-0">
                      <Clock className="w-3 h-3 text-slate-500" />
                      <span>{groundSupportState.snapshot.timestamp}</span>
                    </div>
                  </div>

                  {/* Context Snapshot Card (Persistent context at time of request) */}
                  <div className="bg-[#070b12] border border-[#162130] rounded p-3 flex flex-col gap-1.5 font-mono text-xs">
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider border-b border-[#131d2c] pb-1">
                      CONTEXT SNAPSHOT (CAPTURED AT REQUEST TIME)
                    </span>
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <div>
                        <span className="text-slate-500 text-[10px]">EXPERIMENT:</span>
                        <div className="text-slate-200 font-medium">
                          {groundSupportState.snapshot.experiment}
                        </div>
                      </div>
                      <div>
                        <span className="text-slate-500 text-[10px]">MISSION / ENV:</span>
                        <div className="text-slate-200 font-medium">
                          {groundSupportState.snapshot.mission} (
                          {groundSupportState.snapshot.environment || 'ISS'})
                        </div>
                      </div>
                      <div>
                        <span className="text-slate-500 text-[10px]">CURRENT ACTIVITY AT REQUEST:</span>
                        <div className="text-emerald-300 font-semibold">
                          {groundSupportState.snapshot.activity}
                        </div>
                      </div>
                      <div>
                        <span className="text-slate-500 text-[10px]">CAMERA FEED:</span>
                        <div className="text-slate-200 font-medium">
                          {groundSupportState.snapshot.camera}
                        </div>
                      </div>
                      <div className="col-span-2">
                        <span className="text-slate-500 text-[10px]">WORKSPACE ZONE AT REQUEST:</span>
                        <div className="text-sky-300 font-semibold">
                          {groundSupportState.snapshot.workspaceZone || 'EXPERIMENT WORK AREA'}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center p-6 text-center text-slate-500 gap-1.5">
                  <CheckCircle2 className="w-6 h-6 text-slate-600 mb-1" />
                  <span className="font-mono text-xs font-semibold text-slate-400">
                    NO ACTIVE REQUEST
                  </span>
                  <p className="text-xs text-slate-500 max-w-sm">
                    Onboard ASTRA assistant is managing local context. If the astronaut requests ground support, a context snapshot will appear here.
                  </p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#141e2e]">
                {isRequested && (
                  <>
                    {onCancel && (
                      <button
                        type="button"
                        onClick={onCancel}
                        className="px-3.5 py-1.5 rounded font-mono text-xs font-semibold tracking-wider uppercase bg-[#141c28] hover:bg-[#1c2638] text-slate-300 border border-slate-700 hover:border-slate-500 transition-colors cursor-pointer flex items-center gap-1"
                      >
                        <X className="w-3 h-3" />
                        CANCEL
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={onAcknowledge}
                      className="px-4 py-1.5 rounded font-mono text-xs font-semibold tracking-wider uppercase bg-sky-600 hover:bg-sky-500 text-white transition-colors cursor-pointer flex items-center gap-1.5"
                    >
                      <Check className="w-3.5 h-3.5" />
                      ACKNOWLEDGE
                    </button>
                  </>
                )}
                {isAcknowledged && (
                  <button
                    type="button"
                    onClick={onResolve}
                    className="px-4 py-1.5 rounded font-mono text-xs font-semibold tracking-wider uppercase bg-emerald-600 hover:bg-emerald-500 text-white transition-colors cursor-pointer flex items-center gap-1.5"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    RESOLVE REQUEST
                  </button>
                )}
                {isResolved && (
                  <span className="font-mono text-xs text-emerald-400 font-medium flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    GROUND SUPPORT REQUEST RESOLVED
                  </span>
                )}
                {!hasActiveRequest && (
                  <span className="font-mono text-[10px] text-slate-500">
                    AWAITING ESCALATION TRIGGER
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column (5 cols): Telemetry, Context & Assistant Interactions */}
        <div className="lg:col-span-5 flex flex-col gap-3.5">
          {/* Astronaut Status */}
          <div className="bg-[#0b1018] border border-[#1b2535] rounded p-3 flex flex-col gap-2">
            <div className="flex items-center justify-between border-b border-[#141f2e] pb-1.5">
              <span className="font-mono text-xs font-bold text-slate-200 flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-emerald-400" />
                ASTRONAUT STATUS
              </span>
              <span className="font-mono text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                ACTIVE
              </span>
            </div>

            <div className="flex items-baseline justify-between text-xs">
              <span className="font-mono text-[11px] text-slate-400">Current Activity</span>
              <span className="font-semibold text-slate-100 font-mono">
                {currentActivity?.activity || 'AWAITING ACTIVITY'}
              </span>
            </div>

            <div className="flex items-baseline justify-between text-xs">
              <span className="font-mono text-[11px] text-slate-400">Tracking Status</span>
              <span className="font-medium text-emerald-400 font-mono">
                {currentActivity?.trackingState || 'ACTIVE'}
              </span>
            </div>

            <div className="flex items-baseline justify-between text-xs">
              <span className="font-mono text-[11px] text-slate-400">Pose Estimation</span>
              <span
                className={`font-medium font-mono ${
                  currentActivity?.poseState === 'DEGRADED'
                    ? 'text-amber-400'
                    : 'text-emerald-400'
                }`}
              >
                {currentActivity?.poseState || 'ACTIVE'}
              </span>
            </div>

            <div className="flex items-baseline justify-between text-xs">
              <span className="font-mono text-[11px] text-slate-400">Workspace Zone</span>
              <span className="font-medium text-sky-300 font-mono">
                {workspaceZone || 'NO SPECIFIC ZONE'}
              </span>
            </div>
          </div>

          {/* Active Experiment & Procedure Context */}
          <div className="bg-[#0b1018] border border-[#1b2535] rounded p-3 flex flex-col gap-2">
            <div className="flex items-center justify-between border-b border-[#141f2e] pb-1.5">
              <span className="font-mono text-xs font-bold text-slate-200 flex items-center gap-1.5">
                <FlaskConical className="w-3.5 h-3.5 text-sky-400" />
                EXPERIMENT CONTEXT
              </span>
              <span className="font-mono text-[10px] text-emerald-400 font-semibold">
                CONTEXT READY
              </span>
            </div>

            <div className="flex items-baseline justify-between text-xs">
              <span className="font-mono text-[11px] text-slate-400">Experiment</span>
              <span className="font-semibold text-slate-100">
                {selectedExperiment?.name || 'Cytoskeleton'}
              </span>
            </div>

            <div className="flex items-baseline justify-between text-xs">
              <span className="font-mono text-[11px] text-slate-400">Mission</span>
              <span className="text-slate-200">
                {selectedExperiment?.mission || 'Cosmic Kiss'}
              </span>
            </div>

            <div className="flex items-baseline justify-between text-xs">
              <span className="font-mono text-[11px] text-slate-400">Environment</span>
              <span className="font-mono text-slate-200">
                {selectedExperiment?.environment || 'ISS'}
              </span>
            </div>

            <div className="flex items-baseline justify-between text-xs">
              <span className="font-mono text-[11px] text-slate-400">Camera</span>
              <span className="font-mono text-slate-200">
                {selectedExperiment?.camera || 'CAMERA 01'}
              </span>
            </div>

            {/* Workflow Demonstration Stages Preview */}
            {currentStage && (
              <div className="mt-1 p-2 rounded bg-[#070c14] border border-[#141f2f] flex flex-col gap-1 text-[11px]">
                <div className="flex items-center justify-between text-[10px] text-slate-400">
                  <span className="font-mono text-sky-400 flex items-center gap-1">
                    <ListOrdered className="w-3 h-3" />
                    DEMONSTRATION WORKFLOW
                  </span>
                  <span className="text-[9px] px-1 py-0.2 rounded bg-slate-800 text-slate-400">
                    DEMO / NON-FLIGHT
                  </span>
                </div>
                <div className="flex items-baseline gap-1.5 pt-0.5">
                  <span className="text-slate-400 text-[10px]">Current:</span>
                  <span className="font-semibold text-slate-200">{currentStage.title}</span>
                </div>
                {nextStage && (
                  <div className="flex items-baseline gap-1.5 text-[10px]">
                    <span className="text-slate-500">Next:</span>
                    <span className="text-slate-400">{nextStage.title}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ASTRA Assistant Interaction Transcript */}
          <div className="bg-[#0b1018] border border-[#1b2535] rounded p-3 flex flex-col gap-2 flex-1">
            <div className="flex items-center justify-between border-b border-[#141f2e] pb-1.5">
              <span className="font-mono text-xs font-bold text-slate-200 flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5 text-sky-400" />
                ASTRA ASSISTANT TRANSCRIPT
              </span>
              <span className="font-mono text-[10px] text-slate-400">
                SESSION LOG ({assistantHistory.length})
              </span>
            </div>

            <div className="flex-1 overflow-y-auto max-h-[220px] flex flex-col gap-2 pr-1 text-xs">
              {assistantHistory.length > 0 ? (
                assistantHistory.map((item) => (
                  <div
                    key={item.id}
                    className="p-2 rounded bg-[#080d16] border border-[#141e2e] flex flex-col gap-1"
                  >
                    <div className="flex items-center justify-between text-[10px] text-slate-400">
                      <span className="font-mono text-sky-300 font-semibold">
                        ASTRONAUT: “{item.query}”
                      </span>
                      <span className="font-mono text-slate-500">{item.timestamp}</span>
                    </div>
                    <p className="text-[11px] text-slate-300 font-sans leading-relaxed">
                      <span className="font-mono text-emerald-400 font-semibold">ASTRA: </span>
                      “{item.response}”
                    </p>
                  </div>
                ))
              ) : (
                <div className="flex items-center justify-center h-full text-slate-500 text-xs italic py-6">
                  No voice queries recorded yet in this session.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
