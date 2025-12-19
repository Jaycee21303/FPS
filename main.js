(() => {
  "use strict";

  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");
  const scoreEl = document.getElementById("score");
  const livesEl = document.getElementById("lives");
  const statusEl = document.getElementById("status");
  const startScreen = document.getElementById("startScreen");
  const startButton = document.getElementById("startButton");
  const touchButtons = document.querySelectorAll(".touch-button");

  const TILE = 24;
  const COLS = 28;
  const ROWS = 31;
  const WIDTH = COLS * TILE;
  const HEIGHT = ROWS * TILE;

  canvas.width = WIDTH;
  canvas.height = HEIGHT;

  const mazeTemplate = [
    "############################",
    "#............##............#",
    "#.####.#####.##.#####.####.#",
    "#o####.#####.##.#####.####o#",
    "#.####.#####.##.#####.####.#",
    "#..........................#",
    "#.####.##.########.##.####.#",
    "#.####.##.########.##.####.#",
    "#......##....##....##......#",
    "######.#####.##.#####.######",
    "#......##....##....##......#",
    "######.##.##    ##.##.######",
    "######.##.###DD###.##.######",
    "######.##.##    ##.##.######",
    "#............##............#",
    "#.####.#####.##.#####.####.#",
    "#o..##................##..o#",
    "###.##.#####.##.#####.##.###",
    "###.##.#####.##.#####.##.###",
    "#............##............#",
    "#.####.#####.##.#####.####.#",
    "#o..##................##..o#",
    "#.####.##.########.##.####.#",
    "#......##....##....##......#",
    "######.#####.##.#####.######",
    "#............##............#",
    "#.####.#####.##.#####.####.#",
    "#o####.#####.##.#####.####o#",
    "#.####.#####.##.#####.####.#",
    "#..........................#",
    "############################",
  ];

  const directions = {
    up: { x: 0, y: -1 },
    down: { x: 0, y: 1 },
    left: { x: -1, y: 0 },
    right: { x: 1, y: 0 },
  };

  const directionKeys = {
    ArrowUp: "up",
    KeyW: "up",
    ArrowDown: "down",
    KeyS: "down",
    ArrowLeft: "left",
    KeyA: "left",
    ArrowRight: "right",
    KeyD: "right",
  };

  const state = {
    running: false,
    paused: false,
    score: 0,
    lives: 3,
    level: 1,
    dotsRemaining: 0,
    mode: "scatter",
    modeTimer: 0,
    frightenedTimer: 0,
    lastTime: 0,
  };

  const modeCycle = [
    { mode: "scatter", duration: 7 },
    { mode: "chase", duration: 20 },
    { mode: "scatter", duration: 7 },
    { mode: "chase", duration: 20 },
    { mode: "scatter", duration: 5 },
    { mode: "chase", duration: 999 },
  ];

  let cycleIndex = 0;

  const pacman = {
    x: 13.5 * TILE,
    y: 29.5 * TILE,
    dir: "left",
    nextDir: "left",
    speed: 120,
    radius: 9,
  };

  const ghosts = [
    {
      name: "Blinky",
      color: "#ff4d4d",
      x: 13.5 * TILE,
      y: 11.5 * TILE,
      dir: "left",
      speed: 105,
      scatterTarget: { col: COLS - 2, row: 1 },
      state: "scatter",
    },
    {
      name: "Pinky",
      color: "#ff7cd9",
      x: 12.5 * TILE,
      y: 13.5 * TILE,
      dir: "up",
      speed: 102,
      scatterTarget: { col: 1, row: 1 },
      state: "scatter",
    },
    {
      name: "Inky",
      color: "#5ee7ff",
      x: 13.5 * TILE,
      y: 13.5 * TILE,
      dir: "up",
      speed: 102,
      scatterTarget: { col: COLS - 2, row: ROWS - 2 },
      state: "scatter",
    },
    {
      name: "Clyde",
      color: "#ffb347",
      x: 14.5 * TILE,
      y: 13.5 * TILE,
      dir: "up",
      speed: 100,
      scatterTarget: { col: 1, row: ROWS - 2 },
      state: "scatter",
    },
  ];

  const maze = mazeTemplate.map((row) => row.split(""));

  function isWall(col, row) {
    if (row < 0 || row >= ROWS || col < 0 || col >= COLS) return true;
    return maze[row][col] === "#";
  }

  function isDoor(col, row) {
    if (row < 0 || row >= ROWS || col < 0 || col >= COLS) return false;
    return maze[row][col] === "D";
  }

  function tileCenter(col, row) {
    return {
      x: col * TILE + TILE / 2,
      y: row * TILE + TILE / 2,
    };
  }

  function getTilePos(x, y) {
    return {
      col: Math.floor(x / TILE),
      row: Math.floor(y / TILE),
    };
  }

  function canMove(x, y, dir, allowDoor = false) {
    const nextX = x + directions[dir].x * (TILE / 2);
    const nextY = y + directions[dir].y * (TILE / 2);
    const { col, row } = getTilePos(nextX, nextY);
    if (isWall(col, row)) return false;
    if (!allowDoor && isDoor(col, row)) return false;
    return true;
  }

  function isCentered(x, y) {
    const { col, row } = getTilePos(x, y);
    const center = tileCenter(col, row);
    return Math.abs(center.x - x) < 2 && Math.abs(center.y - y) < 2;
  }

  function resetDots() {
    state.dotsRemaining = 0;
    mazeTemplate.forEach((row, rowIndex) => {
      row.split("").forEach((cell, colIndex) => {
        if (cell === "." || cell === "o") {
          maze[rowIndex][colIndex] = cell;
          state.dotsRemaining += 1;
        } else {
          maze[rowIndex][colIndex] = cell;
        }
      });
    });
  }

  function resetPositions() {
    pacman.x = 13.5 * TILE;
    pacman.y = 29.5 * TILE;
    pacman.dir = "left";
    pacman.nextDir = "left";
    ghosts[0].x = 13.5 * TILE;
    ghosts[0].y = 11.5 * TILE;
    ghosts[1].x = 12.5 * TILE;
    ghosts[1].y = 13.5 * TILE;
    ghosts[2].x = 13.5 * TILE;
    ghosts[2].y = 13.5 * TILE;
    ghosts[3].x = 14.5 * TILE;
    ghosts[3].y = 13.5 * TILE;
    ghosts.forEach((ghost) => {
      ghost.dir = "left";
      ghost.state = state.mode;
    });
  }

  function updateHud() {
    scoreEl.textContent = state.score.toString().padStart(6, "0");
    livesEl.textContent = state.lives.toString();
  }

  function startGame() {
    state.running = true;
    state.paused = false;
    state.score = 0;
    state.lives = 3;
    state.level = 1;
    state.mode = "scatter";
    state.modeTimer = 0;
    state.frightenedTimer = 0;
    cycleIndex = 0;
    resetDots();
    resetPositions();
    updateHud();
    statusEl.textContent = "Ready!";
    startScreen.hidden = true;
  }

  function nextLevel() {
    state.level += 1;
    state.mode = "scatter";
    state.modeTimer = 0;
    cycleIndex = 0;
    resetDots();
    resetPositions();
    statusEl.textContent = `Level ${state.level}`;
  }

  function setPaused(value) {
    state.paused = value;
    statusEl.textContent = value ? "Paused" : "Ready!";
  }

  function updateMode(dt) {
    if (state.frightenedTimer > 0) {
      state.frightenedTimer = Math.max(0, state.frightenedTimer - dt);
      if (state.frightenedTimer === 0) {
        ghosts.forEach((ghost) => {
          if (ghost.state === "frightened") {
            ghost.state = state.mode;
          }
        });
      }
      return;
    }

    state.modeTimer += dt;
    const current = modeCycle[cycleIndex];
    if (state.modeTimer >= current.duration) {
      state.modeTimer = 0;
      cycleIndex = Math.min(cycleIndex + 1, modeCycle.length - 1);
      state.mode = modeCycle[cycleIndex].mode;
      ghosts.forEach((ghost) => {
        if (ghost.state !== "dead") {
          ghost.state = state.mode;
        }
      });
    }
  }

  function applyTunnel(entity) {
    if (entity.x < -TILE / 2) entity.x = WIDTH + TILE / 2;
    if (entity.x > WIDTH + TILE / 2) entity.x = -TILE / 2;
  }

  function movePacman(dt) {
    if (isCentered(pacman.x, pacman.y) && canMove(pacman.x, pacman.y, pacman.nextDir)) {
      pacman.dir = pacman.nextDir;
    }

    if (canMove(pacman.x, pacman.y, pacman.dir)) {
      pacman.x += directions[pacman.dir].x * pacman.speed * dt;
      pacman.y += directions[pacman.dir].y * pacman.speed * dt;
    }

    applyTunnel(pacman);
  }

  function chooseGhostDirection(ghost, target) {
    const { col, row } = getTilePos(ghost.x, ghost.y);
    const possible = [];
    Object.keys(directions).forEach((dir) => {
      if (ghost.state !== "frightened" && ghost.dir) {
        const opposite =
          (ghost.dir === "up" && dir === "down") ||
          (ghost.dir === "down" && dir === "up") ||
          (ghost.dir === "left" && dir === "right") ||
          (ghost.dir === "right" && dir === "left");
        if (opposite) return;
      }
      if (canMove(ghost.x, ghost.y, dir, true)) {
        const nextCol = col + directions[dir].x;
        const nextRow = row + directions[dir].y;
        if (!isWall(nextCol, nextRow)) {
          possible.push({ dir, col: nextCol, row: nextRow });
        }
      }
    });

    if (possible.length === 0) return ghost.dir;

    if (ghost.state === "frightened") {
      const choice = possible[Math.floor(Math.random() * possible.length)];
      return choice.dir;
    }

    let best = possible[0];
    let bestScore = Infinity;
    possible.forEach((option) => {
      const dist = Math.hypot(option.col - target.col, option.row - target.row);
      if (dist < bestScore) {
        bestScore = dist;
        best = option;
      }
    });
    return best.dir;
  }

  function ghostTarget(ghost) {
    if (ghost.state === "dead") {
      return { col: 13, row: 12 };
    }

    if (ghost.state === "scatter") {
      return ghost.scatterTarget;
    }

    const pacTile = getTilePos(pacman.x, pacman.y);
    if (ghost.name === "Blinky") {
      return pacTile;
    }

    if (ghost.name === "Pinky") {
      const dir = directions[pacman.dir];
      return { col: pacTile.col + dir.x * 4, row: pacTile.row + dir.y * 4 };
    }

    if (ghost.name === "Inky") {
      const dir = directions[pacman.dir];
      const ahead = { col: pacTile.col + dir.x * 2, row: pacTile.row + dir.y * 2 };
      const blinkyTile = getTilePos(ghosts[0].x, ghosts[0].y);
      return {
        col: ahead.col + (ahead.col - blinkyTile.col),
        row: ahead.row + (ahead.row - blinkyTile.row),
      };
    }

    if (ghost.name === "Clyde") {
      const ghostTile = getTilePos(ghost.x, ghost.y);
      const dist = Math.hypot(pacTile.col - ghostTile.col, pacTile.row - ghostTile.row);
      if (dist > 8) return pacTile;
      return ghost.scatterTarget;
    }

    return pacTile;
  }

  function moveGhosts(dt) {
    ghosts.forEach((ghost) => {
      const ghostSpeed = ghost.state === "frightened" ? ghost.speed * 0.7 : ghost.speed;
      if (isCentered(ghost.x, ghost.y)) {
        const target = ghostTarget(ghost);
        ghost.dir = chooseGhostDirection(ghost, target);
        if (ghost.state === "dead" && getTilePos(ghost.x, ghost.y).row === 12) {
          ghost.state = state.mode;
        }
      }

      if (canMove(ghost.x, ghost.y, ghost.dir, true)) {
        ghost.x += directions[ghost.dir].x * ghostSpeed * dt;
        ghost.y += directions[ghost.dir].y * ghostSpeed * dt;
      }

      applyTunnel(ghost);
    });
  }

  function eatDots() {
    const { col, row } = getTilePos(pacman.x, pacman.y);
    const cell = maze[row][col];
    if (cell === "." || cell === "o") {
      maze[row][col] = " ";
      state.dotsRemaining -= 1;
      if (cell === ".") {
        state.score += 10;
      } else {
        state.score += 50;
        state.frightenedTimer = 7;
        ghosts.forEach((ghost) => {
          if (ghost.state !== "dead") {
            ghost.state = "frightened";
          }
        });
      }
      updateHud();
      if (state.dotsRemaining <= 0) {
        nextLevel();
      }
    }
  }

  function checkGhostCollisions() {
    ghosts.forEach((ghost) => {
      const dist = Math.hypot(ghost.x - pacman.x, ghost.y - pacman.y);
      if (dist < TILE * 0.6) {
        if (ghost.state === "frightened") {
          ghost.state = "dead";
          ghost.x = 13.5 * TILE;
          ghost.y = 12.5 * TILE;
          state.score += 200;
          updateHud();
        } else if (ghost.state !== "dead") {
          state.lives -= 1;
          updateHud();
          if (state.lives <= 0) {
            state.running = false;
            startScreen.hidden = false;
            statusEl.textContent = "Game Over";
          } else {
            statusEl.textContent = "Try Again";
            resetPositions();
          }
        }
      }
    });
  }

  function drawMaze() {
    ctx.fillStyle = "#000014";
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    for (let row = 0; row < ROWS; row += 1) {
      for (let col = 0; col < COLS; col += 1) {
        const cell = maze[row][col];
        const x = col * TILE;
        const y = row * TILE;

        if (cell === "#") {
          ctx.fillStyle = "#1e2ca8";
          ctx.fillRect(x, y, TILE, TILE);
          ctx.strokeStyle = "#344bff";
          ctx.lineWidth = 2;
          ctx.strokeRect(x + 2, y + 2, TILE - 4, TILE - 4);
        } else if (cell === ".") {
          ctx.fillStyle = "#f9f3d9";
          ctx.beginPath();
          ctx.arc(x + TILE / 2, y + TILE / 2, 3, 0, Math.PI * 2);
          ctx.fill();
        } else if (cell === "o") {
          ctx.fillStyle = "#ffe88f";
          ctx.beginPath();
          ctx.arc(x + TILE / 2, y + TILE / 2, 6, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
  }

  function drawPacman() {
    ctx.fillStyle = "#ffd23c";
    const angle = (Math.sin(Date.now() / 120) + 1) / 4;
    const startAngle = angle * Math.PI;
    const endAngle = (2 - angle) * Math.PI;
    ctx.beginPath();
    ctx.moveTo(pacman.x, pacman.y);
    ctx.arc(pacman.x, pacman.y, pacman.radius, startAngle, endAngle);
    ctx.closePath();
    ctx.fill();
  }

  function drawGhost(ghost) {
    const radius = 10;
    ctx.fillStyle = ghost.state === "frightened" ? "#2c7dff" : ghost.color;
    ctx.beginPath();
    ctx.arc(ghost.x, ghost.y, radius, Math.PI, 0);
    ctx.lineTo(ghost.x + radius, ghost.y + radius);
    ctx.lineTo(ghost.x - radius, ghost.y + radius);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(ghost.x - 4, ghost.y - 2, 3, 0, Math.PI * 2);
    ctx.arc(ghost.x + 4, ghost.y - 2, 3, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#222";
    ctx.beginPath();
    ctx.arc(ghost.x - 4, ghost.y - 2, 1.5, 0, Math.PI * 2);
    ctx.arc(ghost.x + 4, ghost.y - 2, 1.5, 0, Math.PI * 2);
    ctx.fill();
  }

  function render() {
    drawMaze();
    drawPacman();
    ghosts.forEach(drawGhost);
  }

  function update(timestamp) {
    const delta = (timestamp - state.lastTime) / 1000;
    state.lastTime = timestamp;

    if (!state.running) {
      render();
      requestAnimationFrame(update);
      return;
    }

    if (!state.paused) {
      updateMode(delta);
      movePacman(delta);
      eatDots();
      moveGhosts(delta);
      checkGhostCollisions();
    }

    render();
    requestAnimationFrame(update);
  }

  document.addEventListener("keydown", (event) => {
    if (event.code === "Enter" && !state.running) {
      startGame();
      return;
    }
    if (event.code === "KeyP" && state.running) {
      setPaused(!state.paused);
      return;
    }
    const dir = directionKeys[event.code];
    if (dir) {
      pacman.nextDir = dir;
    }
  });

  startButton.addEventListener("click", () => {
    if (!state.running) {
      startGame();
    }
  });

  touchButtons.forEach((button) => {
    button.addEventListener("pointerdown", () => {
      const dir = button.dataset.direction;
      if (dir) {
        pacman.nextDir = dir;
      }
    });
  });

  resetDots();
  updateHud();
  render();
  requestAnimationFrame(update);
})();
