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
//   • The global SceneView reports the camera in geographic degrees; BCF/IFC
//     consumers expect planar metres, so the camera position is projected to
//     Web Mercator (the model's planar frame) before it is written out.
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

// ---------- camera <-> BCF perspective conversion ----------------------------

/**
 * Project a SceneView camera position into the model's planar frame. A global
 * SceneView reports camera.position in geographic degrees (lon/lat); BCF/IFC
 * consumers place geometry in planar metres, so geographic coordinates are
 * projected to Web Mercator. A position already in a projected SR is used as-is.
 *
 * @param {{ x?:number, y?:number, spatialReference?:{ isGeographic?:boolean } }} position
 * @returns {{ x:number, y:number }}
 */
function toPlanarXY(position) {
  if (position?.spatialReference?.isGeographic) {
    const [x, y] = lngLatToXY(position.x ?? 0, position.y ?? 0);
    return { x, y };
  }
  return { x: position?.x ?? 0, y: position?.y ?? 0 };
}

/**
 * Convert an ArcGIS SceneView camera into a BCF PerspectiveCamera description.
 * `heading` is degrees clockwise from north; `tilt` is degrees from straight
 * down (0) to the horizon (90). The direction/up basis is built in a local
 * East-North-Up frame so the result is a valid orthonormal camera. The camera
 * position is projected to the model's planar (Web Mercator) frame so a desktop
 * viewer aligns it to the IFC geometry rather than to raw geographic degrees.
 *
 * @param {import("@arcgis/core/Camera").default} camera
 * @returns {{ viewPoint:{x,y,z}, direction:{x,y,z}, up:{x,y,z}, fieldOfView:number }}
 */
export function cameraToBcfPerspective(camera) {
  const p = camera?.position ?? { x: 0, y: 0, z: 0 };
  const planar = toPlanarXY(p);
  const h = ((camera?.heading ?? 0) * Math.PI) / 180;
  const t = ((camera?.tilt ?? 0) * Math.PI) / 180;

  // View direction in East-North-Up: tilt 0 → straight down, 90 → horizon.
  const direction = normalize({
    x: Math.sin(t) * Math.sin(h),
    y: Math.sin(t) * Math.cos(h),
    z: -Math.cos(t)
  });

  // Orthonormal up-vector: right = dir × worldUp, up = right × dir.
  let right = cross(direction, { x: 0, y: 0, z: 1 });
  if (length(right) < 1e-6) right = { x: 1, y: 0, z: 0 }; // looking straight up/down
  const up = normalize(cross(normalize(right), direction));

  return {
    viewPoint: { x: planar.x, y: planar.y, z: p.z ?? 0 },
    direction,
    up,
    // BCF 2.1 restricts FieldOfView to 45–60 degrees (visinfo.xsd), so clamp here.
    fieldOfView: clamp(camera?.fov ?? 60, 45, 60)
  };
}

/**
 * Inverse of {@link cameraToBcfPerspective}: turn a BCF PerspectiveCamera back
 * into ArcGIS {position, heading, tilt} so a viewer can fly the SceneView to it.
 *
 * @param {{ viewPoint:{x,y,z}, direction:{x,y,z}, fieldOfView?:number }} persp
 */
export function bcfPerspectiveToCamera(persp) {
  const d = normalize(persp.direction);
  const heading = (((Math.atan2(d.x, d.y) * 180) / Math.PI) + 360) % 360;
  const tilt = (Math.acos(clamp(-d.z, -1, 1)) * 180) / Math.PI;
  return {
    position: persp.viewPoint,
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
