import React, { useState, useRef, useCallback, useEffect } from 'react';
import type {
  NavTab,
  Detection,
  ActivityResult,
  ActivityHistoryItem,
  ExperimentProfile,
  ProcedureState,
  GroundSupportState,
  GroundSupportSnapshot,
  AssistantInteraction,
  SessionTraceEvent,
  SessionEventType,
  SessionEventCategory,
} from './types/astra';
import { EXPERIMENT_PROFILES } from './data/experiments';
import { evaluateWorkspaceZone } from './utils/workspaceZones';
import { StartupScreen } from './components/StartupScreen/StartupScreen';
import { Header } from './components/Header/Header';
import { Navigation } from './components/Navigation/Navigation';
import { AstronautWorkspace } from './components/AstronautWorkspace/AstronautWorkspace';
import { ActivityPanel } from './components/ActivityPanel/ActivityPanel';
import { ExperimentContext } from './components/ExperimentContext/ExperimentContext';
import { ContextAssistance } from './components/ContextAssistance/ContextAssistance';
import { VoiceAssistant } from './components/VoiceAssistant/VoiceAssistant';
import { GroundSupport } from './components/GroundSupport/GroundSupport';
import { SessionScreen } from './components/SessionScreen/SessionScreen';
import { ValidationModule } from './components/ValidationModule/ValidationModule';
import type { AssistantState } from './components/VoiceAssistant/VoiceAssistant';

