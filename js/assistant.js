// =============================================================================
// assistant.js — lightweight, local "ask the timeline" command box
// =============================================================================
//
// No sign-in, no network, no AI service. The user types a date or a phrase
// ("Nov 1 2025", "60%", "halfway", "completion") and we map it to a Date inside
// the authored construction window, then hand it to the scrubber's scrubTo().
//

const MONTHS = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
  jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11
};

/**
 * Resolve "quarter / third / half" style phrases (plus Q1–Q4 and "a/b"
 * fractions) to a 0..1 progress fraction through the build. Returns null when
 * nothing matches. "first quarter" = end of the 1st quarter (25%), etc.
 */
function fractionOf(text) {
  // Q1–Q4 shorthand → end of that quarter
  const q = text.match(/\bq\s*([1-4])\b/);
  if (q) return Number(q[1]) / 4;

  // "<ordinal> quarter|third" → end of that segment
  const ord = { first: 1, second: 2, third: 3, fourth: 4, last: -1, final: -1 };
  const om = text.match(/\b(first|second|third|fourth|last|final)[\s-]+(quarter|third)s?\b/);
  if (om) {
    const unit = om[2] === "quarter" ? 4 : 3;
    const n = ord[om[1]] === -1 ? unit : ord[om[1]];
    return n / unit;
  }

  // "<count> quarters|thirds" → that many segments in
  const counts = { one: 1, two: 2, three: 3, a: 1, an: 1 };
  const cm = text.match(/\b(one|two|three|a|an)[\s-]+(quarters?|thirds?)\b/);
  if (cm) {
    const unit = cm[2].startsWith("quarter") ? 4 : 3;
    return Math.min(1, counts[cm[1]] / unit);
  }

  // Bare "quarter" / "third"
  if (/\bquarters?\b/.test(text)) return 0.25;
  if (/\bthirds?\b/.test(text)) return 1 / 3;

  // Numeric fraction "a/b" (skip when it's really an m/d/yyyy date)
  if (!/\d{1,2}\/\d{1,2}\/\d{4}/.test(text)) {
    const fm = text.match(/\b([1-9])\s*\/\s*([1-9])\b/);
    if (fm && Number(fm[1]) <= Number(fm[2])) return Number(fm[1]) / Number(fm[2]);
  }

  return null;
}

const fmtDate = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "2-digit",
  year: "numeric"
});

// Charming-but-snarky replies for anything outside this tool's job description.
const QUIPS = [
  "Hard hat, not crystal ball — I only move the construction timeline. Give me a date or a build percentage (e.g. \u201CNov 1 2025\u201D or \u201C40%\u201D).",
  "That’s above my pay grade. I’m a one-trick crane: feed me a construction date or a build percentage and I’ll get to work.",
  "Nice try! I’m not built for that. I scrub the build timeline — toss me a date or a percentage like \u201C60%\u201D.",
  "I’d love to, but I only speak timeline. Request a construction date or a build percentage and we’re golden.",
  "Beep boop — request denied (politely). I just slide the build through time. Try a date or a percentage, e.g. \u201Ca quarter\u201D.",
  "I flunked everything except dates and percentages. Hand me one and watch me shine.",
  "My talents are gloriously narrow: timeline dates and build percentages. Pick one and let’s build.",
  "I’m all hard hat, no homework. Give me a construction date or a percentage like \u201C75%\u201D.",
  "You’ve reached the timeline desk. We only stock dates and percentages — anything else is sold out.",
  "Plot twist: I’m just a fancy slider. A date or a build percentage is all I crave.",
  "Wrong floor! This elevator only stops at dates and build percentages.",
  "I’d google that for you, but I’m strictly a timeline operator. Date or percentage, please.",
  "Bold request. Sadly my superpower is limited to dates and build percentages — try one of those.",
  "Let’s keep it on-site: a construction date or a percentage like \u201Chalfway\u201D and I’m on it."
];

