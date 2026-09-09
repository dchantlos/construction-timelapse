# 📖 READ ME FIRST — what's in this folder

This folder (`documentation/`) is the **central place** for everything about how
the app turns a failed **IDS** rule into a **BCF** issue file. Everything here is
a **local copy** — changing these files does **not** change the live app.

---

## 👉 If you only open one thing

Open **`bcf-from-ids-workflow.md`** — it's the full explanation with pictures.

Want it **even simpler**? These plain‑English walkthroughs read just like this note:
- **`how-the-audit-decides-pass-fail.md`** — how a rule gets a Pass / Partial / Fail verdict.
- **`how-the-3d-highlight-works.md`** — how the flagged part turns **red in the 3D view**.

**To see the diagrams**, open it in **VS Code** and press **⌘⇧V** (Command +
Shift + V). That switches to "Preview" and draws the flowchart. In plain text you
only see the code that makes the diagram — that's normal.

---

## 🗂️ Every file in this folder, in plain English

| File | What it is | When you'd open it |
|------|-----------|--------------------|
| **`00-READ-ME-FIRST.md`** | This note. | You're reading it. |
| **`bcf-from-ids-workflow.md`** | The main write‑up: how it all works, diagrams, tables, and copy‑paste example code. | To understand or explain the whole thing. |
| **`how-the-audit-decides-pass-fail.md`** | Plain‑English explainer of how each rule gets a **Pass / Partial / Fail** verdict. | To understand how the checking works. |
| **`how-the-3d-highlight-works.md`** | Plain‑English explainer of how the flagged part turns **red in the 3D view**. | To understand the on‑screen highlight. |
| **`construction-timelapse.ids`** | The buildingSMART **IDS** rules file — the checklist the model is audited against. | To see what rules are being checked. |
| **`ids.js`** | The code that **reads** the IDS file. | To see how the rules are loaded. |
| **`audit.js`** | The code that **runs the audit** and **starts the BCF export**. | To see how pass/fail is decided and the export kicked off. |
| **`bcfExport.js`** | The code that **builds the BCF file** (the selection + camera + snapshot, zipped up). | To see how the BCF is actually made. |
| **`config.js`** | The **lookup tables**: which IFC type maps to which 3D layer, and which rule maps to which data field. | To see the name/field mappings. |
| **`CT-S06_..._LOC_fixed_Camera.bcf`** | The **known‑good reference BCF** that was verified to open correctly in BIMVision. | To compare against, or to open in a BCF viewer. |

---

## 🔗 How the pieces fit (one sentence)

`construction-timelapse.ids` (the rules) → **`ids.js`** reads it → **`audit.js`**
checks each rule against the 3D model's data (using **`config.js`** for the
name maps) → when a rule fails, **`bcfExport.js`** builds a BCF issue that points
at the failing part → you get a `.bcfzip` like **`CT-S06_….bcf`**.

---

## ⚠️ Two things to remember

1. **These are copies (snapshots).** If the real code in the project's `js/`
   folder changes later, these copies will be out of date. Ask and they can be
   re‑copied.
2. **Local only.** Nothing in here is uploaded to GitHub or shared.
