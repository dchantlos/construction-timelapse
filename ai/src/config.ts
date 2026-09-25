// Central configuration for the Site Conditions assistant.

export const PORTAL_URL: string =
  (import.meta.env.VITE_PORTAL_URL as string) || "https://www.arcgis.com";

// OAuth Client ID from an ArcGIS Online developer "OAuth credentials" item.
// Empty until you add it to ai/.env.local — the UI degrades gracefully so you
// can still see the map and layout before sign-in is wired.
export const OAUTH_APP_ID: string =
  (import.meta.env.VITE_ARCGIS_OAUTH_APP_ID as string) || "";

// Job site (Zürich, CH) — derived from the progress WebScene camera; matches
// js/progress-sensors.js.
export const SITE = { label: "Zürich, CH", tz: "Europe/Zurich", lat: 47.4133, lon: 8.6142 };

// Primary sensors shown as context markers on the map. Coordinates are the exact
// Web Mercator (WKID 102100) positions from js/velocity.js, so no conversion is
// needed — they render in the right place.
export const SENSOR_MARKERS: { label: string; x: number; y: number; color: number[] }[] = [
  { label: "Wind (tower crane)", x: 958778.6, y: 6010479.36, color: [56, 226, 234] },
  { label: "Multi-gas cabinet", x: 958969.66, y: 6010422.49, color: [250, 204, 21] },
  { label: "Dust (E boundary)", x: 958989.81, y: 6010417.06, color: [251, 146, 60] },
  { label: "Noise (N boundary)", x: 958906.23, y: 6010563.72, color: [167, 139, 250] },
];

// The <arcgis-assistant> component requires a web map (portal item) as its
// reference, WITH AI vector embeddings generated on it. This is the AEC AGO
// (arcaec) site web map. The custom agent's tools don't use the map's data.
export const WEBMAP_ID = "43756982634941dea92a221170bad45c";
