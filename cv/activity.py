import time
import math
import logging
from collections import deque
from typing import List, Dict, Any, Optional

# Diagnostic debug logger
logger = logging.getLogger("astra.har")
if not logger.handlers:
    ch = logging.StreamHandler()
    ch.setLevel(logging.INFO)
    formatter = logging.Formatter("[HAR %(asctime)s] %(message)s", datefmt="%H:%M:%S")
    ch.setFormatter(formatter)
    logger.addHandler(ch)
logger.setLevel(logging.INFO)

# Configurable parameters
TEMPORAL_BUFFER_SIZE = 8
TRANSITION_EVIDENCE_FRAMES = 3
MIN_ACTIVITY_DURATION_SEC = 1.2
MISSED_DETECTION_GRACE_FRAMES = 4   # ~1.4 seconds at 350ms frame intervals
UNCERTAIN_CONFIRMATION_FRAMES = 5   # Must sustain ambiguity for 5 consecutive frames before declaring UNCERTAIN

WORKSPACE_ROI = {"x1": 0.20, "y1": 0.38, "x2": 0.72, "y2": 0.92}


class TemporalFeatureExtractor:
    def __init__(self, buffer_size: int = TEMPORAL_BUFFER_SIZE):
        self.buffer = deque(maxlen=buffer_size)

    def extract_centroid(self, keypoints: List[Dict[str, Any]]) -> Optional[Dict[str, float]]:
        coords = []
        target_names = {"left_shoulder", "right_shoulder", "left_hip", "right_hip"}
        for kpt in keypoints:
            if kpt.get("name") in target_names and kpt.get("confidence", 0) >= 0.35:
                coords.append((kpt["x"], kpt["y"]))
        if not coords:
            return None
        return {
            "x": sum(c[0] for c in coords) / len(coords),
            "y": sum(c[1] for c in coords) / len(coords),
        }

    def extract_wrists(self, keypoints: List[Dict[str, Any]]) -> Dict[str, Optional[Dict[str, Any]]]:
        left = None
        right = None
        for kpt in keypoints:
            name = kpt.get("name")
            if name == "left_wrist" and kpt.get("confidence", 0) >= 0.35:
                left = kpt
            elif name == "right_wrist" and kpt.get("confidence", 0) >= 0.35:
                right = kpt
        return {"left": left, "right": right}

    def compute_distance_to_workspace(self, centroid: Optional[Dict[str, float]]) -> float:
        if centroid is None:
            return 999.0
        cx, cy = centroid["x"], centroid["y"]
        dx = max(0.0, WORKSPACE_ROI["x1"] - cx, cx - WORKSPACE_ROI["x2"])
        dy = max(0.0, WORKSPACE_ROI["y1"] - cy, cy - WORKSPACE_ROI["y2"])
        return math.sqrt(dx * dx + dy * dy)

    def push(
        self,
        centroid: Optional[Dict[str, float]],
        wrists: Dict[str, Optional[Dict[str, Any]]],
        interaction_state: str,
        dist_workspace: float,
        timestamp: float,
        wall_time: float,
    ):
        self.buffer.append({
            "centroid": centroid,
            "wrists": wrists,
            "interaction_state": interaction_state,
            "dist_workspace": dist_workspace,
            "timestamp": timestamp,
            "wall_time": wall_time,
        })

    def compute_features(self) -> Dict[str, Any]:
        if len(self.buffer) < 2:
            return {
                "centroid_vel": 0.0,
                "wrist_vel": 0.0,
                "dist_delta": 0.0,
                "dist_workspace": 999.0,
                "workspace_ratio": 0.0,
                "latest_interaction": "NO_INTERACTION",
                "has_data": False,
            }

        recent_interactions = [f["interaction_state"] for f in self.buffer]
        workspace_in_count = sum(1 for s in recent_interactions if "WORKSPACE" in s)
        workspace_ratio = workspace_in_count / len(recent_interactions)

        # Centroid velocity across buffer
        valid_centroids = [f["centroid"] for f in self.buffer if f["centroid"] is not None]
        centroid_vel = 0.0
        if len(valid_centroids) >= 2:
            dx = valid_centroids[-1]["x"] - valid_centroids[0]["x"]
            dy = valid_centroids[-1]["y"] - valid_centroids[0]["y"]
            centroid_vel = math.sqrt(dx * dx + dy * dy)

        # Distance to workspace trend
        dist_history = [f["dist_workspace"] for f in self.buffer if f["dist_workspace"] < 900.0]
        dist_delta = 0.0
        cur_dist = dist_history[-1] if dist_history else 999.0
        if len(dist_history) >= 2:
            dist_delta = dist_history[-1] - dist_history[0]

        # Wrist displacement / velocity across buffer (tolerates single wrist occlusion)
        recent_wrists = [f["wrists"] for f in self.buffer]
        wrist_pts = []
        for w in recent_wrists:
            c = []
            if w["right"]:
                c.append((w["right"]["x"], w["right"]["y"]))
            elif w["left"]:
                c.append((w["left"]["x"], w["left"]["y"]))
            if c:
                wrist_pts.append(c[0])

        wrist_vel = 0.0
        if len(wrist_pts) >= 2:
            w_dx = wrist_pts[-1][0] - wrist_pts[0][0]
            w_dy = wrist_pts[-1][1] - wrist_pts[0][1]
            wrist_vel = math.sqrt(w_dx * w_dx + w_dy * w_dy)

        return {
            "centroid": valid_centroids[-1] if valid_centroids else None,
            "centroid_vel": centroid_vel,
            "wrist_vel": wrist_vel,
            "dist_delta": dist_delta,
            "dist_workspace": cur_dist,
            "workspace_ratio": workspace_ratio,
            "latest_interaction": recent_interactions[-1],
            "has_data": True,
        }


