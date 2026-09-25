// =============================================================================
// embed.ts — embeddable entry for the main app. Built to a single file
// (assistant/site-conditions.js) that the no-build construction-timelapse app
// lazy-loads when the user clicks the on-page widget.
//
// Deferred login: mountSiteConditions() is only ever called on a user click, so
// the ArcGIS sign-in happens on demand — never at page load. Sign-in uses a
// popup (no page reload), which avoids the parent page's SDK racing to consume
// the OAuth redirect response.
// =============================================================================

// Register the custom elements used by the overlay (side-effect imports).
import "@arcgis/map-components/components/arcgis-map";
import "@arcgis/ai-components/components/arcgis-assistant";
import "@arcgis/ai-components/components/arcgis-assistant-agent";

import { hasAppId, isSignedIn, signIn, addSensorMarkers, buildAssistant } from "./assistant";
import { WEBMAP_ID } from "./config";

const STYLE = `
.sc-overlay { position: fixed; inset: 0; z-index: 100000; display: none;
  background: rgba(3, 8, 20, 0.55); backdrop-filter: blur(2px); }
.sc-overlay.sc-open { display: block; }
.sc-drawer { position: absolute; top: 0; right: 0; height: 100%; width: 440px;
  max-width: 94vw; display: flex; flex-direction: column; background: #0b1220;
  color: #e5eefb; box-shadow: -12px 0 40px rgba(0,0,0,.5);
  font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  --calcite-color-brand: #38e2ea; --calcite-color-brand-hover: #5eeef4;
  --calcite-color-brand-press: #1fb9c1; }
.sc-head { display: flex; align-items: center; justify-content: space-between;
  padding: 12px 14px; border-bottom: 1px solid #1c2a3f;
  background: linear-gradient(180deg, #0e1b2e, #0b1220); }
.sc-title { display: flex; align-items: center; gap: 8px; font-weight: 700; font-size: 15px; letter-spacing: .2px; }
.sc-ai { font-size: 11px; font-weight: 800; letter-spacing: .5px; color: #04212a;
  background: linear-gradient(135deg, #38e2ea, #8b5cf6); border-radius: 6px; padding: 2px 6px; }
.sc-badge { padding: 7px 14px; font-size: 11px; color: #8fa6c4;
  border-bottom: 1px solid #14202f; background: #0a1119; }
.sc-badge b { color: #38e2ea; font-weight: 600; }
.sc-close { background: transparent; border: 0; color: #9fb3cd; font-size: 22px;
  line-height: 1; cursor: pointer; padding: 2px 8px; border-radius: 6px; }
.sc-close:hover { background: #16233a; color: #e5eefb; }
/* The assistant component requires a web map element; keep it in the DOM but
   off-screen so the panel is a clean, chat-only experience. */
.sc-map { position: absolute; left: -10000px; top: 0; width: 320px; height: 320px; pointer-events: none; }
.sc-assistant { flex: 1 1 auto; min-height: 0; }
.sc-assistant arcgis-assistant { height: 100%; }
.sc-msg { padding: 16px; color: #9fb3cd; font-size: 13px; line-height: 1.5; }
.sc-signin { margin: 4px 16px 16px; align-self: flex-start; background: #38e2ea;
  color: #04212a; border: 0; border-radius: 8px; padding: 9px 14px; font-weight: 600; cursor: pointer; }
`;

let overlay: HTMLElement | null = null;

function ensureStyles(): void {
  if (document.getElementById("sc-embed-style")) return;
  const style = document.createElement("style");
  style.id = "sc-embed-style";
  style.textContent = STYLE;
  document.head.appendChild(style);
}

function buildOverlay(): HTMLElement {
  const root = document.createElement("div");
  root.className = "sc-overlay";
  root.innerHTML = `
    <div class="sc-drawer calcite-mode-dark" role="dialog" aria-label="AI Site Analyst">
      <div class="sc-head">
        <div class="sc-title"><span class="sc-ai">AI</span> Site Analyst</div>
        <button class="sc-close" aria-label="Close" type="button">&times;</button>
      </div>
      <div class="sc-badge">Live IoT reasoning · <b>ArcGIS AI Assistant</b> + custom agent (beta)</div>
      <arcgis-map id="sc-map" class="sc-map" item-id="${WEBMAP_ID}"></arcgis-map>
      <div class="sc-assistant" id="sc-assistant-host"></div>
    </div>`;
  root.querySelector(".sc-close")!.addEventListener("click", () => hide());
  root.addEventListener("click", (e) => {
    if (e.target === root) hide();
  });
  const mapEl = root.querySelector("#sc-map") as any;
  mapEl.addEventListener("arcgisViewReadyChange", () => addSensorMarkers(mapEl));
  return root;
}

function show(): void {
  overlay?.classList.add("sc-open");
}
function hide(): void {
  overlay?.classList.remove("sc-open");
}

function renderSignIn(host: HTMLElement, message: string): void {
  host.innerHTML = `<div class="sc-msg">${message}</div>`;
  const btn = document.createElement("button");
  btn.className = "sc-signin";
  btn.type = "button";
  btn.textContent = "Sign in with ArcGIS";
  // A direct click here is a real user gesture with the bundle already loaded,
  // so the sign-in popup won't be blocked.
  btn.addEventListener("click", () => void doSignIn(host));
  host.appendChild(btn);
}

async function doSignIn(host: HTMLElement): Promise<void> {
  host.innerHTML = '<div class="sc-msg">Signing in… (a popup will open)</div>';
  try {
    await signIn(); // opens a popup; resolves when complete
    host.innerHTML = "";
    host.appendChild(buildAssistant());
  } catch {
    renderSignIn(host, "Sign-in was cancelled or blocked. Please allow the popup and try again.");
  }
}

/** Open the assistant panel. Safe to call repeatedly. */
export async function mountSiteConditions(): Promise<void> {
  ensureStyles();
  if (!overlay) {
    overlay = buildOverlay();
    document.body.appendChild(overlay);
  }
  show();

  const host = overlay.querySelector("#sc-assistant-host") as HTMLElement;
  if (host.querySelector("arcgis-assistant")) return; // already mounted

  if (!hasAppId()) {
    host.innerHTML =
      '<div class="sc-msg">This build has no ArcGIS Client ID. Rebuild the widget with VITE_ARCGIS_OAUTH_APP_ID set (see ai/.env.local).</div>';
    return;
  }

  // Silent check (no popup). If a session is already active, mount straight away;
  // otherwise show a button whose click opens the popup within a user gesture.
  host.innerHTML = '<div class="sc-msg">Checking sign-in…</div>';
  if (await isSignedIn()) {
    host.innerHTML = "";
    host.appendChild(buildAssistant());
    return;
  }
  renderSignIn(host, "Sign in with your ArcGIS account to use the assistant.");
}
