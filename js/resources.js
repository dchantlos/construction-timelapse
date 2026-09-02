// =============================================================================
// resources.js — self-contained "Resources" modal with curated learning links.
// =============================================================================
// Injects its own styles, a floating button stacked just below the Help button,
// and an on-brand modal, so the feature adds zero markup and no visual footprint
// until a user opens it. Load once per page as a module
// <script>. To add a link later, drop an entry into GROUPS below — no layout
// code needed. A `null` href renders a non-clickable "coming soon" card.

const STYLE_ID = "resources-widget-styles";

// Mortarboard "learn" glyph, reused at two sizes (sized via CSS).
const CAP = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21.42 10.92a1 1 0 0 0-.02-1.84L12.83 5.18a2 2 0 0 0-1.66 0L2.6 9.08a1 1 0 0 0 0 1.83l8.57 3.91a2 2 0 0 0 1.66 0z"/><path d="M22 10v6"/><path d="M6 12.5V16a6 3 0 0 0 12 0v-3.5"/></svg>`;

const ARROW = `<svg class="res-card__arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 17 17 7"/><path d="M8 7h9v9"/></svg>`;

const GROUPS = [
  {
    group: "Methodology guide",
    items: [
      {
        badge: "Guide",
        title: "Build a custom ArcGIS web app with AI-Assisted Engineering",
        desc: "The interactive methodology guide behind this app.",
        href: "https://dchantlos.github.io/arcgisdev/"
      }
    ]
  },
  {
    group: "Developer blogs",
    items: [
      {
        badge: "Blog",
        title: "Create a 4D simulation with a scene layer & hosted 3D object — Part 1",
        desc: "ArcGIS Blog · AEC",
        href: "https://www.esri.com/arcgis-blog/products/arcgis-pro/aec/create-a-4d-simulation-with-a-scene-layer-and-hosted-3d-object-part-1"
      },
      {
        badge: "Blog",
        title: "4D simulation leveraging scene layer & hosted 3D object — Part 2",
        desc: "ArcGIS Blog · AEC",
        href: "https://www.esri.com/arcgis-blog/products/arcgis-pro/aec/4d-simulation-leveraging-scene-layer-3d-object-hosted-part-2"
      }
    ]
  },
  {
    group: "About this app",
    items: [
      {
        badge: "Soon",
        title: "Coming soon",
        desc: "",
        href: null
      }
    ]
  }
];

