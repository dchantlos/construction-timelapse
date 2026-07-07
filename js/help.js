// =============================================================================
// help.js — floating, draggable "Help" window with per-screen guides
// =============================================================================
//
// Self-contained widget: injects its own styles, builds a Help FAB and an
// expandable accordion panel, and wires open/close, Esc-to-close, an accordion,
// and header dragging. Auto-initialises from `<body data-help="…">`, so any
// page just needs that attribute plus a module <script> to this file.
//

import { HELP_CONTENT } from "./help-content.js?v=1";

const STYLE_ID = "help-widget-styles";

const CSS = `
.help-fab {
  position: fixed; right: 18px; bottom: 24px; z-index: 45;
  display: flex; align-items: center; gap: 8px;
  padding: 9px 15px; border-radius: 999px;
  border: 1px solid rgba(72, 223, 229, 0.42);
  background: rgba(14, 18, 32, 0.66); color: #eaf6f7;
  font: 600 13px/1 "Inter", "Segoe UI", system-ui, sans-serif; cursor: pointer;
  -webkit-backdrop-filter: blur(10px); backdrop-filter: blur(10px);
  box-shadow: 0 10px 30px -12px rgba(0, 0, 0, 0.7), 0 0 18px -6px rgba(72, 223, 229, 0.6);
  transition: opacity .2s ease, transform .2s ease, box-shadow .2s ease;
}
.help-fab--raised { bottom: 78px; }
.help-fab:hover {
  transform: translateY(-1px);
  box-shadow: 0 10px 30px -10px rgba(0, 0, 0, 0.8), 0 0 26px -4px rgba(72, 223, 229, 0.9);
}
.help-fab.is-hidden { opacity: 0; pointer-events: none; transform: translateY(8px); }
.help-fab__icon {
  display: grid; place-items: center; width: 18px; height: 18px; border-radius: 50%;
  background: rgba(72, 223, 229, 0.92); color: #04121a; font-weight: 800; font-size: 12px;
  box-shadow: 0 0 8px rgba(72, 223, 229, 0.7);
}

.help-panel {
  position: fixed; right: 18px; bottom: 24px; z-index: 46;
  width: min(360px, calc(100vw - 36px)); max-height: min(70vh, 560px);
  display: flex; flex-direction: column;
  border-radius: 16px; border: 1px solid rgba(72, 223, 229, 0.28);
  background: rgba(14, 18, 32, 0.88); color: #dbe7f2;
  -webkit-backdrop-filter: blur(16px) saturate(140%); backdrop-filter: blur(16px) saturate(140%);
  box-shadow: 0 22px 60px -18px rgba(0, 0, 0, 0.85), 0 0 30px -10px rgba(72, 223, 229, 0.4);
  opacity: 0; pointer-events: none; transform: translateY(10px);
  transition: opacity .22s ease, transform .22s ease; overflow: hidden;
  font-family: "Inter", "Segoe UI", system-ui, sans-serif;
}
.help-panel.is-open { opacity: 1; pointer-events: auto; transform: none; }
.help-panel.is-dragging {
  transition: none;
  box-shadow: 0 26px 64px -14px rgba(0, 0, 0, 0.9), 0 0 36px -8px rgba(72, 223, 229, 0.55);
}
.help-panel__head {
  display: flex; align-items: center; justify-content: space-between;
  padding: 12px 14px; border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  cursor: grab; user-select: none; touch-action: none;
  background: linear-gradient(180deg, rgba(56, 226, 234, 0.08), transparent);
}
.help-panel__head:active { cursor: grabbing; }
.help-panel__title {
  font-size: 13px; font-weight: 700; letter-spacing: .02em;
  color: #6bf0f5; text-shadow: 0 0 10px rgba(72, 223, 229, 0.45);
}
.help-panel__close {
  border: none; background: transparent; color: #9fb2c4; font-size: 14px;
  cursor: pointer; padding: 2px 6px; border-radius: 8px;
  transition: color .15s ease, background .15s ease;
}
.help-panel__close:hover { color: #fff; background: rgba(255, 255, 255, 0.08); }

.help-panel__body {
  overflow-y: auto; padding: 12px 14px 14px;
  scrollbar-width: thin; scrollbar-color: rgba(56, 226, 234, 0.4) transparent;
}
.help-panel__body::-webkit-scrollbar { width: 6px; }
.help-panel__body::-webkit-scrollbar-thumb { background: rgba(56, 226, 234, 0.35); border-radius: 999px; }
.help-panel__body::-webkit-scrollbar-track { background: transparent; }
.help-intro { margin: 0 0 10px; font-size: 12.5px; line-height: 1.55; color: #afc0d8; }

.help-item { border-top: 1px solid rgba(255, 255, 255, 0.06); }
.help-item:first-of-type { border-top: none; }
.help-item__q {
  width: 100%; display: flex; align-items: center; justify-content: space-between; gap: 10px;
  padding: 10px 2px; border: none; background: transparent; color: #eaf1fb;
  font: 600 13px/1.3 "Inter", "Segoe UI", system-ui, sans-serif;
  text-align: left; cursor: pointer; transition: color .15s ease;
}
.help-item__q:hover { color: #6bf0f5; }
.help-item__chev { color: #6bf0f5; font-size: 13px; transition: transform .2s ease; flex-shrink: 0; }
.help-item.is-open .help-item__chev { transform: rotate(180deg); }
.help-item__a {
  max-height: 0; overflow: hidden; font-size: 12.5px; line-height: 1.55; color: #b7c6dd;
  transition: max-height .25s ease, padding .25s ease;
}
.help-item.is-open .help-item__a { max-height: 460px; padding: 0 2px 11px; }
.help-item__a ul { margin: 6px 0 0; padding-left: 18px; }
.help-item__a li { margin: 3px 0; }
.help-item__a strong { color: #ddeaf7; font-weight: 700; }

@media print { .help-fab, .help-panel { display: none !important; } }
`;

