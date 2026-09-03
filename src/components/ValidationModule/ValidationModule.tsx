import React from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock,
  ShieldCheck,
  Radio,
  Activity,
  Cpu,
  Eye,
  FlaskConical,
  Sparkles,
  Mic,
  PhoneCall,
  FileText,
  CircleDot,
} from 'lucide-react';
import type {
  ActivityResult,
  ExperimentProfile,
  GroundSupportStatus,
  AssistantInteraction,
  SessionTraceEvent,
} from '../../types/astra';
import type { AssistantState } from '../VoiceAssistant/VoiceAssistant';

// ─── Types ────────────────────────────────────────────────────────────────────

type SubsystemStatus = 'PASS' | 'DEGRADED' | 'NO TARGET' | 'NOT SET' | 'WAITING' | 'NOT READY';

interface SubsystemRow {
  id: string;
  label: string;
  status: SubsystemStatus;
  detail: string;
  Icon: React.FC<{ className?: string }>;
}

interface ValidationModuleProps {
  currentActivity?: ActivityResult | null;
  selectedExperiment?: ExperimentProfile | null;
  groundSupportStatus?: GroundSupportStatus;
  assistantHistory?: AssistantInteraction[];
  sessionEvents?: SessionTraceEvent[];
  assistantState?: AssistantState;
  workspaceZone?: string;
  onReturnToOperations: () => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function statusColor(s: SubsystemStatus): string {
  switch (s) {
    case 'PASS':
      return 'text-emerald-400';
    case 'DEGRADED':
    case 'WAITING':
      return 'text-amber-400';
    case 'NO TARGET':
      return 'text-slate-400';
    case 'NOT SET':
    case 'NOT READY':
      return 'text-rose-400';
    default:
      return 'text-slate-500';
  }
}

function statusBg(s: SubsystemStatus): string {
  switch (s) {
    case 'PASS':
      return 'bg-emerald-950/60 border-emerald-800/50';
    case 'DEGRADED':
    case 'WAITING':
      return 'bg-amber-950/60 border-amber-800/50';
    case 'NO TARGET':
      return 'bg-slate-800/50 border-slate-700/50';
    case 'NOT SET':
    case 'NOT READY':
      return 'bg-rose-950/40 border-rose-900/40';
    default:
      return 'bg-slate-900 border-slate-700';
  }
}

function StatusIcon({ status }: { status: SubsystemStatus }) {
  if (status === 'PASS') {
    return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />;
  }
  if (status === 'DEGRADED' || status === 'WAITING') {
    return <AlertCircle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />;
  }
  if (status === 'NO TARGET') {
    return <Clock className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />;
  }
  return <XCircle className="w-3.5 h-3.5 text-rose-400 flex-shrink-0" />;
}

// ─── Component ────────────────────────────────────────────────────────────────

export const ValidationModule: React.FC<ValidationModuleProps> = ({
  currentActivity,
  selectedExperiment,
  groundSupportStatus = 'NO_REQUEST',
  assistantHistory = [],
  sessionEvents = [],
  assistantState = 'IDLE',
  workspaceZone,
  onReturnToOperations,
}) => {
  // ── Derive subsystem statuses from actual state ──────────────────────────

  const tracking = currentActivity?.trackingState || 'INITIALIZING';
  const pose = currentActivity?.poseState || 'INITIALIZING';
  const activityName = currentActivity?.activity || '';

  const VALID_ACTIVITIES = new Set([
    'WORKING AT WORKSPACE',
    'POSITIONING AT WORKSPACE',
    'POSITIONING',
    'REACHING',
    'APPROACHING WORKSPACE',
    'REPOSITIONING',
    'AWAY / IDLE',
  ]);

  const cameraStatus: SubsystemStatus =
    tracking === 'OFFLINE' ? 'NOT READY' :
    tracking === 'INITIALIZING' ? 'WAITING' : 'PASS';

  const trackingStatus: SubsystemStatus =
    tracking === 'ACTIVE' ? 'PASS' :
    tracking === 'SEARCHING' ? 'DEGRADED' :
    tracking === 'NO TARGET' ? 'NO TARGET' :
    tracking === 'INITIALIZING' ? 'WAITING' : 'NOT READY';

  const poseStatus: SubsystemStatus =
    pose === 'ACTIVE' ? 'PASS' :
    pose === 'DEGRADED' ? 'DEGRADED' :
    pose === 'NO TARGET' ? 'NO TARGET' :
    pose === 'INITIALIZING' ? 'WAITING' : 'NOT READY';

  const activityStatus: SubsystemStatus =
    VALID_ACTIVITIES.has(activityName) ? 'PASS' :
    activityName === 'ACTIVITY UNCERTAIN' ? 'DEGRADED' :
    tracking === 'ACTIVE' ? 'WAITING' : 'NO TARGET';

  const experimentStatus: SubsystemStatus =
    selectedExperiment ? 'PASS' : 'NOT SET';

  // Assistance engine state — derive from actual conditions (mirrors ContextAssistance logic)
  const isTrackingActive = tracking === 'ACTIVE';
  const isStableActivity =
    activityName === 'WORKING AT WORKSPACE' || activityName === 'POSITIONING AT WORKSPACE';
  const assistanceStatus: SubsystemStatus =
    !selectedExperiment ? 'NOT SET' :
    !isTrackingActive ? 'DEGRADED' :
    !isStableActivity ? 'WAITING' : 'PASS';

  const voiceStatus: SubsystemStatus =
    assistantState === 'IDLE' ? 'PASS' :
    assistantState === 'LISTENING' || assistantState === 'RESPONDING' ? 'PASS' :
    assistantState === 'PROCESSING' ? 'DEGRADED' : 'WAITING';

  const groundSupportStatusLabel: SubsystemStatus =
    groundSupportStatus === 'NO_REQUEST' ? 'PASS' :
    groundSupportStatus === 'REQUESTED' ? 'DEGRADED' :
    groundSupportStatus === 'ACKNOWLEDGED' ? 'DEGRADED' :
    groundSupportStatus === 'RESOLVED' ? 'PASS' : 'PASS';

  const sessionTraceStatus: SubsystemStatus =
    sessionEvents.length > 0 ? 'PASS' : 'WAITING';

  const subsystems: SubsystemRow[] = [
    {
      id: 'camera',
      label: 'Camera Pipeline',
      status: cameraStatus,
      detail:
        cameraStatus === 'PASS' ? 'LIVE — Fixed camera feed active' :
        cameraStatus === 'WAITING' ? 'Initializing video feed...' : 'Feed unavailable',
      Icon: Radio,
    },
    {
      id: 'tracking',
      label: 'Astronaut Tracking',
      status: trackingStatus,
      detail:
        tracking === 'ACTIVE' ? 'ACTIVE — Target acquired' :
        tracking === 'SEARCHING' ? 'SEARCHING — No stable target' :
        tracking === 'NO TARGET' ? 'NO TARGET — Astronaut not visible' :
        tracking === 'INITIALIZING' ? 'Initializing model...' : 'OFFLINE',
      Icon: Eye,
    },
    {
      id: 'pose',
      label: 'Pose Estimation',
      status: poseStatus,
      detail:
        pose === 'ACTIVE' ? 'ACTIVE — Keypoints available' :
        pose === 'DEGRADED' ? 'DEGRADED — Partial keypoints' :
        pose === 'NO TARGET' ? 'NO TARGET — Awaiting detection' :
        pose === 'INITIALIZING' ? 'Initializing estimator...' : 'OFFLINE',
      Icon: Activity,
    },
    {
      id: 'activity',
      label: 'Activity Recognition',
      status: activityStatus,
      detail:
        VALID_ACTIVITIES.has(activityName)
          ? activityName
          : activityName === 'ACTIVITY UNCERTAIN'
          ? 'Classifier uncertain — awaiting stable state'
          : tracking === 'ACTIVE'
          ? 'Awaiting stable activity...'
          : 'No target — activity unavailable',
      Icon: Cpu,
    },
    {
      id: 'experiment',
      label: 'Experiment Context',
      status: experimentStatus,
      detail:
        selectedExperiment
          ? `${selectedExperiment.name} — ${selectedExperiment.mission || 'Cosmic Kiss'}`
          : 'No experiment selected',
      Icon: FlaskConical,
    },
    {
      id: 'assistance',
      label: 'Assistance Engine',
      status: assistanceStatus,
      detail:
        !selectedExperiment ? 'Context not set' :
        !isTrackingActive ? 'Tracking unavailable' :
        !isStableActivity ? 'Awaiting stable workspace activity' :
        'ASSISTANCE AVAILABLE',
      Icon: Sparkles,
    },
    {
      id: 'voice',
      label: 'Voice Assistant',
      status: voiceStatus,
      detail:
        assistantState === 'IDLE' ? 'READY — Awaiting query' :
        assistantState === 'LISTENING' ? 'LISTENING — Voice input active' :
        assistantState === 'PROCESSING' ? 'PROCESSING — Resolving query' :
        assistantState === 'RESPONDING' ? 'RESPONDING — Speech active' : 'READY',
      Icon: Mic,
    },
    {
      id: 'ground',
      label: 'Ground Support',
      status: groundSupportStatusLabel,
      detail:
        groundSupportStatus === 'NO_REQUEST' ? 'NO REQUEST — Standby' :
        groundSupportStatus === 'REQUESTED' ? 'REQUESTED — Awaiting acknowledgement' :
        groundSupportStatus === 'ACKNOWLEDGED' ? 'ACKNOWLEDGED — In progress' :
        groundSupportStatus === 'RESOLVED' ? 'RESOLVED — Request closed' :
        groundSupportStatus === 'CANCELLED' ? 'CANCELLED' : groundSupportStatus,
      Icon: PhoneCall,
    },
    {
      id: 'session',
      label: 'Session Trace',
      status: sessionTraceStatus,
      detail:
        sessionEvents.length === 0
          ? 'No events recorded yet'
          : `${sessionEvents.length} event${sessionEvents.length !== 1 ? 's' : ''} recorded`,
      Icon: FileText,
    },
  ];

  // ── Demo Validation Checklist ─────────────────────────────────────────────

  const checklist = [
    {
      id: 'chk-camera',
      label: 'Camera running',
      done: cameraStatus === 'PASS',
    },
    {
      id: 'chk-tracking',
      label: 'Astronaut detected',
      done: tracking === 'ACTIVE',
    },
    {
      id: 'chk-pose',
      label: 'Pose available',
      done: pose === 'ACTIVE' || pose === 'DEGRADED',
    },
    {
      id: 'chk-activity',
      label: 'Activity recognized',
      done: VALID_ACTIVITIES.has(activityName),
    },
    {
      id: 'chk-experiment',
      label: 'Experiment context selected',
      done: Boolean(selectedExperiment),
    },
    {
      id: 'chk-assistance',
      label: 'Assistance available',
      done: assistanceStatus === 'PASS',
    },
    {
      id: 'chk-query',
      label: 'Voice query completed',
      done: assistantHistory.length > 0,
    },
    {
      id: 'chk-ground',
      label: 'Ground support lifecycle completed',
      done: groundSupportStatus === 'RESOLVED',
    },
    {
      id: 'chk-trace',
      label: 'Session trace recorded',
      done: sessionEvents.length > 0,
    },
  ];

  const passedChecks = checklist.filter((c) => c.done).length;

  // ── Core Pipeline Health ───────────────────────────────────────────────────

  const corePipelinePasses = [
    cameraStatus === 'PASS',
    trackingStatus === 'PASS',
    poseStatus === 'PASS' || poseStatus === 'DEGRADED',
    activityStatus === 'PASS',
  ].every(Boolean);

  const corePipelineLabel = corePipelinePasses ? 'READY' : 'DEGRADED';
  const corePipelineColor = corePipelinePasses ? 'text-emerald-400' : 'text-amber-400';

  const assistantLabel =
    assistantState === 'PROCESSING' ? 'PROCESSING' :
    assistantState === 'LISTENING' ? 'LISTENING' :
    assistantState === 'RESPONDING' ? 'RESPONDING' : 'READY';

  const assistantLabelColor =
    assistantState === 'PROCESSING' ? 'text-sky-400' :
    assistantState === 'LISTENING' ? 'text-amber-400' :
    assistantState === 'RESPONDING' ? 'text-emerald-400' : 'text-emerald-400';

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="flex-1 flex flex-col max-w-4xl mx-auto w-full px-4 py-4 gap-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ShieldCheck className="w-4 h-4 text-sky-400" />
          <div>
            <h1 className="font-mono text-sm font-bold text-slate-100 tracking-wider uppercase">
              ASTRA Engineering Validation
            </h1>
            <p className="text-[11px] text-slate-500 font-sans mt-0.5">
              Subsystem health indicators — reflects actual observed states
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="font-mono text-[10px] text-slate-500 flex items-center gap-1.5">
            <CircleDot className="w-2.5 h-2.5 text-emerald-500" />
            OFFLINE / LOCAL ONLY
          </span>
          <button
            type="button"
            onClick={onReturnToOperations}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#131d2e] hover:bg-[#19273f] text-slate-300 border border-[#1f3050] text-xs font-mono transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3 h-3" />
            Operations
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left: Subsystem Health Matrix */}
        <div className="lg:col-span-2 flex flex-col gap-3">
          <div className="bg-[#0b1018] border border-[#1b2535] rounded overflow-hidden">
            <div className="px-3.5 py-2 bg-[#0e1522] border-b border-[#1b2535] flex items-center justify-between">
              <span className="font-mono text-xs font-bold text-slate-200 uppercase tracking-wide">
                ASTRA VALIDATION
              </span>
              <span className="text-[10px] font-mono text-slate-500">
                {subsystems.filter((s) => s.status === 'PASS').length}/{subsystems.length} PASS
              </span>
            </div>

