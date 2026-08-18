// =============================================================================
// bcfExport.js — generate a buildingSMART BCF 2.1 issue (.bcfzip) from a failed
// IDS rule, entirely in the browser.
//
// BCF (BIM Collaboration Format) is buildingSMART's openBIM standard for moving
// model issues between tools. When an IDS requirement fails we hand a
// coordinator a portable issue that names the failing rule, pins the exact
// camera, embeds a snapshot, and lists the offending elements by their IFC
// GlobalId so any BCF-capable desktop tool can zoom straight to them.
//
// Adapted to this app (see the project README/PR notes):
//   • No build step — JSZip is loaded as an ESM module from the CDN (import map).
//   • view.takeScreenshot() supplies snapshot.png.
//   • The scene is Web Mercator, but IFC/BCF consumers expect the model's own
//     LOCAL engineering frame, so the camera is mapped from Web Mercator into
//     local model metres (see MODEL_GEOREF) before it is written out.
//   • Per BCF 2.1, element GlobalIds live in the viewpoint's <Components>, and
//     the markup references that viewpoint (BCF 1.0 kept them in the markup).
// =============================================================================

import JSZip from "jszip";
import { lngLatToXY } from "@arcgis/core/geometry/support/webMercatorUtils.js";

// ---------- small vector helpers ---------------------------------------------

const cross = (a, b) => ({
  x: a.y * b.z - a.z * b.y,
  y: a.z * b.x - a.x * b.z,
  z: a.x * b.y - a.y * b.x
});
const length = (v) => Math.hypot(v.x, v.y, v.z);
const normalize = (v) => {
  const l = length(v) || 1;
  return { x: v.x / l, y: v.y / l, z: v.z / l };
};
const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));

// ---------- model georeference: Web Mercator scene <-> IFC local frame --------

/**
 * The BIM model is published into a Web Mercator (EPSG:3857) scene, but IFC/BCF
 * desktop tools (BIMVision, etc.) expect the model's own LOCAL engineering frame
 * — small metre coordinates near the project origin — not raw Web Mercator
 * easting/northing in the millions. This anchor maps between the two:
 *   • originX / originY — Web Mercator position of the IFC local origin (0,0).
 *   • originZ           — height (scene vertical datum) of IFC z = 0.
 *   • rotationDeg       — IFC +X axis east of grid north (0 ⇒ model aligned to
 *                         true north, so ENU axes already match the IFC axes).
 * Web Mercator inflates ground distance by sec(latitude); the reverse factor
 * cos(latitude) at the site is derived from the origin below. These come from
 * the source model's georeference — confirm against its survey/base point.
 * (Current X/Y/Z are estimated from the published Slabs layer extent.)
 */
const MODEL_GEOREF = {
  originX: 958890.58,
  originY: 6010426.04,
  originZ: 442.85,
  rotationDeg: 0
};

const EARTH_R = 6378137; // Web Mercator sphere radius (WGS84 semi-major axis), m

/** Geodetic latitude (radians) for a Web Mercator northing Y (metres). */
function webMercatorLat(y) {
  return 2 * Math.atan(Math.exp(y / EARTH_R)) - Math.PI / 2;
}

// Web Mercator metres → true ground metres at the site (near-constant over the
// ~60 m model footprint, so a single origin-derived factor is used both ways).
const WM_SCALE = Math.cos(webMercatorLat(MODEL_GEOREF.originY));
const GEOREF_RAD = (MODEL_GEOREF.rotationDeg * Math.PI) / 180;

// ---------- camera <-> BCF perspective conversion ----------------------------

/** Web Mercator (or still-geographic) camera position → IFC local metres. */
function toModelLocal(position) {
  let X, Y;
  if (position?.spatialReference?.isGeographic) {
    [X, Y] = lngLatToXY(position.x ?? 0, position.y ?? 0);
  } else {
    X = position?.x ?? 0;
    Y = position?.y ?? 0;
  }
  const dx = (X - MODEL_GEOREF.originX) * WM_SCALE;
  const dy = (Y - MODEL_GEOREF.originY) * WM_SCALE;
  const c = Math.cos(GEOREF_RAD);
  const s = Math.sin(GEOREF_RAD);
  return {
    x: dx * c + dy * s,
    y: -dx * s + dy * c,
    z: (position?.z ?? 0) - MODEL_GEOREF.originZ
  };
}

/** IFC local metres → Web Mercator {x,y,z} (inverse of toModelLocal). */
function fromModelLocal(local) {
  const c = Math.cos(GEOREF_RAD);
  const s = Math.sin(GEOREF_RAD);
  const dx = local.x * c - local.y * s;
  const dy = local.x * s + local.y * c;
  return {
    x: MODEL_GEOREF.originX + dx / WM_SCALE,
    y: MODEL_GEOREF.originY + dy / WM_SCALE,
    z: (local.z ?? 0) + MODEL_GEOREF.originZ
  };
}

