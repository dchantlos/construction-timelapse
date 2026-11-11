// =============================================================================
// welcome.js — intro modal ("title banner") for each page. Parked for now: the
// markup ships `hidden` and only opens when the URL has ?welcome. Set
// SHOW_BY_DEFAULT to true to show it on every page load again. The visitor
// dismisses it (button, backdrop, or Esc) before interacting with the twin.
// =============================================================================

const SHOW_BY_DEFAULT = false;

const modal = document.getElementById("welcome");
const wanted =
  SHOW_BY_DEFAULT || new URLSearchParams(location.search).has("welcome");

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
