const manifestUrl = new URL("../assets/site-photo-analysis.json?v=2", import.meta.url);
const svgNS = "http://www.w3.org/2000/svg";
const normalizeId = id => String(id ?? "").replace(/[{}]/g, "").toLowerCase();

function drawBoxes(svg, tags, { width, height, objects }) {
  svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
  svg.replaceChildren();
  tags.replaceChildren();
  for (const { label, box: [x, y, right, bottom] } of objects) {
    const rect = document.createElementNS(svgNS, "rect");
    for (const [key, value] of Object.entries({ x, y, width: right - x, height: bottom - y })) {
      rect.setAttribute(key, value);
    }
    svg.append(rect);
    const tag = document.createElement("span");
    tag.className = "site-photo-tag";
    tag.textContent = label;
    tags.append(tag);
  }
}

// Boxes stay in image pixels. Place the labels in CSS pixels so they're
// legible regardless of the photo's resolution or the viewer's letterboxing.
function positionTags(tags, { width, height, objects }) {
  const w = tags.clientWidth, h = tags.clientHeight;
  if (!w || !h) return;
  const scale = Math.min(w / width, h / height);
  const dx = (w - width * scale) / 2, dy = (h - height * scale) / 2;
  const occupied = [];
  const chips = [...tags.children].map(tag => ({ tag, tw: tag.offsetWidth, th: tag.offsetHeight }));
  chips.forEach(({ tag, tw, th }, i) => {
    const [l, t, r, b] = objects[i].box.map((n, j) => n * scale + (j % 2 ? dy : dx));
    let best, least = Infinity;
    for (const y of [t - th, t, b, b - th]) {
      for (const x of [l, r - tw]) {
        const left = Math.max(0, Math.min(x, w - tw)), top = Math.max(0, Math.min(y, h - th));
        const overlap = occupied.reduce((sum, p) => sum +
          Math.max(0, Math.min(left + tw, p.right + 2) - Math.max(left, p.left - 2)) *
          Math.max(0, Math.min(top + th, p.bottom + 2) - Math.max(top, p.top - 2)), 0);
        if (overlap < least) {
          least = overlap;
          best = { left, top, right: left + tw, bottom: top + th };
        }
      }
      if (least === 0) break;
    }
    tag.style.left = `${best.left}px`;
    tag.style.top = `${best.top}px`;
    occupied.push(best);
  });
}

