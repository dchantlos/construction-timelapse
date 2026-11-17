// =============================================================================
// project-switch.js — top-bar Vertical | Linear switch + project-aware links.
//
// Every page carries the same switch: each option reopens the current page for
// that project, and the planned ↔ progress links keep the visitor's project
// (and Photorealistic basemap choice). The active option is styled from
// <html data-project>, which the inline <head> script sets before first paint.
// =============================================================================

import { PROJECTS, PROJECT_ID, PROJECT, pageHref } from "./config.js?v=15";

const page = `./${location.pathname.split("/").pop() || "index.html"}`;

/** Point every in-app link at the right project (rerun when the URL changes). */
function refreshLinks() {
  for (const link of document.querySelectorAll("[data-project-link]")) {
    const id = link.dataset.projectLink;
    const project = PROJECTS[id];
    if (!project) continue;
    link.href = pageHref(page, { project: id });
    const active = id === PROJECT_ID;
    link.classList.toggle("is-active", active);
    if (active) link.setAttribute("aria-current", "page");
    else link.removeAttribute("aria-current");
    link.title = active
      ? `Viewing the ${project.kind.toLowerCase()} project — ${project.name}`
      : `Switch to the ${project.kind.toLowerCase()} project — ${project.name}`;
  }
  for (const link of document.querySelectorAll("[data-page-link]")) {
    link.href = pageHref(link.dataset.pageLink);
  }
}

/** Swap the few project nouns baked into the markup ("…the building"). */
function applyProjectText() {
  for (const el of document.querySelectorAll("[data-noun]")) el.textContent = PROJECT.noun;
  for (const el of document.querySelectorAll("[data-title-noun]")) {
    el.title = el.dataset.titleNoun.replace("{noun}", PROJECT.noun);
  }
  if (PROJECT_ID !== "vertical") document.title = `${PROJECT.kind} · ${document.title}`;
}

refreshLinks();
applyProjectText();
window.addEventListener("ct:url-change", refreshLinks);
