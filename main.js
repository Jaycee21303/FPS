import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";

let scene, camera, renderer, clock;
let gun, muzzleFlash, muzzleFlashLight;
let enemies = [];
let impacts = [];
let floor, coverPieces = [];
let level = 1;
let playing = false;
let controlsEnabled = false;
let yaw = 0;
let pitch = 0;
let lastPointer = { x: null, y: null };
let recoilPitch = 0;
let recoilVelocity = 0;
let waveConfig = { total: 0, spawned: 0, spawning: false };
const player = {
  velocity: new THREE.Vector3(),
  speed: 12,
  health: 100,
  ammo: Infinity,
  magSize: Infinity,
  reserve: Infinity
};
const moveState = { forward: false, back: false, left: false, right: false };
let lastShot = 0;
const healthUI = document.getElementById("health");
const ammoUI = document.getElementById("ammo");
const levelUI = document.getElementById("level");
const statusUI = document.getElementById("status");
const hitmarkerUI = document.getElementById("hitmarker");

// Expose the gesture-safe start entrypoint so the inline overlay handler can call it reliably.
window.__START_GAME__ = startGame;

init();
animate();

function init() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x87ceeb);

  camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1200
  );
  camera.position.set(0, 1.6, 5);

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.toneMappingExposure = 1.6;
  document.body.appendChild(renderer.domElement);

  clock = new THREE.Clock();

  addLighting();
  addFloor();
  addCover();
  addScenery();
  addGun();

  setupPointerLock();

  document.addEventListener("keydown", onKeyDown);
  document.addEventListener("keyup", onKeyUp);
  window.addEventListener("resize", onResize);

  spawnWave();
}

function addLighting() {
  const ambient = new THREE.AmbientLight(0xffffff, 1.0);
  const sun = new THREE.DirectionalLight(0xffffff, 2.0);
  sun.position.set(50, 100, 20);
  sun.castShadow = false;

  const bounce = new THREE.HemisphereLight(0xbfd9ff, 0xb7c7d9, 0.6);

  scene.add(ambient, sun, bounce);
}

function addFloor() {
  const material = new THREE.MeshStandardMaterial({
    color: 0xd8e0ea,
    metalness: 0.12,
    roughness: 0.85,
    emissive: 0x9eb8d8,
    emissiveIntensity: 0.08
  });
  floor = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), material);
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);

  const grid = new THREE.GridHelper(170, 120, 0xaac7e8, 0x7ea2c9);
  grid.material.opacity = 0.45;
  grid.material.transparent = true;
  scene.add(grid);
}

function addCover() {
  const group = new THREE.Group();
  const geometry = new THREE.BoxGeometry(3.5, 2.4, 0.4);
  const material = new THREE.MeshStandardMaterial({
    color: 0x38416a,
    emissive: 0x0c1328,
    metalness: 0.4,
    roughness: 0.5,
    envMapIntensity: 0.45
  });

  [-12, -6, 0, 6, 12].forEach((x, index) => {
    const wall = new THREE.Mesh(geometry, material.clone());
    wall.position.set(x, 1.2, -6 - (index % 2) * 4);
    wall.rotation.y = index % 2 === 0 ? 0.3 : -0.25;
    group.add(wall);
    coverPieces.push(wall);
  });

  scene.add(group);
}

function addScenery() {
  const details = new THREE.Group();

  const crateMat = new THREE.MeshStandardMaterial({
    color: 0x555555,
    metalness: 0.35,
    roughness: 0.6
  });
  const crate = new THREE.Mesh(new THREE.BoxGeometry(2, 2, 2), crateMat);
  crate.position.set(3, 1, -3);

  const tallCrate = crate.clone();
  tallCrate.scale.y = 1.5;
  tallCrate.position.set(-4, 1.5, 2.5);

  const barrierMat = new THREE.MeshStandardMaterial({ color: 0x6c7a89, metalness: 0.2, roughness: 0.7 });
  const barrier = new THREE.Mesh(new THREE.BoxGeometry(6, 1.2, 0.6), barrierMat);
  barrier.position.set(0, 0.6, -8);
  barrier.rotation.y = 0.25;

  const rampMat = new THREE.MeshStandardMaterial({ color: 0x7e8fa3, metalness: 0.15, roughness: 0.8 });
  const ramp = new THREE.Mesh(new THREE.BoxGeometry(4, 0.4, 3), rampMat);
  ramp.position.set(-8, 0.2, -4);
  ramp.rotation.z = -0.2;

  const mast = new THREE.Mesh(
    new THREE.CylinderGeometry(0.15, 0.15, 6, 10),
    new THREE.MeshStandardMaterial({ color: 0x9aa6b6, metalness: 0.55, roughness: 0.35 })
  );
  mast.position.set(9, 3, 6);
  const dish = new THREE.Mesh(
    new THREE.ConeGeometry(0.8, 1.6, 18),
    new THREE.MeshStandardMaterial({ color: 0xe3e9f2, metalness: 0.25, roughness: 0.5 })
  );
  dish.position.set(9, 6, 6);
  dish.rotation.x = Math.PI;

  details.add(crate, tallCrate, barrier, ramp, mast, dish);
  scene.add(details);
}

