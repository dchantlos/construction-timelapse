// =============================================================================
// help-content.js — per-screen guide copy for the floating Help window
// =============================================================================
//
// Static, authored content only (no user input) — each entry maps a page key
// to a title, a one-line intro, and a list of expandable sections. `a` bodies
// are trusted HTML fragments rendered into the accordion.
//

export const HELP_CONTENT = {
  // -------------------------------------------------------------------------
  // index.html — Planned Construction Sequencing (4D timelapse)
  // -------------------------------------------------------------------------
  index: {
    title: "Guide · Planned Sequencing",
    intro:
      "A living 3D twin of Meridian Tower that assembles itself over time — exactly the way the construction schedule plans it.",
    sections: [
      {
        q: "What am I looking at?",
        a: "A 3D digital twin of <strong>Meridian Tower</strong> (Downtown Core District) playing back the <strong>planned</strong> build. As the timeline advances, every element appears on the date it was scheduled to be installed."
      },
      {
        q: "Play & scrub the timeline",
        a: "Use the bar along the bottom.<ul><li><strong>Play</strong> — watch the tower rise while the camera gently orbits.</li><li><strong>Slider</strong> — drag to jump to any date; the date read-out follows you. Dragging pauses playback.</li></ul>"
      },
      {
        q: "Construction Dashboard (left)",
        a: "Live figures for the date on screen: overall <strong>% complete</strong>, current <strong>phase</strong>, active layers, and elapsed vs. remaining days. Click any layer in the list to <strong>isolate</strong> it in 3D — <strong>Reset</strong> brings everything back."
      },
      {
        q: "Layers panel (top-right)",
        a: "Toggle individual building systems — structure, façade, MEP and more — on or off. Click <strong>+</strong> to expand the panel."
      },
      {
        q: "Navigate the model (right)",
        a: "<ul><li><strong>+ / –</strong> zoom, <strong>⟳</strong> reset the camera to home.</li><li><strong>◫ Slice</strong> — drop a cut-plane and drag its handles to look straight inside the building.</li></ul>"
      },
      {
        q: "Ask the timeline (✨)",
        a: "Type a date or a phrase — “Nov 1 2025”, “60%”, “halfway”, “completion” — and the build jumps straight to that moment."
      },
      {
        q: "Compare to real progress",
        a: "Use <strong>See Current Construction Progress</strong> in the top bar to switch to the as-built view and compare this plan against what has actually been built on site."
      }
    ]
  },

  // -------------------------------------------------------------------------
  // progress.html — Real Construction Status (4D schedule + 5D cost)
  // -------------------------------------------------------------------------
  progress: {
    title: "Guide · Real Construction Status",
    intro:
      "The as-built view: what has actually been constructed on site, measured against the plan in both time (4D) and cost (5D).",
    sections: [
      {
        q: "What am I looking at?",
        a: "The same Meridian Tower twin, now colour-coded by <strong>real construction status</strong>. Every element shows whether it is installed or still upcoming, so you can read exactly where the job stands today."
      },
      {
        q: "Status colours",
        a: "<ul><li><strong style=\"color:#4ade80\">Green</strong> — Installed.</li><li><strong style=\"color:#3b82f6\">Blue</strong> — due within 10 days.</li><li><strong style=\"color:#e2673a\">Orange</strong> — due in 11–30 days.</li><li><strong style=\"color:#94a3b8\">Grey</strong> — 30+ days out.</li></ul>Hover any element to see its status and schedule."
      },
      {
        q: "Schedule (4D) tab",
        a: "The default left-panel view: <strong>scheduled target</strong> vs. <strong>effective progress</strong>, how far the job is <strong>behind</strong>, the overdue count, and a full <strong>status breakdown</strong>. Filter the 3D model by building layer below."
      },
      {
        q: "Financials (5D) tab",
        a: "Switch to the money view: budget expended, cost-to-date, estimate at completion, and <strong>CPI / SPI</strong> earned-value health, plus the current billing draw and open financial risks."
      },
      {
        q: "Filter 3D Map by Cost",
        a: "Recolour the model through a cost <strong>lens</strong> — Budget vs. Actual, Current Billing Cycle, or Financial Risk Zones. <strong>Clear filters</strong> returns the model to its real-status colours."
      },
      {
        q: "Risk & Variance cards",
        a: "Click a risk card — delay penalty, delayed components, or pending change orders — to open a detailed breakdown synced to the 3D geometry."
      },
      {
        q: "Generate AIA Billing Report",
        a: "Produces a formal <strong>AIA G702 / G703</strong> Application for Payment built from the live project figures."
      },
      {
        q: "Navigate & Spin",
        a: "Zoom, reset or <strong>◫ Slice</strong> the model on the right. Press <strong>Spin</strong> at the bottom to orbit the building."
      }
    ]
  },

  // -------------------------------------------------------------------------
  // report.html — AIA G702/G703 Application for Payment
  // -------------------------------------------------------------------------
  report: {
    title: "Guide · AIA Application for Payment",
    intro:
      "A formal AIA-style Application & Certificate for Payment, generated from the project's live financial data.",
    sections: [
      {
        q: "What am I looking at?",
        a: "A standard <strong>AIA G702 / G703</strong> pay application for Meridian Tower — the document a contractor submits to bill the owner for the work completed in a period."
      },
      {
        q: "Net Amount Due (top)",
        a: "The certified payment being requested for this billing period, after retainage is withheld — the headline figure the owner is asked to pay."
      },
      {
        q: "Continuation Sheet (G703)",
        a: "A line-by-line schedule of <strong>scheduled value</strong> vs. <strong>work completed this period</strong>, totalled with retainage held back to arrive at the net amount due."
      },
      {
        q: "Project Health — Earned Value",
        a: "Contract value, cost to date and estimate at completion, plus <strong>CPI</strong> (cost) and <strong>SPI</strong> (schedule) performance indices that flag any overrun."
      },
      {
        q: "Open Risk & Variance",
        a: "Outstanding financial exposure: delay-penalty risk, the value of overdue components, and pending change orders awaiting owner approval."
      },
      {
        q: "Download or print",
        a: "Export the sheet as a <strong>CSV</strong>, or use <strong>Print / Save PDF</strong> to produce a shareable copy."
      },
      {
        q: "Good to know",
        a: "Figures are illustrative demo data that reconcile with the dashboard — this is not a certified pay application."
      }
    ]
  }
};
