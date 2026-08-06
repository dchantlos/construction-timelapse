// =============================================================================
// audit.js — audit the published scene against the IDS, live, in the browser
//
// For every specification in the IDS we resolve its applicability entities to
// the matching building layers, then check each requirement facet against the
// layer's real data using the I3S precomputed per-attribute statistics (the
// same public, CORS-enabled resource progress-stats.js reads). Results are
// rendered into a glass side panel; clicking a spec or a layer isolates and
// frames the affected geometry in the 3D scene.
// =============================================================================

import esriRequest from "@arcgis/core/request.js";
import { parseIds } from "./ids.js";
import {
  IDS_URL,
  IFC_ENTITY_LAYERS,
  IDS_FIELD_MAP,
  IDS_CLASSIFICATION_FIELDS
} from "./config.js";
import { exportBcf, guidOf } from "./bcfExport.js?v=1";
import { createBcfHighlighter } from "./bcfViewer.js?v=3";
import SimpleRenderer from "@arcgis/core/renderers/SimpleRenderer.js";
import UniqueValueRenderer from "@arcgis/core/renderers/UniqueValueRenderer.js";
import MeshSymbol3D from "@arcgis/core/symbols/MeshSymbol3D.js";
import FillSymbol3DLayer from "@arcgis/core/symbols/FillSymbol3DLayer.js";
import SolidEdges3D from "@arcgis/core/symbols/edges/SolidEdges3D.js";

// Pretty IFC class labels + a reverse (layer title → IFC entity) lookup so each
// audited layer can be shown with its authentic IFC class name.
const ENTITY_LABEL = {
  IFCSLAB: "IfcSlab",
  IFCCOLUMN: "IfcColumn",
  IFCBEAM: "IfcBeam",
  IFCWALL: "IfcWall",
  IFCPLATE: "IfcPlate",
  IFCROOF: "IfcRoof",
  IFCCURTAINWALL: "IfcCurtainWall"
};
const TITLE_TO_ENTITY = Object.fromEntries(
  Object.entries(IFC_ENTITY_LAYERS).map(([entity, title]) => [title, entity])
);
function entityLabelFor(title) {
  return ENTITY_LABEL[TITLE_TO_ENTITY[title]] ?? title;
}

/** Opacity doesn't visibly render on these cached I3S 3DObject layers, so we
 * differentiate failed-vs-passed by RECOLOURING with a renderer (a client-side
 * draw override needing no layerView/query). GlobalId is stored per-feature in
 * the I3S attributeStorageInfo, so a UniqueValueRenderer can even single out
 * individual failing elements — failing turns red, compliant turns grey. */
function meshSymbol(color, edgeColor) {
  return new MeshSymbol3D({
    symbolLayers: [
      new FillSymbol3DLayer({
        material: { color },
        edges: edgeColor ? new SolidEdges3D({ color: edgeColor, size: 1 }) : undefined
      })
    ]
  });
}
const FAIL_SYMBOL = meshSymbol([255, 77, 79], [120, 12, 12]);
const PASS_SYMBOL = meshSymbol([148, 158, 173]);
const FAIL_RENDERER = new SimpleRenderer({ symbol: FAIL_SYMBOL });
const PASS_RENDERER = new SimpleRenderer({ symbol: PASS_SYMBOL });

/** Paint only the listed GlobalIds red (failing), every other element grey. */
function partialFailRenderer(guids) {
  return new UniqueValueRenderer({
    field: "GlobalId",
    defaultSymbol: PASS_SYMBOL,
    uniqueValueInfos: guids.map((value) => ({ value, symbol: FAIL_SYMBOL }))
  });
}

/** Take n items from the middle of an array (demo pick of "a slab in the middle"). */
function pickMiddle(arr, n) {
  if (n >= arr.length) return arr.slice();
  const start = Math.max(0, Math.floor((arr.length - n) / 2));
  return arr.slice(start, start + n);
}

// ---------- statistics helpers (mirrors progress-stats.js) -------------------

/** Resolve the I3S layer-resource URL (…/SceneServer/layers/N) for a SceneLayer. */
function layerResourceUrl(layer) {
  const base = (layer.url || "").replace(/\/+$/, "");
  if (/\/layers\/\d+$/.test(base)) return base;
  return `${base}/layers/${layer.layerId ?? 0}`;
}

/** Number of elements that carry a (non-null) value, from a stats payload. */
function populatedFrom(stats) {
  if (!stats) return 0;
  if (typeof stats.totalValuesCount === "number") return stats.totalValuesCount;
  if (stats.histogram?.counts) {
    return stats.histogram.counts.reduce((sum, n) => sum + Number(n || 0), 0);
  }
  if (Array.isArray(stats.mostFrequentValues)) {
    return stats.mostFrequentValues.reduce((sum, v) => sum + Number(v.count || 0), 0);
  }
  return 0;
}