const CSS = `
.res-fab {
  position: fixed; right: 18px; bottom: 24px; z-index: 45;
  display: inline-flex; align-items: center; gap: 8px;
  padding: 9px 15px; border-radius: 999px;
  border: 1px solid rgba(72, 223, 229, 0.42);
  background: rgba(14, 18, 32, 0.66); color: #eaf6f7; cursor: pointer;
  font: 600 13px/1 "Inter", "Segoe UI", system-ui, sans-serif; letter-spacing: 0.01em;
  -webkit-backdrop-filter: blur(10px); backdrop-filter: blur(10px);
  box-shadow: 0 10px 30px -12px rgba(0, 0, 0, 0.7), 0 0 18px -6px rgba(72, 223, 229, 0.6);
  transition: transform .2s ease, box-shadow .2s ease, border-color .2s ease;
}
.res-fab svg { width: 16px; height: 16px; flex-shrink: 0; }
.res-fab:hover {
  transform: translateY(-1px); border-color: rgba(72, 223, 229, 0.72);
  box-shadow: 0 10px 30px -10px rgba(0, 0, 0, 0.8), 0 0 26px -4px rgba(72, 223, 229, 0.9);
}
.res-fab:focus-visible { outline: 2px solid rgba(72, 223, 229, 0.8); outline-offset: 2px; }

.res-modal { position: fixed; inset: 0; z-index: 120; display: grid; place-items: center; padding: 24px; }
.res-modal[hidden] { display: none; }
.res-modal__backdrop {
  position: absolute; inset: 0; background: rgba(3, 5, 12, 0.66);
  -webkit-backdrop-filter: blur(6px); backdrop-filter: blur(6px);
  animation: res-fade .2s ease;
}
.res-modal__panel {
  position: relative; width: min(560px, 100%);
  max-height: min(82vh, 660px); overflow-y: auto;
  padding: 22px 22px 24px; border-radius: 18px;
  border: 1px solid rgba(72, 223, 229, 0.26);
  background: linear-gradient(160deg, rgba(13, 18, 30, 0.97), rgba(6, 9, 16, 0.97));
  box-shadow: 0 30px 80px -24px rgba(0, 0, 0, 0.8), 0 0 60px -30px rgba(72, 223, 229, 0.5);
  animation: res-pop .26s cubic-bezier(0.22, 1, 0.36, 1);
  scrollbar-width: thin; scrollbar-color: rgba(72, 223, 229, 0.4) transparent;
}
.res-modal__panel::-webkit-scrollbar { width: 7px; }
.res-modal__panel::-webkit-scrollbar-thumb { background: rgba(120, 170, 230, 0.28); border-radius: 999px; }
.res-modal__head { display: flex; align-items: center; gap: 12px; margin-bottom: 6px; }
.res-modal__icon {
  display: grid; place-items: center; width: 38px; height: 38px; flex-shrink: 0;
  border-radius: 11px; color: #48dfe5;
  background: rgba(72, 223, 229, 0.10); border: 1px solid rgba(72, 223, 229, 0.3);
}
.res-modal__icon svg { width: 20px; height: 20px; }
.res-modal__titles { flex: 1; min-width: 0; }
.res-modal__title { margin: 0; font-size: 16px; font-weight: 700; letter-spacing: 0.02em; color: #eaf3f5; }
.res-modal__sub { margin: 2px 0 0; font-size: 12px; color: #9fb0c4; }
.res-modal__close {
  flex-shrink: 0; width: 30px; height: 30px; border-radius: 9px;
  border: 1px solid rgba(255, 255, 255, 0.12); background: rgba(255, 255, 255, 0.04);
  color: #c7d2e0; font-size: 13px; cursor: pointer;
  transition: background .2s ease, color .2s ease, border-color .2s ease;
}
.res-modal__close:hover { background: rgba(251, 113, 133, 0.14); border-color: rgba(251, 113, 133, 0.4); color: #fff; }

.res-group { margin-top: 18px; }
.res-group__label {
  font-size: 10.5px; font-weight: 700; text-transform: uppercase;
  letter-spacing: 0.08em; color: #7f93ab; margin-bottom: 8px;
}
.res-card {
  display: flex; align-items: center; gap: 12px;
  padding: 12px 14px; margin-bottom: 8px; border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.07); background: rgba(255, 255, 255, 0.025);
  text-decoration: none; color: inherit; cursor: pointer;
  transition: background .2s ease, border-color .2s ease, transform .2s ease;
}
.res-card:last-child { margin-bottom: 0; }
.res-card:hover { background: rgba(72, 223, 229, 0.09); border-color: rgba(72, 223, 229, 0.32); transform: translateX(2px); }
.res-card:focus-visible { outline: 2px solid rgba(72, 223, 229, 0.8); outline-offset: 2px; }
.res-card__badge {
  flex-shrink: 0; align-self: flex-start; padding: 3px 9px; border-radius: 999px;
  font-size: 10px; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase;
  color: #0a1418; background: #48dfe5;
}
.res-card__badge--soon { background: rgba(255, 255, 255, 0.14); color: #c7d2e0; }
.res-card__body { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 3px; }
.res-card__title { font-size: 13.5px; font-weight: 600; line-height: 1.3; color: #e9eff8; }
.res-card__desc { font-size: 11.5px; color: #93a4b8; }
.res-card__arrow { width: 16px; height: 16px; flex-shrink: 0; color: #6f8296; transition: color .2s ease, transform .2s ease; }
.res-card:hover .res-card__arrow { color: #48dfe5; transform: translate(1px, -1px); }
.res-card--soon { cursor: default; opacity: 0.72; }
.res-card--soon:hover { background: rgba(255, 255, 255, 0.025); border-color: rgba(255, 255, 255, 0.07); transform: none; }

@keyframes res-fade { from { opacity: 0; } to { opacity: 1; } }
@keyframes res-pop { from { opacity: 0; transform: translateY(10px) scale(0.985); } to { opacity: 1; transform: none; } }
@media (prefers-reduced-motion: reduce) { .res-modal__panel, .res-modal__backdrop { animation: none; } }
@media print { .res-fab { display: none !important; } }
`;

