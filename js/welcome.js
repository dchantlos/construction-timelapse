// =============================================================================
// welcome.js — intro modal ("title banner") for each page. Parked for now: the
// markup ships `hidden` and only opens when the URL has ?welcome. Set
// SHOW_BY_DEFAULT to true to show it on every page load again. The visitor
// dismisses it (button, backdrop, or Esc) before interacting with the twin.
// =============================================================================

import { PROJECT_ID } from "./config.js?v=15";

const SHOW_BY_DEFAULT = false;

// The markup carries the tower's copy; the roadway swaps in its own.
const LINEAR_COPY = {
  index: {
    badge: "Pre-Construction · 4D Sequencing",
    title: "Welcome to the Roadway Digital Twin",
    desc: "Watch the Marina Bay East Elevated Roadway assemble itself exactly as the 4D schedule plans it — piles, piers, girders, deck and finishes, front by front."
  },
  progress: {
    badge: "During Construction · As-Built Twin",
    title: "Simulated Construction Progress",
    desc: "Tracking the roadway against the plan — real status, 5D cost and the pay application, read straight from every element's data."
  }
};

const modal = document.getElementById("welcome");
const wanted =
  SHOW_BY_DEFAULT || new URLSearchParams(location.search).has("welcome");

if (modal && wanted && PROJECT_ID === "linear") {
  const copy = LINEAR_COPY[document.body.dataset.help] ?? LINEAR_COPY.index;
  modal.querySelector(".welcome__badge").textContent = copy.badge;
  modal.querySelector(".welcome__title").textContent = copy.title;
  modal.querySelector(".welcome__desc").textContent = copy.desc;
}

if (modal && wanted) {
  modal.removeAttribute("hidden");
  const opener = document.activeElement;

  const onKey = (e) => {
    if (e.key === "Escape") close();
  };

  function close() {
    if (modal.classList.contains("is-closing")) return;
    modal.classList.add("is-closing");
    window.removeEventListener("keydown", onKey, true);
    window.setTimeout(() => {
      modal.setAttribute("hidden", "");
      modal.classList.remove("is-closing");
      if (opener && typeof opener.focus === "function") opener.focus();
    }, 260);
  }

  modal.querySelectorAll("[data-welcome-close]").forEach((el) => el.addEventListener("click", close));
  // Capture phase on window so the 3D view can't swallow Escape first.
  window.addEventListener("keydown", onKey, true);

  // Focus the primary action so Enter/Space dismisses immediately.
  modal.querySelector(".welcome__btn")?.focus();
}