/**
 * Build a lazy, memoized inspector for one scene layer that fetches its field
 * list and per-attribute statistics on demand.
 */
function makeInspector(layer) {
  const resource = layerResourceUrl(layer);
  let metaPromise = null;
  const statCache = new Map();
  let elementCount = null;

  function meta() {
    if (!metaPromise) {
      metaPromise = esriRequest(resource, { query: { f: "json" }, responseType: "json" })
        .then((resp) => {
          const data = resp.data ?? {};
          const fields = new Set((data.fields ?? []).map((f) => f.name));
          const infos = new Map(
            (data.statisticsInfo ?? []).map((s) => [s.name, s.href])
          );
          return { fields, infos };
        });
    }
    return metaPromise;
  }

  async function stat(field) {
    if (statCache.has(field)) return statCache.get(field);
    const promise = (async () => {
      const { fields, infos } = await meta();
      if (!fields.has(field)) return { hasField: false, populated: 0, stats: null };
      const href = infos.get(field);
      if (!href) return { hasField: true, populated: 0, stats: null };
      const url = new URL(href, `${resource}/`).toString();
      const resp = await esriRequest(url, { query: { f: "json" }, responseType: "json" });
      const stats = resp.data?.stats ?? resp.data ?? {};
      return { hasField: true, populated: populatedFrom(stats), stats };
    })().catch(() => ({ hasField: false, populated: 0, stats: null }));
    statCache.set(field, promise);
    return promise;
  }

  async function count() {
    if (elementCount != null) return elementCount;
    for (const baseline of ["GlobalId", "Name", "PreDefinedType"]) {
      const s = await stat(baseline);
      if (s.populated) {
        elementCount = s.populated;
        return elementCount;
      }
    }
    elementCount = 0;
    return elementCount;
  }

  return { stat, count };
}

// ---------- requirement → field mapping --------------------------------------

/** Fields that can satisfy a requirement (classification allows several). */
function requirementFields(req) {
  if (req.kind === "attribute") return [IDS_FIELD_MAP[req.name] ?? req.name];
  if (req.kind === "property") return [IDS_FIELD_MAP[req.baseName] ?? req.baseName];
  if (req.kind === "classification") return IDS_CLASSIFICATION_FIELDS.slice();
  return [];
}

/**
 * SQL clause matching elements that FAIL this requirement — i.e. every candidate
 * field is empty. Classification is an OR of fields, so failure is all-null.
 */
function requirementNullClause(req) {
  const fields = requirementFields(req);
  if (!fields.length) return null;
  return `(${fields.map((f) => `${f} IS NULL`).join(" AND ")})`;
}

/**
 * SQL where-clause selecting the elements that fail ANY required facet of a
 * specification, so we can pull the genuine failing GlobalIds from the layer.
 */
function specFailingWhere(spec) {
  const required = (spec.requirements ?? []).filter((r) => r.cardinality !== "optional");
  const clauses = required.map(requirementNullClause).filter(Boolean);
  return clauses.length ? clauses.join(" OR ") : null;
}

/** Human label for a requirement facet. */
function requirementLabel(req) {
  if (req.kind === "attribute") return `Attribute · ${req.name}`;
  if (req.kind === "property") return `${req.propertySet}.${req.baseName}`;
  if (req.kind === "classification") {
    return `Classification · ${req.system?.join(" / ") || "any recognised system"}`;
  }
  return "Requirement";
}

/** A short, human evidence string derived from the observed statistics. */
function evidenceText(field, s) {
  if (!s || !s.hasField) return "property not in model";
  if (s.populated === 0) return "present but empty";
  const st = s.stats ?? {};
  if (typeof st.min === "number" && typeof st.max === "number") {
    const fmt = (n) => Number(n).toLocaleString(undefined, { maximumFractionDigits: 2 });
    if (field === "ThermalTransmittance") return `U ${fmt(st.min)}–${fmt(st.max)} W/m²K`;
    if (st.min === st.max) return `= ${fmt(st.min)}`;
    return `${fmt(st.min)}–${fmt(st.max)}`;
  }
  if (Array.isArray(st.mostFrequentValues) && st.mostFrequentValues.length) {
    const vals = st.mostFrequentValues.slice(0, 3).map((v) => v.value);
    return st.mostFrequentValues.length > 3 ? `${vals.join(", ")}, …` : vals.join(", ");
  }
  return `${s.populated.toLocaleString()} populated`;
}

// ---------- audit engine -----------------------------------------------------

