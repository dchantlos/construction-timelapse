// =============================================================================
// assistant.ts — shared building blocks used by both the standalone page
// (main.ts) and the embeddable widget (embed.ts): asset path, deferred OAuth,
// map sensor markers, and the configured <arcgis-assistant> element.
// =============================================================================

import esriConfig from "@arcgis/core/config.js";
import esriId from "@arcgis/core/identity/IdentityManager.js";
import OAuthInfo from "@arcgis/core/identity/OAuthInfo.js";
import Graphic from "@arcgis/core/Graphic.js";
import Point from "@arcgis/core/geometry/Point.js";
import GraphicsLayer from "@arcgis/core/layers/GraphicsLayer.js";
import SimpleMarkerSymbol from "@arcgis/core/symbols/SimpleMarkerSymbol.js";

import { PORTAL_URL, OAUTH_APP_ID, SITE, SENSOR_MARKERS } from "./config";
import { SiteConditionsAgent } from "./agent";

// Load @arcgis/core assets (workers, wasm, icons) from the CDN so nothing extra
// has to be bundled or served alongside the app.
esriConfig.assetsPath = "https://js.arcgis.com/5.1/@arcgis/core/assets";

let oauthConfigured = false;

export function hasAppId(): boolean {
  return !!OAUTH_APP_ID;
}

/** Register OAuth once (config only — this never prompts for sign-in). */
export function configureOAuth(): boolean {
  if (!OAUTH_APP_ID) return false;
  if (!oauthConfigured) {
    esriConfig.portalUrl = PORTAL_URL;
    // Popup sign-in (no page reload) so the parent page's ArcGIS SDK can't
    // consume the OAuth redirect response before we do. The callback page lives
    // next to the host page and relays the response back to this window.
    const popupCallbackUrl = new URL("oauth-callback.html", document.baseURI).href;
    esriId.registerOAuthInfos([
      new OAuthInfo({ appId: OAUTH_APP_ID, portalUrl: PORTAL_URL, popup: true, popupCallbackUrl }),
    ]);
    window.addEventListener("arcgis:auth:hash", (e) => {
      esriId.setOAuthResponseHash((e as CustomEvent).detail);
    });
    oauthConfigured = true;
  }
  return true;
}

/** True only if already signed in — does not prompt. */
export async function isSignedIn(): Promise<boolean> {
  if (!configureOAuth()) return false;
  try {
    await esriId.checkSignInStatus(`${PORTAL_URL}/sharing`);
    return true;
  } catch {
    return false;
  }
}

/** Trigger the ArcGIS sign-in (redirect). Call this only on a user gesture. */
export async function signIn(): Promise<void> {
  configureOAuth();
  await esriId.getCredential(`${PORTAL_URL}/sharing`);
}

/** Add the primary sensor context markers to an <arcgis-map> element. */
export function addSensorMarkers(mapEl: any): void {
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
}

/**
 * Build the configured <arcgis-assistant> (with the custom Site Conditions
 * agent + navigation agent). Its reference-element points at "#sc-map", so the
 * host must contain an <arcgis-map id="sc-map">.
 */
export function buildAssistant(): HTMLElement {
  const assistant = document.createElement("arcgis-assistant") as any;
  assistant.setAttribute("reference-element", "#sc-map");
  assistant.setAttribute("log-enabled", "");
  assistant.setAttribute("keep-suggested-prompts", "");
  assistant.heading = "AI Site Analyst";
  assistant.description =
    "AI reasoning over this site's live ArcGIS Velocity IoT — crane-wind safety, air quality, trends, and weather-driven schedule & cost impact.";
  assistant.entryMessage =
    "I'm an AI analyst wired to this site's live ArcGIS Velocity IoT feeds. Ask about safety (crane wind, gases), current conditions, day-long trends — or how sensor-flagged events (wind stand-downs, gas evacuations, heat holds) have driven schedule slippage and cost. I analyse the sensor time series and explain the 'so what'.";
  assistant.suggestedPrompts = [
    "How is the weather affecting our schedule and cost?",
    "What's our schedule delay penalty, and why are we behind?",
    "What have wind stand-downs and gas evacuations cost us?",
    "Is it safe to run the tower crane right now?",
    "When are the safe tower-crane lifting windows today?",
    "Analyse today's wind and air-quality trends",
  ];

  const custom = document.createElement("arcgis-assistant-agent") as any;
  custom.agent = SiteConditionsAgent;
  custom.context = { site: SITE };

  assistant.appendChild(custom);
  return assistant;
}
