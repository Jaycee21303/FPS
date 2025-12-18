const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const scoreEl = document.getElementById("score");
const streakEl = document.getElementById("streak");
const waveEl = document.getElementById("wave");
const ammoEl = document.getElementById("ammo");
const menu = document.getElementById("menu");
const help = document.getElementById("help");
const gameover = document.getElementById("gameover");
const finalStats = document.getElementById("final-stats");
const toggleHelp = document.getElementById("toggle-help");
const startBtn = document.getElementById("start");
const restartBtn = document.getElementById("restart");

const state = {
  mode: "menu",
  score: 0,
  streak: 0,
  wave: 1,
  lives: 3,
  timeScale: 1,
  slowTimer: 0,
  spawnTimer: 0,
  spawnInterval: 1.2,
  hudFlash: 0,
};

const crosshair = {
  x: 0,
  y: 0,
  radius: 14,
};

const targets = [];
const particles = [];
const texts = [];

const targetTypes = [
  {
    name: "duck",
    radius: 24,
    baseSpeed: 110,
    points: 40,
    health: 1,
    palette: ["#ff9f1c", "#f3722c", "#ffc857"],
  },
  {
    name: "plate",
    radius: 18,
    baseSpeed: 170,
    points: 25,
    health: 1,
    palette: ["#8ac926", "#6df7ff", "#b2ff59"],
  },
  {
    name: "mask",
    radius: 26,
    baseSpeed: 95,
    points: 55,
    health: 2,
    palette: ["#ff65ff", "#8f6bff", "#ff3b3b"],
  },
  {
    name: "prism",
    radius: 22,
    baseSpeed: 140,
    points: 120,
    health: 1,
    palette: ["#6df7ff", "#9be7ff", "#e7f1ff"],
    effect: "slowmo",
  },
];

const backgroundStars = Array.from({ length: 120 }, () => ({
  x: Math.random(),
  y: Math.random(),
  size: Math.random() * 1.6 + 0.4,
  speed: Math.random() * 0.2 + 0.1,
}));

function resize() {
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * devicePixelRatio;
  canvas.height = rect.height * devicePixelRatio;
  ctx.scale(devicePixelRatio, devicePixelRatio);
}

function showOverlay(el) {
  [menu, help, gameover].forEach((o) => o.classList.add("hidden"));
  el.classList.remove("hidden");
}

function hideOverlays() {
  [menu, help, gameover].forEach((o) => o.classList.add("hidden"));
}

function startGame() {
  state.mode = "playing";
  state.score = 0;
  state.streak = 0;
  state.wave = 1;
  state.lives = 3;
  state.spawnInterval = 1.2;
  state.spawnTimer = 0;
  state.slowTimer = 0;
  state.timeScale = 1;
  targets.length = 0;
  particles.length = 0;
  texts.length = 0;
  hideOverlays();
  crosshair.x = canvas.width / (devicePixelRatio * 2);
  crosshair.y = canvas.height / (devicePixelRatio * 2);
}

function endGame() {
  state.mode = "over";
  finalStats.textContent = `You scored ${state.score.toLocaleString()} points and reached wave ${state.wave}.`;
  showOverlay(gameover);
}

function spawnTarget() {
  const type = targetTypes[Math.floor(Math.random() * targetTypes.length)];
  const lane = Math.random();
  const y = 140 + lane * (canvas.height / devicePixelRatio - 240);
  const fromLeft = Math.random() > 0.5;
  const x = fromLeft ? -type.radius - 20 : canvas.width / devicePixelRatio + type.radius + 20;
  const speed = (type.baseSpeed + state.wave * 8) * (fromLeft ? 1 : -1);
  const wobble = Math.random() * 0.8 + 0.5;
  targets.push({
    type,
    x,
    y,
    speed,
    wobble,
    t: Math.random() * Math.PI * 2,
    health: type.health,
    escaped: false,
  });
}

function addParticles(x, y, color) {
  for (let i = 0; i < 14; i += 1) {
    const angle = Math.random() * Math.PI * 2;
    const speed = Math.random() * 90 + 40;
    particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 0.6,
      color,
    });
  }
}

function addText(x, y, value, color = "#e7f1ff") {
  texts.push({ x, y, value, life: 1.1, color });
}