function addGun() {
  gun = new THREE.Group();
  gun.position.set(0.12, -0.58, -0.9);
  gun.scale.set(1.4, 1.4, 1.4);

  const bodyMat = new THREE.MeshStandardMaterial({
    color: 0x151b2f,
    metalness: 0.65,
    roughness: 0.35,
    emissive: 0x0b1021
  });
  const accentMat = new THREE.MeshStandardMaterial({
    color: 0x2de1ff,
    emissive: 0x092f40,
    metalness: 0.9,
    roughness: 0.25
  });

  const body = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.16, 1.05), bodyMat);
  body.position.set(0, -0.08, 0);
  const grip = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.36, 0.2), bodyMat);
  grip.position.set(0, -0.2, -0.15);
  grip.rotation.x = Math.PI / 10;
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.42, 14), accentMat);
  barrel.rotation.z = Math.PI / 2;
  barrel.position.set(0, 0.01, 0.42);
  const sight = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.05, 0.16), accentMat);
  sight.position.set(0, 0.04, -0.08);

  muzzleFlash = new THREE.Mesh(
    new THREE.ConeGeometry(0.12, 0.28, 10),
    new THREE.MeshBasicMaterial({ color: 0xffe27a, transparent: true, opacity: 0, emissive: 0xffe27a })
  );
  muzzleFlash.rotation.x = Math.PI / 2;
  muzzleFlash.position.set(0, 0, 0.58);

  muzzleFlashLight = new THREE.PointLight(0xffb347, 0, 4);
  muzzleFlashLight.position.set(0, 0.02, 0.58);

  gun.add(body, grip, barrel, sight, muzzleFlash, muzzleFlashLight);
  camera.add(gun);
  scene.add(camera);
}

function setupPointerLock() {
  document.body.style.cursor = "none";
  const canvas = renderer.domElement;
  const requestLock = () => {
    if (document.pointerLockElement !== canvas) {
      canvas.requestPointerLock?.().catch(() => {
        // Gameplay continues even if pointer lock is denied.
      });
    }
  };

  canvas.addEventListener("click", requestLock);
  document.addEventListener("pointerlockchange", () => {
    if (document.pointerLockElement !== canvas) {
      lastPointer = { x: null, y: null };
      document.body.style.cursor = "none";
    }
  });
  document.addEventListener("pointerlockerror", () => {
    document.body.style.cursor = "none";
  });
}

function startGame() {
  console.log("CLICK REGISTERED");
  console.log("GAME STARTED");

  if (player.health <= 0) {
    resetGame();
  }

  const overlay = document.getElementById("overlay");
  if (overlay) {
    overlay.remove();
  }

  if (renderer?.domElement?.requestPointerLock) {
    renderer.domElement.requestPointerLock().catch(() => {
      document.body.style.cursor = "none";
    });
  }

  document.body.style.cursor = "none";
  enableControls();
  playing = true;
}

function enableControls() {
  if (controlsEnabled) return;
  controlsEnabled = true;

  // Bind gameplay input directly on the first trusted click to satisfy browser gesture rules.
  document.addEventListener("mousemove", onMouseMove);
  document.addEventListener("mousedown", shoot);
  document.addEventListener("pointerdown", shoot);
}

function onMouseMove(event) {
  if (!playing) return;

  const deltaX = event.movementX ?? (lastPointer.x === null ? 0 : event.clientX - lastPointer.x);
  const deltaY = event.movementY ?? (lastPointer.y === null ? 0 : event.clientY - lastPointer.y);
  lastPointer = { x: event.clientX, y: event.clientY };
  yaw -= (deltaX || 0) * 0.0025;
  pitch -= (deltaY || 0) * 0.0025;
  pitch = Math.max(-Math.PI / 2 + 0.1, Math.min(Math.PI / 2 - 0.1, pitch));
}

