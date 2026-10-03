import cv2
import numpy as np
import mediapipe as mp
import math
from collections import Counter

mp_face_mesh = mp.solutions.face_mesh
mp_hands = mp.solutions.hands

face_mesh = mp_face_mesh.FaceMesh(
    max_num_faces=1,
    refine_landmarks=True,
    min_detection_confidence=0.5,
    min_tracking_confidence=0.5
)

hands = mp_hands.Hands(
    max_num_hands=2,
    min_detection_confidence=0.5,
    min_tracking_confidence=0.5
)

def distance(p1, p2):
    return math.dist(p1, p2)

# ---------------------------------------------------------
#  EATING & BRUSHING (your original logic)
# ---------------------------------------------------------
def detect_eating_brushing(frame, h, w, face_results, hands_results):
    if not hands_results.multi_hand_landmarks:
        return "none", 0.0

    # Mouth center
    if face_results.multi_face_landmarks:
        face = face_results.multi_face_landmarks[0].landmark
        mouth_ids = [13, 14, 78, 308]
        xs = [face[i].x * w for i in mouth_ids]
        ys = [face[i].y * h for i in mouth_ids]
        mouth_center = (np.mean(xs), np.mean(ys))
    else:
        mouth_center = (w * 0.5, h * 0.6)

    min_dist = 99999
    vertical_motion = 0

    for hand in hands_results.multi_hand_landmarks:
        index_tip = hand.landmark[8]
        wrist = hand.landmark[0]

        ix, iy = index_tip.x * w, index_tip.y * h
        wx, wy = wrist.x * w, wrist.y * h

        d = distance((ix, iy), mouth_center)
        min_dist = min(min_dist, d)

        dx = ix - wx
        dy = iy - wy

        if abs(dy) > abs(dx):
            vertical_motion += abs(dy)

    diag = math.sqrt(w*w + h*h)
    mouth_proximity = max(0, min(1, 1 - (min_dist / (diag * 0.5))))
    vertical_score = max(0, min(1, vertical_motion * 5))

    eating_score = mouth_proximity * (1 - 0.5 * vertical_score)
    brushing_score = mouth_proximity * (0.3 + 0.7 * vertical_score)

    if eating_score < 0.2 and brushing_score < 0.2:
        return "none", 0.0

    if brushing_score > eating_score:
        return "brushing", brushing_score
    else:
        return "eating", eating_score

# ---------------------------------------------------------
#  CLEAN HANDS (hand washing + rubbing hands)
# ---------------------------------------------------------
def detect_clean_hands(frame, h, w, hands_results):
    if not hands_results.multi_hand_landmarks or len(hands_results.multi_hand_landmarks) < 2:
        return "none", 0.0

    hand1 = hands_results.multi_hand_landmarks[0]
    hand2 = hands_results.multi_hand_landmarks[1]

    # Index fingertips
    p1 = (hand1.landmark[8].x * w, hand1.landmark[8].y * h)
    p2 = (hand2.landmark[8].x * w, hand2.landmark[8].y * h)

    dist = distance(p1, p2)

    # Motion detection
    motion = abs(hand1.landmark[8].y - hand1.landmark[0].y) + \
             abs(hand2.landmark[8].y - hand2.landmark[0].y)

    # Normalize
    dist_norm = max(0, min(1, 1 - dist / (w * 0.4)))
    motion_norm = max(0, min(1, motion * 3))

    score = (dist_norm * 0.6) + (motion_norm * 0.4)

    if score < 0.2:
        return "none", score

    return "cleanhands", score

# ---------------------------------------------------------
#  PRAYING
# ---------------------------------------------------------
def detect_praying(frame, h, w, hands_results):
    if not hands_results.multi_hand_landmarks or len(hands_results.multi_hand_landmarks) < 2:
        return "none", 0.0

    hand1 = hands_results.multi_hand_landmarks[0]
    hand2 = hands_results.multi_hand_landmarks[1]

    p1 = (hand1.landmark[8].x * w, hand1.landmark[8].y * h)
    p2 = (hand2.landmark[8].x * w, hand2.landmark[8].y * h)

    dist = distance(p1, p2)

    # Hands should be vertical + still
    vertical_alignment = abs(hand1.landmark[8].y - hand1.landmark[0].y)
    stillness = abs(hand1.landmark[8].x - hand1.landmark[0].x)

    dist_norm = max(0, min(1, 1 - dist / (w * 0.3)))
    vertical_norm = max(0, min(1, vertical_alignment * 2))
    still_norm = max(0, min(1, 1 - stillness * 3))

    score = (dist_norm * 0.5) + (vertical_norm * 0.3) + (still_norm * 0.2)

    if score < 0.2:
        return "none", score

    return "praying", score

# ---------------------------------------------------------
#  MAIN DETECTION ROUTER
# ---------------------------------------------------------
def detect_action(frame, activity):
    h, w, _ = frame.shape
    rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)

    face_results = face_mesh.process(rgb)
    hands_results = hands.process(rgb)

    if activity == "eating" or activity == "brushing":
        return detect_eating_brushing(frame, h, w, face_results, hands_results)

    if activity == "cleanhands":
        return detect_clean_hands(frame, h, w, hands_results)

    if activity == "praying":
        return detect_praying(frame, h, w, hands_results)

    return "none", 0.0