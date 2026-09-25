// =============================================================================
// main.ts — wires the map, deferred OAuth sign-in, and the assistant panel.
//
// Deferred login: nothing about auth runs at page load. The ArcGIS sign-in is
// triggered only when the user clicks "Ask the site conditions" (or when they
// return already signed-in). Only then is the assistant + custom agent mounted.
// =============================================================================

// Registering the custom elements (side-effect imports).
import "@arcgis/map-components/components/arcgis-map";
import "@arcgis/ai-components/components/arcgis-assistant";
import "@arcgis/ai-components/components/arcgis-assistant-agent";
import "@arcgis/ai-components/components/arcgis-assistant-navigation-agent";

import esriConfig from "@arcgis/core/config.js";
import esriId from "@arcgis/core/identity/IdentityManager.js";
import OAuthInfo from "@arcgis/core/identity/OAuthInfo.js";
import Graphic from "@arcgis/core/Graphic.js";
import Point from "@arcgis/core/geometry/Point.js";
import GraphicsLayer from "@arcgis/core/layers/GraphicsLayer.js";
import SimpleMarkerSymbol from "@arcgis/core/symbols/SimpleMarkerSymbol.js";

import { PORTAL_URL, OAUTH_APP_ID, SITE, SENSOR_MARKERS } from "./config";
import { SiteConditionsAgent } from "./agent";

// Load @arcgis/core assets (workers, wasm, icons) from the CDN.
esriConfig.assetsPath = "https://js.arcgis.com/5.1/@arcgis/core/assets";
esriConfig.portalUrl = PORTAL_URL;
if (OAUTH_APP_ID) {
  // Config only — this does NOT prompt for sign-in.
  esriId.registerOAuthInfos([new OAuthInfo({ appId: OAUTH_APP_ID, portalUrl: PORTAL_URL, popup: false })]);
}

const gate = document.getElementById("gate") as HTMLDivElement;
const gateBtn = document.getElementById("gate-btn") as HTMLButtonElement;
const gateMsg = document.getElementById("gate-msg") as HTMLDivElement;
const assistantHost = document.getElementById("assistant-host") as HTMLDivElement;
// The map-components element exposes `.map`/`.view` after the view is ready.
// Typed as any: these beta web components are manipulated imperatively.
const mapEl = document.getElementById("main-map") as any;

// Add sensor context markers once the view is ready (no auth needed for this).
mapEl.addEventListener("arcgisViewReadyChange", () => {
  try {
    const layer = new GraphicsLayer({ title: "Sensors" });
    for (const s of SENSOR_MARKERS) {
      layer.add(
        new Graphic({
          geometry: new Point({ x: s.x, y: s.y, spatialReference: { wkid: 102100 } }),
          symbol: new SimpleMarkerSymbol({
            color: s.color,
            size: 10,
            outline: { color: [255, 255, 255], width: 1.2 },
          }),
          attributes: { label: s.label },
        }),
      );
    }
    mapEl.map.add(layer);
    mapEl.view.goTo({ target: layer.graphics, zoom: 16 }).catch(() => {});
  } catch (e) {
    console.warn("sensor markers failed", e);
  }
});

function mountAssistant(): void {
  gate.hidden = true;
  assistantHost.hidden = false;
  if (assistantHost.querySelector("arcgis-assistant")) return;

  // Beta web components — set properties imperatively; cast to keep TS relaxed.
  const assistant = document.createElement("arcgis-assistant") as any;
  assistant.setAttribute("reference-element", "#main-map");
  assistant.setAttribute("log-enabled", "");
  assistant.setAttribute("keep-suggested-prompts", "");
  assistant.heading = "Site Conditions";
  assistant.description = "Ask about live conditions on the Zürich construction site.";
  assistant.entryMessage =
    "Ask about wind at the crane, air quality, gas, dust, or noise. Wind/gas/dust/noise are sample Velocity telemetry; temperature/humidity/air-quality are live.";
  assistant.suggestedPrompts = [
    "Is it safe to run the tower crane right now?",
    "What's the air quality on site?",
    "Are any gas readings above the caution threshold?",
    "How windy is it, and what's the gust at the crane top?",
  ];

  const nav = document.createElement("arcgis-assistant-navigation-agent");
  const custom = document.createElement("arcgis-assistant-agent") as any;
  custom.agent = SiteConditionsAgent;
  custom.context = { site: SITE };

  assistant.appendChild(nav);
  assistant.appendChild(custom);
  assistantHost.appendChild(assistant);
}

gateBtn.addEventListener("click", async () => {
  if (!OAUTH_APP_ID) return;
  gateBtn.disabled = true;
  gateMsg.textContent = "Signing in…";
  try {
    // This is the moment the OAuth flow starts — only on click.
    await esriId.getCredential(`${PORTAL_URL}/sharing`);
    mountAssistant();
  } catch {
    gateMsg.textContent = "Sign-in was cancelled or failed. Try again.";
    gateBtn.disabled = false;
  }
});

async function init(): Promise<void> {
  if (!OAUTH_APP_ID) {
    gateMsg.textContent = "Set VITE_ARCGIS_OAUTH_APP_ID in ai/.env.local to enable sign-in.";
    gateBtn.disabled = true;
    return;
  }
  try {
    // Resolves silently only if already signed in (e.g. returning from redirect).
    await esriId.checkSignInStatus(`${PORTAL_URL}/sharing`);
    mountAssistant();
  } catch {
    // Not signed in — show the gate; sign-in happens on click only.
  }
}

void init();