// Render boxes against the upright attachment, never on top of the native
// viewer's independently panned, zoomed and roll-corrected image.
export function createPhotoAnalysis(source) {
  const el = id => document.getElementById(id);
  const details = el("sitePhotoAnalysis"), caption = el("siteAnalysisCaption");
  const labels = el("siteAnalysisLabels"), toggle = el("siteAnalysisToggle");
  const draft = el("siteAnalysisDraft");
  const frame = el("sitePhotoDetections"), viewer = el("sitePhotoViewer"), svg = el("sitePhotoBoxes");
  const tags = el("sitePhotoTags");
  const verified = new Set();
  let manifest, selection, record, request, wantBoxes = false;
  const layout = new ResizeObserver(() => {
    if (record && !frame.hidden) positionTags(tags, record);
  });

  function resetOverlay() {
    frame.hidden = true;
    viewer.inert = false;
    toggle.setAttribute("aria-pressed", "false");
    toggle.textContent = "Show construction boxes";
    svg.replaceChildren();
    tags.replaceChildren();
    layout.disconnect();
    frame.querySelector("img")?.remove();
  }

  function showBoxes() {
    if (!selection || !record) return;
    const { objectId } = selection;
    const img = new Image();
    img.alt = `Original photo with ${record.objects.length} labeled construction boxes`;
    img.onload = () => {
      if (img.parentElement !== frame) return;
      if (img.naturalWidth !== record.width || img.naturalHeight !== record.height) {
        wantBoxes = false;
        resetOverlay();
        labels.textContent = "Image dimensions changed. Regenerate detections for this attachment.";
        toggle.hidden = true;
        return;
      }
      drawBoxes(svg, tags, record);
      positionTags(tags, record);
      layout.observe(tags);
      for (const tag of tags.children) layout.observe(tag);
    };
    img.onerror = () => {
      if (img.parentElement !== frame) return;
      wantBoxes = false;
      resetOverlay();
      labels.textContent = "Could not load the annotated view. Select Show construction boxes to retry.";
    };
    frame.prepend(img);
    img.src = `${source}/${objectId}/attachments/${record.attachmentId}`;
    frame.hidden = false;
    viewer.inert = true;
    toggle.setAttribute("aria-pressed", "true");
    toggle.textContent = "Return to oriented photo";
  }

  async function refresh() {
    request?.abort();
    resetOverlay();
    record = null;
    toggle.hidden = labels.hidden = draft.hidden = true;
    draft.open = false;
    draft.querySelector("p").textContent = "";
    caption.textContent = "";
    if (!details.open || !selection) {
      wantBoxes = false;
      return;
    }
    const { key, objectId } = selection;
    const { signal } = request = new AbortController();
    caption.textContent = "Loading saved analysis…";
    try {
      manifest ??= fetch(manifestUrl).then(async response => {
        if (!response.ok) throw new Error(`Analysis file: HTTP ${response.status}`);
        const data = await response.json();
        if (data.source !== source || !data.photos) throw new Error("Analysis belongs to a different layer.");
        if (data.detectionModel?.scope !== "construction-work-area") throw new Error("The construction analysis is out of date.");
        return data.photos;
      }).catch(error => { manifest = null; throw error; });
      const result = (await manifest)[key];
      if (signal.aborted) return;
      if (!result) {
        caption.textContent = "No saved AI analysis for this photo yet.";
        return;
      }
      if (!verified.has(key)) {
        const response = await fetch(`${source}/${objectId}/attachments?f=json`, { signal });
        if (!response.ok) throw new Error(`Attachment list: HTTP ${response.status}`);
        const info = await response.json();
        if (info.error || !Array.isArray(info.attachmentInfos)) throw new Error("Could not check the photo attachment.");
        if (signal.aborted) return;
        if (!info.attachmentInfos.some(a => a.id === result.attachmentId && a.size === result.byteLength &&
          normalizeId(a.globalId) === normalizeId(result.attachmentGlobalId) && a.name === result.filename)) {
          caption.textContent = "The photo attachment has changed. Its saved analysis is unavailable.";
          return;
        }
        verified.add(key);
      }
      const counts = new Map();
      if (result.workAreaReviewed) {
        for (const { label } of result.objects) counts.set(label, (counts.get(label) ?? 0) + 1);
      }
      record = result;
      caption.textContent = result.displayCaption ?? result.caption;
      if (result.displayCaption && result.displayCaption !== result.caption) {
        draft.querySelector("p").textContent = result.caption;
        draft.hidden = false;
      }
      labels.textContent = !result.workAreaReviewed ? "Construction boxes are pending work-area review."
        : counts.size ? `In the work area: ${[...counts].map(([label, n]) => n === 1 ? label : `${label} × ${n}`).join(" · ")}`
        : "No matching construction objects found in the work area.";
      labels.hidden = false;
      toggle.hidden = !counts.size;
      if (wantBoxes && counts.size) showBoxes();
    } catch (error) {
      if (signal.aborted) return;
      console.warn("Saved photo analysis unavailable", error);
      caption.textContent = "Analysis is unavailable. Close and reopen this section to retry.";
    }
  }

  details.addEventListener("toggle", refresh);
  toggle.addEventListener("click", () => {
    wantBoxes = frame.hidden;
    if (wantBoxes) showBoxes();
    else resetOverlay();
  });
  return {
    select(objectId, globalId, keepBoxMode) {
      if (!keepBoxMode) wantBoxes = false;
      selection = { objectId, key: normalizeId(globalId) };
      refresh();
    },
    close() {
      selection = null;
      details.open = false;
      refresh();
    }
  };
}
