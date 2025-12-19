(() => {
  "use strict";

  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");
  const scoreEl = document.getElementById("score");
  const livesEl = document.getElementById("lives");
  const statusEl = document.getElementById("status");
  const levelEl = document.getElementById("level");
  const highScoreEl = document.getElementById("highScore");
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

  const LEVELS = [
    {
      name: "Classic",
      scatterTimes: [7, 7, 5],
      chaseTimes: [20, 20, 999],
      maze: [
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
      ],
    },
    {
      name: "Turbo",
      scatterTimes: [6, 6, 4],
      chaseTimes: [20, 20, 999],
      maze: [
        "############################",
        "#............##............#",
        "#.####.#####.##.#####.####.#",
        "#o####.#####.##.#####.####o#",
        "#.####.#####.##.#####.####.#",
        "#............##............#",
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
      ],
    },
    {
      name: "Maze Remix",
      scatterTimes: [7, 7, 5],
      chaseTimes: [18, 20, 999],
      maze: [
        "############################",
        "#............##............#",
        "#.####.#####.##.#####.####.#",
        "#o####.#####.##.#####.####o#",
        "#...............##.........#",
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
      ],
    },
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
    highScore: Number(localStorage.getItem("pacman-highscore") || 0),
    lives: 3,
    level: 1,
    dotsRemaining: 0,
    dotsEaten: 0,
    mode: "scatter",
    modeTimer: 0,
    frightenedTimer: 0,
    frightenedFlash: 0,
    lastTime: 0,
    readyTimer: 0,
    ghostCombo: 0,
    fruit: null,
    fruitTimer: 0,
  };

  let modeCycle = buildModeCycle(LEVELS[0]);
  let cycleIndex = 0;

  const pacman = {
    x: 13.5 * TILE,
    y: 29.5 * TILE,
    dir: "left",
    nextDir: "left",
    speed: 120,
    radius: 9,
    mouthTimer: 0,
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
      home: { col: 13, row: 11 },
      releaseDots: 0,
      released: true,
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
      home: { col: 12, row: 13 },
      releaseDots: 10,
      released: false,
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
      home: { col: 13, row: 13 },
      releaseDots: 30,
      released: false,
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
      home: { col: 14, row: 13 },
      releaseDots: 60,
      released: false,
    },
  ];

  const maze = LEVELS[0].maze.map((row) => row.split(""));

  function buildModeCycle(level) {
    const cycle = [];
    const pairs = Math.max(level.scatterTimes.length, level.chaseTimes.length);
    for (let index = 0; index < pairs; index += 1) {
      const scatter = level.scatterTimes[index];
      if (scatter !== undefined) {
        cycle.push({ mode: "scatter", duration: scatter });
      }
      const chase = level.chaseTimes[index];
      if (chase !== undefined) {
        cycle.push({ mode: "chase", duration: chase });
      }
    }
    return cycle;
  }

  function currentLevelConfig() {
    const index = (state.level - 1) % LEVELS.length;
    return LEVELS[index];
  }

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
    state.dotsEaten = 0;
    const level = currentLevelConfig();
    level.maze.forEach((row, rowIndex) => {
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
    pacman.mouthTimer = 0;
    ghosts.forEach((ghost) => {
      ghost.x = ghost.home.col * TILE + TILE / 2;
      ghost.y = ghost.home.row * TILE + TILE / 2;
      ghost.dir = "left";
      ghost.state = state.mode;
      ghost.released = ghost.name === "Blinky";
    });
    state.readyTimer = 2.2;
    state.ghostCombo = 0;
  }

  function updateHud() {
    scoreEl.textContent = state.score.toString().padStart(6, "0");
    livesEl.textContent = state.lives.toString();
    levelEl.textContent = `${state.level}`;
    highScoreEl.textContent = state.highScore.toString().padStart(6, "0");
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
    state.frightenedFlash = 0;
    cycleIndex = 0;
    modeCycle = buildModeCycle(currentLevelConfig());
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
    state.frightenedTimer = 0;
    state.frightenedFlash = 0;
    cycleIndex = 0;
    modeCycle = buildModeCycle(currentLevelConfig());
    resetDots();
    resetPositions();
    statusEl.textContent = `Level ${state.level}`;
    updateHud();
  }

  function setPaused(value) {
    state.paused = value;
    statusEl.textContent = value ? "Paused" : "Ready!";
  }

  function updateMode(dt) {
    if (state.frightenedTimer > 0) {
      state.frightenedTimer = Math.max(0, state.frightenedTimer - dt);
      if (state.frightenedTimer < 2) {
        state.frightenedFlash += dt;
      }
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
    if (current && state.modeTimer >= current.duration) {
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
    if (state.readyTimer > 0) return;
    if (isCentered(pacman.x, pacman.y) && canMove(pacman.x, pacman.y, pacman.nextDir)) {
      pacman.dir = pacman.nextDir;
    }

    if (canMove(pacman.x, pacman.y, pacman.dir)) {
      pacman.x += directions[pacman.dir].x * pacman.speed * dt;
      pacman.y += directions[pacman.dir].y * pacman.speed * dt;
      pacman.mouthTimer += dt;
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

  function shouldReleaseGhost(ghost) {
    return state.dotsEaten >= ghost.releaseDots;
  }

  function moveGhosts(dt) {
    ghosts.forEach((ghost) => {
      if (!ghost.released) {
        if (shouldReleaseGhost(ghost)) {
          ghost.released = true;
        } else {
          return;
        }
      }
    });

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
    return best.dir;
  }

  function maybeSpawnFruit() {
    if (state.fruit || state.dotsRemaining <= 0) return;
    if (state.dotsEaten === 70 || state.dotsEaten === 170) {
      state.fruit = {
        x: 13.5 * TILE,
        y: 17.5 * TILE,
        value: 100 + state.level * 50,
      };
      state.fruitTimer = 10;
    }

  function updateFruit(dt) {
    if (!state.fruit) return;
    state.fruitTimer = Math.max(0, state.fruitTimer - dt);
    if (state.fruitTimer === 0) {
      state.fruit = null;
    }
  }

  function eatDots() {
    const { col, row } = getTilePos(pacman.x, pacman.y);
    const cell = maze[row][col];
    if (cell === "." || cell === "o") {
      maze[row][col] = " ";
      state.dotsRemaining -= 1;
      state.dotsEaten += 1;
      if (cell === ".") {
        state.score += 10;
      } else {
        state.score += 50;
        state.frightenedTimer = 7;
        state.frightenedFlash = 0;
        state.ghostCombo = 0;
        ghosts.forEach((ghost) => {
          if (ghost.state !== "dead") {
            ghost.state = "frightened";
          }
        });
      }
      updateHud();
      maybeSpawnFruit();
      if (state.dotsRemaining <= 0) {
        nextLevel();
      }
    }

  function eatFruit() {
    if (!state.fruit) return;
    const dist = Math.hypot(state.fruit.x - pacman.x, state.fruit.y - pacman.y);
    if (dist < TILE * 0.6) {
      state.score += state.fruit.value;
      state.fruit = null;
      updateHud();
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
          state.ghostCombo += 1;
          const ghostScore = 200 * Math.pow(2, state.ghostCombo - 1);
          state.score += ghostScore;
          updateHud();
        } else if (ghost.state !== "dead") {
          state.lives -= 1;
          updateHud();
          if (state.lives <= 0) {
            endGame();
          } else {
            statusEl.textContent = "Try Again";
            resetPositions();
          }
        }
      }
    });
  }

  function endGame() {
    state.running = false;
    startScreen.hidden = false;
    statusEl.textContent = "Game Over";
    if (state.score > state.highScore) {
      state.highScore = state.score;
      localStorage.setItem("pacman-highscore", state.highScore);
      updateHud();
    }

    return pacTile;
  }

  function updateHighScore() {
    if (state.score > state.highScore) {
      state.highScore = state.score;
      localStorage.setItem("pacman-highscore", state.highScore);
      updateHud();
    }
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
          const pulse = Math.sin(Date.now() / 200) * 1.5 + 6;
          ctx.beginPath();
          ctx.arc(x + TILE / 2, y + TILE / 2, pulse, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
  }

  function drawPacman() {
    const chew = (Math.sin(pacman.mouthTimer * 12) + 1) / 3 + 0.2;
    const angle = chew * Math.PI;
    const startAngle = angle * Math.sign(directions[pacman.dir].x || 1);
    const endAngle = (2 - chew) * Math.PI * Math.sign(directions[pacman.dir].x || 1);

    ctx.fillStyle = "#ffd23c";
    ctx.beginPath();
    ctx.moveTo(pacman.x, pacman.y);
    ctx.arc(pacman.x, pacman.y, pacman.radius, startAngle, endAngle);
    ctx.closePath();
    ctx.fill();
  }

  function drawGhost(ghost) {
    const radius = 10;
    const frightened = ghost.state === "frightened";
    const flashing = frightened && state.frightenedTimer < 2 && Math.floor(state.frightenedFlash * 6) % 2 === 0;

    ctx.fillStyle = frightened ? (flashing ? "#fff" : "#2c7dff") : ghost.color;
    ctx.beginPath();
    ctx.arc(ghost.x, ghost.y, radius, Math.PI, 0);
    ctx.lineTo(ghost.x + radius, ghost.y + radius);
    ctx.lineTo(ghost.x - radius, ghost.y + radius);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = frightened ? (flashing ? "#2c7dff" : "#fff") : "#fff";
    ctx.beginPath();
    ctx.arc(ghost.x - 4, ghost.y - 2, 3, 0, Math.PI * 2);
    ctx.arc(ghost.x + 4, ghost.y - 2, 3, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = frightened ? "#222" : "#222";
    ctx.beginPath();
    ctx.arc(ghost.x - 4, ghost.y - 2, 1.5, 0, Math.PI * 2);
    ctx.arc(ghost.x + 4, ghost.y - 2, 1.5, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawFruit() {
    if (!state.fruit) return;
    ctx.fillStyle = "#ff5f5f";
    ctx.beginPath();
    ctx.arc(state.fruit.x, state.fruit.y, 7, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawReadyOverlay() {
    if (state.readyTimer <= 0 || !state.running) return;
    ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    ctx.fillStyle = "#ffd23c";
    ctx.font = "bold 28px 'Segoe UI'";
    ctx.textAlign = "center";
    ctx.fillText("READY!", WIDTH / 2, HEIGHT / 2);
  }

  function render() {
    drawMaze();
    drawFruit();
    drawPacman();
    ghosts.forEach(drawGhost);
    drawReadyOverlay();
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
      if (state.readyTimer > 0) {
        state.readyTimer = Math.max(0, state.readyTimer - delta);
      } else {
        updateMode(delta);
        movePacman(delta);
        eatDots();
        eatFruit();
        moveGhosts(delta);
        checkGhostCollisions();
      }
      updateFruit(delta);
      updateHighScore();
    }

    render();
    requestAnimationFrame(update);
  }

  function setDirection(dir) {
    if (dir) {
      pacman.nextDir = dir;
    }
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
    setDirection(dir);
  });

  startButton.addEventListener("click", () => {
    if (!state.running) {
      startGame();
    }
  });

  touchButtons.forEach((button) => {
    button.addEventListener("pointerdown", () => {
      const dir = button.dataset.direction;
      setDirection(dir);
    });
  });

  let swipeStart = null;
  canvas.addEventListener("pointerdown", (event) => {
    swipeStart = { x: event.clientX, y: event.clientY };
  });

  canvas.addEventListener("pointerup", (event) => {
    if (!swipeStart) return;
    const dx = event.clientX - swipeStart.x;
    const dy = event.clientY - swipeStart.y;
    swipeStart = null;

    if (Math.abs(dx) < 20 && Math.abs(dy) < 20) return;
    if (Math.abs(dx) > Math.abs(dy)) {
      setDirection(dx > 0 ? "right" : "left");
    } else {
      setDirection(dy > 0 ? "down" : "up");
    }
  });

  resetDots();
  updateHud();
  render();
  requestAnimationFrame(update);
})();
