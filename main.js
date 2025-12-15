import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";
import { PointerLockControls } from "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/controls/PointerLockControls.js";

let scene, camera, renderer, controls, clock;
let enemies = [];
let level = 1;
let playing = false;
const player = {
  velocity: new THREE.Vector3(),
  speed: 12,
  health: 100
};
const moveState = { forward: false, back: false, left: false, right: false };
let lastShot = 0;

const overlay = document.getElementById("overlay");
const overlaySubtitle = document.getElementById("overlay-subtitle");
const healthUI = document.getElementById("health");
const levelUI = document.getElementById("level");
const statusUI = document.getElementById("status");

init();
animate();

function init() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0c0e1d);

  camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
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

  controls = new PointerLockControls(camera, renderer.domElement);
  controls.addEventListener("lock", () => {
    overlay.classList.add("hidden");
    overlaySubtitle.textContent = "Press ESC to pause";
    statusUI.textContent = "Eliminate all drones";
    playing = true;
  });
  controls.addEventListener("unlock", () => {
    overlay.classList.remove("hidden");
    overlaySubtitle.textContent = player.health <= 0 ? "Click to restart" : "Click to resume";
    playing = false;
  });

  overlay.addEventListener("click", startGame);
  document.addEventListener("mousedown", shoot);
  document.addEventListener("keydown", onKeyDown);
  document.addEventListener("keyup", onKeyUp);
  window.addEventListener("resize", onResize);

  spawnWave();
}

function addLighting() {
  const ambient = new THREE.AmbientLight(0x8899ff, 0.35);
  const sun = new THREE.DirectionalLight(0xffc299, 1.2);
  sun.position.set(5, 10, 5);
  scene.add(ambient, sun);
}

function addFloor() {
  const material = new THREE.MeshStandardMaterial({
    color: 0x1a1f35,
    metalness: 0.15,
    roughness: 0.85
  });
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(140, 140), material);
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);

  const grid = new THREE.GridHelper(120, 80, 0x3d4270, 0x1a203a);
  scene.add(grid);
}

function addCover() {
  const group = new THREE.Group();
  const geometry = new THREE.BoxGeometry(3.5, 2.4, 0.4);
  const material = new THREE.MeshStandardMaterial({
    color: 0x2d325d,
    emissive: 0x0b0e1c,
    metalness: 0.35,
    roughness: 0.6
  });

  [-12, -6, 0, 6, 12].forEach((x, index) => {
    const wall = new THREE.Mesh(geometry, material.clone());
    wall.position.set(x, 1.2, -6 - (index % 2) * 4);
    wall.rotation.y = index % 2 === 0 ? 0.3 : -0.25;
    group.add(wall);
  });

  scene.add(group);
}

function startGame() {
  if (player.health <= 0) {
    resetGame();
  }
  controls.lock();
}

function resetGame() {
  enemies.forEach(bot => scene.remove(bot));
  enemies = [];
  level = 1;
  player.health = 100;
  player.velocity.set(0, 0, 0);
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
  const geometry = new THREE.CapsuleGeometry(0.35, 1.1, 6, 12);
  const material = new THREE.MeshStandardMaterial({
    color: 0x7af7ff,
    emissive: new THREE.Color(0x0a111f),
    metalness: 0.8,
    roughness: 0.25
  });
  const bot = new THREE.Mesh(geometry, material);
  const angle = Math.random() * Math.PI * 2;
  const radius = 14 + Math.random() * 12;
  bot.position.set(Math.cos(angle) * radius, 1.2, Math.sin(angle) * radius * -1);
  bot.userData.hp = 45 + level * 12;
  bot.userData.speed = 1.5 + level * 0.15;
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

function shoot() {
  if (!playing) return;
  const now = performance.now();
  if (now - lastShot < 180) return;
  lastShot = now;

  const viewCenter = new THREE.Vector2(0, 0);
  const raycaster = new THREE.Raycaster();
  raycaster.setFromCamera(viewCenter, camera);
  const hits = raycaster.intersectObjects(enemies, false);

  if (hits.length === 0) return;

  const bot = hits[0].object;
  bot.userData.hp -= 25;
  bot.material.emissive.setHex(0xff5555);
  setTimeout(() => bot.material.emissive.setHex(0x0a111f), 90);

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
  statusUI.textContent = "Wave cleared!";
  setTimeout(spawnWave, 500);
  updateHUD();
}

function updateHUD() {
  healthUI.textContent = `HP: ${Math.max(0, Math.floor(player.health))}`;
  levelUI.textContent = `LEVEL ${level}`;
}

function updatePlayer(delta) {
  player.velocity.x -= player.velocity.x * 9 * delta;
  player.velocity.z -= player.velocity.z * 9 * delta;

  const direction = new THREE.Vector3();
  controls.getDirection(direction);
  direction.y = 0;
  direction.normalize();

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

  controls.moveRight(player.velocity.x * delta);
  controls.moveForward(player.velocity.z * delta);
}

function updateEnemies(delta) {
  const playerPos = controls.getObject().position.clone();
  playerPos.y = 1.0;
  let incomingDamage = 0;

  enemies.forEach(bot => {
    const toPlayer = playerPos.clone().sub(bot.position);
    const distance = toPlayer.length();
    if (distance > 0.1) {
      toPlayer.normalize();
      bot.position.addScaledVector(toPlayer, bot.userData.speed * delta);
    }
    bot.lookAt(playerPos.x, bot.position.y, playerPos.z);

    if (distance < 1.3) {
      incomingDamage += (12 + level * 2) * delta;
      bot.material.emissive.setHex(0xff3366);
    } else {
      bot.material.emissive.setHex(0x0a111f);
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
  overlaySubtitle.textContent = "Click to restart";
  controls.unlock();
}

function animate() {
  requestAnimationFrame(animate);
  const delta = clock.getDelta();

  if (playing) {
    updatePlayer(delta);
    updateEnemies(delta);
  }

  renderer.render(scene, camera);
}

function onResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}
