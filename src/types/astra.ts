export type NavTab = 'operations' | 'session' | 'ground-support' | 'settings';

export type SystemHealthStatus = 'READY' | 'ACTIVE' | 'STANDBY';

export type CameraFeedStatus = 'INITIALIZING' | 'LIVE' | 'OFFLINE';

export type AstronautTrackingStatus = 'ACTIVE' | 'SEARCHING' | 'NO TARGET' | 'INITIALIZING' | 'OFFLINE';

export type PoseEstimationStatus = 'ACTIVE' | 'DEGRADED' | 'NO TARGET' | 'INITIALIZING' | 'OFFLINE';

export type HandWorkspaceState =
  | 'NO_INTERACTION'
  | 'APPROACHING'
  | 'HAND_IN_WORKSPACE'
  | 'BOTH_HANDS_IN_WORKSPACE'
  | 'LEAVING';

export interface HandPoint {
  x: number;
  y: number;
  insideWorkspace: boolean;
  confidence: number;
  available: boolean;
}

export interface WorkspaceRoi {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface InteractionState {
  state: HandWorkspaceState;
  raw_state?: string;
  roi: WorkspaceRoi;
  leftHand: HandPoint;
  rightHand: HandPoint;
  timestamp: number;
}

export interface ActivityResult {
  activity: string;
  state?: 'ACTIVE' | 'STANDBY' | 'SEARCHING';
  duration: number;
  description: string;
  timestamp: number;
  trackingState?: AstronautTrackingStatus;
  poseState?: PoseEstimationStatus;
}

export interface ActivityHistoryItem {
  id: string;
  activity: string;
  timestamp: string;
  duration?: number;
}

export interface PoseKeypoint {
  name: string;
  x: number;      // normalized 0..1 relative to video content width
  y: number;      // normalized 0..1 relative to video content height
  confidence: number;
}

export interface AstronautPose {
  trackId: number;
  keypoints: PoseKeypoint[];
  timestamp: number;
}

export interface Detection {
  trackId: number;
  className: string;
  confidence: number;
  x: number;      // normalized 0..1 relative to video content width
  y: number;      // normalized 0..1 relative to video content height
  width: number;  // normalized 0..1 relative to video content width
  height: number; // normalized 0..1 relative to video content height
  timestamp: number;
  raw_bbox?: number[];
  keypoints?: PoseKeypoint[];
  inferenceMs?: number;
}

export interface SystemStateData {
  localProcessing: SystemHealthStatus;
  voiceAssistance: SystemHealthStatus;
  cameraStatus: CameraFeedStatus;
  astronautTracking: AstronautTrackingStatus;
  poseEstimation: PoseEstimationStatus;
  workspaceInteraction: HandWorkspaceState;
}

export interface DemoProcedureStage {
  stageNumber: number;
  title: string;
  description: string;
}

export interface ProcedureItem {
  id: string;
  stepNumber: number;
  title: string;
  instruction: string;
  requiredContext?: string;
  confirmation?: string;
}

export type ProcedureStatus = 'NOT_STARTED' | 'ACTIVE' | 'PAUSED' | 'COMPLETED';

export interface ProcedureState {
  experimentId: string | null;
  currentStage: number | null;
  currentStepIndex?: number;
  status: ProcedureStatus;
  completedStages: number[];
}

export interface ExperimentProfile {
  id: string;
  name: string;
  mission?: string;
  environment?: string;
  astronaut?: string;
  payload?: string;
  camera: string;
  description: string;
  objective?: string;
  documentedActivities?: string[];
  demoProcedure?: DemoProcedureStage[];
  procedure?: ProcedureItem[];
}

export type ContextStatus = 'NOT SET' | 'READY';

export interface ExperimentContextData {
  experiment: string;
  mission?: string;
  environment?: string;
  payload?: string;
  session: string;
  camera?: string;
  contextStatus?: ContextStatus;
}

export type GroundSupportStatus = 'NO_REQUEST' | 'REQUESTED' | 'ACKNOWLEDGED' | 'RESOLVED' | 'CANCELLED';

export interface GroundSupportSnapshot {
  activity: string;
  experiment: string;
  mission: string;
  environment?: string;
  camera: string;
  procedureStage?: string;
  workspaceZone?: string;
  requestReason: string;
  timestamp: string;
}

export interface GroundSupportState {
  status: GroundSupportStatus;
  snapshot: GroundSupportSnapshot | null;
}

export interface AssistantInteraction {
  id: string;
  query: string;
  response: string;
  timestamp: string;
}

export interface CurrentActivityData {
  status: string;
  subText: string;
}

export type ZoneStatus = 'NO_ZONE' | 'IN_ZONE' | 'TRANSITIONING' | 'UNAVAILABLE';

export interface WorkspaceZone {
  id: string;
  name: string;
  description: string;
  roi: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export interface WorkspaceZoneState {
  currentZone: string;
  status: ZoneStatus;
  zoneId?: string;
  confidence?: number;
}

export type AssistanceState =
  | 'NO_ASSISTANCE'
  | 'ASSISTANCE_AVAILABLE'
  | 'ASSISTANCE_ACTIVE'
  | 'ASSISTANCE_PAUSED';

export interface AssistanceContextInfo {
  state: AssistanceState;
  title: string;
  experimentName?: string;
  relevantKnowledge?: string;
  reason?: string;
  promptText?: string;
  suggestedQuery?: string;
}

export type SessionEventType =
  | 'SESSION_STARTED'
  | 'EXPERIMENT_CONTEXT_SELECTED'
  | 'ACTIVITY_CHANGED'
  | 'WORKSPACE_ZONE_CHANGED'
  | 'ASSISTANT_QUERY'
  | 'ASSISTANT_RESPONSE'
  | 'ASSISTANCE_AVAILABLE'
  | 'GROUND_SUPPORT_REQUESTED'
  | 'GROUND_SUPPORT_ACKNOWLEDGED'
  | 'GROUND_SUPPORT_RESOLVED'
  | 'GROUND_SUPPORT_CANCELLED'
  | 'PROCEDURE_CONTEXT_VIEWED'
  | 'SESSION_ENDED';

export type SessionEventCategory =
  | 'ALL'
  | 'ACTIVITY'
  | 'ASSISTANT'
  | 'GROUND_SUPPORT'
  | 'SYSTEM';

export interface SessionTraceEvent {
  id: string;
  timestamp: string;
  type: SessionEventType;
  category: SessionEventCategory;
  summary: string;
  details?: string;
  metadata?: {
    experiment?: string;
    mission?: string;
    environment?: string;
    camera?: string;
    activity?: string;
    previousActivity?: string;
    reason?: string;
    query?: string;
    response?: string;
  };
}
