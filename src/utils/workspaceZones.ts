import type {
  Detection,
  AstronautTrackingStatus,
  WorkspaceZone,
  WorkspaceZoneState,
} from '../types/astra';

/**
 * Predefined spatial regions for the Cytoskeleton fixed-camera demonstration.
 * These are configured spatial context zones in normalized coordinates (0..1),
 * NOT claims of automated scientific instrument or equipment recognition.
 */
export const WORKSPACE_ZONES: WorkspaceZone[] = [
  {
    id: 'preparation-area',
    name: 'PREPARATION AREA',
    description: 'Configured workspace region for preparation activities',
    roi: { x: 0.16, y: 0.52, width: 0.28, height: 0.42 },
  },
  {
    id: 'experiment-work-area',
    name: 'EXPERIMENT WORK AREA',
    description: 'Configured primary experiment operational workspace',
    roi: { x: 0.22, y: 0.35, width: 0.32, height: 0.38 },
  },
  {
    id: 'equipment-storage-area',
    name: 'EQUIPMENT / STORAGE AREA',
    description: 'Configured module storage and equipment access zone',
    roi: { x: 0.55, y: 0.20, width: 0.35, height: 0.55 },
  },
];

/**
 * Broader operational boundary for the experiment workspace table/area.
 */
export const BROADER_WORKSPACE_ROI = {
  x: 0.18,
  y: 0.35,
  width: 0.55,
  height: 0.58,
};

/**
 * Evaluates the astronaut's physical interaction point relative to configured workspace zones.
 * Uses wrist keypoints when available, falling back to upper body / bounding box position.
 */
export function evaluateWorkspaceZone(
  detections: Detection[],
  trackingStatus: AstronautTrackingStatus
): {
  zone: string;
  status: WorkspaceZoneState['status'];
  matchedZone: WorkspaceZone | null;
  point: { x: number; y: number } | null;
} {
  // If tracking is lost or astronaut is not visible, zone is unavailable
  if (
    trackingStatus !== 'ACTIVE' ||
    !detections ||
    detections.length === 0
  ) {
    return {
      zone: 'UNAVAILABLE',
      status: 'UNAVAILABLE',
      matchedZone: null,
      point: null,
    };
  }

  const primaryDet = detections[0];
  const kpts = primaryDet.keypoints || [];

  let leftWrist = kpts.find((k) => k.name === 'left_wrist' && k.confidence >= 0.35);
  let rightWrist = kpts.find((k) => k.name === 'right_wrist' && k.confidence >= 0.35);

  let pointX: number;
  let pointY: number;

  if (leftWrist && rightWrist) {
    pointX = (leftWrist.x + rightWrist.x) / 2;
    pointY = (leftWrist.y + rightWrist.y) / 2;
  } else if (rightWrist) {
    pointX = rightWrist.x;
    pointY = rightWrist.y;
  } else if (leftWrist) {
    pointX = leftWrist.x;
    pointY = leftWrist.y;
  } else {
    // Fallback to upper-torso / hands anticipation point from bounding box
    pointX = primaryDet.x + primaryDet.width * 0.65;
    pointY = primaryDet.y + primaryDet.height * 0.55;
  }

  // Check which configured zone contains the interaction point
  for (const zone of WORKSPACE_ZONES) {
    const rx = zone.roi.x;
    const ry = zone.roi.y;
    const rw = zone.roi.width;
    const rh = zone.roi.height;

    if (pointX >= rx && pointX <= rx + rw && pointY >= ry && pointY <= ry + rh) {
      return {
        zone: zone.name,
        status: 'IN_ZONE',
        matchedZone: zone,
        point: { x: pointX, y: pointY },
      };
    }
  }

  // If inside broader workspace table but not a specific sub-zone
  const bx = BROADER_WORKSPACE_ROI.x;
  const by = BROADER_WORKSPACE_ROI.y;
  const bw = BROADER_WORKSPACE_ROI.width;
  const bh = BROADER_WORKSPACE_ROI.height;

  if (pointX >= bx && pointX <= bx + bw && pointY >= by && pointY <= by + bh) {
    return {
      zone: 'EXPERIMENT WORK AREA',
      status: 'IN_ZONE',
      matchedZone: WORKSPACE_ZONES[1],
      point: { x: pointX, y: pointY },
    };
  }

  return {
    zone: 'NO SPECIFIC ZONE',
    status: 'NO_ZONE',
    matchedZone: null,
    point: { x: pointX, y: pointY },
  };
}
