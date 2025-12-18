# Neon Midway: Stationary Gallery Shooter

A colorful browser-based gallery shooter tailored for GitHub Pages. You stay planted at the booth while waves of neon targets glide past—click or tap to tag them, chain streaks, and trigger slow-motion prisms.

Play it live on GitHub Pages:
**https://your-username.github.io/FPS/**

> Update the URL above with your GitHub Pages domain if the repository name or account differs.

## How to Play
- **Aim:** Move your mouse or finger to position the crosshair.
- **Shoot:** Click or tap anywhere on the canvas to fire instantly.
- **Score:** Chain hits to build streak multipliers. Slow-motion prisms grant breathing room and big points.
- **Fail State:** Let too many targets slip past and the show ends.

## Features
- Neon-inspired visuals with parallax stars and a reflective arcade floor.
- Varied targets (fast plates, chunky masks, bonus prisms) each with unique speed, health, and rewards.
- Dynamic waves that ramp spawn rates automatically.
- Floating score popups, hit sparks, and slow-motion powerups for flair.
- Responsive canvas that scales up to 16:9 with crisp rendering on high-DPI screens.

## Running Locally
You can open `index.html` directly in a modern browser or serve the folder to avoid CORS quirks:

```bash
python -m http.server 8000
```

Then visit http://localhost:8000 in your browser.

## Deploying to GitHub Pages
1. Push the repository to GitHub.
2. Enable GitHub Pages for the `main` (or relevant) branch and set the root to `/`.
3. Wait a moment for Pages to publish, then update the play link above if needed.
