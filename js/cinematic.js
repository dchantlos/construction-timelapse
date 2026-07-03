// =============================================================================
// cinematic.js — manual time scrubber + auto-play + slow camera orbit
// =============================================================================

import TimeExtent from "@arcgis/core/time/TimeExtent.js";

/**
 * Couples a manually interpolated time progression with a smooth camera orbit
 * so the building appears to assemble itself while the camera circles it, and
 * exposes a custom <input type="range"> scrubber that drives the same timeline.
 * Dragging the slider auto-pauses playback.
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
  const slider = document.getElementById("scrubSlider");
  const dateEl = document.getElementById("timeDisplay");

  // --- Setup: epoch bounds become the slider min/max ------------------------
  const startMs = +fullTimeExtent.start;
  const endMs = +fullTimeExtent.end;
  slider.min = String(startMs);
  slider.max = String(endMs);
  slider.step = String(Math.max(1, Math.round((endMs - startMs) / 500)));
  slider.value = String(startMs);

  const DURATION = 45000; // full construction sweep, in ms
  const ORBIT_DEG_PER_SEC = 4; // gentle, framerate-independent sweep
  const ORBIT_TILT = 62; // held constant so the pitch never drifts

  const fmtDate = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric"
  });

  let playing = false;
  let rafId = null;
  let lastTs = 0;
  let elapsed = 0; // ms of playback progress (0..DURATION)
  let heading = 0;
  let orbitCenter = null;

  /** Solid cyan left of the thumb, dark gray to the right. */
  function paintTrack(ms) {
    const pct = ((ms - startMs) / (endMs - startMs)) * 100;
    slider.style.background =
      `linear-gradient(90deg, #48dfe5 0%, #48dfe5 ${pct}%, #2a3142 ${pct}%, #2a3142 100%)`;
  }

  /** Apply an epoch timestamp to the map, slider thumb, and date label. */
  function applyMs(ms, { moveThumb = true } = {}) {
    const end = new Date(ms);
    timeSlider.timeExtent = new TimeExtent({ start: fullTimeExtent.start, end });
    view.timeExtent = timeSlider.timeExtent; // filter the 3D scene
    if (moveThumb) slider.value = String(ms);
    dateEl.textContent = fmtDate.format(end);
    paintTrack(ms);
  }

  function frame(ts) {
    if (!playing) return;

    const dt = lastTs ? ts - lastTs : 16;
    lastTs = ts;

    // Advance the timeline (loop back to the start when complete).
    elapsed += dt;
    if (elapsed >= DURATION) elapsed = 0;
    applyMs(startMs + (elapsed / DURATION) * (endMs - startMs));

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
    label.textContent = "Pause";

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

  // --- Scrubbing: dragging interrupts playback and scrubs the timeline ------
  slider.addEventListener("input", () => {
    if (playing) stop(); // interrupt auto-play
    const ms = +slider.value;
    elapsed = ((ms - startMs) / (endMs - startMs)) * DURATION;
    applyMs(ms, { moveThumb: false });
  });

  // Prime the initial date label + track fill.
  applyMs(startMs);

  /**
   * Scrub the timeline to an explicit Date (used by the timeline assistant).
   * Pauses playback, clamps to the authored bounds, and moves the thumb.
   * @param {Date|number} date
   */
  function scrubTo(date) {
    if (playing) stop();
    const ms = Math.max(startMs, Math.min(endMs, +date));
    elapsed = ((ms - startMs) / (endMs - startMs)) * DURATION;
    applyMs(ms);
  }

  return { start, stop, scrubTo };
}
