// On the served Linear Progress page, run:
// await (await import("./tests/linear-site-photos.browser.mjs")).checkSitePhotos()
import View from "@arcgis/core/views/View.js";
import * as reactiveUtils from "@arcgis/core/core/reactiveUtils.js";

export async function checkSitePhotos() {
  const check = (value, message) => { if (!value) throw new Error(message); };
  const el = id => document.getElementById(id);
  const scene = View.views.find(v => v.type === "3d" && v.ready);
  el("viewSchedule").click();
  const previous = scene.camera.clone();
  const total = el("progTotal").textContent;
  const signal = AbortSignal.timeout(90000);
  const until = predicate => reactiveUtils.whenOnce(predicate, { signal });
  const nativeImage = () => View.views.find(v => v.type === "2d" && v.container)
    ?.map?.allLayers.find(l => l.type === "imagery-tile")?.url;
  const selectedImage = () => {
    const layer = scene.map.findLayerById("site-photo-image");
    const oid = layer?.definitionExpression?.split(" = ")[1];
    return oid && nativeImage()?.includes(`/FeatureServer/0/${oid}/attachments/`);
  };
  const choose = index => {
    el("sitePhotoSelect").selectedIndex = index;
    el("sitePhotoSelect").dispatchEvent(new Event("change"));
  };
  try {
    el("viewSitePhotos").click();
    await until(selectedImage);
    await until(() => scene.stationary);
    const stops = scene.map.findLayerById("site-photo-stops");
    check(stops.graphics.length === 6, "Expected six distinct map stops");
    check(el("sitePhotoSelect").selectedOptions[0].text.startsWith("F - P17"), "Open on P17 at F");
    const camera = scene.camera.clone();
    const p17 = nativeImage();
    el("sitePhotoNext").click();
    await until(() => selectedImage() && nativeImage() !== p17);
    check(camera.equals(scene.camera), "Moving from P17 to P18 must not move the scene camera");
    check(el("sitePhotoSelect").selectedOptions[0].text.startsWith("F - P18"), "Next must select P18");
    const images = new Set([p17, nativeImage()]);
    for (let i = 0; i < 6; ++i) {
      choose(i);
      await until(selectedImage);
      images.add(nativeImage());
    }
    check(images.size === 8, "Each list entry must load its own hosted image");
    const meshDrawn = scene.map.allLayers.some(l => l.graphics?.some(g => g.visible && g.geometry?.type === "mesh"));
    check(meshDrawn, "The native current footprint must be a visible 3D mesh");
  } finally {
    el("viewSchedule").click();
  }
  await until(() => !View.views.some(v => v.type === "2d" && v.container));
  check(!scene.map.findLayerById("site-photo-stops") && !scene.map.findLayerById("site-photo-image"), "Photo layers left in dashboard");
  // Round-tripping a SceneView camera through geocentric coordinates changes
  // its last few decimal places even when it is at the same position.
  const { position: p, heading, tilt, fov } = scene.camera;
  check(Math.hypot(p.x - previous.position.x, p.y - previous.position.y, p.z - previous.position.z) < 0.001 &&
    Math.abs(heading - previous.heading) < 1e-6 && Math.abs(tilt - previous.tilt) < 1e-6 &&
    Math.abs(fov - previous.fov) < 1e-6, "Leaving photos must restore the previous viewpoint");
  check(el("progTotal").textContent === total, "Photo cameras must not change reported component counts");
  return "8 distinct hosted photos, 6 stops, paired viewpoints, 3D cone and dashboard restoration passed";
}

// Run on the same page after checkSitePhotos().
export async function checkPhotoAnalysis() {
  const el = id => document.getElementById(id);
  const check = (value, message) => { if (!value) throw new Error(message); };
  async function waitFor(condition) {
    const end = performance.now() + 20000;
    while (!condition()) {
      if (performance.now() > end) throw new Error("Timed out waiting for photo analysis");
      await new Promise(resolve => setTimeout(resolve, 50));
    }
  }
  el("viewSchedule").click();
  el("viewSitePhotos").click();
  try {
    await waitFor(() => !el("sitePhotoSelect").disabled);
    const analysis = el("sitePhotoAnalysis"), toggle = el("siteAnalysisToggle"), frame = el("sitePhotoDetections");
    check(!analysis.open, "Analysis must be opt-in");
    analysis.open = true;
    await waitFor(() => !toggle.hidden);
    const firstCaption = el("siteAnalysisCaption").textContent;
    toggle.click();
    await waitFor(() => !!frame.querySelector("svg rect"));
    const firstImage = frame.querySelector("img").src;
    const { width, height } = frame.querySelector("svg").viewBox.baseVal;
    check(width === frame.querySelector("img").naturalWidth && height === frame.querySelector("img").naturalHeight,
      "Boxes must use the source image coordinate system");
    const stage = el("sitePhotoStage"), expand = el("sitePhotoExpand");
    const tags = () => [...el("sitePhotoTags").children];
    const fontSize = () => parseFloat(getComputedStyle(tags()[0]).fontSize);
    check(tags().length === frame.querySelectorAll("svg rect").length && fontSize() >= 14,
      "Each construction box needs a readable screen-size label in the sidebar");
    const viewer = el("sitePhotoViewer").firstElementChild, img = frame.querySelector("img");
    const compactScale = frame.querySelector("svg").getScreenCTM().a;
    expand.click();
    await waitFor(() => stage.matches(":modal") && frame.querySelector("svg").getScreenCTM().a > compactScale);
    check(fontSize() >= 18 && viewer === el("sitePhotoViewer").firstElementChild && img === frame.querySelector("img"),
      "Presentation must enlarge both photo and labels in place without remounting the viewer");
    el("sitePhotoNext").click();
    await waitFor(() => !frame.hidden && !!frame.querySelector("svg rect") && frame.querySelector("img").src !== firstImage);
    check(stage.matches(":modal"), "Presentation navigation should keep annotated mode open");
    el("sitePhotoPrev").click();
    await waitFor(() => !frame.hidden && !!frame.querySelector("svg rect") && frame.querySelector("img").src === firstImage);
    expand.click();
    check(!stage.matches(":modal") && stage.open && !frame.hidden && document.activeElement === expand,
      "Collapsing returns focus to Expand photos and retains the current annotation");
    el("sitePhotoNext").click();
    check(frame.hidden && !frame.querySelector("svg rect"), "Switching at the same station must immediately clear old boxes");
    await waitFor(() => !toggle.hidden && el("siteAnalysisCaption").textContent !== firstCaption);
    toggle.click();
    await waitFor(() => !!frame.querySelector("svg rect"));
    check(frame.querySelector("img").src !== firstImage, "Station F's two photos cannot share annotations");
    toggle.click();
    check(frame.hidden && !el("sitePhotoViewer").inert, "Switching back must restore the native oriented viewer");
  } finally {
    el("viewSchedule").click();
  }
  check(!el("sitePhotoAnalysis").open && el("sitePhotoDetections").hidden, "Closing Site photos must clear analysis");
  return "Per-attachment descriptions, readable labels, presentation navigation and restoration passed";
}
