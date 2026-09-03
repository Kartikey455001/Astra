import cv2
import numpy as np
from fastapi import FastAPI, File, UploadFile, Form
from fastapi.middleware.cors import CORSMiddleware
from cv.pose import AstronautPoseEstimator

app = FastAPI(title="ASTRA Local Astronaut Detection, Tracking & Pose Engine")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize the modular Astronaut Pose Estimator
pose_estimator = AstronautPoseEstimator(model_path="yolov8n-pose.pt")

@app.get("/health")
def health_check():
    return {
        "status": "READY",
        "model": pose_estimator.model_name,
        "tracker": pose_estimator.tracker_name,
        "capabilities": ["detection", "bytetrack", "2d_pose"],
        "keypoints": 17
    }

@app.post("/detect")
async def process_frame(
    file: UploadFile = File(...),
    timestamp: float = Form(0.0)
):
    try:
        contents = await file.read()
        nparr = np.frombuffer(contents, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        if img is None:
            return {"status": "error", "detections": [], "inference_ms": 0}

        # Run through modular pose estimator
        result = pose_estimator.estimate(img, timestamp=timestamp)
        return result
    except Exception as e:
        return {"status": "error", "message": str(e), "detections": [], "inference_ms": 0}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)