function handleShot(x, y) {
  if (state.mode !== "playing") return;
  const hitTargets = targets.filter((t) => {
    const dx = x - t.x;
    const dy = y - t.y;
    return Math.hypot(dx, dy) <= t.type.radius + 6;
  });

  if (hitTargets.length === 0) {
    state.streak = Math.max(0, state.streak - 1);
    streakEl.classList.add("flash");
    setTimeout(() => streakEl.classList.remove("flash"), 200);
    return;
  }

  hitTargets.forEach((target) => {
    target.health -= 1;
    addParticles(target.x, target.y, target.type.palette[0]);
    if (target.health <= 0) {
      const multiplier = 1 + state.streak * 0.12;
      const points = Math.round(target.type.points * multiplier);
      state.score += points;
      state.streak = Math.min(state.streak + 1, 999);
      addText(target.x, target.y - 16, `+${points}`, target.type.palette[1]);
      texts.push({ x: target.x + 8, y: target.y + 12, value: `x${(multiplier).toFixed(2)}`, life: 0.8, color: "#9be7ff" });

      if (target.type.effect === "slowmo") {
        state.slowTimer = 2.2;
        state.timeScale = 0.55;
        addText(target.x, target.y - 38, "SLOW-MO!", "#6df7ff");
      }

      target.escaped = true;
    } else {
      addText(target.x, target.y, "HIT", "#ffc857");
    }
  });

  streakEl.classList.add("flash");
  setTimeout(() => streakEl.classList.remove("flash"), 200);
}

function update(dt) {
  if (state.mode !== "playing") return;
  const scaled = dt * state.timeScale;

  state.spawnTimer += scaled;
  if (state.spawnTimer >= state.spawnInterval) {
    state.spawnTimer = 0;
    spawnTarget();
  }

  if (state.slowTimer > 0) {
    state.slowTimer -= dt;
    if (state.slowTimer <= 0) {
      state.timeScale = 1;
    }
  }

  // Increase difficulty slowly.
  if (state.score / 600 > state.wave - 1) {
    state.wave += 1;
    state.spawnInterval = Math.max(0.55, state.spawnInterval - 0.05);
    addText(canvas.width / (devicePixelRatio * 2), 80, `Wave ${state.wave}`, "#ff65ff");
  }

  for (let i = targets.length - 1; i >= 0; i -= 1) {
    const t = targets[i];
    t.x += t.speed * scaled * 0.016;
    t.t += scaled * t.wobble * 1.8;
    t.y += Math.sin(t.t) * 0.4;

    if (!t.escaped && ((t.speed > 0 && t.x - t.type.radius > canvas.width / devicePixelRatio + 20) || (t.speed < 0 && t.x + t.type.radius < -20))) {
      t.escaped = true;
      state.lives -= 1;
      addText(canvas.width / (devicePixelRatio * 2), canvas.height / (devicePixelRatio) - 40, "Missed!", "#ff3b3b");
      state.streak = 0;
      if (state.lives <= 0) endGame();
    }

    if (t.escaped) targets.splice(i, 1);
  }

  for (let i = particles.length - 1; i >= 0; i -= 1) {
    const p = particles[i];
    p.life -= scaled;
    if (p.life <= 0) {
      particles.splice(i, 1);
      continue;
    }
    p.x += p.vx * scaled * 0.016;
    p.y += p.vy * scaled * 0.016;
  }

  for (let i = texts.length - 1; i >= 0; i -= 1) {
    const text = texts[i];
    text.life -= scaled * 0.9;
    text.y -= 10 * scaled * 0.016;
    if (text.life <= 0) texts.splice(i, 1);
  }

  updateHud();
}

function drawBackground() {
  const width = canvas.width / devicePixelRatio;
  const height = canvas.height / devicePixelRatio;
  ctx.save();
  ctx.fillStyle = "#0b1021";
  ctx.fillRect(0, 0, width, height);

  // Gradient floor
  const gradient = ctx.createLinearGradient(0, height * 0.4, 0, height);
  gradient.addColorStop(0, "rgba(255,255,255,0.02)");
  gradient.addColorStop(1, "rgba(13, 18, 40, 0.95)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, height * 0.42, width, height * 0.6);

  // Grid
  ctx.strokeStyle = "rgba(255,255,255,0.05)";
  ctx.lineWidth = 1;
  for (let x = 0; x <= width; x += 70) {
    ctx.beginPath();
    ctx.moveTo(x, height * 0.45);
    ctx.lineTo(x + 20, height);
    ctx.stroke();
  }
  for (let y = height * 0.45; y <= height; y += 36) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y + 12);
    ctx.stroke();
  }

  // Floating stars
  backgroundStars.forEach((s) => {
    s.y += s.speed * 0.6;
    if (s.y > 1) s.y = 0;
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = "#6df7ff";
    ctx.beginPath();
    ctx.arc(s.x * width, s.y * height * 0.4 + 40, s.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  });

  ctx.restore();
}

