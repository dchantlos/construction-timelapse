// =============================================================================
// ids.js — fetch + parse a buildingSMART IDS 1.0 file into a plain JS model
//
// The IDS XML uses the default namespace http://standards.buildingsmart.org/IDS
// plus embedded xs: restrictions, so we match on localName throughout rather
// than fighting namespace-qualified selectors. Only the facets this app can
// evaluate against the published scene (entity / attribute / property /
// classification) are extracted; anything else is ignored gracefully.
// =============================================================================

/** First child element with the given localName, or null. */
function firstByLocal(el, name) {
  if (!el) return null;
  for (const child of el.children) {
    if (child.localName === name) return child;
  }
  return null;
}

/** All descendant elements with the given localName. */
function allByLocal(el, name) {
  const out = [];
  if (!el) return out;
  for (const child of el.children) {
    if (child.localName === name) out.push(child);
    out.push(...allByLocal(child, name));
  }
  return out;
}

/** Trimmed text content of an element, or "". */
function textOf(el) {
  return (el?.textContent ?? "").trim();
}

/**
 * Read an IDS value container (e.g. <name>, <baseName>, <propertySet>, <system>)
 * into a normalized shape the audit engine can reason about.
 *
 * @param {Element|null} el
 * @returns {{ simple: string|null, enumeration: string[]|null, pattern: string|null }}
 */
function readValue(el) {
  const result = { simple: null, enumeration: null, pattern: null };
  if (!el) return result;

  const simple = firstByLocal(el, "simpleValue");
  if (simple) {
    result.simple = textOf(simple);
    return result;
  }

  const restriction = firstByLocal(el, "restriction");
  if (restriction) {
    const enums = allByLocal(restriction, "enumeration")
      .map((e) => e.getAttribute("value"))
      .filter((v) => v != null);
    if (enums.length) result.enumeration = enums;

    const pattern = firstByLocal(restriction, "pattern");
    if (pattern) result.pattern = pattern.getAttribute("value");
  }
  return result;
}

/** Flatten a value container to the list of literal values it names (if any). */
function valueList(el) {
  const v = readValue(el);
  if (v.simple != null) return [v.simple];
  if (v.enumeration) return v.enumeration;
  return [];
}

/** Parse the <applicability> facets we understand (currently entity names). */
function parseApplicability(specEl) {
  const app = firstByLocal(specEl, "applicability");
  const entities = [];
  for (const entity of allByLocal(app, "entity")) {
    const nameEl = firstByLocal(entity, "name");
    for (const name of valueList(nameEl)) {
      entities.push(name.toUpperCase());
    }
  }
  return { entities };
}

/** Parse the <requirements> facets into a flat list of typed requirement objects. */
function parseRequirements(specEl) {
  const req = firstByLocal(specEl, "requirements");
  const out = [];
  if (!req) return out;

  for (const facet of req.children) {
    const cardinality = facet.getAttribute("cardinality") || "required";

    if (facet.localName === "attribute") {
      const values = valueList(firstByLocal(facet, "name"));
      for (const name of values) {
        out.push({ kind: "attribute", name, cardinality });
      }
    } else if (facet.localName === "property") {
      const psetVal = readValue(firstByLocal(facet, "propertySet"));
      const baseName = valueList(firstByLocal(facet, "baseName"))[0] ?? null;
      const allowed = valueList(firstByLocal(facet, "value"));
      out.push({
        kind: "property",
        propertySet: psetVal.simple ?? psetVal.pattern ?? "Pset",
        baseName,
        dataType: facet.getAttribute("dataType") || null,
        allowedValues: allowed.length ? allowed : null,
        cardinality
      });
    } else if (facet.localName === "classification") {
      out.push({
        kind: "classification",
        system: valueList(firstByLocal(facet, "system")),
        cardinality
      });
    }
  }
  return out;
}

/**
 * Parse IDS XML text into the plain JS model. Throws if the text is not
 * well-formed XML or is not a buildingSMART IDS document.
 *
 * @param {string} text
 * @returns {{ info: object, specifications: Array<object> }}
 */
export function parseIds(text) {
  const doc = new DOMParser().parseFromString(text, "application/xml");
  if (doc.getElementsByTagName("parsererror").length) {
    throw new Error("the file is not well-formed XML");
  }

  const root = doc.documentElement;
  if (!root || root.localName !== "ids") {
    throw new Error("the file is not a buildingSMART IDS document");
  }

  const infoEl = firstByLocal(root, "info");
  const info = {
    title: textOf(firstByLocal(infoEl, "title")) || "Information Delivery Specification",
    version: textOf(firstByLocal(infoEl, "version")),
    description: textOf(firstByLocal(infoEl, "description")),
    author: textOf(firstByLocal(infoEl, "author")),
    date: textOf(firstByLocal(infoEl, "date")),
    purpose: textOf(firstByLocal(infoEl, "purpose")),
    milestone: textOf(firstByLocal(infoEl, "milestone"))
  };

  const specsEl = firstByLocal(root, "specifications");
  const specifications = allByLocal(specsEl, "specification")
    .filter((el) => el.parentElement?.localName === "specifications")
    .map((el) => ({
      name: el.getAttribute("name") || "Specification",
      identifier: el.getAttribute("identifier") || "",
      description: el.getAttribute("description") || "",
      instructions: el.getAttribute("instructions") || "",
      ifcVersion: el.getAttribute("ifcVersion") || "",
      applicability: parseApplicability(el),
      requirements: parseRequirements(el)
    }));

  return { info, specifications };
}

/**
 * Fetch and parse the IDS document at `url`.
 *
 * @param {string} url
 * @returns {Promise<{ info: object, specifications: Array<object> }>}
 */
export async function loadIds(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Could not load IDS (${res.status})`);
  return parseIds(await res.text());
}
