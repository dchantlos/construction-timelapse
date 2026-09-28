// =============================================================================
// welcome.js — intro modal shown on every page load. The visitor dismisses it
// (button, backdrop, or Esc) before interacting with the digital twin.
// =============================================================================

const modal = document.getElementById("welcome");

if (modal) {
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
