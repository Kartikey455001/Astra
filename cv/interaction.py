from collections import deque
from typing import List, Dict, Any, Optional

# Configurable Region of Interest (ROI) corresponding to the physical operational workspace in experiment.mp4
# Normalized (0..1) coordinates relative to video frame width and height
WORKSPACE_ROI = {
    "x": 0.20,
    "y": 0.38,
    "width": 0.52,
    "height": 0.54
}

# Margin around ROI to detect approaching or leaving transitions without jitter
APPROACH_MARGIN = 0.06

# Wrist confidence threshold from pose estimation
WRIST_CONF_THRESHOLD = 0.40

# Consecutive frames required to transition state (temporal smoothing / debouncing)
DEBOUNCE_FRAMES = 3

class WorkspaceInteractionDetector:
    def __init__(self, roi: Optional[Dict[str, float]] = None, margin: float = APPROACH_MARGIN):
        self.roi = roi or WORKSPACE_ROI
        self.margin = margin
        self.state_history = deque(maxlen=DEBOUNCE_FRAMES)
        self.current_state = "NO_INTERACTION"

    def _is_inside_roi(self, x: float, y: float) -> bool:
        x_min = self.roi["x"]
        x_max = self.roi["x"] + self.roi["width"]
        y_min = self.roi["y"]
        y_max = self.roi["y"] + self.roi["height"]
        return x_min <= x <= x_max and y_min <= y <= y_max

    def _is_in_approach_zone(self, x: float, y: float) -> bool:
        x_min = self.roi["x"] - self.margin
        x_max = self.roi["x"] + self.roi["width"] + self.margin
        y_min = self.roi["y"] - self.margin
        y_max = self.roi["y"] + self.roi["height"] + self.margin
        return x_min <= x <= x_max and y_min <= y <= y_max

    def evaluate(self, keypoints: List[Dict[str, Any]], timestamp: float = 0.0) -> Dict[str, Any]:
        left_wrist = None
        right_wrist = None

        for kpt in keypoints:
            name = kpt.get("name")
            if name == "left_wrist":
                left_wrist = kpt
            elif name == "right_wrist":
                right_wrist = kpt

        left_avail = left_wrist is not None and left_wrist.get("confidence", 0) >= WRIST_CONF_THRESHOLD
        right_avail = right_wrist is not None and right_wrist.get("confidence", 0) >= WRIST_CONF_THRESHOLD

        left_inside = False
        right_inside = False
        left_approach = False
        right_approach = False

        if left_avail:
            lx, ly = left_wrist["x"], left_wrist["y"]
            left_inside = self._is_inside_roi(lx, ly)
            left_approach = not left_inside and self._is_in_approach_zone(lx, ly)

        if right_avail:
            rx, ry = right_wrist["x"], right_wrist["y"]
            right_inside = self._is_inside_roi(rx, ry)
            right_approach = not right_inside and self._is_in_approach_zone(rx, ry)

        # Raw state computation for this frame
        raw_state = "NO_INTERACTION"
        if left_inside and right_inside:
            raw_state = "BOTH_HANDS_IN_WORKSPACE"
        elif left_inside or right_inside:
            raw_state = "HAND_IN_WORKSPACE"
        elif left_approach or right_approach:
            if "WORKSPACE" in self.current_state:
                raw_state = "LEAVING"
            else:
                raw_state = "APPROACHING"
        else:
            raw_state = "NO_INTERACTION"

        # Apply temporal smoothing / debouncing
        self.state_history.append(raw_state)

        # Transition state only if consistent across debounce window
        if len(self.state_history) == DEBOUNCE_FRAMES:
            # If all recent frames agree, update state
            if all(s == self.state_history[0] for s in self.state_history):
                self.current_state = self.state_history[0]
            # Fast-track entering workspace if two consecutive frames detect hands inside
            elif sum(1 for s in self.state_history if "WORKSPACE" in s) >= 2:
                if left_inside and right_inside:
                    self.current_state = "BOTH_HANDS_IN_WORKSPACE"
                else:
                    self.current_state = "HAND_IN_WORKSPACE"

        return {
            "state": self.current_state,
            "raw_state": raw_state,
            "roi": self.roi,
            "leftHand": {
                "x": left_wrist["x"] if left_avail else 0.0,
                "y": left_wrist["y"] if left_avail else 0.0,
                "insideWorkspace": left_inside,
                "confidence": left_wrist.get("confidence", 0.0) if left_avail else 0.0,
                "available": left_avail
            },
            "rightHand": {
                "x": right_wrist["x"] if right_avail else 0.0,
                "y": right_wrist["y"] if right_avail else 0.0,
                "insideWorkspace": right_inside,
                "confidence": right_wrist.get("confidence", 0.0) if right_avail else 0.0,
                "available": right_avail
            },
            "timestamp": timestamp
        }
