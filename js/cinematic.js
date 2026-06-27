// =============================================================================
// cinematic.js — manually-driven 4D timeline playback + slow camera orbit
// =============================================================================

import TimeExtent from "@arcgis/core/TimeExtent.js";

/**
 * Couples a manually interpolated time progression with a smooth camera orbit
 * so the building appears to assemble itself while the camera circles it.
 *
 * We drive `timeSlider.timeExtent` ourselves (instead of `timeSlider.play()`)
 * because cumulative-from-start playback can stall depending on the authored
 * stops — manual interpolation guarantees the timeline always advances.
 *
 * @param {import("@arcgis/core/views/SceneView").default} view
 * @param {import("@arcgis/core/widgets/TimeSlider").default} timeSlider
 * @param {TimeExtent} fullTimeExtent
 */
export function createCinematic(view, timeSlider, fullTimeExtent) {
  const btn = document.getElementById("cinematicBtn");
  const icon = document.getElementById("cineIcon");
  const label = document.getElementById("cineLabel");

  const startMs = +fullTimeExtent.start;
  const endMs = +fullTimeExtent.end;
  const DURATION = 45000; // full construction sweep, in ms
  const ORBIT_DEG_PER_SEC = 4; // gentle, framerate-independent sweep
  const ORBIT_TILT = 62; // held constant so the pitch never drifts

  let playing = false;
  let rafId = null;
  let lastTs = 0;
  let elapsed = 0; // ms of playback progress (0..DURATION)
  let heading = 0;
  let orbitCenter = null;

  function applyTime(progress) {
    const end = new Date(startMs + progress * (endMs - startMs));
    timeSlider.timeExtent = new TimeExtent({ start: fullTimeExtent.start, end });
  }

  function frame(ts) {
    if (!playing) return;

    const dt = lastTs ? ts - lastTs : 16;
    lastTs = ts;

    // Advance the timeline (loop back to the start when complete).
    elapsed += dt;
    if (elapsed >= DURATION) elapsed = 0;
    applyTime(elapsed / DURATION);

    // Gently orbit the camera around the building (heading only; tilt held).
    heading = (heading + ORBIT_DEG_PER_SEC * (dt / 1000)) % 360;
    view
      .goTo({ target: orbitCenter, heading, tilt: ORBIT_TILT }, { animate: false })
      .catch(() => {
        /* goTo rejects when interrupted — safe to ignore */
      });

    rafId = requestAnimationFrame(frame);
  }

  function start() {
    playing = true;
    lastTs = 0;
    orbitCenter = view.center.clone();
    heading = view.camera.heading;

    // Restart from the beginning if we're already at the end.
    if (+timeSlider.timeExtent?.end >= endMs) elapsed = 0;

    btn.classList.add("is-playing");
    icon.textContent = "\u275A\u275A";
    label.textContent = "Playing";

    rafId = requestAnimationFrame(frame);
  }

  function stop() {
    playing = false;
    if (rafId) cancelAnimationFrame(rafId);
    rafId = null;

    btn.classList.remove("is-playing");
    icon.textContent = "\u25B6";
    label.textContent = "Play";
  }

  btn.addEventListener("click", () => (playing ? stop() : start()));

  return { stop };
}
