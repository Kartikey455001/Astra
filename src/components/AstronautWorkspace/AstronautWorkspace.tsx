import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Camera, Radio, Target, Activity, Hand } from 'lucide-react';
import type {
  CameraFeedStatus,
  AstronautTrackingStatus,
  PoseEstimationStatus,
  HandWorkspaceState,
  Detection,
  PoseKeypoint,
  InteractionState,
  ActivityResult,
} from '../../types/astra';

import { WORKSPACE_ZONES } from '../../utils/workspaceZones';

interface AstronautWorkspaceProps {
  className?: string;
  feedSource?: string;
  videoRef?: React.RefObject<HTMLVideoElement | null>;
  currentWorkspaceZone?: string;
  onStatusChange?: (status: CameraFeedStatus) => void;
  onDetectionsChange?: (detections: Detection[]) => void;
  onInteractionChange?: (interaction: InteractionState) => void;
  onActivityChange?: (activity: ActivityResult) => void;
}

// Standard COCO 17 limb connections (joint index pairs)
const SKELETON_LIMBS: [number, number][] = [
  [0, 1], [0, 2],        // Nose to eyes
  [1, 3], [2, 4],        // Eyes to ears
  [5, 6],                // Left shoulder to right shoulder
  [5, 7], [7, 9],        // Left arm: shoulder -> elbow -> wrist
  [6, 8], [8, 10],       // Right arm: shoulder -> elbow -> wrist
  [5, 11], [6, 12],      // Torso sides: shoulders to hips
  [11, 12],              // Left hip to right hip
  [11, 13], [13, 15],    // Left leg: hip -> knee -> ankle
  [12, 14], [14, 16],    // Right leg: hip -> knee -> ankle
];

const KEYPOINT_CONF_THRESHOLD = 0.40;

