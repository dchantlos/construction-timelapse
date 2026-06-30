# Construction Timelapse

A futuristic, glassmorphism **4D construction-monitoring dashboard** built on the
[ArcGIS Maps SDK for JavaScript (5.x)](https://developers.arcgis.com/javascript/).
It plays a 3D building's construction sequence over time — a living digital twin —
with a cinematic camera orbit, interactive layer isolation, and a real-time progress HUD.


## Features

- **Cinematic playback** — a single Play button drives the construction timeline with
  a smooth, framerate-independent camera orbit and an inline progress bar.
- **4D time animation** — a headless `TimeSlider` drives time-aware scene layers so the
  building assembles slab-by-slab, structure, walls, envelope, roofing, and finishes.
- **Interactive layer isolation** — click any construction layer in the dashboard to
  ghost the rest; **Reset** restores the full model.
- **Live progress HUD** — completion ring, current phase, active layer count, and
  elapsed / remaining days, all updated reactively from the time extent.
- **Custom hit-test tooltips** — hover any building element for a glass tooltip with
  status and phase.
- **Glassmorphism UI** — WCAG-tuned contrast, neon-cyan accents, and a dark digital-twin aesthetic.

## Tech

- ArcGIS Maps SDK for JavaScript **5.1** (loaded as ES modules from the CDN via an import map)
- Vanilla JavaScript (ES modules), HTML, and CSS — no build step required

## Run locally

ES modules must be served over HTTP (not opened from `file://`). Any static server works:

```bash
# Python 3
python -m http.server 5500
```

Then open <http://localhost:5500>.

## Project structure

```
4d-construction-monitor/
├─ index.html          UI shell: glass overlay, dashboard, dock, tooltip
├─ css/styles.css      Design tokens + glassmorphism + ArcGIS widget overrides
├─ js/
│  ├─ app.js           Boot orchestration
│  ├─ config.js        WebScene id, layers, phases, time config
│  ├─ scene.js         WebScene + SceneView, lighting, time-extent resolution
│  ├─ dashboard.js     Live progress HUD + layer list
│  ├─ layers.js        Layer isolation control
│  ├─ cinematic.js     Timeline playback + camera orbit
│  └─ interaction.js   Hit-test highlighting + tooltip
└─ assets/             Esri logo
```

## Credits

Built with the ArcGIS Maps SDK for JavaScript. Esri and ArcGIS are trademarks of Esri.
