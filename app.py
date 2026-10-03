from flask import Flask, render_template, jsonify, request
import base64
import numpy as np
import cv2
from ai.detector import detect_action

app = Flask(__name__)

@app.route("/")
def home():
    return render_template("index.html")

@app.route("/detect", methods=["POST"])
def detect():
    data = request.json

    # Read image and activity
    img = data["image"]
    activity = data.get("activity", "eating")

    # Decode base64 → OpenCV frame
    img_bytes = np.frombuffer(base64.b64decode(img), np.uint8)
    frame = cv2.imdecode(img_bytes, cv2.IMREAD_COLOR)

    # Run detection for the given habit
    action, score = detect_action(frame, activity)

    # Convert score → performance level
    if score > 0.75:
        level = "Perfect"
    elif score > 0.40:
        level = "Moderate"
    else:
        level = "TryAgain"   # note: no space, matches JS key

    return jsonify({
        "action": action,
        "score": float(score),
        "level": level
    })

if __name__ == "__main__":
    app.run(debug=True)