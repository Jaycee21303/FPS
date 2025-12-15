import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";

let scene, camera, renderer;
let yaw = 0, pitch = 0;
let health = 100;
let level = 1;
let robots = [];

const overlay = document.getElementById("overlay");
const healthUI = document.getElementById("health");
const levelUI = document.getElementById("level");

init();
animate();

function init() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0xffb070); // sunset

  camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 1000);
  camera.position.y = 1.6;

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  // Lighting
  const sun = new THREE.DirectionalLight(0xffcc88, 1.2);
  sun.position.set(5, 10, 2);
  scene.add(sun);
  scene.add(new THREE.AmbientLight(0x664422, 0.4));

  // Floor
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(100, 100),
    new THREE.MeshStandardMaterial({ color: 0x444444 })
  );
  floor.rotation.x = -Math.PI / 2;
  scene.add(floor);

  spawnRobots();

  window.addEventListener("resize", onResize);
  overlay.addEventListener("click", startGame);
}

function spawnRobots() {
  robots = [];
  for (let i = 0; i < 5 + level * 2; i++) {
    const robot = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.4, 1.2, 6, 12),
      new THREE.MeshStandardMaterial({
        metalness: 0.8,
        roughness: 0.3,
        emissive: new THREE.Color(0x330000)
      })
    );
    robot.position.set(
      (Math.random() - 0.5) * 20,
      1,
      -10 - Math.random() * 20
    );
    robot.userData.hp = 30 + level * 10;
    scene.add(robot);
    robots.push(robot);
  }
}

function startGame() {
  overlay.style.display = "none";
  document.body.requestFullscreen();
  renderer.domElement.requestPointerLock();

  document.addEventListener("mousemove", onMouseMove);
  document.addEventListener("mousedown", shoot);
}

function onMouseMove(e) {
  yaw -= e.movementX * 0.002;
  pitch -= e.movementY * 0.002;
  pitch = Math.max(-1.5, Math.min(1.5, pitch));
  camera.rotation.set(pitch, yaw, 0);
}

function shoot() {
  const raycaster = new THREE.Raycaster();
  raycaster.setFromCamera(new THREE.Vector2(0,0), camera);

  const hits = raycaster.intersectObjects(robots);
  if (hits.length > 0) {
    const bot = hits[0].object;
    bot.userData.hp -= 20;
    bot.material.emissive.setHex(0xff0000);
    setTimeout(() => bot.material.emissive.setHex(0x330000), 100);

    if (bot.userData.hp <= 0) {
      scene.remove(bot);
      robots.splice(robots.indexOf(bot), 1);
      if (robots.length === 0) nextLevel();
    }
  }
}

function nextLevel() {
  level++;
  levelUI.textContent = "LEVEL " + (level === 4 ? "BOSS" : level);
  spawnRobots();
}

function animate() {
  requestAnimationFrame(animate);

  robots.forEach(bot => {
    bot.position.z += 0.02 + level * 0.005;
    bot.lookAt(camera.position);

    if (bot.position.distanceTo(camera.position) < 1.5) {
      health -= 0.2;
      healthUI.textContent = "HP: " + Math.max(0, Math.floor(health));
      if (health <= 0) location.reload();
    }
  });

  renderer.render(scene, camera);
}

function onResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}
