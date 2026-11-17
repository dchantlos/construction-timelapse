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
        a: "<ul><li><strong>+ / –</strong> zoom, <strong>⟳</strong> reset the camera to home.</li><li><strong>◫ Slice</strong> — drop a cut-plane and drag its handles to look straight inside the building.</li><li><strong>⇕ Explode</strong> — spring the tower's podium, mid-rise and top apart to see how it stacks up; click again to settle it back.</li><li><strong>☑ Audit</strong> — validate the model against the buildingSMART IDS (see below).</li></ul>"
      },
      {
        q: "Audit the model (☑ IDS)",
        a: "Open the <strong>☑ IDS audit</strong> from the right-hand controls to check the live model against a <strong>buildingSMART IDS</strong> — an openBIM Information Delivery Specification. Each requirement (GlobalId, naming, predefined type, 4D scheduling, fire rating, thermal U-value, classification…) is scored <strong style=\"color:#4ade80\">pass</strong> / <strong style=\"color:#f6c445\">partial</strong> / <strong style=\"color:#fb7185\">fail</strong> against the real element data. Expand any specification for the per-layer breakdown, then click a layer to isolate it in 3D."
      },
      {
        q: "Highlight & export issues (BCF)",
        a: "For any rule that fails, use <strong>◎ Highlight failing in 3D</strong> to fly to and ghost-highlight the exact non-compliant elements — painted red down to the individual component — then <strong>⭳ Export BCF issue</strong> to download a <strong>buildingSMART BCF 2.1</strong> file (<code>.bcfzip</code>) any BCF-aware tool can open. IFC in, IDS checked, BCF out."
      },
      {
        q: "Ask the timeline (✨)",
        a: "Type a date or a phrase — “Nov 1 2025”, “60%”, “halfway”, “completion” — and the build jumps straight to that moment."
      },
      {
        q: "Compare to real progress",
        a: "Use <strong>See Current Construction Progress</strong> in the top bar to switch to the as-built view and compare this plan against what has actually been built on site."
      },
      {
        q: "Vertical or linear?",
        a: "The <strong>Vertical | Linear</strong> switch in the top bar flips between this building and the <strong>Marina Bay East Elevated Roadway</strong>, a linear infrastructure project — you stay on the same view."
      }
    ]
  },

  // -------------------------------------------------------------------------
  // progress.html — Real Construction Status (4D schedule + 5D cost)
  // -------------------------------------------------------------------------
  progress: {
    title: "Guide · Real Construction Status",
    intro:
      "The as-built view: what has actually been constructed on site, measured against the plan in time (4D) and cost (5D) — with real-time IoT feeds overlaid on the model.",
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
        q: "Real-time IoT feeds",
        a: "The <strong>Real-Time IoT Feeds</strong> panel (bottom-left) streams real-time <strong>noise, dust, gas and wind</strong> readings from <strong>ArcGIS Velocity</strong>, alongside weather, air quality and site activity (workers / vehicles), updating continuously as new readings arrive."
      },
      {
        q: "Show sensors on the map",
        a: "Hit <strong>Show</strong> in the panel's location controls to drop each sensor onto the 3D model as a glowing, gently pulsing orb, colour-coded by its reading. Filter with the chips — <strong>All · Noise · Dust · Gas · Wind</strong> — to isolate one type; press <strong>Show</strong> again to hide them."
      },
      {
        q: "Inspect a sensor",
        a: "Click any orb for a live pop-up showing its latest reading, category and status. Sensor identities are anonymised (e.g. “Noise sensor 1”, “Gas monitor”)."
      },
      {
        q: "Real-Time IoT Feeds · Overview (⤢)",
        a: "Press <strong>⤢</strong> on the feeds panel to open the <strong>Real-Time IoT Feeds · Overview</strong> — a full dashboard of live conditions plus a per-feed breakdown. <strong>⤡</strong> returns to the summary."
      },
      {
        q: "Which gases to watch",
        a: "When gas readings climb, the panel, pop-up and on-map label name the exact gases driving it — worst first (e.g. “Watch: CO, VOC”) — so you can see which factors need attention, not just an overall category."
      },
      {
        q: "Navigate & Spin",
        a: "Zoom, reset, <strong>◫ Slice</strong> or <strong>⇕ Explode</strong> the model on the right — Explode springs the podium, mid-rise and top apart. Press <strong>Spin</strong> at the bottom to orbit the building."
      },
      {
        q: "Vertical or linear?",
        a: "The <strong>Vertical | Linear</strong> switch in the top bar flips between this building and the <strong>Marina Bay East Elevated Roadway</strong>, a linear infrastructure project — you stay on the same view."
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
  },

  // =========================================================================
  // Linear project — Marina Bay East Elevated Roadway (?project=linear)
  // =========================================================================

  "index-linear": {
    title: "Guide · Planned Sequencing",
    intro:
      "A living 3D twin of the Marina Bay East Elevated Roadway that assembles itself over time — exactly the way the construction schedule plans it.",
    sections: [
      {
        q: "What am I looking at?",
        a: "A 3D digital twin of the <strong>Marina Bay East Elevated Roadway</strong> — a 1.5 km twin-carriageway viaduct in Singapore — playing back the <strong>planned</strong> build. Two work fronts, <strong>West</strong> (Ch 0–760 m) and <strong>East</strong> (Ch 768–1,525 m), advance at once, and every element appears on the date its work is scheduled to start."
      },
      {
        q: "Play & scrub the timeline",
        a: "Use the bar along the bottom.<ul><li><strong>Play</strong> — watch the viaduct rise from piles to road markings; the camera stays where you put it, so pan or zoom to follow either work front.</li><li><strong>Slider</strong> — drag to jump to any date; the date read-out follows you. Dragging pauses playback.</li></ul>"
      },
      {
        q: "Construction Dashboard (left)",
        a: "Live figures for the date on screen: overall <strong>% complete</strong>, current <strong>phase</strong>, active systems, and elapsed vs. remaining days. Each system's bar follows its real schedule — the share of its elements already under way. Click a row to <strong>isolate</strong> that system in 3D — <strong>Reset</strong> brings everything back."
      },
      {
        q: "Click any element",
        a: "Click a pile, pier, girder or barrier to see its own record: scheduled dates, construction phase, <strong>chainage</strong> along the alignment and its <strong>work front</strong>."
      },
      {
        q: "Layers panel (top-right)",
        a: "Toggle each system — piles, pier stems, girders, bearings, deck, barriers, surfacing, markings and lighting — on or off. Click <strong>+</strong> to expand the panel."
      },
      {
        q: "Navigate the model (right)",
        a: "<ul><li><strong>+ / –</strong> zoom, <strong>⟳</strong> reset the camera to home.</li><li><strong>◫ Slice</strong> — drop a cut-plane to look inside the deck and piers.</li><li><strong>⇕ Explode</strong> — lift the viaduct's systems apart: foundations, piers, bearings, girders, deck and finishes; click again to settle them back.</li><li><strong>Photorealistic 3D</strong> (picture icon) — sign in with an ArcGIS account whose organization enables Google's Photorealistic 3D tiles to swap the dark basemap for the scene's authored one, 3D mask along the alignment included. Click again for the dark basemap.</li></ul>"
      },
      {
        q: "Ask the timeline (✨)",
        a: "Type a date or a phrase — “Jun 1 2027”, “60%”, “halfway”, “completion” — and the build jumps straight to that moment."
      },
      {
        q: "Compare to real progress",
        a: "Use <strong>View Simulated Construction Progress</strong> in the top bar to see the as-built status and the 5D cost picture."
      },
      {
        q: "Vertical or linear?",
        a: "The <strong>Vertical | Linear</strong> switch in the top bar flips between this roadway and the <strong>Meridian Tower</strong> building project — you stay on the same view."
      }
    ]
  },

  "progress-linear": {
    title: "Guide · Real Construction Status",
    intro:
      "The as-built view of the roadway: what has actually been built, measured against the plan in time (4D) and cost (5D) — every figure summed live from the elements' own data.",
    sections: [
      {
        q: "What am I looking at?",
        a: "The same roadway twin, colour-coded by <strong>real construction status</strong> at the 3 Aug 2027 status date. A simulated access delay on the <strong>West</strong> front has pushed its remaining work back three weeks; the East front is on programme."
      },
      {
        q: "Status colours",
        a: "<ul><li><strong style=\"color:#4ade80\">Green</strong> — Installed.</li><li><strong style=\"color:#3b82f6\">Blue</strong> — due within 10 days.</li><li><strong style=\"color:#e2673a\">Orange</strong> — due in 11–30 days.</li><li><strong style=\"color:#cbd5e1\">Ghosted white</strong> — 31+ days out.</li></ul>Click any element for its status, schedule and chainage."
      },
      {
        q: "Schedule (4D) tab",
        a: "The <strong>scheduled target</strong> vs. <strong>effective progress</strong>, how far the job is <strong>behind</strong>, the overdue count and a full <strong>status breakdown</strong> — all read from each element's progress fields. Filter the model by system below."
      },
      {
        q: "Financials (5D) tab",
        a: "Budget expended, cost-to-date, estimate at completion and <strong>CPI / SPI</strong> earned-value health, plus the current pay-application draw — summed live from every element's cost fields, in Singapore dollars."
      },
      {
        q: "Risk & Variance cards",
        a: "Click a card — liquidated damages from the critical-path delay, overdue work, or pending change orders — to open its detailed breakdown."
      },
      {
        q: "Generate AIA Billing Report",
        a: "Produces a formal <strong>AIA G702 / G703</strong> Application for Payment with one line per system, reconciled to the dashboard."
      },
      {
        q: "Navigate the model",
        a: "Zoom, reset, <strong>◫ Slice</strong> or <strong>⇕ Explode</strong> the viaduct on the right, and flip on the <strong>Photorealistic 3D</strong> basemap after signing in."
      },
      {
        q: "Vertical or linear?",
        a: "The <strong>Vertical | Linear</strong> switch in the top bar flips between this roadway and the <strong>Meridian Tower</strong> building project — you stay on the same view."
      }
    ]
  },

  "report-linear": {
    title: "Guide · AIA Application for Payment",
    intro:
      "A formal AIA-style Application & Certificate for Payment, generated from the roadway's live element data.",
    sections: [
      {
        q: "What am I looking at?",
        a: "A standard <strong>AIA G702 / G703</strong> pay application for the Marina Bay East Elevated Roadway — the document a contractor submits to bill the owner for the work completed in a period."
      },
      {
        q: "Net Amount Due (top)",
        a: "The payment requested for this billing period after retainage — summed live from every element's cost fields."
      },
      {
        q: "Continuation Sheet (G703)",
        a: "One line per system with its <strong>scheduled value</strong> and the <strong>work completed this period</strong>, plus the net change in stored materials, less retainage, to arrive at the net amount due."
      },
      {
        q: "Project Health — Earned Value",
        a: "Contract value, cost to date and estimate at completion, plus <strong>CPI</strong> (cost) and <strong>SPI</strong> (schedule) performance indices that flag any overrun."
      },
      {
        q: "Open Risk & Variance",
        a: "Liquidated damages from the critical-path delay, the value of overdue work, and change orders awaiting owner approval."
      },
      {
        q: "Download or print",
        a: "Export the sheet as a <strong>CSV</strong>, or use <strong>Print / Save PDF</strong> to produce a shareable copy."
      },
      {
        q: "Good to know",
        a: "Figures are the model's illustrative SGD work-package allowance — not measured quantities, market rates or a certified pay application."
      }
    ]
  }
};