/** Inject the widget stylesheet once. */
function injectStyles() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = CSS;
  document.head.appendChild(style);
}

/** Tiny element factory. `html` is only ever trusted, authored content. */
function el(tag, className, html) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (html != null) node.innerHTML = html;
  return node;
}

/**
 * Build and mount the Help FAB + floating panel for a given page.
 * @param {"index"|"progress"|"report"} pageKey
 * @returns {{ open: () => void, close: () => void } | null}
 */
export function createHelp(pageKey) {
  const content = HELP_CONTENT[pageKey];
  if (!content) return null;
  injectStyles();

  // --- FAB ------------------------------------------------------------------
  const fab = el("button", "help-fab");
  fab.type = "button";
  fab.setAttribute("aria-label", "Open the on-screen guide");
  fab.title = "What am I looking at? — open the guide";
  fab.innerHTML =
    '<span class="help-fab__icon" aria-hidden="true">?</span><span class="help-fab__label">Help</span>';
  // Sit above the Esri badge where one is present (index / progress views).
  if (document.querySelector(".esri-badge")) fab.classList.add("help-fab--raised");

  // --- Panel ----------------------------------------------------------------
  const panel = el("section", "help-panel");
  panel.setAttribute("role", "dialog");
  panel.setAttribute("aria-label", "On-screen guide");

  const head = el("header", "help-panel__head");
  head.appendChild(el("span", "help-panel__title", content.title));
  const closeBtn = el("button", "help-panel__close");
  closeBtn.type = "button";
  closeBtn.setAttribute("aria-label", "Close guide");
  closeBtn.innerHTML = "✕";
  head.appendChild(closeBtn);

  const body = el("div", "help-panel__body");
  if (content.intro) body.appendChild(el("p", "help-intro", content.intro));

  content.sections.forEach((sec, i) => {
    const item = el("div", "help-item" + (i === 0 ? " is-open" : ""));
    const q = el("button", "help-item__q");
    q.type = "button";
    q.innerHTML = `<span>${sec.q}</span><span class="help-item__chev" aria-hidden="true">⌄</span>`;
    const a = el("div", "help-item__a", sec.a);
    q.addEventListener("click", () => item.classList.toggle("is-open"));
    item.appendChild(q);
    item.appendChild(a);
    body.appendChild(item);
  });

  panel.appendChild(head);
  panel.appendChild(body);
  document.body.appendChild(fab);
  document.body.appendChild(panel);

  // --- Open / close ---------------------------------------------------------
  function open() {
    panel.classList.add("is-open");
    fab.classList.add("is-hidden");
  }
  function close() {
    panel.classList.remove("is-open");
    fab.classList.remove("is-hidden");
  }
  fab.addEventListener("click", open);
  closeBtn.addEventListener("click", close);
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && panel.classList.contains("is-open")) close();
  });

  // --- Dragging: grab the header to float the window anywhere ---------------
  let dragging = false;
  let offsetX = 0;
  let offsetY = 0;

  head.addEventListener("pointerdown", (e) => {
    if (e.target.closest(".help-panel__close")) return; // let close work
    const rect = panel.getBoundingClientRect();
    // Anchor to left/top so we can move freely (overrides CSS right/bottom).
    panel.style.left = `${rect.left}px`;
    panel.style.top = `${rect.top}px`;
    panel.style.right = "auto";
    panel.style.bottom = "auto";
    offsetX = e.clientX - rect.left;
    offsetY = e.clientY - rect.top;
    dragging = true;
    panel.classList.add("is-dragging");
    head.setPointerCapture?.(e.pointerId);
  });
  window.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    const w = panel.offsetWidth;
    const h = panel.offsetHeight;
    const x = Math.max(8, Math.min(window.innerWidth - w - 8, e.clientX - offsetX));
    const y = Math.max(8, Math.min(window.innerHeight - h - 8, e.clientY - offsetY));
    panel.style.left = `${x}px`;
    panel.style.top = `${y}px`;
  });
  window.addEventListener("pointerup", (e) => {
    if (!dragging) return;
    dragging = false;
    panel.classList.remove("is-dragging");
    head.releasePointerCapture?.(e.pointerId);
  });

  return { open, close };
}

// --- Auto-init from <body data-help="…"> ------------------------------------
function autoInit() {
  const key = document.body?.dataset?.help;
  if (key) createHelp(key);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", autoInit);
} else {
  autoInit();
}