            <div className="flex flex-col divide-y divide-[#111a28]">
              {subsystems.map((sub) => (
                <div
                  key={sub.id}
                  className="flex items-center justify-between px-3.5 py-2.5 hover:bg-[#0c1420] transition-colors"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <sub.Icon className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                    <span className="text-xs font-mono text-slate-300">{sub.label}</span>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0 ml-4">
                    <span className="text-[10px] font-sans text-slate-500 text-right max-w-[180px] truncate hidden sm:block">
                      {sub.detail}
                    </span>
                    <div
                      className={`flex items-center gap-1.5 px-2 py-0.5 rounded border font-mono text-[10px] font-semibold ${statusBg(sub.status)} ${statusColor(sub.status)}`}
                    >
                      <StatusIcon status={sub.status} />
                      {sub.status}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Important Notice */}
          <div className="bg-[#0a0f1a] border border-[#192134] rounded px-3.5 py-2.5 text-[11px] font-sans text-slate-500 leading-relaxed">
            <span className="font-mono text-slate-400 text-[10px] font-semibold">NOTE: </span>
            These are software subsystem health indicators derived from observed application state.
            They do not represent AI accuracy percentages, scientific validation, or spacecraft telemetry.
            This is a local prototype for SIH 26174 demonstration purposes.
          </div>
        </div>

        {/* Right: Checklist + Summary */}
        <div className="flex flex-col gap-3">
          {/* Demo Validation Checklist */}
          <div className="bg-[#0b1018] border border-[#1b2535] rounded overflow-hidden">
            <div className="px-3.5 py-2 bg-[#0e1522] border-b border-[#1b2535] flex items-center justify-between">
              <span className="font-mono text-xs font-bold text-slate-200 uppercase tracking-wide">
                DEMO CHECKLIST
              </span>
              <span className="text-[10px] font-mono text-slate-500">
                {passedChecks}/{checklist.length}
              </span>
            </div>

            <div className="flex flex-col divide-y divide-[#111a28]">
              {checklist.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-2.5 px-3.5 py-2.5"
                >
                  {item.done ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                  ) : (
                    <div className="w-3.5 h-3.5 rounded-full border border-slate-600 flex-shrink-0" />
                  )}
                  <span
                    className={`text-[11px] font-sans ${
                      item.done ? 'text-slate-200' : 'text-slate-500'
                    }`}
                  >
                    {item.label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Validation Summary */}
          <div className="bg-[#0b1018] border border-[#1b2535] rounded overflow-hidden">
            <div className="px-3.5 py-2 bg-[#0e1522] border-b border-[#1b2535]">
              <span className="font-mono text-xs font-bold text-slate-200 uppercase tracking-wide">
                SYSTEM VALIDATION
              </span>
            </div>

            <div className="flex flex-col gap-0 divide-y divide-[#111a28] px-3.5 py-1">
              {/* Core Pipeline */}
              <div className="flex items-baseline justify-between py-2.5">
                <span className="font-mono text-[11px] text-slate-400">Core Pipeline</span>
                <span className={`font-mono text-[11px] font-semibold ${corePipelineColor}`}>
                  {corePipelineLabel}
                </span>
              </div>

              {/* Context */}
              <div className="flex items-baseline justify-between py-2.5">
                <span className="font-mono text-[11px] text-slate-400">Context</span>
                <span
                  className={`font-mono text-[11px] font-semibold ${
                    selectedExperiment ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {selectedExperiment ? 'READY' : 'NOT SET'}
                </span>
              </div>

              {/* Workspace Zone */}
              <div className="flex items-baseline justify-between py-2.5">
                <span className="font-mono text-[11px] text-slate-400">Workspace Zone</span>
                <span
                  className={`font-mono text-[11px] font-semibold ${
                    workspaceZone && workspaceZone !== 'NO SPECIFIC ZONE' && workspaceZone !== 'UNAVAILABLE'
                      ? 'text-sky-400'
                      : 'text-slate-500'
                  }`}
                >
                  {workspaceZone || 'NO SPECIFIC ZONE'}
                </span>
              </div>

              {/* Assistant */}
              <div className="flex items-baseline justify-between py-2.5">
                <span className="font-mono text-[11px] text-slate-400">Assistant</span>
                <span className={`font-mono text-[11px] font-semibold ${assistantLabelColor}`}>
                  {assistantLabel}
                </span>
              </div>

              {/* Ground Support */}
              <div className="flex items-baseline justify-between py-2.5">
                <span className="font-mono text-[11px] text-slate-400">Ground Support</span>
                <span
                  className={`font-mono text-[11px] font-semibold ${
                    groundSupportStatus === 'NO_REQUEST' ? 'text-slate-400' :
                    groundSupportStatus === 'REQUESTED' ? 'text-amber-400' :
                    groundSupportStatus === 'ACKNOWLEDGED' ? 'text-sky-400' :
                    groundSupportStatus === 'RESOLVED' ? 'text-emerald-400' :
                    'text-slate-400'
                  }`}
                >
                  {groundSupportStatus}
                </span>
              </div>

              {/* Session Trace */}
              <div className="flex items-baseline justify-between py-2.5">
                <span className="font-mono text-[11px] text-slate-400">Session Trace</span>
                <span className="font-mono text-[11px] font-semibold text-slate-300">
                  {sessionEvents.length} EVENT{sessionEvents.length !== 1 ? 'S' : ''}
                </span>
              </div>
            </div>
          </div>

          {/* Architecture Note */}
          <div className="bg-[#090e18] border border-[#131f2e] rounded px-3 py-2 text-[10px] font-mono text-slate-600 leading-relaxed">
            Validation observes state only. No subsystem is controlled from this panel.
          </div>
        </div>
      </div>
    </div>
  );
};
