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
import { loadIds } from "./ids.js";
import {
  IDS_URL,
  IFC_ENTITY_LAYERS,
  IDS_FIELD_MAP,
  IDS_CLASSIFICATION_FIELDS
} from "./config.js";

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
  row.addEventListener("click", () => onFocus(specLayer.title));
  return row;
}

function renderSpec(spec, onFocus) {
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

  head.addEventListener("click", () => {
    const open = card.classList.toggle("is-open");
    head.setAttribute("aria-expanded", String(open));
  });

  card.append(head, detail);
  return card;
}

function renderResult(result, container, onFocus) {
  container.textContent = "";
  container.append(renderSummary(result));

  const list = elt("div", "audit-list");
  result.specs.forEach((spec) => list.append(renderSpec(spec, onFocus)));
  container.append(list);

  const foot = elt("div", "audit-foot");
  const link = elt("a", "audit-foot__link", "View the IDS file");
  link.href = IDS_URL;
  link.target = "_blank";
  link.rel = "noopener";
  foot.append(link);
  foot.append(
    elt(
      "p",
      "audit-foot__note",
      "Audited live against the published scene-service statistics — element counts per property, per layer."
    )
  );
  container.append(foot);
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

  // Title → loaded SceneLayer lookup for the building layers named in the IDS.
  const layerByTitle = new Map();
  for (const title of Object.values(IFC_ENTITY_LAYERS)) {
    const layer = scene.allLayers.find((l) => l.title === title);
    if (layer) layerByTitle.set(title, layer);
  }

  let isOpen = false;
  let hasRun = false;

  function focusLayer(title) {
    const layer = layerByTitle.get(title);
    if (!layer) return;
    layerControl.isolate(title);
    if (layer.fullExtent) {
      view.goTo(layer.fullExtent, { duration: 900 }).catch(() => {});
    }
  }

  async function run() {
    body.textContent = "";
    body.append(elt("div", "audit-loading", "Auditing the model against the IDS…"));
    try {
      const idsModel = await loadIds(IDS_URL);
      const result = await runAudit(idsModel, layerByTitle);
      renderResult(result, body, focusLayer);
    } catch (err) {
      console.error("IDS audit failed", err);
      body.textContent = "";
      const msg = elt("div", "audit-error");
      msg.append(
        elt("strong", null, "Could not run the audit."),
        elt("p", null, err?.message ?? String(err))
      );
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
    if (isOpen && !hasRun) {
      hasRun = true;
      run();
    }
  }

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
