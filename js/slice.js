// =============================================================================
// slice.js — interactive "slice through the model" tool
//
// Wires the neon Slice nav button to an ArcGIS Slice widget. Opening the tool
// starts a fresh cut plane you can drop on the building and drag/tilt to slice
// straight through it; closing the tool clears the cut. The widget's own
// controls live inside a floating glass panel next to the nav stack.
//
// The Slice widget is deprecated in favor of the arcgis-slice component, but
// this app is built on the ESM SceneView + widget pattern (see the TimeSlider
// in app.js), so the widget is the consistent, dependency-free choice here.
// =============================================================================

import Slice from "@arcgis/core/widgets/Slice.js";

/**
 * Attach the slice tool to a SceneView and hook up the custom controls.
 *
 * @param {import("@arcgis/core/views/SceneView.js").default} view
 *   A ready SceneView (call after `await view.when()`).
 * @returns {{ open: () => void, close: () => void, toggle: () => void }}
 */
export function createSlice(view) {
  const button = document.getElementById("sliceBtn");
  const panel = document.getElementById("slicePanel");
  const container = document.getElementById("sliceContainer");
  const closeBtn = document.getElementById("sliceClose");

  // Nothing to wire if the page didn't include the slice controls.
  if (!button || !panel || !container) {
    return { open() {}, close() {}, toggle() {} };
  }

  let widget = null;
  let isOpen = false;

  // Build the widget lazily so the scene isn't charged for it until first use.
  function ensureWidget() {
    if (!widget) {
      widget = new Slice({ view, container });
      // Keep the terrain intact — only the building gets sliced.
      widget.viewModel.excludeGroundSurface = true;
      // Let the plane orient to the surface you click, enabling angled cuts.
      widget.viewModel.tiltEnabled = true;
    }
    return widget;
  }

  function startSlice() {
    const vm = ensureWidget().viewModel;
    // start() returns a promise that rejects if placement is cancelled.
    Promise.resolve(vm.start?.()).catch((err) =>
      console.warn("Slice creation was interrupted", err)
    );
  }

  function clearSlice() {
    widget?.viewModel?.clear?.();
  }

  function setOpen(next) {
    if (next === isOpen) return;
    isOpen = next;
    button.classList.toggle("is-active", isOpen);
    button.setAttribute("aria-pressed", String(isOpen));
    panel.classList.toggle("is-open", isOpen);
    panel.setAttribute("aria-hidden", String(!isOpen));
    if (isOpen) startSlice();
    else clearSlice();
  }

  button.addEventListener("click", () => setOpen(!isOpen));
  closeBtn?.addEventListener("click", () => setOpen(false));

  // Escape closes the tool and clears the cut.
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && isOpen) setOpen(false);
  });

  return {
    open: () => setOpen(true),
    close: () => setOpen(false),
    toggle: () => setOpen(!isOpen)
  };
}
