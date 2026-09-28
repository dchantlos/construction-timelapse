// =============================================================================
// presentation.js - self-contained "Presentation Mode": a clean, captioned
// walkthrough of the app's key features for recording demo videos.
//
// Start it from the launcher button, press "P", or open the page with ?present.
// Advance with the on-screen controls or → / Space (← to go back); Esc exits.
// Each beat shows a lower-third subtitle, an optional action cue, and softly
// spotlights the element being described. No dependencies; load once per page.
// =============================================================================

const PAGE = document.body && document.body.dataset.help === "progress" ? "progress" : "index";

// The demo script - one entry per beat: { label, text, target?, cue? }.
const SCRIPTS = {
  index: [
    { label: "Welcome", text: "Welcome to the construction digital twin, built with the ArcGIS Maps SDK for JavaScript. This is ArcGIS extended into a fully customisable application, shaped to any business solution. Building an application like this no longer takes a development team: it was built through AI-assisted engineering, extending the value and ROI of your existing ArcGIS user types." },
    { label: "The Digital Twin", text: "As part of the validation process, before construction can break ground, we begin by visualising our BIM model: a high-rise building, authored in Autodesk Revit and exported as buildingSMART Industry Foundation Classes, also known as IFC, brought to life here as a 3D digital twin." },
    { label: "4D Sequencing", text: "ArcGIS validates that the BIM model is correctly geolocated and carries its construction schedule. Press play and the tower builds itself in time, exactly to that schedule. That's 4D sequencing.", target: ".dock", cue: "▶ Press Play" },
    { label: "Live Dashboard", text: "As part of that validation, the team can query the dashboard at any date on the timeline: overall progress, the current phase, active building systems, and days elapsed versus remaining. It's how we confirm the schedule holds to the deadlines the construction teams depend on.", target: ".dashboard" },
    { label: "Building Systems", text: "Every building system, from structure to facade to services, is its own layer. Click one to isolate it and see how the building goes together.", target: ".dashboard", cue: "Click a layer to isolate it" },
    { label: "BIM Validation", text: "Before construction starts, we validate the model against an open buildingSMART Information Delivery Specification, also known as IDS. It checks every element against the project's data standards and submission requirements, confirming the model meets the agreed design standards before we build.", target: "#auditBtn", cue: "☑ Open the Model Audit" },
    { label: "Running the Audit", text: "The audit checks every element against that specification and scores the whole project in seconds: whether it passes, needs attention, or fails compliance.", target: "#auditPanel" },
    { label: "Requirement by Requirement", text: "Each requirement is scored against the real element data: unique IDs, naming, 4D scheduling dates, fire ratings, classifications. You see exactly what's compliant and what's missing from the BIM data.", target: "#auditPanel" },
    { label: "Pinpoint the Problems", text: "Expand any requirement for a per-layer breakdown, then drill into a layer to see precisely which elements fall short.", target: "#auditPanel" },
    { label: "Highlight & Fix", text: "We visualise and highlight every failing component right in the 3D model, then package them into a buildingSMART BIM Collaboration Format file, also known as BCF, so the design team can fix the model before construction begins.", target: "#auditPanel", cue: "⭳ Highlight & export BCF" },
    { label: "Close the Loop", text: "Once the design team receives that BCF file, they fix each flagged issue and run the audit again, looping until the model reaches 100% compliance.", target: "#auditPanel" },
    { label: "From Plan to Site", text: "That's the validated plan. So how is the real build tracking against it? Let's move to the next panel on the application.", target: ".tab-link", cue: "→ View Simulated Construction Progress" },
  ],
  progress: [
    { label: "The As-Built Twin", text: "The same tower, now colour-coded by real construction status, updated in the field by our construction crews with ArcGIS Field Maps, can be measured against the plan." },
    { label: "Status at a Glance", text: "Green is installed, blue is due soon, orange is due by the end of the month, and grey is still weeks out. The whole job, read at a single glance." },
    { label: "Schedule · 4D", text: "The 4D view compares scheduled versus effective progress, this shows how far behind our planned schedule is running, and breaks the job down by status.", target: ".dashboard" },
    { label: "Real-Time IoT", text: "Live feeds for wind, gas, dust, noise and weather stream in from ArcGIS Velocity. We detect, store and analyse them to measure the cost of environmental and site delays, this also helps keep field crews safe with early detection monitoring.", target: ["#sensorDetailPanel", ".sensor-panel"], cue: "⤢ Expand the feeds" },
    { label: "Sensors in 3D", text: "Every sensor drops onto the model as a live, colour-coded glowing point. Click one for its latest reading and status.", target: ["#sensorDetailPanel", ".sensor-panel"], cue: "Show Sensor Locations" },
    { label: "Readings at a Glance", text: "Each pop-up gives project supervisors a clear read of a sensor's current values, and those same live readings roll up into the larger feeds panel, so the whole site's conditions stay in view.", target: [".sensor-pop", "#sensorDetailPanel", ".sensor-panel"] },
    { label: "Cost · 5D", text: "Click the Financials tab to open the ERP-to-GIS bridge. It streams our live project costs straight from the ERP into the twin: budget, cost-to-date, earned-value health, and the current billing draw. That's 5D.", target: "#viewFinancial", cue: "Open Financials · 5D" },
    { label: "Risk & Variance", text: "Risk and variance track the cost of everything we couldn't plan for in design: environmental holds flagged by our site sensors, and the price of components running late. The unplanned spend, captured and quantified.", target: "#finRisks", cue: "Risk & Variance" },
    { label: "AI Site Analyst", text: "Open the AI Site Analyst and ask how those risks hit the bottom line. It reasons over the live feeds and the cost figures and answers in plain English: how much these unplanned events have added to the total budget.", target: "#sc-fab", cue: "✨ Ask the AI Site Analyst" },
    { label: "Clarity for Everyone", text: "For supervisors and stakeholders, this is the payoff. No dashboards to decode: the assistant turns connected data and systems, working in harmony, into clear answers, so everyone makes better sense of the site and the decisions that follow." },
    { label: "AIA Billing Report", text: "Finally, generate the AIA billing report: full transparency on exactly how much work is in place and what it has cost. One click produces the payment application, ready to submit and saved with the project record.", target: "#finBilling", cue: "Generate AIA Billing Report" },
    { label: "One Digital Twin", text: "From a validated plan to tracked delivery: one construction digital twin. Model the plan, manage the build, master the budget, with ArcGIS." },
  ],
};

