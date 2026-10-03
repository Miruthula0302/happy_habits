let currentActivity = "";
let detectInterval = null;
let isPracticing = false;

/* ============================================================
   HABIT-SPECIFIC CLOUD-PUPPY MESSAGES
============================================================ */
const habitMessages = {
  eating: {
    Perfect: "🌟 Cloud‑Puppy loves how gently you're eating!",
    Moderate: "😊 Slow cloud bites help us feel calm.",
    TryAgain: "💖 Let's try one tiny cloud bite together."
  },
  brushing: {
    Perfect: "✨ Your teeth are sparkling like cloud stars!",
    Moderate: "😊 Let's brush the left cloud, then the right.",
    TryAgain: "💖 Cloud‑Puppy will brush with you."
  },
  cleanhands: {
    Perfect: "💧 Your hands are shiny like clean clouds!",
    Moderate: "😊 Rub rub rub… warm cloud hands.",
    TryAgain: "💖 Let's try gentle cloud bubbles again."
  },
  praying: {
    Perfect: "🌤 Such peaceful cloud hands.",
    Moderate: "😊 Let's breathe softly like a sleepy cloud.",
    TryAgain: "💖 Cloud‑Puppy will sit quietly with you."
  }
};

/* ============================================================
   STICKER REWARD SYSTEM
============================================================ */
function addSticker(emoji) {
  let grid = document.getElementById("stickerGrid");

  let s = document.createElement("div");
  s.classList.add("sticker");
  s.innerText = emoji;

  grid.appendChild(s);
}

const stickerIcons = {
  eating: "🍽️",
  brushing: "🪥",
  cleanhands: "💧",
  praying: "🙏"
};

/* ============================================================
   CAMERA
============================================================ */
function startCamera() {
  navigator.mediaDevices.getUserMedia({ video: true })
    .then(stream => {
      document.getElementById("camera").srcObject = stream;
      document.getElementById("camera").classList.add("camera-active");
    })
    .catch(err => {
      console.error("Camera error:", err);
    });
}

/* ============================================================
   ACTIVITY FLOW
============================================================ */
function openActivity(activity) {
  currentActivity = activity;

  const videoDemo = document.getElementById("instructionVideo");
  const btn = document.getElementById("practiceBtn");
  const title = document.getElementById("activityTitle");
  const backBtn = document.getElementById("backBtn");
  const countdownEl = document.getElementById("countdown");
  const centerPanel = document.getElementById("centerPanel");

  // Reset UI
  document.getElementById("result").innerText = "";
  document.getElementById("message").innerText = "";
  countdownEl.innerText = "";
  document.getElementById("progressBar").style.display = "none";

  // Apply theme
  centerPanel.className = "center theme-" + activity;

  // Show controls
  videoDemo.style.display = "block";
  btn.hidden = false;
  backBtn.hidden = false;

  // Load correct video
  const src = document.getElementById("videoSource");

  if (activity === "eating") {
    title.innerText = "🍽 Eating Practice";
    src.src = "/static/videos/eating.mp4";

  } else if (activity === "brushing") {
    title.innerText = "🪥 Brushing Practice";
    src.src = "/static/videos/brushing.mp4";

  } else if (activity === "cleanhands") {
    title.innerText = "✋💧 Clean Hands Practice";
    src.src = "/static/videos/cleanhands.mp4";

  } else if (activity === "praying") {
    title.innerText = "🙏 Praying Practice";
    src.src = "/static/videos/praying.mp4";
  }

  videoDemo.load();
  videoDemo.play();
}

function startPractice() {
  if (isPracticing) return;

  isPracticing = true;

  const countdownEl = document.getElementById("countdown");
  let countdown = 3;
  countdownEl.innerText = "Get ready... 3";

  stopPractice();

  const timer = setInterval(() => {
    countdown--;
    if (countdown > 0) {
      countdownEl.innerText = "Get ready... " + countdown;
    } else {
      clearInterval(timer);
      countdownEl.innerText = "";

      document.getElementById("result").innerText = "Detecting...";
      document.getElementById("message").innerText = "Keep going 😊";

      document.getElementById("progressBar").style.display = "block";

      captureAndSendFrame();
      detectInterval = setInterval(captureAndSendFrame, 1000);
    }
  }, 1000);
}

function stopPractice() {
  isPracticing = false;
  if (detectInterval) {
    clearInterval(detectInterval);
    detectInterval = null;
  }
}

function goHome() {
  const videoDemo = document.getElementById("instructionVideo");
  const btn = document.getElementById("practiceBtn");
  const title = document.getElementById("activityTitle");
  const backBtn = document.getElementById("backBtn");
  const countdownEl = document.getElementById("countdown");

  videoDemo.style.display = "none";
  btn.hidden = true;
  backBtn.hidden = true;

  title.innerText = "Choose an activity";
  document.getElementById("result").innerText = "";
  document.getElementById("message").innerText = "";
  countdownEl.innerText = "";
  document.getElementById("progressBar").style.display = "none";

  stopPractice();
}

/* ============================================================
   FRAME CAPTURE & DETECTION
============================================================ */
function captureFrame() {
  const video = document.getElementById("camera");
  if (!video.videoWidth || !video.videoHeight) return null;

  const canvas = document.createElement("canvas");
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;

  const ctx = canvas.getContext("2d");
  ctx.drawImage(video, 0, 0);

  return canvas.toDataURL("image/jpeg").split(",")[1];
}

function captureAndSendFrame() {
  const imageData = captureFrame();
  if (!imageData) return;

  fetch("/detect", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      image: imageData,
      activity: currentActivity
    })
  })
    .then(res => res.json())
    .then(data => {
      console.log("Detection:", data);

      document.getElementById("result").innerText = data.level;

      // Habit-specific message
      document.getElementById("message").innerText =
        habitMessages[currentActivity][data.level];

      // Progress bar
      document.getElementById("progressFill").style.width =
        (data.score * 100) + "%";

      // Rewards
      if (data.level === "Perfect") {
        launchConfetti();
        showStars(3);
        addSticker(stickerIcons[currentActivity]);
      } else if (data.level === "Moderate") {
        showStars(2);
      } else {
        showStars(1);
      }
    })
    .catch(err => {
      console.error("Detect error:", err);
    });
}

/* ============================================================
   REWARD ANIMATIONS
============================================================ */
function launchConfetti() {
  for (let i = 0; i < 40; i++) {
    let c = document.createElement("div");
    c.classList.add("confetti");
    c.style.left = Math.random() * 100 + "vw";
    c.style.background = ["#ffcc00", "#ff6666", "#66ccff", "#99ff99"][Math.floor(Math.random() * 4)];
    c.style.animationDuration = (2 + Math.random() * 2) + "s";
    document.body.appendChild(c);

    setTimeout(() => c.remove(), 3000);
  }
}

function showStars(count) {
  for (let i = 0; i < count; i++) {
    let star = document.createElement("div");
    star.classList.add("star");
    star.innerText = "⭐";
    star.style.left = (50 + Math.random() * 20 - 10) + "vw";
    star.style.top = "60vh";
    document.body.appendChild(star);

    setTimeout(() => star.remove(), 2000);
  }
}
