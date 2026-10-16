# Rotation Studio — volleyball visualizer

A complete, **offline-capable** browser application, without external libraries or a server.

## Open it

Open **`index.html`** or **`standalone.html`** — both now contain all their CSS, JavaScript, and icon, so either file works by itself in a full browser. `app.js` and `styles.css` are additionally included as editable source files. It works directly from a local folder (`file://`) and can also be served as a static website. For iPhone, use a real website URL in Safari: publish `index.html` (or the project folder) with GitHub Pages. iOS Files/ChatGPT document previews commonly block JavaScript, so they may only show the static six-player preview, not the interactive controls. There is no sign-in or backend.

For an optional local development server, from this folder run:

```bash
python3 -m http.server 8000
```

Then visit `http://localhost:8000` on the computer. To access it from a phone on the same Wi-Fi, use the computer's LAN IP instead of `localhost` and ensure the firewall allows the connection.

## Features

- Switch **2D tactics** and a **rotatable, perspective-projected 3D court**. The 3D view uses a built-in lightweight Canvas renderer and does **not** require Three.js or an Internet connection.
- Drag players or the volleyball on either view. In 3D, drag an empty area to orbit, and use the mouse wheel, zoom buttons, or touch pinch to zoom.
- Standard clockwise six-position rotations for **5–1** and **6–2** systems.
- In 6–2, the back-row setter is automatically identified as active each rotation.
- Rename players and change jersey numbers with the inspector. Select the ball to adjust its height above the court.
- Four sample animation keyframes per rotation. Add, remove or rename frames; select a frame and drag objects to create custom plays.
- Play, pause, rewind, scrub and adjust animation speed. The ball follows a small arc between frames.
- Autosaves the current draft in `localStorage`. **Save play** retains additional named plays, and **Export** / **Import JSON** works across browsers or devices.
- All app files are local and use zero trackers or remote services.

## Volleyball position conventions

The near court's zones are arranged like this, facing the net:

```text
                NET
     [4]      [3]      [2]
     [5]      [6]      [1]
```

When a team wins the serve back, rotation moves players `1 → 6 → 5 → 4 → 3 → 2 → 1`.

Starting lineup (Rotation 1):

| Zone | 5–1 | 6–2 |
|---|---|---|
| 1 | S | S1 |
| 2 | OH1 | OH1 |
| 3 | MB1 | MB1 |
| 4 | OPP | S2 |
| 5 | OH2 | OH2 |
| 6 | MB2 | MB2 |

The example animations are coaching illustrations, not official overlap/legal-position validation. They do not enforce serve-receive overlap constraints or libero substitutions. Review team-specific rotations and league rules before relying on them competitively.

## Files

- `standalone.html` — complete standalone application, no supporting files required
- `index.html` — identical self-contained main entrypoint with built-in static six-player preview
- `styles.css` — responsive visual styling
- `app.js` — rotation engine, court renderer, touch gestures, animation, storage
- `icon.svg` — favicon

## Browser storage and limitations

- Browser-specific storage can be erased by private mode, clearing website data, or browser policy. **Export JSON** is recommended for important plays.
- The 3D view uses projected shapes, not downloaded character models or WebGL. Camera orbit and moving 3D figures work without dependencies.
- For security, imported JSON files are size-limited and validated. Avoid importing data from sources you do not trust.
- No server, shared accounts, cloud synchronization, overlap validation, or opponent lineup editing is included.

## Deploy for free with GitHub Pages

1. Create a public repository.
2. Upload `index.html` to the root of the repository. It is fully self-contained. (You may upload the other project files too, but they are optional.)
3. In repository Settings → Pages, select **Deploy from a branch**, branch `main`, folder `/ (root)`.
4. Open the website URL provided by GitHub. On iPhone Safari, use **Share → Add to Home Screen** for quick access.

This independent tool is not connected to or affiliated with SetOptics.

## Troubleshooting: no players visible

- Both HTML files include a static **six-player SVG preview** that remains visible if JavaScript cannot run. It disappears once a complete interactive player-and-ball frame has rendered.
- If you still see “Preview only”, you are likely in a file previewer instead of a full web browser. Publish `index.html` to GitHub Pages or another static host and open its URL in Safari or Chrome.
- If the players disappeared after editing positions or importing a file, click **Reset player positions** in Rotation controls. This restores default positions for all six players and recreates the animation frames (you'll be asked before overwriting edits).
- Opening one HTML file from the previous ZIP could fail because `index.html` expected a separate `app.js`. This release embeds everything into both HTML files.
- Browser storage is per origin/device. An HTML file opened from a different path, or a new hosted URL, may not see your old saves. Import a saved JSON backup if necessary.