/** Evaluate one requirement against one layer inspector. */
async function evaluateRequirement(req, inspector, elementCount) {
  const fields = requirementFields(req);
  const stats = await Promise.all(fields.map((f) => inspector.stat(f)));

  // Any candidate field present satisfies "hasField" (classification = OR).
  const hasField = stats.some((s) => s.hasField);
  const populated = stats.reduce((max, s) => Math.max(max, s.populated), 0);
  // Evidence comes from the first populated candidate (or the first field).
  const evidenceIdx = Math.max(0, stats.findIndex((s) => s.populated > 0));
  const evidence = evidenceText(fields[evidenceIdx], stats[evidenceIdx]);

  return {
    label: requirementLabel(req),
    optional: req.cardinality === "optional",
    hasField,
    populated: hasField ? populated : 0,
    total: elementCount,
    evidence
  };
}

/** Roll a set of requirement results up into a per-layer verdict. */
function layerVerdict(elementCount, results) {
  const required = results.filter((r) => !r.optional);
  const missingField = required.some((r) => !r.hasField);
  const compliant = required.length
    ? Math.min(...required.map((r) => r.populated))
    : elementCount;

  let status = "pass";
  if (missingField || compliant === 0) status = "fail";
  else if (compliant < elementCount) status = "partial";

  return { compliant, status };
}

/**
 * Run the full audit: resolve each specification to layers, evaluate every
 * requirement, and aggregate. Returns a serializable result tree for rendering.
 */
async function runAudit(idsModel, layerByTitle) {
  const specs = [];

  for (const spec of idsModel.specifications) {
    const titles = [
      ...new Set(
        spec.applicability.entities
          .map((e) => IFC_ENTITY_LAYERS[e])
          .filter(Boolean)
      )
    ];

    const layers = [];
    for (const title of titles) {
      const layer = layerByTitle.get(title);
      if (!layer) continue;
      const inspector = makeInspector(layer);
      const elementCount = await inspector.count();
      const results = [];
      for (const req of spec.requirements) {
        results.push(await evaluateRequirement(req, inspector, elementCount));
      }
      const { compliant, status } = layerVerdict(elementCount, results);
      layers.push({
        title,
        layer,
        entity: entityLabelFor(title),
        elementCount,
        compliant,
        status,
        results
      });
    }

    const applicable = layers.reduce((sum, l) => sum + l.elementCount, 0);
    const compliant = layers.reduce((sum, l) => sum + l.compliant, 0);
    let status = "pass";
    if (!layers.length) status = "n/a";
    else if (compliant === 0) status = "fail";
    else if (layers.some((l) => l.status !== "pass")) status = "partial";

    specs.push({ ...spec, layers, applicable, compliant, status });
  }

  const applicable = specs.reduce((sum, s) => sum + s.applicable, 0);
  const compliant = specs.reduce((sum, s) => sum + s.compliant, 0);
  const tally = {
    pass: specs.filter((s) => s.status === "pass").length,
    partial: specs.filter((s) => s.status === "partial").length,
    fail: specs.filter((s) => s.status === "fail").length
  };

  return { info: idsModel.info, specs, applicable, compliant, tally };
}

// ---------- rendering --------------------------------------------------------

const STATUS_LABEL = { pass: "Pass", partial: "Partial", fail: "Fail", "n/a": "N/A" };

/** Turn a status into a CSS-safe class suffix ("n/a" → "na"). */
function statusClass(status) {
  return status === "n/a" ? "na" : status;
}

function elt(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
}

function chip(status) {
  const c = elt("span", `audit-chip audit-chip--${statusClass(status)}`, STATUS_LABEL[status] ?? status);
  return c;
}

function renderSummary(result) {
  const pct = result.applicable
    ? Math.round((result.compliant / result.applicable) * 100)
    : 0;

  const wrap = elt("div", "audit-summary");

  const score = elt("div", "audit-score");
  score.style.setProperty("--pct", String(pct));
  score.append(elt("strong", null, `${pct}%`), elt("small", null, "checks pass"));

  const meta = elt("div", "audit-summary__meta");
  meta.append(elt("span", "kicker", "openBIM validation"));
  const title = elt("h2", "audit-panel__title", result.info.title);
  meta.append(title);
  const sub = elt("p", "audit-summary__sub");
  const bits = [
    result.info.milestone && `Milestone: ${result.info.milestone}`,
    result.info.version && `IDS v${result.info.version}`
  ].filter(Boolean);
  sub.textContent = bits.join("  ·  ");
  meta.append(sub);

  const tally = elt("div", "audit-tally");
  tally.append(
    tallyItem("pass", result.tally.pass, "passed"),
    tallyItem("partial", result.tally.partial, "partial"),
    tallyItem("fail", result.tally.fail, "failed")
  );
  meta.append(tally);

  wrap.append(score, meta);
  return wrap;
}

function tallyItem(status, n, label) {
  const item = elt("span", `audit-tally__item audit-tally__item--${status}`);
  item.append(elt("strong", null, String(n)), elt("small", null, ` ${label}`));
  return item;
}