/** Rotate a direction/up vector from ENU (grid) into the IFC frame. */
function rotateToModel(v) {
  const c = Math.cos(GEOREF_RAD);
  const s = Math.sin(GEOREF_RAD);
  return { x: v.x * c + v.y * s, y: -v.x * s + v.y * c, z: v.z };
}

/** Rotate a direction vector from the IFC frame back to ENU (grid). */
function rotateFromModel(v) {
  const c = Math.cos(GEOREF_RAD);
  const s = Math.sin(GEOREF_RAD);
  return { x: v.x * c - v.y * s, y: v.x * s + v.y * c, z: v.z };
}

/**
 * Convert an ArcGIS SceneView camera into a BCF PerspectiveCamera description.
 * `heading` is degrees clockwise from north; `tilt` is degrees from straight
 * down (0) to the horizon (90). The direction/up basis is built in a local
 * East-North-Up frame so the result is a valid orthonormal camera. The position
 * and basis are then mapped into the model's LOCAL IFC frame (see MODEL_GEOREF)
 * so a desktop viewer aligns the viewpoint to the IFC geometry rather than to
 * raw Web Mercator easting/northing.
 *
 * @param {import("@arcgis/core/Camera").default} camera
 * @returns {{ viewPoint:{x,y,z}, direction:{x,y,z}, up:{x,y,z}, fieldOfView:number }}
 */
export function cameraToBcfPerspective(camera) {
  const p = camera?.position ?? { x: 0, y: 0, z: 0 };
  const h = ((camera?.heading ?? 0) * Math.PI) / 180;
  const t = ((camera?.tilt ?? 0) * Math.PI) / 180;

  // View direction in East-North-Up: tilt 0 → straight down, 90 → horizon.
  const dirEnu = normalize({
    x: Math.sin(t) * Math.sin(h),
    y: Math.sin(t) * Math.cos(h),
    z: -Math.cos(t)
  });

  // Orthonormal up-vector: right = dir × worldUp, up = right × dir.
  let right = cross(dirEnu, { x: 0, y: 0, z: 1 });
  if (length(right) < 1e-6) right = { x: 1, y: 0, z: 0 }; // looking straight up/down
  const upEnu = normalize(cross(normalize(right), dirEnu));

  return {
    viewPoint: toModelLocal(p),
    direction: rotateToModel(dirEnu),
    up: rotateToModel(upEnu),
    // BCF 2.1 restricts FieldOfView to 45–60 degrees (visinfo.xsd), so clamp here.
    fieldOfView: clamp(camera?.fov ?? 60, 45, 60)
  };
}

/**
 * Inverse of {@link cameraToBcfPerspective}: turn a BCF PerspectiveCamera back
 * into ArcGIS {position, heading, tilt} so a viewer can fly the SceneView to it.
 * The viewpoint is mapped from the IFC local frame back to Web Mercator.
 *
 * @param {{ viewPoint:{x,y,z}, direction:{x,y,z}, fieldOfView?:number }} persp
 */
export function bcfPerspectiveToCamera(persp) {
  const d = normalize(rotateFromModel(persp.direction));
  const heading = (((Math.atan2(d.x, d.y) * 180) / Math.PI) + 360) % 360;
  const tilt = (Math.acos(clamp(-d.z, -1, 1)) * 180) / Math.PI;
  return {
    position: fromModelLocal(persp.viewPoint),
    heading,
    tilt,
    fov: persp.fieldOfView ?? 60
  };
}

// ---------- XML helpers -------------------------------------------------------

const xmlEscape = (s) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const uuid = () =>
  crypto?.randomUUID?.() ??
  "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });

const vec = (tag, v) => `<${tag}><X>${v.x}</X><Y>${v.y}</Y><Z>${v.z}</Z></${tag}>`;

/**
 * Pull the IFC GlobalId out of a feature-attribute object, tolerating the
 * various field names a source model might use.
 */
export function guidOf(attrs) {
  return (
    attrs?.GlobalId ??
    attrs?.IfcGuid ??
    attrs?.GLOBALID ??
    attrs?.Guid ??
    attrs?.globalId ??
    null
  );
}

// ---------- BCF file builders ------------------------------------------------

function bcfVersionXml() {
  return `<?xml version="1.0" encoding="UTF-8"?>
<Version VersionId="2.1" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <DetailedVersion>2.1</DetailedVersion>
</Version>`;
}