const steps = SCRIPTS[PAGE] || [];
const AUTO_MS = 9000;

let idx = 0;
let active = false;
let autoOn = false;
let autoTimer = null;
let lastKey = "";

// ---- Styles -----------------------------------------------------------------
const STYLE_ID = "presentation-styles";
if (!document.getElementById(STYLE_ID)) {
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
  .present-fab { position: fixed; right: 18px; z-index: 45; display: inline-flex; align-items: center; gap: 8px;
    padding: 9px 15px; border-radius: 999px; cursor: pointer; color: #eaf0ff; letter-spacing: .01em;
    font: 600 13px/1 "Inter","Segoe UI",system-ui,sans-serif; border: 1px solid rgba(124,92,255,.5);
    background: rgba(14,18,32,.66); -webkit-backdrop-filter: blur(10px); backdrop-filter: blur(10px);
    box-shadow: 0 10px 30px -12px rgba(0,0,0,.7), 0 0 18px -6px rgba(124,92,255,.6);
    transition: transform .2s ease, box-shadow .2s ease, opacity .2s ease; }
  .present-fab:hover { transform: translateY(-1px); box-shadow: 0 10px 30px -10px rgba(0,0,0,.8), 0 0 26px -4px rgba(124,92,255,.9); }
  .present-fab:focus-visible { outline: 2px solid rgba(124,92,255,.8); outline-offset: 2px; }
  .present-fab__i { display: grid; place-items: center; width: 18px; height: 18px; color: #c9bcff; }
  .present-fab__i svg { width: 17px; height: 17px; }
  body.is-presenting .present-fab, body.is-presenting .help-fab, body.is-presenting .res-fab,
  .capture-clean .present-fab { opacity: 0 !important; pointer-events: none !important; }

  .present-ring { position: fixed; z-index: 91; border-radius: 14px; pointer-events: none; opacity: 0;
    box-shadow: 0 0 0 2px rgba(72,223,229,.95), 0 0 0 5px rgba(72,223,229,.18), 0 0 26px 6px rgba(72,223,229,.5);
    animation: present-ring-pulse 2.4s ease-in-out infinite;
    transition: left .4s cubic-bezier(.22,1,.36,1), top .4s cubic-bezier(.22,1,.36,1),
      width .4s cubic-bezier(.22,1,.36,1), height .4s cubic-bezier(.22,1,.36,1), opacity .3s ease; }
  @keyframes present-ring-pulse {
    0%, 100% { box-shadow: 0 0 0 2px rgba(72,223,229,.9), 0 0 0 5px rgba(72,223,229,.16), 0 0 20px 4px rgba(72,223,229,.4); }
    50% { box-shadow: 0 0 0 2px rgba(72,223,229,1), 0 0 0 7px rgba(72,223,229,.26), 0 0 32px 8px rgba(72,223,229,.62); }
  }

  .present-cap { position: fixed; left: 50%; bottom: 118px; transform: translateX(-50%) translateY(14px);
    z-index: 100001; width: min(840px, calc(100vw - 40px)); padding: 18px 24px 14px; border-radius: 16px;
    color: #eaf1ff; overflow: hidden; background: rgba(9,12,24,.85); border: 1px solid rgba(124,92,255,.34);
    -webkit-backdrop-filter: blur(18px) saturate(140%); backdrop-filter: blur(18px) saturate(140%);
    box-shadow: 0 26px 64px -18px rgba(0,0,0,.85), 0 0 34px -12px rgba(124,92,255,.5);
    opacity: 0; pointer-events: none; transition: opacity .3s ease, transform .3s ease;
    font-family: "Inter","Segoe UI",system-ui,sans-serif; }
  .present-cap.is-on { opacity: 1; pointer-events: auto; transform: translateX(-50%) translateY(0); }
  .present-cap__label { display: flex; align-items: center; gap: 10px; font-size: 12px; font-weight: 700;
    letter-spacing: .2em; text-transform: uppercase; color: #b7a6ff; }
  .present-cap__count { margin-left: auto; letter-spacing: .08em; color: #8ea0c8; font-weight: 600; }
  .present-cap__text { margin: 11px 0 0; font-size: 21px; line-height: 1.5; font-weight: 500; color: #eff4ff; }
  .present-cap__cuewrap:not(:empty) { margin-top: 12px; }
  .present-cap__cue { display: inline-flex; align-items: center; gap: 6px; padding: 6px 13px; border-radius: 999px;
    font-size: 13.5px; font-weight: 700; letter-spacing: .01em; color: #05141b;
    background: linear-gradient(135deg,#48dfe5,#7c5cff); box-shadow: 0 0 16px -4px rgba(72,223,229,.6); }
  .present-cap__nav { display: flex; align-items: center; gap: 8px; margin-top: 15px; }
  .present-cap__btn { display: inline-flex; align-items: center; justify-content: center; gap: 6px; height: 34px;
    padding: 0 15px; border-radius: 9px; border: 1px solid rgba(140,170,230,.28); background: rgba(255,255,255,.05);
    color: #dbe7f2; font: 600 13px/1 "Inter",system-ui,sans-serif; cursor: pointer;
    transition: background .15s ease, border-color .15s ease, opacity .15s ease; }
  .present-cap__btn:hover { background: rgba(255,255,255,.1); border-color: rgba(72,223,229,.5); }
  .present-cap__btn:disabled { opacity: .38; cursor: default; }
  .present-cap__btn--primary { background: linear-gradient(135deg, rgba(0,121,193,.55), rgba(124,92,255,.45));
    border-color: rgba(124,92,255,.6); color: #fff; }
  .present-cap__spacer { flex: 1; }
  .present-cap__icon { width: 34px; padding: 0; font-size: 12px; }
  .present-cap__bar { position: absolute; left: 0; bottom: 0; height: 2px; width: 0;
    background: linear-gradient(90deg,#48dfe5,#7c5cff); opacity: 0; }
  .present-cap__bar.is-run { opacity: 1; }
  @media (max-width: 900px) { .present-cap { bottom: 96px; } .present-cap__text { font-size: 18px; } }
  @media (prefers-reduced-motion: reduce) { .present-ring { transition: opacity .2s ease; animation: none; } }
  `;
  document.head.appendChild(style);
}

// ---- DOM --------------------------------------------------------------------
const ring = document.createElement("div");
ring.className = "present-ring";
ring.setAttribute("aria-hidden", "true");

const cap = document.createElement("div");
cap.className = "present-cap";
cap.setAttribute("role", "region");
cap.setAttribute("aria-label", "Presentation narration");
cap.innerHTML = `
  <div class="present-cap__bar"></div>
  <div class="present-cap__label"><span class="present-cap__labeltext"></span><span class="present-cap__count"></span></div>
  <p class="present-cap__text"></p>
  <div class="present-cap__cuewrap"></div>
  <div class="present-cap__nav">
    <button type="button" class="present-cap__btn present-cap__prev">‹ Back</button>
    <button type="button" class="present-cap__btn present-cap__btn--primary present-cap__next">Next ›</button>
    <span class="present-cap__spacer"></span>
    <button type="button" class="present-cap__btn present-cap__icon present-cap__exit" title="Exit (Esc)" aria-label="Exit presentation">✕</button>
  </div>`;

const fab = document.createElement("button");
fab.type = "button";
fab.className = "present-fab is-hidden";
fab.style.bottom = PAGE === "progress" ? "186px" : "132px";
fab.setAttribute("aria-label", "Start Presentation Mode");
fab.innerHTML = `<span class="present-fab__i"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="13" rx="2"/><path d="M10.5 8.2v4.6L14.5 10.5z" fill="currentColor" stroke="none"/><path d="M8 20h8"/></svg></span><span>Presentation</span>`;

document.body.appendChild(ring);
document.body.appendChild(cap);
document.body.appendChild(fab);

const prevBtn = cap.querySelector(".present-cap__prev");
const nextBtn = cap.querySelector(".present-cap__next");
const exitBtn = cap.querySelector(".present-cap__exit");
const bar = cap.querySelector(".present-cap__bar");

// ---- Spotlight --------------------------------------------------------------
function resolveTarget(t) {
  const list = Array.isArray(t) ? t : [t];
  for (const sel of list) {
    const el = document.querySelector(sel);
    if (el) {
      const r = el.getBoundingClientRect();
      if (r.width > 1 && r.height > 1 && r.top < innerHeight && r.bottom > 0) return el;
    }
  }
  return null;
}
function positionSpotlight() {
  const s = steps[idx];
  if (!s || !s.target) {
    if (lastKey !== "none") {
      ring.style.opacity = "0";
      lastKey = "none";
    }
    return;
  }
  // Prefer the first visible target (e.g. the expanded panel), keep the ring if none is measurable yet.
  const el = resolveTarget(s.target);
  if (!el) return;
  const r = el.getBoundingClientRect();
  const pad = 6;
  const key = `${Math.round(r.left)},${Math.round(r.top)},${Math.round(r.width)},${Math.round(r.height)}`;
  if (key !== lastKey) {
    ring.style.left = r.left - pad + "px";
    ring.style.top = r.top - pad + "px";
    ring.style.width = r.width + pad * 2 + "px";
    ring.style.height = r.height + pad * 2 + "px";
    lastKey = key;
  }
  ring.style.opacity = "1";
}

// ---- Auto-play --------------------------------------------------------------
function startAuto() {
  clearTimeout(autoTimer);
  bar.classList.remove("is-run");
  bar.style.transition = "none";
  bar.style.width = "0";
  requestAnimationFrame(() => {
    bar.style.transition = `width ${AUTO_MS}ms linear`;
    bar.classList.add("is-run");
    bar.style.width = "100%";
  });
  autoTimer = setTimeout(() => (idx < steps.length - 1 ? next() : stop()), AUTO_MS);
}
function stopAuto() {
  clearTimeout(autoTimer);
  bar.classList.remove("is-run");
  bar.style.transition = "none";
  bar.style.width = "0";
}
// ---- Narration (Web Speech API) ---------------------------------------------
const synth = typeof window !== "undefined" ? window.speechSynthesis : null;
const audioEl = new Audio();
let voices = [];
let currentVoice = null;
let narrateOn = true;
let audioMode = null; // becomes true/false once we know if pre-recorded clips exist

function audioPath() {
  return `assets/narration/${PAGE}-${String(idx + 1).padStart(2, "0")}.mp3`;
}
async function ensureAudioMode() {
  if (audioMode !== null) return audioMode;
  try {
    const res = await fetch(`assets/narration/${PAGE}-01.mp3`, { method: "HEAD" });
    if (res.ok) {
      audioMode = true;
      return true;
    }
    if (res.status === 404) audioMode = false; // no clips authored — settle on TTS
    return false;
  } catch {
    // Probe aborted (e.g. fired during heavy scene load) — don't cache; retry next beat.
    return false;
  }
}
function advanceIfAuto() {
  if (active && autoOn && narrateOn) {
    clearTimeout(autoTimer);
    autoTimer = setTimeout(() => (idx < steps.length - 1 ? next() : stop()), 1100);
  }
}

// Spell out acronyms so the narrator pronounces them cleanly.
function speechText(t) {
  return t
    .replace(/buildingSMART/gi, "building smart")
    .replace(/façade/gi, "facade")
    .replace(/\bArcGIS\b/g, "Arc G I S")
    .replace(/\bBIM\b/g, "B I M")
    .replace(/\bIFC\b/g, "I F C")
    .replace(/\bIDS\b/g, "I D S")
    .replace(/\bBCF\b/g, "B C F")
    .replace(/\bIoT\b/g, "I O T")
    .replace(/\bCPI\b/g, "C P I")
    .replace(/\bSPI\b/g, "S P I")
    .replace(/\bAIA\b/g, "A I A")
    .replace(/\bSDK\b/g, "S D K")
    .replace(/\bERP\b/g, "E R P")
    .replace(/\bGIS\b/g, "G I S")
    .replace(/\bROI\b/g, "R O I")
    .replace(/\b3D\b/g, "three D")
    .replace(/\b4D\b/g, "four D")
    .replace(/\b5D\b/g, "five D");
}
function pickVoice(list) {
  const exact = (n) => list.find((v) => v.name === n);
  const rx = (re) => list.find((v) => re.test(v.name));
  return (
    exact("Google UK English Female") ||
    rx(/(Sonia|Libby|Hazel).*Natural|Natural.*United Kingdom/i) ||
    rx(/Microsoft (Sonia|Libby|Hazel|Susan)/i) ||
    exact("Serena (Premium)") || exact("Serena (Enhanced)") || exact("Serena") ||
    exact("Kate") || exact("Stephanie") ||
    list.find((v) => /UK English Female/i.test(v.name)) ||
    list.find((v) => /en-GB/i.test(v.lang) && /(female|google)/i.test(v.name)) ||
    exact("Google US English") || exact("Samantha") ||
    list.find((v) => /en-GB/i.test(v.lang)) ||
    list.find((v) => /^en/i.test(v.lang)) ||
    list[0] ||
    null
  );
}
function loadVoices() {
  if (!synth) return;
  const all = synth.getVoices();
  if (!all.length) return;
  const en = all.filter((v) => /^en/i.test(v.lang));
  voices = en.length ? en : all;
  const keep = currentVoice && currentVoice.name;
  currentVoice = (keep && voices.find((v) => v.name === keep)) || pickVoice(voices);
}
function canSpeak() {
  return !!(synth && narrateOn);
}
// Narrate the current beat: prefer a pre-recorded clip, fall back to the browser voice.
async function narrate() {
  if (!active) return;
  audioEl.pause();
  synth && synth.cancel();
  if (!narrateOn) {
    if (autoOn) startAuto();
    return;
  }
  const myIdx = idx;
  const useAudio = await ensureAudioMode();
  if (idx !== myIdx || !active || !narrateOn) return;
  if (!useAudio) {
    speakCurrent();
    return;
  }
  let fellBack = false;
  const toTTS = () => {
    if (!fellBack && active && idx === myIdx) {
      fellBack = true;
      speakCurrent();
    }
  };
  audioEl.onended = advanceIfAuto;
  audioEl.onerror = toTTS;
  audioEl.src = audioPath();
  audioEl.play().catch(toTTS);
}
function speakCurrent() {
  if (!active) return;
  if (!canSpeak()) {
    if (autoOn) startAuto();
    return;
  }
  synth.cancel();
  const u = new SpeechSynthesisUtterance(speechText(steps[idx].text));
  if (currentVoice) u.voice = currentVoice;
  u.rate = 0.97;
  u.pitch = 1;
  u.onend = advanceIfAuto;
  u.onerror = advanceIfAuto;
  synth.speak(u);
}
if (synth) {
  synth.onvoiceschanged = loadVoices;
  loadVoices();
}

// ---- Render / navigate ------------------------------------------------------
function render() {
  const s = steps[idx];
  cap.querySelector(".present-cap__labeltext").textContent = s.label;
  cap.querySelector(".present-cap__count").textContent = `${idx + 1} / ${steps.length}`;
  cap.querySelector(".present-cap__text").textContent = s.text;
  cap.querySelector(".present-cap__cuewrap").innerHTML = s.cue
    ? `<span class="present-cap__cue">${s.cue}</span>`
    : "";
  prevBtn.disabled = idx === 0;
  nextBtn.textContent = idx === steps.length - 1 ? "Done ✓" : "Next ›";
  lastKey = "";
  positionSpotlight();
  clearTimeout(autoTimer);
  narrate();
}
function next() {
  if (idx < steps.length - 1) {
    idx++;
    render();
  } else {
    stop();
  }
}
function prev() {
  if (idx > 0) {
    idx--;
    render();
  }
}

// ---- Start / stop -----------------------------------------------------------
let poll = null;
function start() {
  if (active || !steps.length) return;
  active = true;
  idx = 0;
  const w = document.getElementById("welcome");
  if (w) w.setAttribute("hidden", "");
  document.body.classList.add("is-presenting");
  cap.classList.add("is-on");
  render();
  nextBtn.focus();
  poll = setInterval(() => active && positionSpotlight(), 300);
}
function stop() {
  active = false;
  autoOn = false;
  stopAuto();
  synth && synth.cancel();
  audioEl.pause();
  clearInterval(poll);
  document.body.classList.remove("is-presenting");
  cap.classList.remove("is-on");
  ring.style.opacity = "0";
  lastKey = "none";
}

// ---- Wiring -----------------------------------------------------------------
fab.addEventListener("click", start);
exitBtn.addEventListener("click", stop);
prevBtn.addEventListener("click", prev);
nextBtn.addEventListener("click", next);
window.addEventListener("resize", () => active && positionSpotlight());

window.addEventListener(
  "keydown",
  (e) => {
    if (e.key.toLowerCase() === "p" && !active && !/^(input|textarea)$/i.test(document.activeElement?.tagName || "")) {
      start();
      return;
    }
    if (!active) return;
    if (e.key === "ArrowRight" || e.key === " " || e.key === "PageDown" || e.key === "Enter") {
      e.preventDefault();
      e.stopPropagation();
      next();
    } else if (e.key === "ArrowLeft" || e.key === "PageUp") {
      e.preventDefault();
      e.stopPropagation();
      prev();
    } else if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      stop();
    }
  },
  true,
);

// Reveal the launcher once the page has settled; auto-start with ?present.
setTimeout(() => fab.classList.remove("is-hidden"), 1200);
if (new URLSearchParams(location.search).has("present")) setTimeout(start, 900);