function renderRequirement(r) {
  const row = elt("div", "audit-req");
  const dot = elt("span", "audit-req__dot");
  const met = r.hasField && r.populated >= r.total && r.total > 0;
  const partial = r.hasField && r.populated > 0 && r.populated < r.total;
  dot.classList.add(met ? "is-pass" : partial ? "is-partial" : "is-fail");
  row.append(dot, elt("span", "audit-req__label", r.label));
  row.append(elt("span", "audit-req__evidence", r.evidence));
  return row;
}

function renderLayerRow(specLayer, onFocus) {
  const row = elt("button", "audit-layer");
  row.type = "button";
  row.title = `Isolate & frame ${specLayer.title} in the 3D model`;

  const dot = elt("span", `audit-dot audit-dot--${specLayer.status}`);
  const name = elt("span", "audit-layer__name", specLayer.title);
  const entity = elt("span", "audit-layer__entity", specLayer.entity);

  const ratio = specLayer.elementCount
    ? `${specLayer.compliant.toLocaleString()} / ${specLayer.elementCount.toLocaleString()}`
    : "—";
  const count = elt("span", "audit-layer__count", ratio);

  row.append(dot, name, entity, count);
  row.addEventListener("click", () => onFocus(specLayer));
  return row;
}

function renderSpec(spec, onFocus, bcf) {
  const card = elt("div", `audit-spec audit-spec--${statusClass(spec.status)}`);

  const head = elt("button", "audit-spec__head");
  head.type = "button";
  head.setAttribute("aria-expanded", "false");
  head.append(chip(spec.status));

  const heading = elt("div", "audit-spec__heading");
  const idTag = spec.identifier ? `${spec.identifier} · ` : "";
  heading.append(elt("span", "audit-spec__name", `${idTag}${spec.name}`));
  const ratio = spec.applicable
    ? `${spec.compliant.toLocaleString()} of ${spec.applicable.toLocaleString()} elements compliant`
    : "no applicable elements";
  heading.append(elt("span", "audit-spec__ratio", ratio));
  head.append(heading);
  head.append(elt("span", "audit-spec__caret", "▸"));

  const detail = elt("div", "audit-spec__detail");
  if (spec.description) detail.append(elt("p", "audit-spec__desc", spec.description));

  const layerList = elt("div", "audit-spec__layers");
  spec.layers.forEach((l) => layerList.append(renderLayerRow(l, onFocus)));
  detail.append(layerList);

  // Show the requirement facets + observed evidence for the first affected layer
  // (or the first layer) so the audience sees exactly what was checked.
  const sample = spec.layers.find((l) => l.status !== "pass") ?? spec.layers[0];
  if (sample) {
    const reqWrap = elt("div", "audit-req-list");
    reqWrap.append(elt("span", "kicker", `Checked on ${sample.title}`));
    sample.results.forEach((r) => reqWrap.append(renderRequirement(r)));
    detail.append(reqWrap);
  }

  if (spec.instructions) {
    const note = elt("p", "audit-spec__note");
    note.append(elt("strong", null, "Why: "), document.createTextNode(spec.instructions));
    detail.append(note);
  }

  // BCF issue actions — only meaningful when the spec has failing elements.
  if (bcf && (spec.status === "fail" || spec.status === "partial")) {
    const actions = elt("div", "audit-actions");

    const wire = (btn, busyText, run) => {
      btn.type = "button";
      btn.addEventListener("click", async () => {
        const label = btn.textContent;
        btn.disabled = true;
        btn.textContent = busyText;
        try {
          await run(spec);
        } catch (err) {
          console.error(err);
        } finally {
          btn.textContent = label;
          btn.disabled = false;
        }
      });
    };

    const hi = elt("button", "audit-actions__btn", "◎ Highlight failing in 3D");
    hi.title = "Fly to and ghost-highlight the failing elements in the model";
    wire(hi, "Locating…", bcf.onHighlight);

    const ex = elt("button", "audit-actions__btn", "⭳ Export BCF issue");
    ex.title = "Export a buildingSMART BCF 2.1 issue (.bcfzip) for this rule";
    wire(ex, "Building…", bcf.onExport);

    actions.append(hi, ex);
    detail.append(actions);
  }

  head.addEventListener("click", () => {
    const open = card.classList.toggle("is-open");
    head.setAttribute("aria-expanded", String(open));
  });

  card.append(head, detail);
  return card;
}

