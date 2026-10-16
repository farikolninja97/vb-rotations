# Rotation Studio v5 — iPhone portrait export fix

## Fixes

- In iPhone portrait view, **Export** and **Save play** are now both always shown in an easy-to-tap second row under the logo. The old CSS hid Export at widths of 610px or less.
- Added a second **Export JSON backup** button in the **Saved plays** panel, convenient when already scrolled down.
- Both buttons export the same complete project JSON; all rotation, 2D/3D, serving/receiving, animation, save, and manual passer features from v4 are retained.
- Self-contained HTML, no additional dependencies.

## Update GitHub Pages

1. Download this version of `index.html`.
2. Replace the root `index.html` in your GitHub repository, then commit the change.
3. Open your existing GitHub Pages address and add `?v=5` to the URL to bypass an old Safari cache.
4. In portrait orientation, look just under the ROTATION STUDIO name for the **Export** and **Save play** buttons. Alternatively scroll to **Saved plays** and tap **Export JSON backup**.

Locally saved plays should remain in the same Safari browser when you update at the **same GitHub Pages URL**. Export backups are recommended before changing URLs, phones, or clearing browser site data.
