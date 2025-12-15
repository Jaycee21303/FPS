# Browser FPS Prototype

A lightweight Three.js target-practice arena that runs entirely in the browser. Drop the files on any static host (including GitHub Pages) and play instantly.

## How to Run

1. Upload the repository contents to your GitHub repo.
2. Open **Settings → Pages** and set Source to the `main` branch with the `/root` folder.
3. Visit the Pages URL and click the overlay to start (the browser will request fullscreen + pointer lock).
4. To test locally, run any static server (for example: `python -m http.server 8000`) and open `http://localhost:8000`.

## Controls

- Move: **W A S D** (or arrow keys)
- Look: Mouse
- Shoot: Left click
- Pause/Resume: **ESC**

## Notes

- 100% client-side—no installs or backend required.
- Optimized for Chromium-based browsers on desktop.
- Pointer lock/fullscreen must be accepted for aiming and capturing the mouse.
