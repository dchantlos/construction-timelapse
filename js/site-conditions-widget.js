// =============================================================================
// site-conditions-widget.js — floating launcher for the Site Conditions AI
// assistant on the Current Construction Progress page.
//
// The heavy assistant bundle (ArcGIS AI components) is only fetched when the
// user clicks the widget, and the ArcGIS sign-in is only triggered then too.
// The bundle is produced by ai/ via `npm run build:embed` → ./assistant/.
// =============================================================================

// The built widget bundle lives at <app-root>/assistant/. This module is at
// <app-root>/js/, so the specifier is resolved one level up. This works both
// locally (served at root) and on GitHub Pages (served at /construction-timelapse/).
const EMBED_URL = "../assistant/site-conditions.js?v=13";

let embedPromise = null;

function injectStyles() {
  if (document.getElementById("sc-fab-style")) return;
  const style = document.createElement("style");
  style.id = "sc-fab-style";
  // Matches the app's Help/Resources FABs (js/help.js, js/resources.js) and
  // stacks above them (Resources ~24px, Help ~78px, this ~132px) so the
  // launchers form one tidy column instead of overlapping.
  style.textContent = `
    #sc-fab { position: fixed; right: 18px; bottom: 132px; z-index: 45;
      display: inline-flex; align-items: center; gap: 8px; padding: 9px 15px;
      border-radius: 999px; cursor: pointer; color: #eaf6f7; letter-spacing: .01em;
      font: 600 13px/1 "Inter", "Segoe UI", system-ui, sans-serif;
      border: 1px solid rgba(72,223,229,.42); background: rgba(14,18,32,.66);
      -webkit-backdrop-filter: blur(10px); backdrop-filter: blur(10px);
      box-shadow: 0 10px 30px -12px rgba(0,0,0,.7), 0 0 18px -6px rgba(72,223,229,.6);
      transition: transform .2s ease, box-shadow .2s ease, border-color .2s ease; }
    #sc-fab:hover { transform: translateY(-1px); border-color: rgba(72,223,229,.72);
      box-shadow: 0 10px 30px -10px rgba(0,0,0,.8), 0 0 26px -4px rgba(72,223,229,.9); }
    #sc-fab:focus-visible { outline: 2px solid rgba(72,223,229,.8); outline-offset: 2px; }
    #sc-fab .sc-fab__icon { display: grid; place-items: center; width: 18px; height: 18px;
      border-radius: 50%; background: rgba(72,223,229,.92); color: #04121a;
      box-shadow: 0 0 8px rgba(72,223,229,.7); }
    #sc-fab .sc-fab__icon svg { width: 12px; height: 12px; }
    #sc-fab .sc-fab-label { white-space: nowrap; }
    @media print { #sc-fab { display: none !important; } }
  `;
  document.head.appendChild(style);
}

function createFab() {
  const btn = document.createElement("button");
  btn.id = "sc-fab";
  btn.type = "button";
  btn.title = "Ask the AI Site Analyst";
  btn.setAttribute("aria-label", "Ask the AI Site Analyst");
  btn.innerHTML =
    '<span class="sc-fab__icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l1.9 6.1L20 10l-6.1 1.9L12 18l-1.9-6.1L4 10l6.1-1.9z"/></svg></span>' +
    '<span class="sc-fab-label">AI Site Analyst</span>';
  btn.addEventListener("click", () => openAssistant());
  document.body.appendChild(btn);
}

function loadEmbed() {
  if (!embedPromise) embedPromise = import(EMBED_URL);
  return embedPromise;
}

async function openAssistant() {
  try {
    const mod = await loadEmbed();
    await mod.mountSiteConditions();
  } catch (err) {
    console.error("Failed to open Site Conditions assistant", err);
  }
}

function boot() {
  injectStyles();
  createFab();
}

boot();