function drawTargets() {
  targets.forEach((t) => {
    const { palette, radius } = t.type;
    ctx.save();
    ctx.translate(t.x, t.y);
    ctx.shadowColor = palette[0];
    ctx.shadowBlur = 20;

    // Body
    const grad = ctx.createRadialGradient(0, -radius * 0.4, radius * 0.3, 0, 0, radius * 1.2);
    grad.addColorStop(0, palette[1]);
    grad.addColorStop(1, palette[2]);
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.ellipse(0, 0, radius * 1.1, radius * 0.85, 0, 0, Math.PI * 2);
    ctx.fill();

    // Faceplate
    ctx.fillStyle = "rgba(0,0,0,0.3)";
    ctx.beginPath();
    ctx.arc(0, 0, radius * 0.6, 0, Math.PI * 2);
    ctx.fill();

    // Center ring
    ctx.lineWidth = 3;
    ctx.strokeStyle = palette[0];
    ctx.beginPath();
    ctx.arc(0, 0, radius * 0.7, 0, Math.PI * 2);
    ctx.stroke();

    // Health pips
    for (let i = 0; i < t.health; i += 1) {
      ctx.fillStyle = palette[0];
      ctx.beginPath();
      ctx.arc(-radius * 0.6 + i * 8, -radius * 0.9, 3.5, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  });
}

function drawParticles() {
  particles.forEach((p) => {
    ctx.save();
    ctx.globalAlpha = Math.max(0, p.life);
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  });
}

function drawTexts() {
  texts.forEach((t) => {
    ctx.save();
    ctx.globalAlpha = Math.max(0, t.life);
    ctx.fillStyle = t.color;
    ctx.font = "16px 'Chakra Petch', 'Space Grotesk', sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(t.value, t.x, t.y);
    ctx.restore();
  });
}

function drawCrosshair() {
  ctx.save();
  ctx.translate(crosshair.x, crosshair.y);
  ctx.strokeStyle = "#6df7ff";
  ctx.lineWidth = 2;
  ctx.shadowColor = "rgba(109, 247, 255, 0.5)";
  ctx.shadowBlur = 10;
  ctx.beginPath();
  ctx.arc(0, 0, crosshair.radius, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-crosshair.radius - 4, 0);
  ctx.lineTo(-6, 0);
  ctx.moveTo(crosshair.radius + 4, 0);
  ctx.lineTo(6, 0);
  ctx.moveTo(0, -crosshair.radius - 4);
  ctx.lineTo(0, -6);
  ctx.moveTo(0, crosshair.radius + 4);
  ctx.lineTo(0, 6);
  ctx.stroke();

  ctx.fillStyle = "#ff65ff";
  ctx.beginPath();
  ctx.arc(0, 0, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawLives() {
  const width = canvas.width / devicePixelRatio;
  const height = canvas.height / devicePixelRatio;
  const baseX = width - 140;
  const y = height - 28;
  for (let i = 0; i < 3; i += 1) {
    ctx.save();
    ctx.translate(baseX + i * 32, y);
    ctx.fillStyle = i < state.lives ? "#ffc857" : "rgba(255,255,255,0.15)";
    ctx.beginPath();
    ctx.moveTo(0, -6);
    ctx.bezierCurveTo(8, -18, 24, -8, 0, 18);
    ctx.bezierCurveTo(-24, -8, -8, -18, 0, -6);
    ctx.fill();
    ctx.restore();
  }
}

function draw() {
  const width = canvas.width / devicePixelRatio;
  const height = canvas.height / devicePixelRatio;
  ctx.clearRect(0, 0, width, height);
  drawBackground();
  drawTargets();
  drawParticles();
  drawTexts();
  drawCrosshair();
  drawLives();
}

function updateHud() {
  scoreEl.textContent = state.score.toLocaleString();
  streakEl.textContent = `x${Math.max(1, state.streak)}`;
  waveEl.textContent = state.wave;
  ammoEl.textContent = "∞";
}

let lastTime = 0;
function loop(timestamp) {
  if (!lastTime) lastTime = timestamp;
  const dt = Math.min((timestamp - lastTime) / 1000, 0.05);
  lastTime = timestamp;
  update(dt);
  draw();
  requestAnimationFrame(loop);
}

function screenToCanvas(event) {
  const rect = canvas.getBoundingClientRect();
  const x = (event.clientX - rect.left) * (canvas.width / rect.width) / devicePixelRatio;
  const y = (event.clientY - rect.top) * (canvas.height / rect.height) / devicePixelRatio;
  crosshair.x = x;
  crosshair.y = y;
  return { x, y };
}

function init() {
  resize();
  crosshair.x = canvas.width / (devicePixelRatio * 2);
  crosshair.y = canvas.height / (devicePixelRatio * 2);
  updateHud();
  requestAnimationFrame(loop);
}

window.addEventListener("resize", resize);
canvas.addEventListener("pointermove", (e) => screenToCanvas(e));
canvas.addEventListener("pointerdown", (e) => {
  const pos = screenToCanvas(e);
  handleShot(pos.x, pos.y);
});

startBtn.addEventListener("click", startGame);
restartBtn.addEventListener("click", startGame);
toggleHelp.addEventListener("click", () => {
  help.classList.toggle("hidden");
});

init();