export const App: React.FC = () => {
  const [isStartingUp, setIsStartingUp] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<NavTab>('operations');
  const [_detections, setDetections] = useState<Detection[]>([]);
  const [currentActivity, setCurrentActivity] = useState<ActivityResult | null>(null);
  const [activityHistory, setActivityHistory] = useState<ActivityHistoryItem[]>([]);
  
  // Default to Cytoskeleton (ESA Cosmic Kiss ISS experiment matching CAMERA 01)
  const [selectedExperiment, setSelectedExperiment] = useState<ExperimentProfile | null>(
    EXPERIMENT_PROFILES[0]
  );

  // Procedure State (strictly decoupled from ActivityRecognizer)
  const [procedureState, setProcedureState] = useState<ProcedureState>({
    experimentId: EXPERIMENT_PROFILES[0].id,
    currentStage: 1,
    status: 'ACTIVE',
    completedStages: [],
  });

  // Single Shared Ground Support State across Operations, Assistant, and Ground Support
  const [groundSupportState, setGroundSupportState] = useState<GroundSupportState>({
    status: 'NO_REQUEST',
    snapshot: null,
  });
  const groundSupportStatusRef = useRef(groundSupportState.status);
  groundSupportStatusRef.current = groundSupportState.status;

  // Workspace Zone State (Part 13 Visual Grounding)
  const [currentWorkspaceZone, setCurrentWorkspaceZone] = useState<string>('EXPERIMENT WORK AREA');
  const pendingZoneTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingZoneCandidateRef = useRef<string>('');
  const lastLoggedZoneRef = useRef<string>('EXPERIMENT WORK AREA');

  // Session Assistant Interaction Transcript
  const [assistantHistory, setAssistantHistory] = useState<AssistantInteraction[]>([]);

  // Operational Trace Events (Part 11)
  const [sessionEvents, setSessionEvents] = useState<SessionTraceEvent[]>([]);

  // Context-Aware Assistance Engine State (Part 12)
  const [isAssistanceDismissed, setIsAssistanceDismissed] = useState<boolean>(false);
  const [externalQueryTrigger, setExternalQueryTrigger] = useState<{ query: string; id: number } | null>(null);

  // Observed assistant state for ValidationModule (read-only, sourced from VoiceAssistant callback)
  const [observedAssistantState, setObservedAssistantState] = useState<AssistantState>('IDLE');

  const previousActivityRef = useRef<string>('');
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Activity debounce filter for Session Trace (BUG 2 fix)
  const lastLoggedTraceActivityRef = useRef<string>('');
  const pendingTraceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingCandidateActivityRef = useRef<string>('');

  // Central Operational Trace Logger
  const logSessionEvent = useCallback(
    (
      type: SessionEventType,
      category: SessionEventCategory,
      summary: string,
      details?: string,
      metadata?: SessionTraceEvent['metadata']
    ) => {
      const now = new Date();
      const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
      const newEvent: SessionTraceEvent = {
        id: `trace-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        timestamp: timeStr,
        type,
        category,
        summary,
        details,
        metadata,
      };
      setSessionEvents((prev) => [newEvent, ...prev.slice(0, 99)]);
    },
    []
  );

  // Initial Session Start
  useEffect(() => {
    logSessionEvent(
      'SESSION_STARTED',
      'SYSTEM',
      'Session initiated',
      'Local onboard monitoring and assistance active'
    );
  }, [logSessionEvent]);

  // When experiment selection changes
  const prevExpIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (selectedExperiment?.demoProcedure && selectedExperiment.demoProcedure.length > 0) {
      setProcedureState({
        experimentId: selectedExperiment.id,
        currentStage: 1,
        status: 'ACTIVE',
        completedStages: [],
      });
    } else {
      setProcedureState({
        experimentId: selectedExperiment?.id || null,
        currentStage: null,
        status: 'NOT_STARTED',
        completedStages: [],
      });
    }

    if (selectedExperiment && selectedExperiment.id !== prevExpIdRef.current) {
      prevExpIdRef.current = selectedExperiment.id;
      logSessionEvent(
        'EXPERIMENT_CONTEXT_SELECTED',
        'SYSTEM',
        selectedExperiment.name,
        `Mission: ${selectedExperiment.mission || 'Cosmic Kiss'} • Camera: ${selectedExperiment.camera}`,
        {
          experiment: selectedExperiment.name,
          mission: selectedExperiment.mission,
          environment: selectedExperiment.environment,
          camera: selectedExperiment.camera,
        }
      );
    }
  }, [selectedExperiment, logSessionEvent]);

  // Reset dismissal when activity or experiment changes
  useEffect(() => {
    setIsAssistanceDismissed(false);
  }, [currentActivity?.activity, selectedExperiment?.id]);

  // Evaluate Assistance Availability for Session Trace (logged strictly once per stable context)
  const assistanceLoggedContextRef = useRef<string>('');
  useEffect(() => {
    const isTrackingActive = (currentActivity?.trackingState || 'ACTIVE') === 'ACTIVE';
    const hasExp = Boolean(selectedExperiment);
    const act = currentActivity?.activity;
    const isStableWork = act === 'WORKING AT WORKSPACE' || act === 'POSITIONING AT WORKSPACE';

    if (hasExp && isTrackingActive && isStableWork && !isAssistanceDismissed) {
      const contextKey = `${selectedExperiment?.id}-${act}-${currentWorkspaceZone}`;
      if (assistanceLoggedContextRef.current !== contextKey) {
        assistanceLoggedContextRef.current = contextKey;
        logSessionEvent(
          'ASSISTANCE_AVAILABLE',
          'SYSTEM',
          'Context assistance available',
          `Context: ${selectedExperiment?.name} • Zone: ${currentWorkspaceZone}`,
          {
            experiment: selectedExperiment?.name,
            activity: act,
          }
        );
      }
    }
  }, [
    selectedExperiment?.id,
    selectedExperiment?.name,
    currentActivity?.activity,
    currentActivity?.trackingState,
    currentWorkspaceZone,
    isAssistanceDismissed,
    logSessionEvent,
  ]);

  // Cleanup pending timers on unmount
  useEffect(() => {
    return () => {
      if (pendingTraceTimerRef.current) {
        clearTimeout(pendingTraceTimerRef.current);
      }
      if (pendingZoneTimerRef.current) {
        clearTimeout(pendingZoneTimerRef.current);
      }
    };
  }, []);

  // Handle Detections and Evaluate Workspace Zone with Temporal Smoothing
  const handleDetectionsChange = useCallback(
    (dets: Detection[]) => {
      setDetections(dets);
      const trackingState = currentActivity?.trackingState || (dets.length > 0 ? 'ACTIVE' : 'NO TARGET');
      const result = evaluateWorkspaceZone(dets, trackingState);

      // If tracking lost, set to UNAVAILABLE immediately
      if (result.zone === 'UNAVAILABLE') {
        if (pendingZoneTimerRef.current) {
          clearTimeout(pendingZoneTimerRef.current);
          pendingZoneTimerRef.current = null;
        }
        pendingZoneCandidateRef.current = '';
        setCurrentWorkspaceZone((prev) => (prev !== 'UNAVAILABLE' ? 'UNAVAILABLE' : prev));
        return;
      }

      // If already current zone, cancel pending candidate
      if (result.zone === currentWorkspaceZone) {
        if (pendingZoneTimerRef.current) {
          clearTimeout(pendingZoneTimerRef.current);
          pendingZoneTimerRef.current = null;
        }
        pendingZoneCandidateRef.current = '';
        return;
      }

      // If candidate is already in debounce progress, let timer continue
      if (result.zone === pendingZoneCandidateRef.current) {
        return;
      }

      // New candidate zone: require 1.8 seconds of continuous stability before committing
      if (pendingZoneTimerRef.current) {
        clearTimeout(pendingZoneTimerRef.current);
      }

      const candidate = result.zone;
      pendingZoneCandidateRef.current = candidate;
      pendingZoneTimerRef.current = setTimeout(() => {
        pendingZoneTimerRef.current = null;
        pendingZoneCandidateRef.current = '';
        setCurrentWorkspaceZone(candidate);

        // Record stable spatial transition in Session Trace
        const VALID_LOG_ZONES = new Set([
          'PREPARATION AREA',
          'EXPERIMENT WORK AREA',
          'EQUIPMENT / STORAGE AREA',
        ]);
        if (
          VALID_LOG_ZONES.has(candidate) &&
          lastLoggedZoneRef.current !== candidate
        ) {
          const prevZone = lastLoggedZoneRef.current;
          lastLoggedZoneRef.current = candidate;
          logSessionEvent(
            'WORKSPACE_ZONE_CHANGED',
            'SYSTEM',
            `Workspace zone: ${candidate}`,
            `Transitioned from ${prevZone} to ${candidate}`,
            {
              reason: `Spatial transition to ${candidate}`,
            }
          );
        }
      }, 1800);
    },
    [currentActivity?.trackingState, currentWorkspaceZone, logSessionEvent]
  );

  const handleActivityChange = useCallback(
    (act: ActivityResult) => {
      setCurrentActivity(act);

      // Recent Activity continues to update immediately with valid activities
      const VALID_RECENT_ACTIVITIES = new Set([
        'WORKING AT WORKSPACE',
        'POSITIONING AT WORKSPACE',
        'POSITIONING',
        'REACHING',
        'APPROACHING WORKSPACE',
        'REPOSITIONING',
        'AWAY / IDLE',
      ]);

      if (
        act.activity &&
        VALID_RECENT_ACTIVITIES.has(act.activity) &&
        act.activity !== previousActivityRef.current
      ) {
        previousActivityRef.current = act.activity;
        const now = new Date();
        const timeStr = now.toTimeString().split(' ')[0];

        setActivityHistory((prev) => [
          {
            id: `${Date.now()}-${act.activity}`,
            activity: act.activity,
            timestamp: timeStr,
          },
          ...prev.slice(0, 4),
        ]);
      }

      // Session Trace Activity Logging with Temporal Debounce / Filter
      const VALID_TRACE_ACTIVITIES = new Set([
        'WORKING AT WORKSPACE',
        'POSITIONING AT WORKSPACE',
        'POSITIONING',
        'REACHING',
        'APPROACHING WORKSPACE',
        'REPOSITIONING',
        'AWAY / IDLE',
      ]);

      const currentActName = act.activity;

      // If perception state, cancel any pending candidate and do not log to Session Trace
      if (!currentActName || !VALID_TRACE_ACTIVITIES.has(currentActName)) {
        if (pendingTraceTimerRef.current) {
          clearTimeout(pendingTraceTimerRef.current);
          pendingTraceTimerRef.current = null;
        }
        pendingCandidateActivityRef.current = '';
        return;
      }

      // If returned to already logged activity, cancel pending candidate (it was a brief flicker)
      if (currentActName === lastLoggedTraceActivityRef.current) {
        if (pendingTraceTimerRef.current) {
          clearTimeout(pendingTraceTimerRef.current);
          pendingTraceTimerRef.current = null;
        }
        pendingCandidateActivityRef.current = '';
        return;
      }

      // If candidate is already being debounced, let the timer continue
      if (currentActName === pendingCandidateActivityRef.current) {
        return;
      }

      // New candidate activity: reset timer and wait for minimum stable duration (2.5 seconds)
      if (pendingTraceTimerRef.current) {
        clearTimeout(pendingTraceTimerRef.current);
      }

      pendingCandidateActivityRef.current = currentActName;
      pendingTraceTimerRef.current = setTimeout(() => {
        const prevLogged = lastLoggedTraceActivityRef.current;
        lastLoggedTraceActivityRef.current = currentActName;
        pendingTraceTimerRef.current = null;
        pendingCandidateActivityRef.current = '';

        logSessionEvent(
          'ACTIVITY_CHANGED',
          'ACTIVITY',
          currentActName,
          prevLogged
            ? `Activity transitioned from ${prevLogged} to ${currentActName}`
            : `Activity detected: ${currentActName}`,
          {
            activity: currentActName,
            previousActivity: prevLogged,
          }
        );
      }, 2500);
    },
    [logSessionEvent]
  );

  // Ground Support Request handler: captures context snapshot including Workspace Zone
  const handleGroundSupportRequest = useCallback(
    (reason: string) => {
      // Prevent duplicate requests if already active
      if (groundSupportStatusRef.current === 'REQUESTED') {
        return;
      }

      const now = new Date();
      const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;

      const activeStageTitle = selectedExperiment?.demoProcedure?.find(
        (s) => s.stageNumber === (procedureState.currentStage ?? 1)
      )?.title || 'Cell culture retrieval';

      const resolvedReason = reason || 'Human assistance requested';

      const snapshot: GroundSupportSnapshot = {
        activity: currentActivity?.activity || 'WORKING AT WORKSPACE',
        experiment: selectedExperiment?.name || 'Cytoskeleton',
        mission: selectedExperiment?.mission || 'Cosmic Kiss',
        environment: selectedExperiment?.environment || 'ISS',
        camera: selectedExperiment?.camera || 'CAMERA 01',
        procedureStage: activeStageTitle,
        workspaceZone: currentWorkspaceZone || 'EXPERIMENT WORK AREA',
        requestReason: resolvedReason,
        timestamp: timeStr,
      };

      setGroundSupportState({
        status: 'REQUESTED',
        snapshot,
      });

      logSessionEvent(
        'GROUND_SUPPORT_REQUESTED',
        'GROUND_SUPPORT',
        'Ground support requested',
        `Reason: ${resolvedReason}`,
        {
          reason: resolvedReason,
          experiment: selectedExperiment?.name || 'Cytoskeleton',
          activity: currentActivity?.activity || 'WORKING AT WORKSPACE',
          camera: selectedExperiment?.camera || 'CAMERA 01',
        }
      );
    },
    [currentActivity, selectedExperiment, procedureState, currentWorkspaceZone, logSessionEvent]
  );

  const handleGroundSupportCancel = useCallback(() => {
    if (groundSupportStatusRef.current === 'NO_REQUEST') return;

    setGroundSupportState({
      status: 'CANCELLED',
      snapshot: null,
    });
    logSessionEvent(
      'GROUND_SUPPORT_CANCELLED',
      'GROUND_SUPPORT',
      'Ground support request cancelled'
    );

    setTimeout(() => {
      setGroundSupportState({
        status: 'NO_REQUEST',
        snapshot: null,
      });
    }, 400);
  }, [logSessionEvent]);

  const handleGroundSupportAcknowledge = useCallback(() => {
    setGroundSupportState((prev) => ({
      ...prev,
      status: 'ACKNOWLEDGED',
    }));
    logSessionEvent(
      'GROUND_SUPPORT_ACKNOWLEDGED',
      'GROUND_SUPPORT',
      'Ground support request acknowledged'
    );
  }, [logSessionEvent]);

  const handleGroundSupportResolve = useCallback(() => {
    setGroundSupportState((prev) => ({
      ...prev,
      status: 'RESOLVED',
    }));
    logSessionEvent(
      'GROUND_SUPPORT_RESOLVED',
      'GROUND_SUPPORT',
      'Ground support request resolved'
    );
  }, [logSessionEvent]);

  const handleRecordInteraction = useCallback(
    (query: string, response: string) => {
      const now = new Date();
      const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
      const newInteraction: AssistantInteraction = {
        id: `interaction-${Date.now()}`,
        query,
        response,
        timestamp: timeStr,
      };
      setAssistantHistory((prev) => [newInteraction, ...prev.slice(0, 19)]);

      // Check for explicit procedure view
      if (
        query.toLowerCase().includes('procedure') ||
        query.toLowerCase().includes('current stage') ||
        query.toLowerCase().includes('what is the current procedure')
      ) {
        logSessionEvent(
          'PROCEDURE_CONTEXT_VIEWED',
          'SYSTEM',
          'Demonstration workflow viewed',
          `Current Stage: ${procedureState.currentStage ?? 1}`
        );
      }

      // Log in Operational Trace: Query first, then Response
      logSessionEvent('ASSISTANT_QUERY', 'ASSISTANT', `“${query}”`, undefined, { query });
      logSessionEvent('ASSISTANT_RESPONSE', 'ASSISTANT', `“${response}”`, undefined, { response });
    },
    [logSessionEvent, procedureState.currentStage]
  );

  // Clear Session Trace handler
  const handleClearSessionTrace = useCallback(() => {
    setSessionEvents([]);
  }, []);

  // New Session handler
  const handleNewSession = useCallback(() => {
    const now = new Date();
    const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;

    setGroundSupportState({
      status: 'NO_REQUEST',
      snapshot: null,
    });
    setAssistantHistory([]);
    setIsAssistanceDismissed(false);
    setExternalQueryTrigger(null);
    setCurrentWorkspaceZone('EXPERIMENT WORK AREA');
    lastLoggedZoneRef.current = 'EXPERIMENT WORK AREA';
    assistanceLoggedContextRef.current = '';
    lastLoggedTraceActivityRef.current = '';
    if (pendingTraceTimerRef.current) {
      clearTimeout(pendingTraceTimerRef.current);
      pendingTraceTimerRef.current = null;
    }
    if (pendingZoneTimerRef.current) {
      clearTimeout(pendingZoneTimerRef.current);
      pendingZoneTimerRef.current = null;
    }
    pendingCandidateActivityRef.current = '';
    pendingZoneCandidateRef.current = '';

    const initialEvent: SessionTraceEvent = {
      id: `trace-${Date.now()}`,
      timestamp: timeStr,
      type: 'SESSION_STARTED',
      category: 'SYSTEM',
      summary: 'New session initiated',
      details: 'Operational trace reset for new session',
    };
    setSessionEvents([initialEvent]);
  }, []);

  // Context-Aware Assistance handlers (Part 12)
  const handleAskAstra = useCallback((query: string) => {
    setExternalQueryTrigger({ query, id: Date.now() });
  }, []);

  const handleDismissAssistance = useCallback(() => {
    setIsAssistanceDismissed(true);
  }, []);


  if (isStartingUp) {
    return <StartupScreen onComplete={() => setIsStartingUp(false)} />;
  }

  return (
    <div className="min-h-screen bg-[#080c14] text-slate-100 flex flex-col font-sans">
      {/* Top System Header with Ground Support status */}
      <Header groundSupportStatus={groundSupportState.status} />

      {/* Primary Navigation */}
      <Navigation currentTab={activeTab} onSelectTab={setActiveTab} />

      {/* Main Viewport */}
      <main className="flex-1 flex flex-col max-w-[1920px] w-full mx-auto p-3 sm:p-4">
        {/* Operations Tab View: Kept mounted so CV loop and tracking are never interrupted */}
        <div
          className={`flex-1 grid grid-cols-1 lg:grid-cols-12 gap-3.5 items-stretch ${
            activeTab === 'operations' ? '' : 'hidden'
          }`}
        >
          {/* Dominant Left Column: Astronaut Workspace (approx. 75% width: 9 of 12 cols on desktop) */}
          <div className="lg:col-span-8 xl:col-span-9 flex flex-col min-h-[460px] lg:min-h-[580px]">
            <AstronautWorkspace
              className="flex-1 h-full"
              videoRef={videoRef}
              feedSource="/experiment.mp4"
              currentWorkspaceZone={currentWorkspaceZone}
              onDetectionsChange={handleDetectionsChange}
              onActivityChange={handleActivityChange}
            />
          </div>

          {/* Right Column: Context and Assistant (approx. 25% width: 3 of 12 cols on desktop) */}
          <div className="lg:col-span-4 xl:col-span-3 flex flex-col gap-3">
            <ActivityPanel
              activity={currentActivity}
              history={activityHistory}
              workspaceZone={currentWorkspaceZone}
            />
            <ExperimentContext
              selectedExperiment={selectedExperiment}
              onSelectExperiment={setSelectedExperiment}
            />
            <ContextAssistance
              selectedExperiment={selectedExperiment}
              currentActivity={currentActivity}
              trackingStatus={currentActivity?.trackingState || 'ACTIVE'}
              workspaceZone={currentWorkspaceZone}
              isDismissed={isAssistanceDismissed}
              onAskAstra={handleAskAstra}
              onDismiss={handleDismissAssistance}
            />
            <VoiceAssistant
              currentActivity={currentActivity}
              selectedExperiment={selectedExperiment}
              procedureState={procedureState}
              groundSupportStatus={groundSupportState.status}
              trackingStatus={currentActivity?.trackingState || 'ACTIVE'}
              poseStatus={currentActivity?.poseState || 'ACTIVE'}
              cameraStatus="LIVE"
              workspaceZone={currentWorkspaceZone}
              onRequestGroundSupport={handleGroundSupportRequest}
              onCancelGroundSupport={handleGroundSupportCancel}
              onRecordInteraction={handleRecordInteraction}
              externalQueryTrigger={externalQueryTrigger}
              onAssistantStateChange={setObservedAssistantState}
            />
          </div>
        </div>

        {/* Ground Support Tab View */}
        {activeTab === 'ground-support' && (
          <GroundSupport
            currentActivity={currentActivity}
            selectedExperiment={selectedExperiment}
            procedureState={procedureState}
            groundSupportState={groundSupportState}
            assistantHistory={assistantHistory}
            workspaceZone={currentWorkspaceZone}
            onAcknowledge={handleGroundSupportAcknowledge}
            onResolve={handleGroundSupportResolve}
            onCancel={handleGroundSupportCancel}
            onReturnToOperations={() => setActiveTab('operations')}
          />
        )}

        {/* Session Screen Tab View */}
        {activeTab === 'session' && (
          <SessionScreen
            events={sessionEvents}
            selectedExperiment={selectedExperiment}
            onClearTrace={handleClearSessionTrace}
            onNewSession={handleNewSession}
            onReturnToOperations={() => setActiveTab('operations')}
          />
        )}

        {/* Settings — Engineering Validation Panel */}
        {activeTab === 'settings' && (
          <ValidationModule
            currentActivity={currentActivity}
            selectedExperiment={selectedExperiment}
            groundSupportStatus={groundSupportState.status}
            assistantHistory={assistantHistory}
            sessionEvents={sessionEvents}
            assistantState={observedAssistantState}
            workspaceZone={currentWorkspaceZone}
            onReturnToOperations={() => setActiveTab('operations')}
          />
        )}
      </main>
    </div>
  );
};

export default App;