function resetGame() {
  enemies.forEach(bot => scene.remove(bot));
  enemies = [];
  level = 1;
  player.health = 100;
  player.velocity.set(0, 0, 0);
  player.ammo = player.magSize;
  waveConfig = { total: 0, spawned: 0, spawning: false };
  updateHUD();
  spawnWave();
}

function spawnWave() {
  const bots = Math.min(4 + level, 14);
  waveConfig = { total: bots, spawned: 0, spawning: true };
  statusUI.textContent = `Wave ${level} - ${bots} incoming`;
  updateHUD();

  const beginDelay = 400;
  setTimeout(() => scheduleSpawn(), beginDelay);
}

function scheduleSpawn() {
  if (!waveConfig.spawning) return;
  if (waveConfig.spawned >= waveConfig.total) {
    waveConfig.spawning = false;
    return;
  }

  const aliveLimit = Math.min(5, 3 + Math.floor(level / 2));
  if (enemies.length >= aliveLimit) {
    setTimeout(scheduleSpawn, 300);
    return;
  }

  const robot = createRobot();
  enemies.push(robot);
  scene.add(robot);
  waveConfig.spawned += 1;

  const nextDelay = 1100 + Math.random() * 500;
  setTimeout(scheduleSpawn, nextDelay);
}

function createRobot() {
  const bot = new THREE.Group();
  const bodyMat = new THREE.MeshStandardMaterial({
    color: 0x394048,
    metalness: 0.8,
    roughness: 0.35,
    emissive: 0x0d0f12,
    emissiveIntensity: 0.4
  });
  const visorMat = new THREE.MeshStandardMaterial({
    color: 0x111820,
    emissive: 0x11293b,
    metalness: 0.55,
    roughness: 0.25
  });
  const coreMat = new THREE.MeshStandardMaterial({
    color: 0xff612c,
    emissive: 0x9c1d00,
    emissiveIntensity: 1.6,
    metalness: 0.35,
    roughness: 0.4
  });

  const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 1.2, 14, 1, true), bodyMat);
  torso.position.y = 1.1;
  const plating = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.35, 0.7), bodyMat.clone());
  plating.position.set(0, 1.2, 0);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.3, 16, 12), visorMat);
  head.position.y = 1.9;
  const visor = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.16, 0.08), visorMat.clone());
  visor.position.set(0, 1.9, 0.3);
  visor.material.emissive.setHex(0x1e7db8);

  const core = new THREE.Mesh(new THREE.SphereGeometry(0.22, 14, 10), coreMat);
  core.position.set(0, 1.1, 0.32);

  const shoulder = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.18, 0.3), bodyMat.clone());
  shoulder.position.set(0, 1.45, 0);

  const legL = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.7, 0.2), bodyMat.clone());
  legL.position.set(-0.18, 0.35, 0);
  const legR = legL.clone();
  legR.position.x = 0.18;

  bot.add(torso, plating, head, visor, core, shoulder, legL, legR);

  const angle = Math.random() * Math.PI * 2;
  const radius = 14 + Math.random() * 12;
  bot.position.set(Math.cos(angle) * radius, 0, Math.sin(angle) * radius * -1);
  bot.userData = {
    hp: 40 + level * 6,
    speed: 1.15 + level * 0.08,
    animOffset: Math.random() * Math.PI * 2,
    retreatTimer: 0,
    dodgeTimer: 0,
    lastHit: -1,
    state: "advance",
    deathTimer: 0,
    id: Math.random() * 1000,
    core
  };
  return bot;
}

function onKeyDown(event) {
  switch (event.code) {
    case "KeyW":
    case "ArrowUp":
      moveState.forward = true;
      break;
    case "KeyS":
    case "ArrowDown":
      moveState.back = true;
      break;
    case "KeyA":
    case "ArrowLeft":
      moveState.left = true;
      break;
    case "KeyD":
    case "ArrowRight":
      moveState.right = true;
      break;
    case "Space":
      reload();
      break;
  }
}

function onKeyUp(event) {
  switch (event.code) {
    case "KeyW":
    case "ArrowUp":
      moveState.forward = false;
      break;
    case "KeyS":
    case "ArrowDown":
      moveState.back = false;
      break;
    case "KeyA":
    case "ArrowLeft":
      moveState.left = false;
      break;
    case "KeyD":
    case "ArrowRight":
      moveState.right = false;
      break;
  }
}

function reload() {
  statusUI.textContent = "Unlimited ammo ready";
  updateHUD();
}

