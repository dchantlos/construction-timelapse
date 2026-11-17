// =============================================================================
// basemap.js — the linear project's public basemap + opt-in Photorealistic 3D.
//
// The roadway's WebScenes are authored on Google Photorealistic 3D tiles, with a
// 3D mask (a "replace" modification) that flattens the mesh along the
// alignment. Google only streams to a signed-in ArcGIS user whose organization
// enables the basemap for this site, so public visitors get a dark basemap
// styled like the tower's (Dark Gray Canvas, 3D labels and glass context
// buildings) and nobody is asked to sign in. The nav-stack toggle (or
// ?basemap=photoreal) signs in first and only then swaps the authored basemap
// back in — the same Basemap instance, so its mask comes with it.
// =============================================================================

import Basemap from "@arcgis/core/Basemap.js";
import SceneLayer from "@arcgis/core/layers/SceneLayer.js";
import VectorTileLayer from "@arcgis/core/layers/VectorTileLayer.js";
import esriId from "@arcgis/core/identity/IdentityManager.js";
import OAuthInfo from "@arcgis/core/identity/OAuthInfo.js";

import { PHOTOREAL_OAUTH, PROJECT } from "./config.js?v=15";

const GOOGLE_TILES = /tile\.googleapis\.com/i;
const SHARING_URL = `${PHOTOREAL_OAUTH.portalUrl}/sharing`;

/** The authored (Google) basemap per scene, kept for the Photorealistic toggle. */
const authoredBasemaps = new WeakMap();
/** One public dark basemap per scene, reused across toggles. */
const darkBasemaps = new WeakMap();

/** Basemap ground layers that stream Google's Photorealistic 3D tiles. */
function googleLayers(basemap) {
  return basemap?.groundLayers?.filter((layer) => GOOGLE_TILES.test(layer.url ?? "")).toArray() ?? [];
}

/** True when the page asked to start on the Photorealistic basemap. */
function wantsPhotoreal() {
  return new URLSearchParams(location.search).get("basemap") === "photoreal";
}

/**
 * The tower's Dark Gray Canvas look: vector basemap, 3D place labels, and the
 * Esri 3D buildings drawn as faint glass like the tower's Swiss context layer.
 */
function darkBasemap(scene) {
  if (darkBasemaps.has(scene)) return darkBasemaps.get(scene);
  const basemap = new Basemap({
    id: "ct-dark",
    title: "Dark Gray Canvas",
    baseLayers: [
      new VectorTileLayer({
        title: "Dark Gray Canvas",
        url: "https://cdn.arcgis.com/sharing/rest/content/items/e6b230fe483b43f390a7e767731d52d6/resources/styles/root.json"
      }),
      new SceneLayer({
        title: "Buildings",
        url: "https://basemaps3d.arcgis.com/arcgis/rest/services/Esri3D_Buildings_v1/SceneServer/layers/0",
        elevationInfo: { mode: "relative-to-ground" },
        popupEnabled: false,
        renderer: {
          type: "simple",
          symbol: {
            type: "mesh-3d",
            symbolLayers: [
              {
                type: "fill",
                material: {
                  color: [103, 141, 156, 0.1],
                  emissive: { strength: 1, source: "color" },
                  colorMixMode: "tint"
                },
                edges: { type: "solid", color: [0, 0, 0, 0.65], size: 0.3 }
              }
            ]
          }
        }
      }),
      new SceneLayer({
        title: "Places and Labels",
        url: "https://basemaps3d.arcgis.com/arcgis/rest/services/Open3D_LightLabels_v1/SceneServer/layers/0",
        popupEnabled: false
      })
    ]
  });
  darkBasemaps.set(scene, basemap);
  return basemap;
}

// ---------- Sign-in ------------------------------------------------------------

let oauthRegistered = false;

/** Register the OAuth popup sign-in once (configuration only — never prompts). */
function registerOAuth() {
  if (oauthRegistered || !PHOTOREAL_OAUTH.appId) return;
  esriId.registerOAuthInfos([
    new OAuthInfo({
      appId: PHOTOREAL_OAUTH.appId,
      portalUrl: PHOTOREAL_OAUTH.portalUrl,
      popup: true,
      popupCallbackUrl: new URL("oauth-callback.html", document.baseURI).href
    })
  ]);
  // oauth-callback.html relays the popup's response to this window.
  window.addEventListener("arcgis:auth:hash", (event) => {
    try {
      esriId.setOAuthResponseHash(event.detail);
    } catch (err) {
      console.warn("[BASEMAP] OAuth response ignored", err);
    }
  });
  oauthRegistered = true;
}

/** Resolves true if a stored ArcGIS sign-in is still valid (never prompts). */
async function isSignedIn() {
  registerOAuth();
  try {
    await esriId.checkSignInStatus(SHARING_URL);
    return true;
  } catch {
    return false;
  }
}

/**
 * Before the view sees the scene: replace an authored Google Photorealistic
 * basemap with the public dark one, unless the page asked for Photorealistic
 * and the visitor is already signed in. Never throws — any doubt means dark.
 *
 * @param {import("@arcgis/core/WebScene").default} scene A loaded WebScene.
 * @returns {Promise<"dark"|"photoreal"|null>} the basemap in use, or null
 *   when the scene has no Google basemap (left untouched).
 */