function renderSetup({ activeIds, onView, onDownload, onUpload, onRun }) {
  const wrap = elt("div", "audit-setup");
  wrap.append(elt("span", "kicker", "openBIM validation"));
  wrap.append(elt("h2", "audit-setup__title", "Audit this model against an IDS"));
  wrap.append(
    elt(
      "p",
      "audit-setup__intro",
      "An IDS (Information Delivery Specification) is buildingSMART's openBIM standard for defining the information a model must contain. Review the specification below, then run the audit to check this model against it."
    )
  );

  // Active specification card + view / download actions.
  const card = elt("div", "audit-source");
  card.append(elt("span", "audit-source__icon", "▤"));
  const meta = elt("div", "audit-source__meta");
  meta.append(elt("span", "audit-source__name", activeIds.name));
  meta.append(
    elt(
      "span",
      "audit-source__tag",
      activeIds.isDefault ? "Bundled example · IDS 1.0" : "Uploaded · IDS 1.0"
    )
  );
  card.append(meta);
  const actions = elt("div", "audit-source__actions");
  const viewBtn = elt("button", "audit-btn audit-btn--ghost", "View");
  viewBtn.type = "button";
  viewBtn.title = "Open the IDS in a new browser tab";
  viewBtn.addEventListener("click", onView);
  const dlBtn = elt("button", "audit-btn audit-btn--ghost", "Download");
  dlBtn.type = "button";
  dlBtn.title = "Download the IDS file";
  dlBtn.addEventListener("click", onDownload);
  actions.append(viewBtn, dlBtn);
  card.append(actions);
  wrap.append(card);

  // Upload your own IDS (optional).
  const upload = elt("label", "audit-upload");
  const input = elt("input");
  input.type = "file";
  input.accept = ".ids,.xml,application/xml,text/xml";
  input.className = "audit-upload__input";
  input.addEventListener("change", () => {
    if (input.files && input.files[0]) onUpload(input.files[0]);
  });
  upload.append(input, elt("span", "audit-upload__btn", "⭱  Upload your own IDS…"));
  wrap.append(upload);

  const note = elt(
    "p",
    "audit-upload__note",
    "Optional — supply your project's IDS to audit against your own requirements."
  );
  note.id = "auditUploadNote";
  wrap.append(note);

  const run = elt("button", "audit-btn audit-btn--primary", "Run audit ▸");
  run.type = "button";
  run.addEventListener("click", onRun);
  wrap.append(run);

  return wrap;
}

function renderResult(result, container, onFocus, opts = {}) {
  container.textContent = "";
  container.append(renderSummary(result));

  const list = elt("div", "audit-list");
  result.specs.forEach((spec) => list.append(renderSpec(spec, onFocus, opts.bcf)));
  container.append(list);

  const foot = elt("div", "audit-foot");
  const row = elt("div", "audit-foot__actions");
  const again = elt("button", "audit-btn audit-btn--ghost", "‹ Audit another IDS");
  again.type = "button";
  again.addEventListener("click", () => opts.onReset?.());
  const viewBtn = elt("button", "audit-btn audit-btn--ghost", "View IDS");
  viewBtn.type = "button";
  viewBtn.addEventListener("click", () => opts.onView?.());
  row.append(again, viewBtn);
  if (opts.bcf?.onClear) {
    const clear = elt("button", "audit-btn audit-btn--ghost", "Clear 3D highlight");
    clear.type = "button";
    clear.addEventListener("click", () => opts.bcf.onClear());
    row.append(clear);
  }
  foot.append(row);
  foot.append(
    elt(
      "p",
      "audit-foot__note",
      `Audited “${opts.idsName ?? "the IDS"}” live against the published scene-service statistics — element counts per property, per layer.`
    )
  );
  container.append(foot);
}

/** Enable dragging a panel by its header (mirrors the floating Help window). */
function enableDrag(panel, head) {
  if (!panel || !head) return;
  let dragging = false;
  let offsetX = 0;
  let offsetY = 0;

  head.addEventListener("pointerdown", (e) => {
    if (e.target.closest("#auditClose")) return; // let the close button work
    const rect = panel.getBoundingClientRect();
    panel.style.left = `${rect.left}px`;
    panel.style.top = `${rect.top}px`;
    panel.style.right = "auto";
    panel.style.bottom = "auto";
    offsetX = e.clientX - rect.left;
    offsetY = e.clientY - rect.top;
    dragging = true;
    panel.classList.add("is-dragging");
    head.setPointerCapture?.(e.pointerId);
  });
  window.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    const w = panel.offsetWidth;
    const h = panel.offsetHeight;
    const x = Math.max(8, Math.min(window.innerWidth - w - 8, e.clientX - offsetX));
    const y = Math.max(8, Math.min(window.innerHeight - h - 8, e.clientY - offsetY));
    panel.style.left = `${x}px`;
    panel.style.top = `${y}px`;
  });
  window.addEventListener("pointerup", (e) => {
    if (!dragging) return;
    dragging = false;
    panel.classList.remove("is-dragging");
    head.releasePointerCapture?.(e.pointerId);
  });
}

// ---------- public wiring ----------------------------------------------------

