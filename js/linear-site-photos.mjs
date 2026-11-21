import { createPhotoAnalysis } from "./site-photo-analysis.mjs?v=3";

const SOURCE = "https://services.arcgis.com/tgUWep3BZhLoHKNh/arcgis/rest/services/SG_Roadway_OrientedImages/FeatureServer/0";
const captured = new Intl.DateTimeFormat("en-SG", {
  timeZone: "Asia/Singapore", day: "numeric", month: "short", year: "numeric",
  hour: "2-digit", minute: "2-digit", hour12: false
});

function stationKey({ geometry: p }) {
  return `${p.x},${p.y},${p.z}`;
}

// 5.1 searches by a point in the footprint, not by object ID. Use a point
// down the sightline and restrict the search layer to the chosen exposure.
function searchPoint(feature) {
  const p = feature.geometry.clone();
  const { CameraHeading, FarDistance } = feature.attributes;
  const radians = CameraHeading * Math.PI / 180;
  const distance = FarDistance * 0.72; // the published XY is in Web Mercator metres
  p.x += Math.sin(radians) * distance;
  p.y += Math.cos(radians) * distance;
  p.z = undefined;
  return p;
}

export function createSitePhotos(view) {
  const el = id => document.getElementById(id);
  const select = el("sitePhotoSelect"), host = el("sitePhotoViewer");
  const prev = el("sitePhotoPrev"), next = el("sitePhotoNext"), retry = el("sitePhotoRetry");
  const status = el("sitePhotoStatus"), bearing = el("sitePhotoBearing");
  const stage = el("sitePhotoStage"), expand = el("sitePhotoExpand");
  const analysis = createPhotoAnalysis(SOURCE);
  let active = null;

  function present(value, focus = true) {
    if (stage.matches(":modal") === value) return;
    // Promote the same modeless dialog. Reparenting the SDK element would
    // disconnect it and destroy the image viewer and its scene graphics.
    stage.close();
    if (value) stage.showModal();
    else stage.open = true;
    expand.setAttribute("aria-expanded", String(value));
    expand.textContent = value ? "Collapse photos" : "Expand photos";
    expand.title = value ? "Return to the map (Esc)" : "Enlarge the site photo";
    if (focus) expand.focus({ preventScroll: true });
  }
  expand.addEventListener("click", () => present(!stage.matches(":modal")));
  stage.addEventListener("cancel", event => {
    event.preventDefault();
    present(false);
  });
  stage.addEventListener("keydown", event => {
    if (!stage.matches(":modal")) return;
    if (event.key === "Escape") {
      event.stopPropagation(); // let the dialog cancel, not the tools behind it
      return;
    }
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey ||
        event.target === select || event.composedPath().includes(host)) return;
    const button = event.key === "ArrowLeft" ? prev : event.key === "ArrowRight" ? next : null;
    if (button) {
      event.preventDefault();
      event.stopPropagation();
      button.click();
    }
  });

  function unavailable(s, error) {
    if (s !== active || error?.name === "AbortError") return;
    console.warn("Roadway site photos unavailable", error);
    status.textContent = "Site photos could not be loaded. Check your connection and retry.";
    retry.hidden = false;
  }

  async function show(s, index) {
    const feature = s?.features?.[index];
    if (!feature || s !== active) return;
    s.selection?.abort();
    s.selection = new AbortController();
    const { signal } = s.selection;
    const key = stationKey(feature);
    select.selectedIndex = index;
    prev.disabled = index === 0;
    next.disabled = index === s.features.length - 1;
    retry.hidden = true;
    const a = feature.attributes;
    analysis.select(feature.getObjectId(), a[s.layer.globalIdField], stage.matches(":modal"));
    bearing.textContent = `${index + 1} / ${s.features.length} · ${Math.round(a.CameraHeading)}° true`;
    status.textContent = `Loading ${a.Name}…`;
    s.layer.definitionExpression = `${s.layer.objectIdField} = ${feature.getObjectId()}`;
    if (s.station !== key) {
      s.station = key;
      view.goTo({ target: feature.geometry, scale: 680, heading: 345, tilt: 43 }, {
        animate: !matchMedia("(prefers-reduced-motion: reduce)").matches, duration: 550
      }).catch(error => unavailable(s, error));
    }
    try {
      await s.viewer.loadBestImage(searchPoint(feature), { signal });
      if (!signal.aborted) status.textContent = `Captured ${captured.format(a.AcquisitionDate)} SGT`;
    } catch (error) {
      if (!signal.aborted) unavailable(s, error);
    }
  }

  async function open(s) {
    const { signal } = s.controller;
    const [{ default: OrientedImageryLayer }, { default: GraphicsLayer }, { default: Graphic }, { default: config }] =
      await Promise.all([
        import("@arcgis/core/layers/OrientedImageryLayer.js"),
        import("@arcgis/core/layers/GraphicsLayer.js"),
        import("@arcgis/core/Graphic.js"),
        import("@arcgis/core/config.js"),
        import("https://js.arcgis.com/5.1/map-components/")
      ]);
    if (signal.aborted) return;
    // The public demo must not open the SDK sign-in dialog if this item stops
    // being shared. Scope this to photos; the optional basemap still signs in.
    const guard = { urls: SOURCE, before: ({ requestOptions }) => { requestOptions.authMode = "no-prompt"; } };
    const interceptors = config.request.interceptors;
    interceptors.push(guard);
    s.releaseAuthGuard = () => {
      const index = interceptors.indexOf(guard);
      if (index !== -1) interceptors.splice(index, 1);
    };
    const layer = s.layer = new OrientedImageryLayer({
      id: "site-photo-image", url: SOURCE, listMode: "hide", popupEnabled: false,
      sequenceOrderFields: [{ field: "AcquisitionDate", order: "ASC" }]
    });
    await layer.load({ signal });
    const query = layer.createQuery();
    query.outFields = [layer.objectIdField, layer.globalIdField, "Name", "AcquisitionDate", "CameraHeading", "FarDistance"];
    query.orderByFields = ["AcquisitionDate ASC", `${layer.objectIdField} ASC`];
    query.returnGeometry = query.returnZ = true;
    const { features } = await layer.queryFeatures(query, { signal });
    if (signal.aborted) return;
    if (!features.length) throw new Error("The published imagery layer contains no camera points.");
    s.features = features;

    const groups = new Map();
    features.forEach((feature, index) => {
      const key = stationKey(feature);
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(index);
      select.add(new Option(feature.attributes.Name, String(index)));
    });
    const accent = getComputedStyle(document.documentElement).getPropertyValue("--accent").trim();
    const stops = s.stops = new GraphicsLayer({
      id: "site-photo-stops", title: "Site photo stops", listMode: "hide",
      elevationInfo: { mode: "absolute-height" },
      graphics: [...groups].map(([key, [index]]) => new Graphic({
        geometry: features[index].geometry, attributes: { station: key },
        symbol: { type: "point-3d", symbolLayers: [{ type: "icon", size: 11,
          resource: { primitive: "circle" }, material: { color: accent },
          outline: { color: "white", size: 1 } }] }
      }))
    });
    const first = Math.max(0, features.findIndex(f => f.attributes.Name.startsWith("F - P17 -")));
    layer.definitionExpression = `${layer.objectIdField} = ${features[first].getObjectId()}`;
    view.map.addMany([layer, stops]);
    const viewer = s.viewer = document.createElement("arcgis-oriented-imagery-viewer");
    viewer.label = "Site photograph";
    viewer.view = view;
    viewer.layer = layer;
    viewer.disabled = true; // station picking and paired-image navigation are ours
    viewer.hideHeader = viewer.hideMenu = viewer.currentCoverageVisible = true;
    host.replaceChildren(viewer);
    await Promise.all([viewer.componentOnReady(), view.whenLayerView(layer)]);
    if (signal.aborted) return;

    // On a narrow tablet the dashboard is above the scene, not beside it.
    // Frame the cone in the uncovered part, restoring the padding on exit.
    const dashboard = host.closest(".dashboard");
    const fitScene = () => {
      if (stage.matches(":modal")) return;
      const top = matchMedia("(max-width: 720px)").matches
        ? Math.ceil(dashboard.getBoundingClientRect().bottom) + 6 : s.padding.top;
      if (view.padding.top !== top) view.padding = { ...s.padding, top };
    };
    s.layout = new ResizeObserver(fitScene);
    s.layout.observe(dashboard);
    fitScene();

    s.pickHandle = view.on("click", async event => {
      try {
        const hit = await view.hitTest(event, { include: stops });
        if (signal.aborted) return;
        const key = hit.results.find(r => r.graphic?.layer === stops)?.graphic.attributes.station;
        const indices = groups.get(key);
        if (!indices) return;
        const current = indices.indexOf(select.selectedIndex);
        await show(s, indices[(current + 1) % indices.length]);
      } catch (error) { unavailable(s, error); }
    });
    select.disabled = expand.disabled = false;
    await show(s, first);
  }

  function close() {
    const s = active;
    if (!s) return;
    active = null;
    present(false, false);
    analysis.close();
    s.controller.abort();
    s.selection?.abort();
    s.pickHandle?.remove();
    s.layout?.disconnect();
    host.replaceChildren(); // disconnects and destroys the native viewer and its graphics
    for (const layer of [s.stops, s.layer]) {
      if (!layer) continue;
      view.map.remove(layer);
      layer.destroy();
    }
    s.releaseAuthGuard?.();
    if (s.station) {
      view.animation?.stop();
      view.padding = s.padding;
      view.camera = s.camera;
    }
  }

  function setOpen(value) {
    if (!value) return close();
    if (active) return;
    const s = active = {
      controller: new AbortController(), camera: view.camera.clone(), padding: { ...view.padding }
    };
    select.replaceChildren();
    select.disabled = expand.disabled = prev.disabled = next.disabled = true;
    retry.hidden = true;
    bearing.textContent = "";
    status.textContent = "Loading site photos…";
    open(s).catch(error => unavailable(s, error));
  }
  select.addEventListener("change", () => show(active, select.selectedIndex));
  prev.addEventListener("click", () => show(active, select.selectedIndex - 1));
  next.addEventListener("click", () => show(active, select.selectedIndex + 1));
  retry.addEventListener("click", () => { close(); setOpen(true); });
  return { setOpen };
}