class TemporalActivityRecognizer:
    def __init__(self):
        self.feature_extractor = TemporalFeatureExtractor()
        self.current_activity = "AWAITING ACTIVITY"
        self.current_description = "System initialized. Monitoring camera feed for astronaut movement."
        self.activity_start_time = time.time()

        # Transition debouncing
        self.candidate_activity = None
        self.candidate_count = 0
        self.candidate_start_time = 0.0

        # Perception state counters
        self.missed_detection_count = 0
        self.uncertain_count = 0

    def update(
        self,
        detections: List[Dict[str, Any]],
        interaction: Dict[str, Any],
        timestamp: float = 0.0,
    ) -> Dict[str, Any]:
        now = time.time()
        astronaut_visible = len(detections) > 0
        interaction_state = interaction.get("state", "NO_INTERACTION")

        # ==========================================================
        # 1. PERCEPTION STATE EVALUATION (Separated from Human Activity)
        # ==========================================================
        tracking_state = "ACTIVE"
        pose_state = "ACTIVE"

        if not astronaut_visible:
            self.missed_detection_count += 1

            if self.missed_detection_count <= MISSED_DETECTION_GRACE_FRAMES:
                tracking_state = "SEARCHING"
                pose_state = "DEGRADED"
                reason = f"Temporary detection drop (grace frame {self.missed_detection_count}/{MISSED_DETECTION_GRACE_FRAMES})"
            else:
                tracking_state = "NO TARGET"
                pose_state = "NO TARGET"
                reason = "Astronaut absent beyond grace period"

            # Development debugging log
            logger.info(
                f"t={timestamp:6.1f}s | trk={tracking_state:10s} | pose={pose_state:8s} | "
                f"cur={self.current_activity:22s} | cand=None | cand_dur=0.0s | "
                f"acc=False | rej=True | reason={reason}"
            )

            # During grace period, retain the confirmed activity and its duration seamlessly
            # Beyond grace period, current activity becomes AWAITING ACTIVITY (NEVER "ASTRONAUT NOT VISIBLE"!)
            if tracking_state == "NO TARGET":
                self.current_activity = "AWAITING ACTIVITY"
                self.current_description = "Awaiting astronaut return to the payload area."
                self.candidate_activity = None
                self.candidate_count = 0

            return {
                "activity": self.current_activity,
                "state": "SEARCHING" if tracking_state == "SEARCHING" else "STANDBY",
                "trackingState": tracking_state,
                "poseState": pose_state,
                "timestamp": timestamp,
                "duration": round(now - self.activity_start_time, 1),
                "description": self.current_description,
            }

        # Astronaut is detected: reset missed counter
        self.missed_detection_count = 0
        primary = detections[0]
        kpts = primary.get("keypoints", [])
        
        # Determine pose state based on visible keypoints
        confident_kpts = [k for k in kpts if k.get("confidence", 0) >= 0.35]
        if len(confident_kpts) < 6:
            pose_state = "DEGRADED"
        else:
            pose_state = "ACTIVE"

        centroid = self.feature_extractor.extract_centroid(kpts)
        wrists = self.feature_extractor.extract_wrists(kpts)
        dist_workspace = self.feature_extractor.compute_distance_to_workspace(centroid)

        # Push to sliding temporal window
        self.feature_extractor.push(
            centroid=centroid,
            wrists=wrists,
            interaction_state=interaction_state,
            dist_workspace=dist_workspace,
            timestamp=timestamp,
            wall_time=now,
        )

        features = self.feature_extractor.compute_features()

        if not features["has_data"]:
            return {
                "activity": self.current_activity,
                "state": "ACTIVE",
                "trackingState": tracking_state,
                "poseState": pose_state,
                "timestamp": timestamp,
                "duration": round(now - self.activity_start_time, 1),
                "description": self.current_description,
            }

        body_mov = features["centroid_vel"]
        wrist_mov = features["wrist_vel"]
        dist_delta = features["dist_delta"]
        cur_dist = features["dist_workspace"]
        workspace_ratio = features["workspace_ratio"]
        latest_interaction = features["latest_interaction"]

        # ==========================================================
        # 2. CALIBRATED TEMPORAL HYPOTHESIS GENERATION
        # ==========================================================
        proposed_activity = "ACTIVITY UNCERTAIN"
        proposed_desc = "Motion features inconclusive. Gathering additional frame evidence."

        is_in_or_near_workspace = (
            latest_interaction in ("HAND_IN_WORKSPACE", "BOTH_HANDS_IN_WORKSPACE")
            or workspace_ratio >= 0.25
            or cur_dist <= 0.05
        )
        is_active_manipulation = (
            (wrist_mov >= 0.025 or body_mov >= 0.020) and body_mov <= 0.12
        )

        # WORKING AT WORKSPACE
        if is_in_or_near_workspace and is_active_manipulation:
            proposed_activity = "WORKING AT WORKSPACE"
            proposed_desc = "Astronaut is actively interacting with the experiment workspace."

        # REPOSITIONING (significant translation or turning away)
        elif body_mov >= 0.11 or (body_mov >= 0.08 and cur_dist > 0.06):
            proposed_activity = "REPOSITIONING"
            proposed_desc = "Astronaut is adjusting orientation or translating relative to the station."

        # POSITIONING AT WORKSPACE (stabilized working stance, paused / preparing)
        elif cur_dist <= 0.06 and body_mov < 0.06 and wrist_mov < 0.04:
            proposed_activity = "POSITIONING AT WORKSPACE"
            proposed_desc = "Astronaut is stabilized in working posture at the experiment bay."

        # APPROACHING WORKSPACE (distance decreasing)
        elif dist_delta < -0.03 or latest_interaction == "APPROACHING":
            proposed_activity = "APPROACHING WORKSPACE"
            proposed_desc = "Astronaut is translating forward toward the workstation."

        # AWAY / IDLE (far from bay and no interaction)
        elif cur_dist >= 0.12 and latest_interaction == "NO_INTERACTION":
            proposed_activity = "AWAY / IDLE"
            proposed_desc = "Astronaut is away from the main payload facility."

        # Inconclusive/Ambiguous: Apply inertia to prevent rapid UNCERTAIN toggling
        else:
            # If current activity is established and astronaut hasn't moved away, PRESERVE current activity
            if self.current_activity in ("WORKING AT WORKSPACE", "POSITIONING AT WORKSPACE") and cur_dist <= 0.08:
                proposed_activity = self.current_activity
                proposed_desc = self.current_description

        # Track prolonged ambiguity for UNCERTAIN state
        if proposed_activity == "ACTIVITY UNCERTAIN":
            self.uncertain_count += 1
            if self.uncertain_count < UNCERTAIN_CONFIRMATION_FRAMES and self.current_activity != "AWAITING ACTIVITY":
                # Suppress transient uncertain frames: hold confirmed activity
                proposed_activity = self.current_activity
                proposed_desc = self.current_description
        else:
            self.uncertain_count = 0

        # ==========================================================
        # 3. HYSTERESIS & TRANSITION ARBITRATION
        # ==========================================================
        current_dur = now - self.activity_start_time
        transition_accepted = False
        transition_rejected = False
        reason = "Stable continuation"

        if proposed_activity == self.current_activity:
            self.candidate_activity = None
            self.candidate_count = 0
            self.candidate_start_time = 0.0
            reason = "Matches current confirmed activity"
        else:
            # Track candidate activity across consecutive frames
            if proposed_activity == self.candidate_activity:
                self.candidate_count += 1
            else:
                self.candidate_activity = proposed_activity
                self.candidate_count = 1
                self.candidate_start_time = now

            cand_dur = now - self.candidate_start_time

            # Criteria to commit transition:
            # 1. Candidate must be sustained across TRANSITION_EVIDENCE_FRAMES
            # 2. Previous activity must have elapsed MIN_ACTIVITY_DURATION_SEC (unless transitioning from AWAITING/UNCERTAIN)
            can_transition = (
                self.candidate_count >= TRANSITION_EVIDENCE_FRAMES
                and (
                    current_dur >= MIN_ACTIVITY_DURATION_SEC
                    or self.current_activity in ("AWAITING ACTIVITY", "ACTIVITY UNCERTAIN")
                )
            )

            if can_transition:
                prev = self.current_activity
                self.current_activity = proposed_activity
                self.current_description = proposed_desc
                self.activity_start_time = now
                self.candidate_activity = None
                self.candidate_count = 0
                self.candidate_start_time = 0.0
                transition_accepted = True
                reason = f"Confirmed transition: {prev} -> {proposed_activity} (sustained {self.candidate_count} frames)"
            else:
                transition_rejected = True
                reason = f"Debouncing candidate: {self.candidate_activity} ({self.candidate_count}/{TRANSITION_EVIDENCE_FRAMES} frames)"

        # Development Diagnostic Logging (Required fields)
        cand_str = self.candidate_activity or "None"
        cand_dur_val = round(now - self.candidate_start_time, 2) if self.candidate_start_time > 0 else 0.0

        logger.info(
            f"t={timestamp:6.1f}s | trk={tracking_state:10s} | pose={pose_state:8s} | "
            f"cur={self.current_activity:22s} | cand={cand_str:22s} | cand_dur={cand_dur_val:4.1f}s | "
            f"acc={str(transition_accepted):5s} | rej={str(transition_rejected):5s} | reason={reason}"
        )

        return {
            "activity": self.current_activity,
            "state": "ACTIVE",
            "trackingState": tracking_state,
            "poseState": pose_state,
            "timestamp": timestamp,
            "duration": round(now - self.activity_start_time, 1),
            "description": self.current_description,
        }
