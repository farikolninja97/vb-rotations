# Rotation Studio v3 — Serving / Receiving

One-file volleyball rotation visualizer. Requires no build process, libraries or paid hosting.

## Update your existing GitHub Pages app (iPhone-friendly)

1. If you have important edits, open your existing live app and use **Export** to back up the play as JSON.
2. Open the **root folder** of your GitHub repository, then open `index.html`.
3. Edit/replace it with the new `index.html` from this download (the complete file, not just a snippet). Alternatively upload and commit the new file to the root of the repository.
4. Commit the change to the same branch GitHub Pages publishes (`main`, unless you configured a different branch).
5. After deployment, open your original GitHub Pages URL with `?v=3` appended (or `&v=3` if your URL already contains `?`) to bypass an old browser cache. Example: `https://username.github.io/repository/?v=3`.

Only **index.html** is necessary; it includes CSS, JavaScript and a fallback six-player preview. `standalone.html` is identical and provided for convenience. You do not need to upload a ZIP to GitHub.

## New features

- **Serving**: zone 1 is the current server and starts behind the end line. Playback shows serve, defense and offense transition.
- **Receiving**: starts in rotational zone order. Pick **3-player** or **2-player** receive. Suggested passers are highlighted. Playback shows first pass, setter transition and attack approach.
- Both 5-1 and 6-2 systems support all six rotations in both modes.
- The current rotation, mode and passer option have their own saved animation keyframes. Switching between setups remembers changes rather than silently resetting them.
- Drag players and ball to adjust each keyframe. All original 2D/3D views, touch controls and local saving remain available.
- Prior-version saved plays remain readable; a previously saved draft retains its existing keyframes. Existing v2 saves without a specified mode open in Receiving mode.

## Notes

- The receive presets preserve basic front/back and left-to-right rotational ordering, but this app does **not** check overlap faults based on players' actual feet, substitutions, or league-specific rules. Coaches should verify serve-receive layouts before game use.
- All changes save in the **same browser/site storage**. If you change the domain or clear Safari site data you may lose stored drafts; export JSON backups as needed.
- Mode and system controls are under **Rotation controls**, below `Offensive system`.

## Local testing

Open `index.html` directly in a full desktop browser or serve with `python3 -m http.server 8000`. For iPhone, use your published GitHub Pages URL in Safari, not the file previewer.