function shoot() {
  if (!playing) return;
  const now = performance.now();
  if (now - lastShot < 140) return;
  lastShot = now;
  recoilVelocity += 0.065;
  gun.position.y = -0.48;
  muzzleFlash.visible = true;
  muzzleFlash.material.opacity = 1;
  muzzleFlashLight.intensity = 2.4;
  setTimeout(() => {
    muzzleFlash.visible = false;
    muzzleFlash.material.opacity = 0;
    muzzleFlashLight.intensity = 0;
  }, 60);

  playShotSound();

  const viewCenter = new THREE.Vector2(0, 0);
  const raycaster = new THREE.Raycaster();
  raycaster.setFromCamera(viewCenter, camera);
  const targets = [...enemies, floor, ...coverPieces];
  const hits = raycaster.intersectObjects(targets, true);

  if (hits.length === 0) {
    updateHUD();
    return;
  }

  const hit = hits[0];
  let bot = hit.object;
  while (bot && !enemies.includes(bot)) {
    bot = bot.parent;
  }
  if (bot && enemies.includes(bot)) {
    applyDamage(bot, hit.point, hit.face?.normal);
  } else {
    spawnImpact(hit.point, hit.face?.normal || new THREE.Vector3(0, 1, 0), 0xb8c7ff);
  }

  updateHUD();
}

function playShotSound() {
  const ctx = new (window.AudioContext || window.webkitAudioContext)();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "square";
  osc.frequency.value = 420;
  gain.gain.setValueAtTime(0.25, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.25);
  osc.connect(gain).connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + 0.25);
}

function spawnImpact(position, normal, color = 0xffe27a) {
  const geometry = new THREE.PlaneGeometry(0.22, 0.22);
  const material = new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity: 0.9,
    side: THREE.DoubleSide
  });
  const decal = new THREE.Mesh(geometry, material);
  decal.position.copy(position);
  const orient = new THREE.Quaternion();
  orient.setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal.clone().normalize());
  decal.quaternion.copy(orient);
  scene.add(decal);
  impacts.push({ mesh: decal, ttl: 0.3 });
}

function showHitmarker() {
  hitmarkerUI.classList.add("show-hitmarker");
  setTimeout(() => hitmarkerUI.classList.remove("show-hitmarker"), 120);
}

function applyDamage(bot, point, normal) {
  if (bot.userData.state === "dying") return;

  bot.userData.hp -= 45;
  bot.userData.retreatTimer = 0.35;
  bot.userData.dodgeTimer = 0.25;
  bot.userData.lastHit = performance.now();
  bot.userData.hitFlash = 0.18;
  spawnImpact(point, normal || new THREE.Vector3(0, 1, 0), 0xff6b6b);
  showHitmarker();

  bot.traverse(child => {
    if (child.isMesh) {
      child.material.emissive?.setHex(0xff6666);
    }
  });
  setTimeout(() => {
    bot.traverse(child => {
      if (child.isMesh) {
        child.material.emissive?.setHex(0x0d0f12);
      }
    });
  }, 120);

  if (bot.userData.hp <= 0 && bot.userData.state !== "dying") {
    bot.userData.state = "dying";
    bot.userData.deathTimer = 0.6;
  }
}

function nextLevel() {
  level += 1;
  statusUI.textContent = "Wave cleared!";
  waveConfig = { total: 0, spawned: 0, spawning: false };
  setTimeout(spawnWave, 1400);
  updateHUD();
}

function updateHUD() {
  healthUI.textContent = `HP: ${Math.max(0, Math.floor(player.health))}`;
  ammoUI.textContent = `AMMO: ∞`;
  levelUI.textContent = `LEVEL ${level}`;
}

function updatePlayer(delta) {
  player.velocity.x -= player.velocity.x * 9 * delta;
  player.velocity.z -= player.velocity.z * 9 * delta;

  const facing = new THREE.Vector3(0, 0, -1).applyEuler(new THREE.Euler(0, yaw, 0, "YXZ"));
  const direction = facing.clone().setY(0).normalize();
  const right = new THREE.Vector3();
  right.crossVectors(direction, new THREE.Vector3(0, 1, 0)).normalize();

  const move = new THREE.Vector3();
  if (moveState.forward) move.add(direction);
  if (moveState.back) move.sub(direction);
  if (moveState.left) move.sub(right);
  if (moveState.right) move.add(right);

  if (move.lengthSq() > 0) {
    move.normalize();
    player.velocity.addScaledVector(move, player.speed * delta);
  }

  camera.position.addScaledVector(player.velocity, delta);

  recoilVelocity -= recoilVelocity * 6 * delta;
  recoilPitch += recoilVelocity;
  recoilPitch -= recoilPitch * 10 * delta;
  gun.position.y += ( -0.45 - gun.position.y) * 8 * delta;
}

