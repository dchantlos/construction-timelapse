// =============================================================================
// spin.js — turntable camera orbit for the (non-time) progress view.
//
// A lightweight, framerate-independent heading sweep around the current view
// center. Mirrors the camera-orbit half of cinematic.js without any timeline.
// =============================================================================

/**
 * Wire a "Spin" toggle button to a slow orbit of the SceneView camera.
 * Grabbing the view (drag) cancels the orbit so manual navigation always wins.
 *
 * @param {import("@arcgis/core/views/SceneView").default} view
 * @returns {{ stop: () => void }}
 */
export function createSpin(view) {
  const btn = document.getElementById("spinBtn");
  const icon = document.getElementById("spinIcon");
  const label = document.getElementById("spinLabel");
  if (!btn) return { stop() {} };

  const DEG_PER_SEC = 6; // gentle, framerate-independent sweep

  let spinning = false;
  let rafId = null;
  let lastTs = 0;
  let heading = 0;
  let tilt = 62;
  let center = null;

  function frame(ts) {
    if (!spinning) return;
    const dt = lastTs ? ts - lastTs : 16;
    lastTs = ts;

    heading = (heading + DEG_PER_SEC * (dt / 1000)) % 360;
    view
      .goTo({ target: center, heading, tilt }, { animate: false })
      .catch(() => {
        /* goTo rejects when interrupted — safe to ignore */
      });

    rafId = requestAnimationFrame(frame);
  }

  function start() {
    spinning = true;
    lastTs = 0;
    center = view.center.clone();
    heading = view.camera.heading;
    tilt = view.camera.tilt; // hold the current pitch while orbiting

    btn.classList.add("is-playing");
    icon.textContent = "\u275A\u275A"; // ❚❚
    label.textContent = "Stop";

    rafId = requestAnimationFrame(frame);
  }

  function stop() {
    spinning = false;
    if (rafId) cancelAnimationFrame(rafId);
    rafId = null;

    btn.classList.remove("is-playing");
    icon.textContent = "\u27F3"; // ⟳
    label.textContent = "Spin";
  }

  btn.addEventListener("click", () => (spinning ? stop() : start()));

  // As soon as the user grabs the view, hand control back to them.
  view.on("drag", () => {
    if (spinning) stop();
  });

  return { stop };
}