export const AstronautWorkspace: React.FC<AstronautWorkspaceProps> = ({
  className = '',
  feedSource = '/experiment.mp4',
  videoRef,
  currentWorkspaceZone = 'NO SPECIFIC ZONE',
  onStatusChange,
  onDetectionsChange,
  onInteractionChange,
  onActivityChange,
}) => {
  const [cameraStatus, setCameraStatus] = useState<CameraFeedStatus>('INITIALIZING');
  const [trackingStatus, setTrackingStatus] = useState<AstronautTrackingStatus>('INITIALIZING');
  const [poseStatus, setPoseStatus] = useState<PoseEstimationStatus>('INITIALIZING');
  const [interactionState, setInteractionState] = useState<InteractionState | null>(null);
  const [detections, setDetections] = useState<Detection[]>([]);
  const [autoplayBlocked, setAutoplayBlocked] = useState<boolean>(false);
  const [videoBox, setVideoBox] = useState<{ width: number; height: number; offsetX: number; offsetY: number }>({
    width: 0,
    height: 0,
    offsetX: 0,
    offsetY: 0,
  });

  const onActivityChangeRef = useRef(onActivityChange);
  const onInteractionChangeRef = useRef(onInteractionChange);
  const onDetectionsChangeRef = useRef(onDetectionsChange);

  useEffect(() => {
    onActivityChangeRef.current = onActivityChange;
  }, [onActivityChange]);

  useEffect(() => {
    onInteractionChangeRef.current = onInteractionChange;
  }, [onInteractionChange]);

  useEffect(() => {
    onDetectionsChangeRef.current = onDetectionsChange;
  }, [onDetectionsChange]);

  const internalVideoRef = useRef<HTMLVideoElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const offscreenCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const isInferencingRef = useRef<boolean>(false);

  const activeVideoRef = videoRef || internalVideoRef;

  const updateStatus = useCallback((status: CameraFeedStatus) => {
    setCameraStatus(status);
    if (onStatusChange) {
      onStatusChange(status);
    }
  }, [onStatusChange]);

  // Compute video content bounds within container (handling object-fit: contain)
  const updateVideoBounds = useCallback(() => {
    const container = containerRef.current;
    const video = activeVideoRef.current;
    if (!container || !video) return;

    const containerW = container.clientWidth;
    const containerH = container.clientHeight;
    if (containerW === 0 || containerH === 0) return;

    const videoW = video.videoWidth || 768;
    const videoH = video.videoHeight || 432;
    const videoAspect = videoW / videoH;
    const containerAspect = containerW / containerH;

    let renderW = 0;
    let renderH = 0;
    let offsetX = 0;
    let offsetY = 0;

    if (containerAspect > videoAspect) {
      // Pillarbox (bars on left/right)
      renderH = containerH;
      renderW = containerH * videoAspect;
      offsetX = (containerW - renderW) / 2;
      offsetY = 0;
    } else {
      // Letterbox (bars top/bottom)
      renderW = containerW;
      renderH = containerW / videoAspect;
      offsetX = 0;
      offsetY = (containerH - renderH) / 2;
    }

    setVideoBox({ width: renderW, height: renderH, offsetX, offsetY });
  }, [activeVideoRef]);

  useEffect(() => {
    window.addEventListener('resize', updateVideoBounds);
    return () => window.removeEventListener('resize', updateVideoBounds);
  }, [updateVideoBounds]);

  // Service health monitoring
  useEffect(() => {
    const checkServiceHealth = async () => {
      try {
        const res = await fetch('http://127.0.0.1:8000/health');
        if (res.ok) {
          setTrackingStatus((prev) => (prev === 'OFFLINE' || prev === 'INITIALIZING' ? 'NO TARGET' : prev));
          setPoseStatus((prev) => (prev === 'OFFLINE' || prev === 'INITIALIZING' ? 'NO TARGET' : prev));
        } else {
          setTrackingStatus('OFFLINE');
          setPoseStatus('OFFLINE');
          setInteractionState(null);
        }
      } catch {
        setTrackingStatus('OFFLINE');
        setPoseStatus('OFFLINE');
        setInteractionState(null);
      }
    };

    checkServiceHealth();
    const healthInterval = setInterval(checkServiceHealth, 4000);
    return () => clearInterval(healthInterval);
  }, []);

  // Video element playback event listeners
  useEffect(() => {
    const video = activeVideoRef.current;
    if (!video) return;

    const handlePlay = () => {
      setAutoplayBlocked(false);
      updateStatus('LIVE');
      updateVideoBounds();
    };

    const handleWaiting = () => {
      updateStatus('INITIALIZING');
    };

    const handleError = () => {
      updateStatus('OFFLINE');
    };

    video.addEventListener('playing', handlePlay);
    video.addEventListener('waiting', handleWaiting);
    video.addEventListener('error', handleError);
    video.addEventListener('loadedmetadata', updateVideoBounds);

    const startFeed = async () => {
      try {
        await video.play();
        setAutoplayBlocked(false);
        updateStatus('LIVE');
        updateVideoBounds();
      } catch {
        setAutoplayBlocked(true);
        updateStatus('INITIALIZING');
      }
    };

    startFeed();

    return () => {
      video.removeEventListener('playing', handlePlay);
      video.removeEventListener('waiting', handleWaiting);
      video.removeEventListener('error', handleError);
      video.removeEventListener('loadedmetadata', updateVideoBounds);
    };
  }, [activeVideoRef, feedSource, updateStatus, updateVideoBounds]);

  // Frame sampling, Pose, and Workspace Interaction loop (~350ms interval)
  useEffect(() => {
    if (cameraStatus !== 'LIVE') return;

    if (!offscreenCanvasRef.current) {
      offscreenCanvasRef.current = document.createElement('canvas');
      offscreenCanvasRef.current.width = 480;
      offscreenCanvasRef.current.height = 270;
    }

    const intervalId = setInterval(async () => {
      const video = activeVideoRef.current;
      const canvas = offscreenCanvasRef.current;
      if (!video || !canvas || video.paused || video.ended || isInferencingRef.current) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Draw current video frame to scaled offscreen canvas
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const currentTime = video.currentTime;

      canvas.toBlob(async (blob) => {
        if (!blob) return;

        isInferencingRef.current = true;
        const formData = new FormData();
        formData.append('file', blob, 'frame.jpg');
        formData.append('timestamp', currentTime.toString());

        try {
          const response = await fetch('http://127.0.0.1:8000/detect', {
            method: 'POST',
            body: formData,
          });

          if (response.ok) {
            const data = await response.json();
            if (data.status === 'success') {
              if (Array.isArray(data.detections) && data.detections.length > 0) {
                setDetections(data.detections);
              } else {
                setDetections([]);
              }

              if (data.activity?.trackingState) {
                setTrackingStatus(data.activity.trackingState);
              } else if (Array.isArray(data.detections) && data.detections.length > 0) {
                setTrackingStatus('ACTIVE');
              } else {
                setTrackingStatus('NO TARGET');
              }

              if (data.activity?.poseState) {
                setPoseStatus(data.activity.poseState);
              } else if (Array.isArray(data.detections) && data.detections.length > 0) {
                setPoseStatus('ACTIVE');
              } else {
                setPoseStatus('NO TARGET');
              }

              if (data.interaction) {
                setInteractionState(data.interaction);
                if (onInteractionChangeRef.current) {
                  onInteractionChangeRef.current(data.interaction);
                }
              }

              if (data.activity && onActivityChangeRef.current) {
                onActivityChangeRef.current(data.activity);
              }

              if (onDetectionsChangeRef.current) {
                onDetectionsChangeRef.current(data.detections);
              }
            }
          } else {
            setTrackingStatus('OFFLINE');
            setPoseStatus('OFFLINE');
          }
        } catch {
          setTrackingStatus('OFFLINE');
          setPoseStatus('OFFLINE');
          setDetections([]);
          setInteractionState(null);
        } finally {
          isInferencingRef.current = false;
        }
      }, 'image/jpeg', 0.85);
    }, 350);

    return () => clearInterval(intervalId);
  }, [cameraStatus, activeVideoRef, onDetectionsChange, onInteractionChange]);

  const handleActivateFeed = async () => {
    const video = activeVideoRef.current;
    if (!video) return;
    try {
      await video.play();
      setAutoplayBlocked(false);
      updateStatus('LIVE');
    } catch {
      updateStatus('OFFLINE');
    }
  };

  const getCameraBadge = () => {
    switch (cameraStatus) {
      case 'LIVE':
        return (
          <div className="flex items-center gap-1.5 font-mono text-xs text-emerald-400 font-semibold">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>LIVE</span>
          </div>
        );
      case 'INITIALIZING':
        return (
          <div className="flex items-center gap-1.5 font-mono text-xs text-amber-400 font-medium">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
            <span>INITIALIZING</span>
          </div>
        );
      case 'OFFLINE':
      default:
        return (
          <div className="flex items-center gap-1.5 font-mono text-xs text-rose-400 font-medium">
            <span className="w-2 h-2 rounded-full bg-rose-500"></span>
            <span>OFFLINE</span>
          </div>
        );
    }
  };

  const getStatusBadge = (status: AstronautTrackingStatus | PoseEstimationStatus) => {
    switch (status) {
      case 'ACTIVE':
        return {
          text: 'text-emerald-400',
          dot: 'bg-emerald-400 animate-pulse',
          label: 'ACTIVE',
        };
      case 'SEARCHING':
        return {
          text: 'text-amber-400',
          dot: 'bg-amber-400 animate-pulse',
          label: 'SEARCHING',
        };
      case 'DEGRADED':
        return {
          text: 'text-amber-400',
          dot: 'bg-amber-400',
          label: 'DEGRADED',
        };
      case 'NO TARGET':
        return {
          text: 'text-slate-400',
          dot: 'bg-slate-500',
          label: 'NO TARGET',
        };
      case 'INITIALIZING':
        return {
          text: 'text-amber-300',
          dot: 'bg-amber-300 animate-pulse',
          label: 'INITIALIZING',
        };
      case 'OFFLINE':
      default:
        return {
          text: 'text-slate-500',
          dot: 'bg-slate-600',
          label: 'OFFLINE',
        };
    }
  };

  const getInteractionBadge = (state: HandWorkspaceState | undefined) => {
    if (!state || trackingStatus === 'OFFLINE') {
      return {
        text: 'text-slate-500',
        dot: 'bg-slate-600',
        label: 'NONE',
      };
    }

    switch (state) {
      case 'HAND_IN_WORKSPACE':
      case 'BOTH_HANDS_IN_WORKSPACE':
        return {
          text: 'text-emerald-400',
          dot: 'bg-emerald-400 animate-pulse',
          label: 'ACTIVE',
        };
      case 'APPROACHING':
      case 'LEAVING':
        return {
          text: 'text-amber-400',
          dot: 'bg-amber-400',
          label: 'APPROACHING',
        };
      case 'NO_INTERACTION':
      default:
        return {
          text: 'text-slate-400',
          dot: 'bg-slate-600',
          label: 'NONE',
        };
    }
  };

  const trackingBadge = getStatusBadge(trackingStatus);
  const poseBadge = getStatusBadge(poseStatus);
  const interactionBadge = getInteractionBadge(interactionState?.state);

  const isWorkspaceActive =
    interactionState?.state === 'HAND_IN_WORKSPACE' ||
    interactionState?.state === 'BOTH_HANDS_IN_WORKSPACE';

  const defaultRoi = { x: 0.20, y: 0.38, width: 0.52, height: 0.54 };
  const roi = interactionState?.roi || defaultRoi;

  return (
    <section
      className={`flex flex-col bg-[#0b1018] border border-[#1b2535] rounded overflow-hidden shadow-sm ${className}`}
      aria-label="Astronaut Workspace"
    >
      {/* Workspace Panel Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-[#0e1522] border-b border-[#1b2535] select-none">
        <div className="flex items-center gap-2">
          <Camera className="w-3.5 h-3.5 text-slate-400" />
          <h2 className="font-mono text-xs font-bold tracking-wider text-slate-200">
            ASTRONAUT WORKSPACE
          </h2>
        </div>

        {/* Right Header Status Indicators */}
        <div className="flex items-center gap-3 sm:gap-4">
          {/* Workspace Interaction Indicator */}
          <div className="flex items-center gap-1.5 font-mono text-xs">
            <Hand className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-400 hidden xl:inline">WORKSPACE INTERACTION</span>
            <span className={`flex items-center gap-1 font-semibold ${interactionBadge.text}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${interactionBadge.dot}`}></span>
              {interactionBadge.label}
            </span>
          </div>

          <div className="h-3 w-px bg-slate-800 hidden sm:block"></div>

          {/* Astronaut Tracking Indicator */}
          <div className="flex items-center gap-1.5 font-mono text-xs">
            <Target className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-400 hidden md:inline">ASTRONAUT TRACKING</span>
            <span className={`flex items-center gap-1 font-semibold ${trackingBadge.text}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${trackingBadge.dot}`}></span>
              {trackingBadge.label}
            </span>
          </div>

          <div className="h-3 w-px bg-slate-800 hidden sm:block"></div>

          {/* Pose Estimation Indicator */}
          <div className="flex items-center gap-1.5 font-mono text-xs">
            <Activity className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-400 hidden md:inline">POSE ESTIMATION</span>
            <span className={`flex items-center gap-1 font-semibold ${poseBadge.text}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${poseBadge.dot}`}></span>
              {poseBadge.label}
            </span>
          </div>

          <div className="h-3 w-px bg-slate-800"></div>

          {/* Camera 01 Status */}
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs text-slate-400">CAMERA 01</span>
            {getCameraBadge()}
          </div>
        </div>
      </div>

      {/* Main Continuous Live Camera Viewport */}
      <div
        ref={containerRef}
        className="relative flex-1 w-full bg-[#05080e] flex items-center justify-center overflow-hidden min-h-[420px] lg:min-h-[540px]"
      >
        {/* Continuous simulated live camera stream from fixed payload camera */}
        <video
          ref={activeVideoRef}
          src={feedSource}
          autoPlay
          loop
          muted
          playsInline
          className="w-full h-full object-contain pointer-events-none select-none"
        />

        {/* Technical Computer-Vision Detection, 2D Pose & Workspace ROI Overlay Layer */}
        {videoBox.width > 0 && (
          <div
            className="absolute pointer-events-none select-none"
            style={{
              left: `${videoBox.offsetX}px`,
              top: `${videoBox.offsetY}px`,
              width: `${videoBox.width}px`,
              height: `${videoBox.height}px`,
            }}
          >
            {/* Experiment Workspace Region of Interest (ROI) Overlay */}
            <div
              className={`absolute transition-all duration-300 ${
                isWorkspaceActive
                  ? 'border border-emerald-400/70 bg-emerald-500/5'
                  : 'border border-dashed border-sky-500/35'
              }`}
              style={{
                left: `${roi.x * videoBox.width}px`,
                top: `${roi.y * videoBox.height}px`,
                width: `${roi.width * videoBox.width}px`,
                height: `${roi.height * videoBox.height}px`,
              }}
            >
              {/* ROI Corner Accents */}
              <div className="absolute -top-1 -left-1 w-2 h-2 border-t-2 border-l-2 border-sky-400/80"></div>
              <div className="absolute -top-1 -right-1 w-2 h-2 border-t-2 border-r-2 border-sky-400/80"></div>
              <div className="absolute -bottom-1 -left-1 w-2 h-2 border-b-2 border-l-2 border-sky-400/80"></div>
              <div className="absolute -bottom-1 -right-1 w-2 h-2 border-b-2 border-r-2 border-sky-400/80"></div>

              {/* Minimal Technical Label Tag */}
              <div
                className={`absolute -top-4 right-2 px-1.5 py-0.2 rounded font-mono text-[9px] tracking-wider transition-colors ${
                  isWorkspaceActive
                    ? 'bg-emerald-950/90 border border-emerald-500/80 text-emerald-300'
                    : 'bg-[#09121f]/90 border border-slate-700/80 text-slate-400'
                }`}
              >
                EXPERIMENT WORKSPACE
              </div>
            </div>

            {/* Configured Experiment Workspace Zones (Part 13 Spatial Grounding) */}
            {WORKSPACE_ZONES.map((zone) => {
              const isZoneActive = currentWorkspaceZone === zone.name;
              return (
                <div
                  key={`zone-${zone.id}`}
                  className={`absolute transition-all duration-300 pointer-events-none ${
                    isZoneActive
                      ? 'border border-sky-400/70 bg-sky-500/10'
                      : 'border border-dashed border-slate-500/25'
                  }`}
                  style={{
                    left: `${zone.roi.x * videoBox.width}px`,
                    top: `${zone.roi.y * videoBox.height}px`,
                    width: `${zone.roi.width * videoBox.width}px`,
                    height: `${zone.roi.height * videoBox.height}px`,
                  }}
                >
                  <div
                    className={`absolute -top-3.5 left-1 px-1 py-0.2 rounded font-mono text-[8px] tracking-wider transition-colors select-none ${
                      isZoneActive
                        ? 'bg-sky-950/90 border border-sky-500/80 text-sky-300'
                        : 'bg-[#09101a]/80 border border-slate-700/50 text-slate-500'
                    }`}
                  >
                    {zone.name}
                  </div>
                </div>
              );
            })}

            {/* SVG Layer for 2D Skeleton Limbs and Keypoints */}
            {poseStatus === 'ACTIVE' && detections.length > 0 && (
              <svg
                className="absolute inset-0 w-full h-full pointer-events-none"
                viewBox={`0 0 ${videoBox.width} ${videoBox.height}`}
              >
                {detections.map((det) => {
                  if (!det.keypoints || det.keypoints.length === 0) return null;

                  const kpts = det.keypoints;

                  return (
                    <g key={`pose-${det.trackId}`}>
                      {/* Render Connecting Limbs / Bones */}
                      {SKELETON_LIMBS.map(([p1Idx, p2Idx]) => {
                        const p1: PoseKeypoint | undefined = kpts[p1Idx];
                        const p2: PoseKeypoint | undefined = kpts[p2Idx];

                        if (
                          !p1 ||
                          !p2 ||
                          p1.confidence < KEYPOINT_CONF_THRESHOLD ||
                          p2.confidence < KEYPOINT_CONF_THRESHOLD
                        ) {
                          return null;
                        }

                        const x1 = p1.x * videoBox.width;
                        const y1 = p1.y * videoBox.height;
                        const x2 = p2.x * videoBox.width;
                        const y2 = p2.y * videoBox.height;

                        return (
                          <line
                            key={`limb-${p1Idx}-${p2Idx}`}
                            x1={x1}
                            y1={y1}
                            x2={x2}
                            y2={y2}
                            stroke="#38bdf8"
                            strokeWidth="1.5"
                            strokeOpacity="0.85"
                            strokeLinecap="round"
                          />
                        );
                      })}

                      {/* Render Anatomical Keypoint Joints */}
                      {kpts.map((kpt, kIdx) => {
                        if (kpt.confidence < KEYPOINT_CONF_THRESHOLD) return null;

                        const cx = kpt.x * videoBox.width;
                        const cy = kpt.y * videoBox.height;
                        const isWrist = kIdx === 9 || kIdx === 10;

                        return (
                          <g key={`joint-${kIdx}`}>
                            <circle
                              cx={cx}
                              cy={cy}
                              r={isWrist ? '3.5' : '2.5'}
                              fill={isWrist && isWorkspaceActive ? '#10b981' : '#0284c7'}
                              stroke={isWrist && isWorkspaceActive ? '#6ee7b7' : '#7dd3fc'}
                              strokeWidth={isWrist ? '1.5' : '1'}
                            />
                          </g>
                        );
                      })}
                    </g>
                  );
                })}
              </svg>
            )}

            {/* Subtle Bounding Box Layer */}
            {trackingStatus === 'ACTIVE' &&
              detections.map((det, index) => {
                const boxLeft = det.x * videoBox.width;
                const boxTop = det.y * videoBox.height;
                const boxWidth = det.width * videoBox.width;
                const boxHeight = det.height * videoBox.height;

                return (
                  <div
                    key={`track-${det.trackId}-${index}`}
                    className="absolute transition-all duration-150 ease-out"
                    style={{
                      left: `${boxLeft}px`,
                      top: `${boxTop}px`,
                      width: `${boxWidth}px`,
                      height: `${boxHeight}px`,
                    }}
                  >
                    {/* Technical Subtle Bounding Box Border */}
                    <div className="w-full h-full border border-sky-400/50 relative shadow-xs">
                      <div className="absolute -top-1 -left-1 w-2 h-2 border-t border-l border-sky-300"></div>
                      <div className="absolute -top-1 -right-1 w-2 h-2 border-t border-r border-sky-300"></div>
                      <div className="absolute -bottom-1 -left-1 w-2 h-2 border-b border-l border-sky-300"></div>
                      <div className="absolute -bottom-1 -right-1 w-2 h-2 border-b border-r border-sky-300"></div>
                    </div>

                    {/* Discrete Monospace Detection Label Tag */}
                    <div className="absolute -top-5 left-0 bg-[#09121f]/95 border border-sky-500/80 px-1.5 py-0.5 rounded text-[10px] font-mono text-sky-200 tracking-wider flex items-center gap-1.5 whitespace-nowrap shadow-sm">
                      <span className="font-semibold">ASTRONAUT</span>
                      <span className="text-slate-400">•</span>
                      <span className="text-sky-300 font-normal">TRACKING</span>
                    </div>
                  </div>
                );
              })}
          </div>
        )}

        {/* Autoplay fallback prompt if browser policy blocks autonomous playback */}
        {autoplayBlocked && (
          <div className="absolute inset-0 bg-[#070b13]/85 flex flex-col items-center justify-center p-6 text-center z-20">
            <div className="w-12 h-12 rounded-full bg-[#101826] border border-[#1d2a40] flex items-center justify-center mb-3 text-slate-300">
              <Radio className="w-5 h-5 text-sky-400 animate-pulse" />
            </div>
            <div className="font-mono text-xs font-semibold tracking-wider text-slate-200 uppercase mb-1">
              CAMERA 01 STANDBY
            </div>
            <p className="text-xs text-slate-400 font-sans mb-4">
              Payload camera feed awaiting initial authorization.
            </p>
            <button
              type="button"
              onClick={handleActivateFeed}
              className="px-4 py-2 rounded bg-sky-600 hover:bg-sky-500 text-white font-mono text-xs font-semibold tracking-wider transition-colors cursor-pointer border border-sky-400"
            >
              ACTIVATE CAMERA FEED
            </button>
          </div>
        )}
      </div>
    </section>
  );
};