export async function preparePublicBasemap(scene) {
  const authored = scene.basemap;
  if (!googleLayers(authored).length) return null;
  authoredBasemaps.set(scene, authored);
  try {
    if (wantsPhotoreal() && (await isSignedIn())) return "photoreal";
  } catch {
    // fall through to the public basemap
  }
  scene.basemap = darkBasemap(scene);
  return "dark";
}

// ---------- Toast ----------------------------------------------------------------

let toastEl = null;
let toastTimer = 0;

/** Brief status line under the top bar (also announced to screen readers). */
function toast(text, tone = "info") {
  if (!toastEl) {
    toastEl = document.createElement("div");
    toastEl.className = "toast glass";
    toastEl.setAttribute("role", "status");
    toastEl.setAttribute("aria-live", "polite");
    document.body.appendChild(toastEl);
  }
  toastEl.textContent = text;
  toastEl.dataset.tone = tone;
  toastEl.classList.add("is-visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove("is-visible"), 5200);
}

// ---------- Toggle ---------------------------------------------------------------

/** Keep ?basemap= in the address bar (and so in every in-app link) current. */
function rememberMode(mode) {
  const url = new URL(location.href);
  if (mode === "photoreal") url.searchParams.set("basemap", "photoreal");
  else url.searchParams.delete("basemap");
  history.replaceState(history.state, "", url);
  window.dispatchEvent(new CustomEvent("ct:url-change"));
}

/**
 * Wire the nav-stack Photorealistic toggle (#basemapBtn). Switching on signs
 * in (the SDK's dialog opens the OAuth popup), swaps the authored basemap back
 * in and waits for Google's tiles; any failure returns to the dark basemap.
 *
 * @param {object} opts
 * @param {import("@arcgis/core/WebScene").default} opts.scene
 * @param {"dark"|"photoreal"|null} opts.initial what preparePublicBasemap chose
 * @param {(mode: "dark"|"photoreal") => void} [opts.onChange]
 */
export function createBasemapToggle({ scene, initial, onChange }) {
  const button = document.getElementById("basemapBtn");
  const authored = authoredBasemaps.get(scene);
  if (!button || !authored || !PROJECT.photoreal) {
    button?.remove();
    return { mode: () => initial };
  }

  let mode = initial ?? "dark";
  let busy = false;
  let unavailable = null; // reason Photorealistic can't load for this visitor

  function render() {
    const on = mode === "photoreal";
    button.classList.toggle("is-active", on);
    button.classList.toggle("is-busy", busy);
    button.setAttribute("aria-pressed", String(on));
    button.setAttribute("aria-busy", String(busy));
    button.title = busy
      ? "Loading the Photorealistic 3D basemap…"
      : on
        ? "Photorealistic 3D basemap on — click for the dark basemap"
        : unavailable
          ? `Photorealistic 3D basemap unavailable: ${unavailable}`
          : "Photorealistic 3D basemap (Google, ArcGIS sign-in required)";
  }

  function setMode(next) {
    mode = next;
    rememberMode(mode);
    render();
    onChange?.(mode);
  }

  async function showPhotoreal() {
    busy = true;
    render();
    try {
      registerOAuth();
      await esriId.getCredential(SHARING_URL);
    } catch (err) {
      busy = false;
      render();
      const aborted = /abort|cancel/i.test(`${err?.name} ${err?.message}`);
      toast(aborted ? "Sign-in cancelled — staying on the dark basemap." : `Sign-in failed: ${err?.message ?? err}`, "warn");
      return;
    }

    scene.basemap = authored;
    try {
      await Promise.all(googleLayers(authored).map((layer) => layer.load()));
      busy = false;
      setMode("photoreal");
      toast("Photorealistic 3D basemap on, with the scene's 3D mask along the alignment.");
    } catch (err) {
      // A failed layer can't reload, so the toggle stays off until a page reload.
      unavailable = err?.message ?? "the basemap didn't load";
      scene.basemap = darkBasemap(scene);
      busy = false;
      setMode("dark");
      toast(
        "Photorealistic 3D isn't enabled for this account or site — ask your ArcGIS admin to allow it.",
        "warn"
      );
      console.warn("[BASEMAP] Photorealistic basemap failed to load", err);
    }
  }

  button.addEventListener("click", () => {
    if (busy) return;
    if (mode === "photoreal") {
      scene.basemap = darkBasemap(scene);
      setMode("dark");
    } else if (unavailable) {
      toast(`Photorealistic 3D basemap unavailable: ${unavailable}`, "warn");
    } else {
      showPhotoreal();
    }
  });

  // Asked for Photorealistic but not signed in yet: say how to get there.
  if (mode === "dark" && wantsPhotoreal()) {
    toast("Sign in from the Photorealistic button (right) to see the authored 3D basemap.");
    rememberMode("dark");
  }

  // Started on Photorealistic with a stored sign-in: if Google still refuses
  // (e.g. the organization doesn't enable it for this site), fall back.
  if (mode === "photoreal") {
    Promise.all(googleLayers(authored).map((layer) => layer.load())).catch((err) => {
      unavailable = err?.message ?? "the basemap didn't load";
      scene.basemap = darkBasemap(scene);
      setMode("dark");
      toast(
        "Photorealistic 3D isn't enabled for this account or site — showing the dark basemap.",
        "warn"
      );
    });
  }

  render();
  onChange?.(mode);
  return { mode: () => mode };
}