function updateEnemies(delta) {
  const playerPos = camera.position.clone();
  playerPos.y = 1.0;
  let incomingDamage = 0;

  enemies.forEach(bot => {
    const data = bot.userData;
    if (data.state === "dying") {
      data.deathTimer -= delta;
      bot.scale.y = Math.max(0.05, bot.scale.y * (1 - 3.5 * delta));
      bot.rotation.x += 0.2;
      bot.traverse(child => {
        if (child.material?.emissive) {
          const pulse = Math.random() * 0.6 + 0.2;
          child.material.emissiveIntensity = (child.material.emissiveIntensity || 1) * 0.6 + pulse;
        }
      });
      if (data.deathTimer <= 0) {
        scene.remove(bot);
        enemies.splice(enemies.indexOf(bot), 1);
        statusUI.textContent = `${enemies.length} targets left`;
        if (enemies.length === 0 && !waveConfig.spawning && waveConfig.spawned >= waveConfig.total) {
          nextLevel();
        }
      }
      return;
    }

    const toPlayer = playerPos.clone().sub(bot.position);
    const distance = toPlayer.length();
    const dir = toPlayer.clone().normalize();

    const anim = Math.sin(clock.elapsedTime * 6 + data.animOffset) * 0.08;
    bot.children.forEach(child => {
      if (child.geometry && child.position) {
        const base = child.userData.baseY ?? child.position.y;
        child.userData.baseY = base;
        child.position.y = base + anim;
      }
    });

    if (data.retreatTimer > 0) {
      data.retreatTimer -= delta;
      bot.position.addScaledVector(dir.clone().negate(), data.speed * 1.4 * delta);
    } else if (data.dodgeTimer > 0) {
      data.dodgeTimer -= delta;
      const lateral = new THREE.Vector3(dir.z, 0, -dir.x).normalize();
      bot.position.addScaledVector(lateral, data.speed * 1.2 * delta);
    } else if (distance > 0.1) {
      bot.position.addScaledVector(dir, data.speed * delta);
    }

    const swayLateral = new THREE.Vector3(dir.z, 0, -dir.x).normalize();
    bot.position.addScaledVector(swayLateral, Math.sin(clock.elapsedTime * 2 + data.id) * 0.4 * delta);

    bot.lookAt(playerPos.x, bot.position.y + 0.5, playerPos.z);

    const core = data.core;
    if (core && core.material?.emissive) {
      core.material.emissiveIntensity = 1.5 + Math.sin(clock.elapsedTime * 6) * 0.5;
    }

    if (data.hitFlash) {
      data.hitFlash -= delta;
      bot.traverse(child => {
        if (child.material?.emissive) {
          child.material.emissiveIntensity = Math.max(0.6, 1 + data.hitFlash * 4);
        }
      });
    }

    if (distance < 1.3) {
      incomingDamage += (12 + level * 2) * delta;
      bot.traverse(child => child.material?.emissive?.setHex(0xff3366));
    } else {
      bot.traverse(child => child.material?.emissive?.setHex(0x0d0f12));
    }
  });

  if (incomingDamage > 0) {
    player.health -= incomingDamage;
    if (player.health <= 0) {
      handleGameOver();
    }
    updateHUD();
  }
}

function handleGameOver() {
  player.health = 0;
  updateHUD();
  statusUI.textContent = "You were overwhelmed";
  playing = false;
  waveConfig.spawning = false;
  showOverlay("CLICK TO RESTART");
}

function showOverlay(message) {
  let overlay = document.getElementById("overlay");
  if (!overlay) {
    overlay = document.createElement("div");
    overlay.id = "overlay";
    overlay.setAttribute("onclick", "window.__START_GAME__()");
    document.body.appendChild(overlay);
  }

  // Keep the CTA visible and clickable for restarts without blocking gameplay.
  overlay.textContent = message || "CLICK TO PLAY";
}

function animate() {
  requestAnimationFrame(animate);
  const delta = clock.getDelta();

  if (playing) {
    updatePlayer(delta);
    updateEnemies(delta);
  }

  impacts = impacts.filter(effect => {
    effect.ttl -= delta;
    effect.mesh.material.opacity = Math.max(0, effect.ttl * 2.5);
    if (effect.ttl <= 0) {
      scene.remove(effect.mesh);
      return false;
    }
    return true;
  });

  camera.rotation.set(pitch + recoilPitch, yaw, 0, "YXZ");
  renderer.render(scene, camera);
}

function onResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}