function markupXml({ topicGuid, viewpointGuid, title, description, author, date }) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<Markup xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <Topic Guid="${topicGuid}" TopicType="Issue" TopicStatus="Open">
    <Title>${xmlEscape(title)}</Title>
    <CreationDate>${date}</CreationDate>
    <CreationAuthor>${xmlEscape(author)}</CreationAuthor>
    <Description>${xmlEscape(description)}</Description>
  </Topic>
  <Viewpoints Guid="${viewpointGuid}">
    <Viewpoint>viewpoint.bcfv</Viewpoint>
    <Snapshot>snapshot.png</Snapshot>
  </Viewpoints>
</Markup>`;
}

function viewpointXml({ viewpointGuid, guids, perspective }) {
  // BCF 2.1 (visinfo.xsd): inside <Components> the order is fixed —
  // <ViewSetupHints>? , <Selection>? , <Visibility> (required) , <Coloring>? —
  // and <Selection> must hold at least one <Component>. Elements are flagged by
  // adding a <Component IfcGuid="…"/> to <Selection>, so a BCF viewer selects and
  // zooms to them. An empty <Selection/> is schema-invalid, so it is emitted
  // only when there are GlobalIds to reference.
  const selection = guids.length
    ? `    <Selection>
${guids.map((g) => `      <Component IfcGuid="${xmlEscape(g)}" />`).join("\n")}
    </Selection>
`
    : "";

  return `<?xml version="1.0" encoding="UTF-8"?>
<VisualizationInfo xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" Guid="${viewpointGuid}">
  <Components>
    <ViewSetupHints SpacesVisible="false" SpaceBoundariesVisible="false" OpeningsVisible="false" />
${selection}    <Visibility DefaultVisibility="true" />
  </Components>
  <PerspectiveCamera>
    ${vec("CameraViewPoint", perspective.viewPoint)}
    ${vec("CameraDirection", perspective.direction)}
    ${vec("CameraUpVector", perspective.up)}
    <FieldOfView>${perspective.fieldOfView}</FieldOfView>
  </PerspectiveCamera>
</VisualizationInfo>`;
}

// ---------- public API --------------------------------------------------------

/**
 * Build a BCF 2.1 issue for a failed IDS rule and trigger a browser download.
 *
 * @param {object} opts
 * @param {Array<object>} opts.failedElements Feature attributes of the failing
 *   elements; each should carry a GlobalId / IfcGuid.
 * @param {string} opts.ruleName IDS rule name → BCF topic title (e.g.
 *   "CT-S08 - Classification reference present").
 * @param {import("@arcgis/core/views/SceneView").default} opts.view
 * @param {string} [opts.description] Extra context for the issue body.
 * @param {string} [opts.author="ids-audit@construction-timelapse"]
 * @param {string} [opts.fileName] Override the .bcfzip download name.
 * @returns {Promise<{ blob: Blob, fileName: string, guids: string[] }>}
 */
export async function exportBcf({
  failedElements = [],
  ruleName = "IDS rule failure",
  view,
  description,
  author = "ids-audit@construction-timelapse",
  fileName
}) {
  if (!view) throw new Error("exportBcf needs the SceneView");

  const guids = [...new Set(failedElements.map(guidOf).filter(Boolean))];
  const topicGuid = uuid();
  const viewpointGuid = uuid();
  const date = new Date().toISOString();

  // 1) Snapshot the current 3D view → snapshot.png (base64 payload for JSZip).
  let snapshotBase64 = null;
  try {
    const shot = await view.takeScreenshot({ width: 800, height: 600, format: "png" });
    snapshotBase64 = shot?.dataUrl?.split(",")[1] ?? null;
  } catch (err) {
    console.warn("BCF: could not capture a snapshot", err);
  }

  // 2) Current camera → BCF PerspectiveCamera.
  const perspective = cameraToBcfPerspective(view.camera);

  // 3) Issue body.
  const desc =
    description ??
    `${guids.length} element(s) fail the IDS rule “${ruleName}”. ` +
      `Camera and snapshot captured from the ArcGIS scene on ${date}.`;

  // 4) Zip in the BCF 2.1 layout: bcf.version at the root, one folder per topic
  //    (named by its GUID) holding markup, viewpoint and snapshot.
  const zip = new JSZip();
  zip.file("bcf.version", bcfVersionXml());
  const topicDir = zip.folder(topicGuid);
  topicDir.file(
    "markup.bcf",
    markupXml({ topicGuid, viewpointGuid, title: ruleName, description: desc, author, date })
  );
  topicDir.file("viewpoint.bcfv", viewpointXml({ viewpointGuid, guids, perspective }));
  if (snapshotBase64) topicDir.file("snapshot.png", snapshotBase64, { base64: true });

  const blob = await zip.generateAsync({ type: "blob" });

  // 5) Trigger the download.
  const safeName =
    fileName ??
    `${ruleName.replace(/[^\w.-]+/g, "_").replace(/^_+|_+$/g, "") || "ids-issue"}.bcfzip`;
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = safeName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60000);

  return { blob, fileName: safeName, guids };
}