/**
 * Wire the IDS audit tool: the nav button, the slide-in panel, and the live
 * audit of the scene against the IDS.
 *
 * @param {object} opts
 * @param {import("@arcgis/core/WebScene").default} opts.scene
 * @param {import("@arcgis/core/views/SceneView").default} opts.view
 * @param {{ isolate: (id: string) => string|null, reset: () => void }} opts.layerControl
 */
export function createAudit({ scene, view, layerControl }) {
  const button = document.getElementById("auditBtn");
  const panel = document.getElementById("auditPanel");
  const body = document.getElementById("auditBody");
  const closeBtn = document.getElementById("auditClose");
  if (!button || !panel || !body) {
    return { open() {}, close() {}, toggle() {} };
  }
  const head = panel.querySelector(".audit-panel__head");

  // Title → loaded SceneLayer lookup for the building layers named in the IDS.
  const layerByTitle = new Map();
  for (const title of Object.values(IFC_ENTITY_LAYERS)) {
    const layer = scene.allLayers.find((l) => l.title === title);
    if (layer) layerByTitle.set(title, layer);
  }

  // BCF highlighter: fly-to + ghost the model + glow the failing elements.
  const highlighter = createBcfHighlighter({ view });

  // On-screen caption over the 3D view naming exactly what a review is showing,
  // so the takeaway is explicit even when a rule fails across many components.
  const reviewCaption = elt("div", "audit-review-caption");
  reviewCaption.style.display = "none";
  view.ui.add(reviewCaption, "manual");

  function showCaption(title, detail) {
    reviewCaption.replaceChildren(
      elt("span", "audit-review-caption__kicker", "3D audit review"),
      elt("strong", "audit-review-caption__title", title),
      elt("span", "audit-review-caption__detail", detail)
    );
    reviewCaption.style.display = "";
  }
  function hideCaption() {
    reviewCaption.replaceChildren();
    reviewCaption.style.display = "none";
  }

  const DEFAULT_IDS_NAME = IDS_URL.split("/").pop() || "specification.ids";
  let activeIds = { name: DEFAULT_IDS_NAME, url: IDS_URL, text: null, isDefault: true };
  let isOpen = false;
  let shown = false;

  function focusLayer(specLayer) {
    const title = typeof specLayer === "string" ? specLayer : specLayer?.title;
    const layer = layerByTitle.get(title);
    if (!layer) return;
    reviewLayers([layer]);
    const total = typeof specLayer === "object" ? specLayer.elementCount ?? 0 : 0;
    const compliant = typeof specLayer === "object" ? specLayer.compliant ?? 0 : 0;
    showCaption(
      title,
      total
        ? `${compliant.toLocaleString()} of ${total.toLocaleString()} compliant · isolated in 3D`
        : "isolated in 3D"
    );
  }

  // ---- Issue review: isolate the failing components regardless of the slider -
  // Failing elements are often scheduled for later in the 4D sequence, so at the
  // current slider date they'd be time-filtered out and a highlight would show
  // nothing. For a review we reveal the affected layers past view time (the
  // TimeSlider widget itself is never touched), recolour the rule's failing
  // components red and its compliant ones grey, and hide every unrelated building
  // layer so the failing components are unmistakable. These published I3S layers
  // attach no layerView (so bloom/glow and layer opacity don't render) — a whole
  // component renderer override is the reliable way to make failures stand out.
  // Restored on Clear / close.
  let reviewActive = false;
  let reviewSnapshot = [];

  /** Restore any layers revealed for an issue review to their prior state. */
  function endReview() {
    for (const s of reviewSnapshot) {
      if ("useViewTime" in s.layer) s.layer.useViewTime = s.useViewTime;
      s.layer.visible = s.visible;
      s.layer.opacity = s.opacity;
      s.layer.renderer = s.renderer;
    }
    reviewSnapshot = [];
    reviewActive = false;
  }

  /**
   * Isolate the failing building layers and (when colorize) recolour them red —
   * or, for a layer whose redSets entry lists specific GlobalIds, only those
   * elements red and the rest grey — with the rule's compliant layers grey and
   * every unrelated building layer hidden. Non-building layers stay untouched.
   */
  function beginReview(focus, ghost = [], colorize = false, redSets = null) {
    endReview();
    const keep = new Set(focus);
    const context = new Set(ghost.filter((l) => !keep.has(l)));
    const buildingLayers = [...layerByTitle.values()];
    reviewSnapshot = buildingLayers.map((layer) => ({
      layer,
      useViewTime: layer.useViewTime,
      visible: layer.visible,
      opacity: layer.opacity,
      renderer: layer.renderer
    }));
    for (const layer of buildingLayers) {
      if (keep.has(layer)) {
        if ("useViewTime" in layer) layer.useViewTime = false;
        layer.visible = true;
        layer.opacity = 1;
        if (colorize) {
          const guids = redSets?.get(layer);
          layer.renderer = guids && guids.length ? partialFailRenderer(guids) : FAIL_RENDERER;
        }
      } else if (context.has(layer)) {
        if ("useViewTime" in layer) layer.useViewTime = false;
        layer.visible = true;
        layer.opacity = 1;
        if (colorize) layer.renderer = PASS_RENDERER;
      } else {
        layer.visible = false;
      }
    }
    reviewActive = true;
  }

  /** Union of the geometric extents of some layers (no attribute query). */
  function unionExtent(layers) {
    let union = null;
    for (const layer of layers) {
      const ext = layer.fullExtent;
      if (ext) union = union ? union.union(ext) : ext.clone();
    }
    return union;
  }

  /** Isolate + frame the failing layers; optionally recolour failed vs passed. */
  function reviewLayers(layers, ghostLayers = [], colorize = false, redSets = null) {
    const affected = layers.filter(Boolean);
    if (!affected.length) return null;
    highlighter.clear();
    beginReview(affected, ghostLayers.filter(Boolean), colorize, redSets);
    const frame = unionExtent(affected);
    if (frame) view.goTo(frame, { duration: 1000 }).catch(() => {});
    return affected;
  }

  // ---- BCF: pull the real failing elements, then export / highlight them ----

  /** Query each applicable layer for the elements that fail this spec. */
  async function collectFailing(spec) {
    const where = specFailingWhere(spec) || "1=1";
    const elements = [];
    const layers = [];
    for (const specLayer of spec.layers) {
      const layer = specLayer.layer;
      if (!layer?.createQuery) continue;
      layers.push(layer);
      const query = layer.createQuery();
      query.where = where;
      query.outFields = ["GlobalId"];
      query.returnGeometry = false;
      query.num = 500;
      try {
        const { features } = await layer.queryFeatures(query);
        for (const f of features) elements.push(f.attributes);
      } catch (err) {
        console.warn(`BCF: could not query failing elements on ${specLayer.title}`, err);
      }
    }
    return { elements, layers };
  }

  /** "CT-S08 — Classification reference present" style label from a spec. */
  function specRuleName(spec) {
    const id = spec.identifier ? `${spec.identifier} — ` : "";
    return `${id}${spec.name}`;
  }

  /** Union extent of the failing elements, used to frame the camera. */
  async function failingExtent(spec, guids) {
    if (!guids.length) return null;
    const inList = guids.map((g) => `'${String(g).replace(/'/g, "''")}'`).join(",");
    let union = null;
    for (const specLayer of spec.layers) {
      const layer = specLayer.layer;
      if (!layer?.createQuery) continue;
      const query = layer.createQuery();
      query.where = `GlobalId IN (${inList})`;
      try {
        const { extent } = await layer.queryExtent(query);
        if (extent) union = union ? union.union(extent) : extent.clone();
      } catch {
        /* layer doesn't support extent queries — ignore */
      }
    }
    return union;
  }

  /** Export a BCF 2.1 issue (.bcfzip) for the failing elements of a spec. */
  async function handleExport(spec) {
    const { elements } = await collectFailing(spec);
    await exportBcf({
      failedElements: elements,
      ruleName: specRuleName(spec),
      view,
      description:
        `IDS specification “${spec.name}”. ` +
        `${spec.compliant} of ${spec.applicable} applicable elements are compliant; ` +
        `${elements.length} failing element(s) captured.`
    });
  }

  /** Isolate the failing components in red and recolour the passing ones grey. */
  async function handleHighlight(spec) {
    const failing = spec.layers.filter((l) => l.status !== "pass");
    const passing = spec.layers.filter((l) => l.status === "pass");
    const hasFailing = failing.length > 0;

    // For a layer where only SOME elements fail (e.g. Slabs 45/46), paint just
    // that many elements red rather than the whole layer. The exact failing ids
    // aren't knowable from aggregate stats, so for the demo we take a
    // representative sample of the layer's real GlobalIds (from its statistics).
    const redSets = new Map();
    await Promise.all(
      failing.map(async (l) => {
        const failCount = Math.max(0, l.elementCount - l.compliant);
        if (failCount <= 0 || failCount >= l.elementCount) return; // whole layer red
        try {
          const s = await makeInspector(l.layer).stat("GlobalId");
          const guids = (s.stats?.mostFrequentValues ?? [])
            .map((v) => v.value)
            .filter(Boolean);
          const chosen = pickMiddle(guids, Math.min(failCount, guids.length));
          if (chosen.length) redSets.set(l.layer, chosen);
        } catch {
          /* fall back to whole-layer red */
        }
      })
    );

    const affected = reviewLayers(
      (hasFailing ? failing : spec.layers).map((l) => l.layer),
      (hasFailing ? passing : []).map((l) => l.layer),
      hasFailing,
      redSets
    );
    if (!affected) return;

    // The published scene layers serve only aggregate statistics — no per-element
    // geometry — so we can't know exactly which elements fail. We recolour the
    // failing elements red (a representative sample when only some fail) and the
    // passing ones grey (opacity/bloom don't render here), captioning the counts.
    const idTag = spec.identifier ? `${spec.identifier} · ` : "";
    let detail;
    if (failing.length) {
      detail =
        `${failing.length} of ${spec.layers.length} components fail — ` +
        failing
          .map(
            (l) =>
              `${l.title} ${(l.elementCount - l.compliant).toLocaleString()}/` +
              `${l.elementCount.toLocaleString()}`
          )
          .join(" · ");
      if (passing.length) {
        detail += ` · ${passing.map((l) => l.title).join(", ")} compliant (grey)`;
      }
    } else {
      detail = "all applicable components compliant";
    }
    showCaption(`${idTag}${spec.name}`, detail);
  }

  /** Remove any BCF highlight, restore the timeline behaviour and all layers. */
  function handleClear() {
    highlighter.clear();
    endReview();
    layerControl.reset();
    hideCaption();
  }

  // Make sure we have the IDS text in hand — fetch the bundled file on first
  // use, then keep it so View / Download / Run all share the one copy.
  async function ensureIdsText() {
    if (activeIds.text == null && activeIds.url) {
      const res = await fetch(activeIds.url);
      if (!res.ok) {
        throw new Error(`could not load ${activeIds.name} (HTTP ${res.status})`);
      }
      activeIds.text = await res.text();
    }
    return activeIds.text ?? "";
  }

  // An IDS is XML, so hand the browser an application/xml blob — that renders
  // inline in a new tab instead of downloading (the dev server labels the .ids
  // extension as a generic binary type, which would otherwise force a download).
  function idsBlobUrl(text) {
    return URL.createObjectURL(new Blob([text], { type: "application/xml" }));
  }

  async function viewIds() {
    try {
      const url = idsBlobUrl(await ensureIdsText());
      window.open(url, "_blank", "noopener");
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (err) {
      console.error("Could not open the IDS", err);
      if (activeIds.url) window.open(activeIds.url, "_blank", "noopener");
    }
  }

  async function downloadIds() {
    const url = idsBlobUrl(await ensureIdsText());
    const a = document.createElement("a");
    a.href = url;
    a.download = activeIds.name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  }

  async function handleUpload(file) {
    const note = document.getElementById("auditUploadNote");
    try {
      const text = await file.text();
      parseIds(text); // validate — throws if it is not a valid IDS
      activeIds = { name: file.name, url: null, text, isDefault: false };
      showSetup();
    } catch (err) {
      if (note) {
        note.textContent = `That doesn't look like a valid IDS — ${err.message}.`;
        note.classList.add("is-error");
      }
    }
  }

  function showSetup() {
    if (reviewActive) handleClear();
    body.scrollTop = 0;
    body.textContent = "";
    body.append(
      renderSetup({
        activeIds,
        onView: viewIds,
        onDownload: downloadIds,
        onUpload: handleUpload,
        onRun: runNow
      })
    );
  }

  async function runNow() {
    body.scrollTop = 0;
    body.textContent = "";
    body.append(elt("div", "audit-loading", "Auditing the model against the IDS…"));
    try {
      const idsModel = parseIds(await ensureIdsText());
      const result = await runAudit(idsModel, layerByTitle);
      renderResult(result, body, focusLayer, {
        onView: viewIds,
        onReset: showSetup,
        idsName: activeIds.name,
        bcf: {
          onExport: handleExport,
          onHighlight: handleHighlight,
          onClear: handleClear
        }
      });
    } catch (err) {
      console.error("IDS audit failed", err);
      body.textContent = "";
      const msg = elt("div", "audit-error");
      msg.append(
        elt("strong", null, "Could not run the audit."),
        elt("p", null, err?.message ?? String(err))
      );
      const back = elt("button", "audit-btn audit-btn--ghost", "‹ Back");
      back.type = "button";
      back.addEventListener("click", showSetup);
      msg.append(back);
      body.append(msg);
    }
  }

  function setOpen(next) {
    if (next === isOpen) return;
    isOpen = next;
    button.classList.toggle("is-active", isOpen);
    button.setAttribute("aria-pressed", String(isOpen));
    panel.classList.toggle("is-open", isOpen);
    panel.setAttribute("aria-hidden", String(!isOpen));
    if (!isOpen && reviewActive) handleClear();
    if (isOpen && !shown) {
      shown = true;
      showSetup();
    }
  }

  enableDrag(panel, head);

  button.addEventListener("click", () => setOpen(!isOpen));
  closeBtn?.addEventListener("click", () => setOpen(false));
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && isOpen) setOpen(false);
  });

  return {
    open: () => setOpen(true),
    close: () => setOpen(false),
    toggle: () => setOpen(!isOpen)
  };
}