function injectStyles() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = CSS;
  document.head.appendChild(style);
}

function esc(value) {
  return String(value).replace(
    /[&<>"]/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])
  );
}

function cardHtml(item) {
  const desc = item.desc
    ? `<span class="res-card__desc">${esc(item.desc)}</span>`
    : "";
  const inner = `
      <span class="res-card__badge${item.href ? "" : " res-card__badge--soon"}">${esc(item.badge)}</span>
      <span class="res-card__body">
        <span class="res-card__title">${esc(item.title)}</span>
        ${desc}
      </span>`;
  return item.href
    ? `<a class="res-card" href="${esc(item.href)}" target="_blank" rel="noopener noreferrer">${inner}${ARROW}</a>`
    : `<div class="res-card res-card--soon" aria-disabled="true">${inner}</div>`;
}

function buildModal() {
  const overlay = document.createElement("div");
  overlay.className = "res-modal";
  overlay.id = "resModal";
  overlay.setAttribute("role", "dialog");
  overlay.setAttribute("aria-modal", "true");
  overlay.setAttribute("aria-labelledby", "resModalTitle");
  overlay.hidden = true;

  const groups = GROUPS.map(
    (g) => `
    <div class="res-group">
      <div class="res-group__label">${esc(g.group)}</div>
      ${g.items.map(cardHtml).join("")}
    </div>`
  ).join("");

  overlay.innerHTML = `
    <div class="res-modal__backdrop" data-res-close></div>
    <div class="res-modal__panel" role="document">
      <div class="res-modal__head">
        <span class="res-modal__icon">${CAP}</span>
        <div class="res-modal__titles">
          <h2 class="res-modal__title" id="resModalTitle">Resources</h2>
          <p class="res-modal__sub">Learn the tech behind this app</p>
        </div>
        <button class="res-modal__close" type="button" data-res-close aria-label="Close resources">&#10005;</button>
      </div>
      <div class="res-modal__body">${groups}</div>
    </div>`;

  document.body.appendChild(overlay);
  return overlay;
}

function buildFab() {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "res-fab";
  btn.setAttribute("aria-haspopup", "dialog");
  btn.setAttribute("aria-expanded", "false");
  btn.title = "Resources — blogs & developer guides";
  btn.innerHTML = `${CAP}<span class="res-fab__label">Resources</span>`;
  return btn;
}

function init() {
  if (document.getElementById("resModal")) return;

  injectStyles();
  const modal = buildModal();
  const fab = buildFab();
  document.body.appendChild(fab);

  // Raise the Help button so this one sits just below it (bottom-right stack).
  const raiseHelp = () =>
    document.querySelector(".help-fab")?.classList.add("help-fab--raised");
  raiseHelp();
  requestAnimationFrame(raiseHelp);

  let lastFocus = null;
  const open = () => {
    lastFocus = document.activeElement;
    modal.hidden = false;
    fab.setAttribute("aria-expanded", "true");
    requestAnimationFrame(() =>
      modal.querySelector(".res-modal__close")?.focus()
    );
  };
  const close = () => {
    modal.hidden = true;
    fab.setAttribute("aria-expanded", "false");
    if (lastFocus && typeof lastFocus.focus === "function") lastFocus.focus();
  };

  fab.addEventListener("click", open);
  modal.addEventListener("click", (e) => {
    if (e.target.closest("[data-res-close]")) close();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !modal.hidden) close();
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
