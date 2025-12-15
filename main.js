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
const player = {
  velocity: new THREE.Vector3(),
  speed: 12,
  health: 100,
  ammo: 30,
  magSize: 30,
  reserve: 120
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

// Expose the gesture-safe start entrypoint so the inline overlay handler can call it reliably.
window.__START_GAME__ = startGame;

init();
animate();

function init() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x101423);

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
  document.body.appendChild(renderer.domElement);

  clock = new THREE.Clock();

  addLighting();
  addFloor();
  addCover();
  addGun();

  document.addEventListener("keydown", onKeyDown);
  document.addEventListener("keyup", onKeyUp);
  window.addEventListener("resize", onResize);

  spawnWave();
}

function addLighting() {
  const hemi = new THREE.HemisphereLight(0xb7d8ff, 0x1b2246, 0.85);
  const ambient = new THREE.AmbientLight(0xdde7ff, 0.35);
  const sun = new THREE.DirectionalLight(0xffe6c7, 1.35);
  sun.position.set(12, 18, 6);
  sun.castShadow = false;

  const fill1 = new THREE.SpotLight(0x6de5ff, 1.1, 120, Math.PI / 6, 0.2, 0.8);
  fill1.position.set(-14, 12, -10);
  const fill2 = new THREE.SpotLight(0xff9f6d, 0.9, 120, Math.PI / 5, 0.25, 1.1);
  fill2.position.set(16, 10, 8);
  const flood = new THREE.PointLight(0x9ad6ff, 1.4, 45);
  flood.position.set(0, 6, -4);

  scene.add(hemi, ambient, sun, fill1, fill2, flood);
}

function addFloor() {
  const material = new THREE.MeshStandardMaterial({
    color: 0x2a304a,
    metalness: 0.25,
    roughness: 0.62,
    emissive: 0x060812,
    envMapIntensity: 0.3
  });
  floor = new THREE.Mesh(new THREE.PlaneGeometry(180, 180), material);
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);

  const grid = new THREE.GridHelper(140, 100, 0x5677a1, 0x1a203a);
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

function addGun() {
  gun = new THREE.Group();
  gun.position.set(0.38, -0.45, -0.9);

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

  const body = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.14, 0.9), bodyMat);
  body.position.set(0, -0.08, 0);
  const grip = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.32, 0.18), bodyMat);
  grip.position.set(0, -0.2, -0.15);
  grip.rotation.x = Math.PI / 10;
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.35, 14), accentMat);
  barrel.rotation.z = Math.PI / 2;
  barrel.position.set(0, 0.01, 0.42);
  const sight = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.05, 0.12), accentMat);
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

  enableControls();
  playing = true;
}

function enableControls() {
  if (controlsEnabled) return;
  controlsEnabled = true;

  // Bind gameplay input directly on the first trusted click to satisfy browser gesture rules.
  document.addEventListener("mousemove", onMouseMove);
  document.addEventListener("mousedown", shoot);
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
  updateHUD();
  spawnWave();
}

function spawnWave() {
  const bots = Math.min(6 + level * 2, 24);
  statusUI.textContent = `Wave ${level} - ${bots} drones`;
  for (let i = 0; i < bots; i++) {
    const robot = createRobot();
    enemies.push(robot);
    scene.add(robot);
  }
  updateHUD();
}

function createRobot() {
  const bot = new THREE.Group();
  const primaryMat = new THREE.MeshStandardMaterial({
    color: 0x8cf3ff,
    emissive: 0x112438,
    roughness: 0.3,
    metalness: 0.85
  });
  const accentMat = new THREE.MeshStandardMaterial({
    color: 0x2ae3c0,
    emissive: 0x0a2a29,
    roughness: 0.25,
    metalness: 0.9
  });

  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.4, 0.9, 8, 16), primaryMat);
  torso.position.y = 1.1;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.28, 16, 12), accentMat);
  head.position.y = 1.9;
  const visor = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.3, 12), new THREE.MeshStandardMaterial({ color: 0xff5577, emissive: 0x220014, metalness: 0.7, roughness: 0.2 }));
  visor.rotation.z = Math.PI / 2;
  visor.position.set(0, 1.9, 0.22);
  const legL = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.6, 0.14), primaryMat);
  legL.position.set(-0.15, 0.35, 0);
  const legR = legL.clone();
  legR.position.x = 0.15;

  bot.add(torso, head, visor, legL, legR);

  const angle = Math.random() * Math.PI * 2;
  const radius = 14 + Math.random() * 12;
  bot.position.set(Math.cos(angle) * radius, 0, Math.sin(angle) * radius * -1);
  bot.userData = {
    hp: 55 + level * 14,
    speed: 1.6 + level * 0.18,
    animOffset: Math.random() * Math.PI * 2,
    retreatTimer: 0,
    dodgeTimer: 0,
    lastHit: -1,
    state: "advance"
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
  const needed = player.magSize - player.ammo;
  if (needed <= 0 || player.reserve <= 0) return;
  const pulled = Math.min(needed, player.reserve);
  player.reserve -= pulled;
  player.ammo += pulled;
  statusUI.textContent = "Reloaded";
  updateHUD();
}

function shoot() {
  if (!playing) return;
  const now = performance.now();
  if (now - lastShot < 180) return;
  if (player.ammo <= 0) {
    statusUI.textContent = "Out of ammo - press SPACE";
    return;
  }
  lastShot = now;
  player.ammo -= 1;
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
  bot.userData.hp -= 25;
  bot.userData.retreatTimer = 0.65;
  bot.userData.dodgeTimer = 0.4;
  bot.userData.lastHit = performance.now();
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
        child.material.emissive?.setHex(0x112438);
      }
    });
  }, 120);

  if (bot.userData.hp <= 0) {
    scene.remove(bot);
    enemies.splice(enemies.indexOf(bot), 1);
    statusUI.textContent = `${enemies.length} targets left`;
    if (enemies.length === 0) {
      nextLevel();
    }
  }
}

function nextLevel() {
  level += 1;
  player.reserve += 15;
  statusUI.textContent = "Wave cleared!";
  setTimeout(spawnWave, 500);
  updateHUD();
}

function updateHUD() {
  healthUI.textContent = `HP: ${Math.max(0, Math.floor(player.health))}`;
  ammoUI.textContent = `AMMO: ${player.ammo}/${player.reserve}`;
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

    bot.lookAt(playerPos.x, bot.position.y + 0.5, playerPos.z);

    if (distance < 1.3) {
      incomingDamage += (12 + level * 2) * delta;
      bot.traverse(child => child.material?.emissive?.setHex(0xff3366));
    } else {
      bot.traverse(child => child.material?.emissive?.setHex(0x112438));
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
  console.log("FRAME RUNNING");
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