/**
 * Wire up the assistant panel + FAB and translate typed phrases into dates.
 *
 * @param {Object} opts
 * @param {{ start: Date, end: Date }} opts.fullTimeExtent  authored bounds
 * @param {(date: Date) => void} opts.onDate  called with the resolved date
 */
export function createAssistant({ fullTimeExtent, onDate }) {
  const startMs = +fullTimeExtent.start;
  const endMs = +fullTimeExtent.end;

  const fab = document.getElementById("assistantFab");
  const panel = document.getElementById("assistant");
  const log = document.getElementById("assistantLog");
  const form = document.getElementById("assistantForm");
  const input = document.getElementById("assistantInput");
  const closeBtn = document.getElementById("assistantClose");

  if (!fab || !panel || !form || !input || !log) return { open() {}, close() {} };

  // --- Panel open / close ---------------------------------------------------
  function open() {
    panel.classList.add("is-open");
    fab.classList.add("is-hidden");
    input.focus();
  }
  function close() {
    panel.classList.remove("is-open");
    fab.classList.remove("is-hidden");
  }
  fab.addEventListener("click", open);
  closeBtn?.addEventListener("click", close);

  // --- Dragging: grab the header to float the panel anywhere -----------------
  const head = panel.querySelector(".asst__head");
  let dragging = false;
  let offsetX = 0;
  let offsetY = 0;

  function onPointerDown(e) {
    if (e.target.closest(".asst__close")) return; // let the close button work
    const rect = panel.getBoundingClientRect();
    // Anchor to left/top so we can move freely (overrides the CSS right/top).
    panel.style.left = `${rect.left}px`;
    panel.style.top = `${rect.top}px`;
    panel.style.right = "auto";
    panel.style.bottom = "auto";
    offsetX = e.clientX - rect.left;
    offsetY = e.clientY - rect.top;
    dragging = true;
    panel.classList.add("is-dragging");
    head?.setPointerCapture?.(e.pointerId);
  }
  function onPointerMove(e) {
    if (!dragging) return;
    const w = panel.offsetWidth;
    const h = panel.offsetHeight;
    const x = Math.max(8, Math.min(window.innerWidth - w - 8, e.clientX - offsetX));
    const y = Math.max(8, Math.min(window.innerHeight - h - 8, e.clientY - offsetY));
    panel.style.left = `${x}px`;
    panel.style.top = `${y}px`;
  }
  function onPointerUp(e) {
    if (!dragging) return;
    dragging = false;
    panel.classList.remove("is-dragging");
    head?.releasePointerCapture?.(e.pointerId);
  }
  head?.addEventListener("pointerdown", onPointerDown);
  window.addEventListener("pointermove", onPointerMove);
  window.addEventListener("pointerup", onPointerUp);

  // --- Chat bubbles ---------------------------------------------------------
  function bubble(text, who) {
    const el = document.createElement("div");
    el.className = `asst-msg asst-msg--${who}`;
    el.textContent = text;
    log.appendChild(el);
    log.scrollTop = log.scrollHeight;
  }

  bubble(
    "Type a date or phrase to jump the build there — e.g. \u201CNov 1 2025\u201D, \u201C25%\u201D, \u201Ca quarter\u201D, \u201Chalfway\u201D, or \u201Ccompletion\u201D.",
    "bot"
  );

  // --- Phrase / date parser -------------------------------------------------
  /**
   * @param {string} raw
   * @returns {{ date: Date, label: string } | null}
   */
  function parse(raw) {
    const text = raw.trim().toLowerCase();
    if (!text) return null;

    const at = (ms) => new Date(Math.max(startMs, Math.min(endMs, ms)));

    // Keyword anchors
    if (/\b(start|begin|beginning|groundbreak|day\s*one|kick\s*off)\b/.test(text)) {
      return { date: at(startMs), label: "the start of construction" };
    }
    if (/\b(end|finish|final|complete|completion|handover|done|topp?ed?\s*out)\b/.test(text)) {
      return { date: at(endMs), label: "completion" };
    }
    if (/\b(half|halfway|midpoint|middle|mid)\b/.test(text)) {
      return { date: at((startMs + endMs) / 2), label: "the halfway point" };
    }

    // Fractions / quarters / thirds → percentage through the build
    const frac = fractionOf(text);
    if (frac != null) {
      const p = Math.round(frac * 100);
      return { date: at(startMs + frac * (endMs - startMs)), label: `${p}% through the build` };
    }

    // Percent through the build
    const pct = text.match(/(\d{1,3})\s*(%|percent)/);
    if (pct) {
      const p = Math.max(0, Math.min(100, Number(pct[1])));
      return { date: at(startMs + (p / 100) * (endMs - startMs)), label: `${p}% through the build` };
    }

    // A bare whole number 0–100 (no % sign) is read as a percentage.
    const bare = text.match(/^(\d{1,3})$/);
    if (bare && Number(bare[1]) <= 100) {
      const p = Number(bare[1]);
      return { date: at(startMs + (p / 100) * (endMs - startMs)), label: `${p}% through the build` };
    }

    // ISO date  2025-11-01
    const iso = text.match(/(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (iso) {
      const d = new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
      if (!isNaN(+d)) return { date: at(+d), label: fmtDate.format(d) };
    }

    // US date  11/1/2025
    const us = text.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (us) {
      const d = new Date(Number(us[3]), Number(us[1]) - 1, Number(us[2]));
      if (!isNaN(+d)) return { date: at(+d), label: fmtDate.format(d) };
    }

    // Month/day with no year (e.g., "10/23") — infer the year from the build window
    const md = text.match(/^(\d{1,2})\/(\d{1,2})$/);
    if (md) {
      const mo = Number(md[1]) - 1;
      const day = Number(md[2]);
      if (mo >= 0 && mo <= 11 && day >= 1 && day <= 31) {
        const startY = new Date(startMs).getFullYear();
        const endY = new Date(endMs).getFullYear();
        const mid = (startMs + endMs) / 2;
        let best = null;
        for (let y = startY; y <= endY; y++) {
          const cand = new Date(y, mo, day);
          if (+cand >= startMs && +cand <= endMs) { best = cand; break; }
          if (!best || Math.abs(+cand - mid) < Math.abs(+best - mid)) best = cand;
        }
        if (best && !isNaN(+best)) return { date: at(+best), label: fmtDate.format(best) };
      }
    }

    // Month-name date  "nov 1 2025" / "1 november 2025" / "november 2025"
    const monRe = /(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*/;
    const mon = text.match(monRe);
    if (mon) {
      const month = MONTHS[mon[1]];
      const nums = text.match(/\d{1,4}/g) || [];
      let day = 1;
      let year = new Date((startMs + endMs) / 2).getFullYear();
      for (const n of nums) {
        const v = Number(n);
        if (v > 31) year = v;
        else if (v >= 1) day = v;
      }
      const d = new Date(year, month, day);
      if (!isNaN(+d)) return { date: at(+d), label: fmtDate.format(d) };
    }

    // Last resort: let the engine try (handles "Nov 1, 2025" etc.)
    const loose = new Date(raw);
    if (!isNaN(+loose)) return { date: at(+loose), label: fmtDate.format(loose) };

    return null;
  }

  // --- Submit ---------------------------------------------------------------
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const raw = input.value;
    if (!raw.trim()) return;
    bubble(raw, "user");
    input.value = "";

    const hit = parse(raw);
    if (!hit) {
      bubble(QUIPS[Math.floor(Math.random() * QUIPS.length)], "bot");
      return;
    }

    onDate(hit.date);
    bubble(`Jumping to ${hit.label} \u2014 ${fmtDate.format(hit.date)}.`, "bot");
  });

  return { open, close };
}
