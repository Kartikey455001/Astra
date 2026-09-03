import time
import cv2
import numpy as np
from ultralytics import YOLO
from cv.interaction import WorkspaceInteractionDetector, WORKSPACE_ROI
from cv.activity import TemporalActivityRecognizer

COCO_KEYPOINT_NAMES = [
    "nose",           # 0
    "left_eye",       # 1
    "right_eye",      # 2
    "left_ear",       # 3
    "right_ear",      # 4
    "left_shoulder",  # 5
    "right_shoulder", # 6
    "left_elbow",     # 7
    "right_elbow",    # 8
    "left_wrist",     # 9
    "right_wrist",    # 10
    "left_hip",       # 11
    "right_hip",      # 12
    "left_knee",      # 13
    "right_knee",     # 14
    "left_ankle",     # 15
    "right_ankle"     # 16
]

# Standard COCO limb connections (joint index pairs)
SKELETON_LIMBS = [
    (0, 1), (0, 2),        # Nose to eyes
    (1, 3), (2, 4),        # Eyes to ears
    (5, 6),                # Shoulder to shoulder
    (5, 7), (7, 9),        # Left arm (shoulder -> elbow -> wrist)
    (6, 8), (8, 10),       # Right arm (shoulder -> elbow -> wrist)
    (5, 11), (6, 12),      # Torso sides (shoulders to hips)
    (11, 12),              # Hip to hip
    (11, 13), (13, 15),    # Left leg (hip -> knee -> ankle)
    (12, 14), (14, 16)     # Right leg (hip -> knee -> ankle)
]

class AstronautPoseEstimator:
    def __init__(self, model_path: str = "yolov8n-pose.pt"):
        # Unified lightweight edge model for detection, tracking, and 2D pose
        self.model = YOLO(model_path)
        self.model_name = "YOLOv8n-pose"
        self.tracker_name = "ByteTrack"
        self.interaction_detector = WorkspaceInteractionDetector()
        self.activity_recognizer = TemporalActivityRecognizer()

    def estimate(self, img: np.ndarray, timestamp: float = 0.0) -> dict:
        start_time = time.time()
        h, w, _ = img.shape

        # Run ByteTrack multi-frame tracking + 2D pose estimation simultaneously
        results = self.model.track(
            img,
            persist=True,
            tracker="bytetrack.yaml",
            classes=[0],  # strictly class 0 (person / astronaut)
            conf=0.35,
            imgsz=416,
            verbose=False
        )[0]

        inference_ms = round((time.time() - start_time) * 1000, 1)
        detections = []
        primary_kpts = []

        if results.boxes is not None and len(results.boxes) > 0:
            boxes = results.boxes
            has_kpts = results.keypoints is not None and results.keypoints.data is not None

            for i, box in enumerate(boxes):
                conf = float(box.conf[0].item())
                xyxy = box.xyxy[0].tolist()

                # Extract ByteTrack tracking ID
                if box.id is not None and len(box.id) > 0:
                    track_id = int(box.id[0].item())
                else:
                    track_id = 1

                x1, y1, x2, y2 = xyxy

                # Extract 17 2D keypoints
                keypoints_list = []
                if has_kpts and i < len(results.keypoints.data):
                    kpts_tensor = results.keypoints.data[i]  # shape (17, 3)
                    for kpt_idx in range(len(COCO_KEYPOINT_NAMES)):
                        kx = float(kpts_tensor[kpt_idx, 0].item())
                        ky = float(kpts_tensor[kpt_idx, 1].item())
                        kconf = float(kpts_tensor[kpt_idx, 2].item()) if kpts_tensor.shape[1] > 2 else 1.0

                        keypoints_list.append({
                            "name": COCO_KEYPOINT_NAMES[kpt_idx],
                            "x": round(kx / w, 4),
                            "y": round(ky / h, 4),
                            "confidence": round(kconf, 2)
                        })

                if i == 0:
                    primary_kpts = keypoints_list

                detection_record = {
                    "trackId": track_id,
                    "className": "ASTRONAUT",
                    "confidence": round(conf, 2),
                    "x": round(x1 / w, 4),
                    "y": round(y1 / h, 4),
                    "width": round((x2 - x1) / w, 4),
                    "height": round((y2 - y1) / h, 4),
                    "raw_bbox": [round(v, 1) for v in xyxy],
                    "keypoints": keypoints_list,
                    "timestamp": round(timestamp, 2),
                    "inferenceMs": inference_ms
                }
                detections.append(detection_record)

        # Evaluate hand-workspace interaction
        interaction = self.interaction_detector.evaluate(primary_kpts, timestamp=timestamp)

        # Recognize temporal human activity
        activity = self.activity_recognizer.update(detections, interaction, timestamp=timestamp)

        return {
            "status": "success",
            "timestamp": timestamp,
            "inference_ms": inference_ms,
            "detections": detections,
            "interaction": interaction,
            "activity": activity
        }
