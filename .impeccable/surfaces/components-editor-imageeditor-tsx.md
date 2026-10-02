---
version: 1
slug: "components-editor-imageeditor-tsx"
primary_target: "components/editor/ImageEditor.tsx"
related_targets: ["app/studio/image/[assetId]/page.tsx"]
---

# Surface brief: Image editor (F4)

Scope and mode: Operate, inside the settled Proof Sheet world. Frame pinned by the plan: top bar (name, Undo/Redo, Compare, Download, Save as new), centre canvas, tools on the right; under `lg` the tools become a bottom sheet.
Task: apply tools to one image as an ordered list of steps, preview them, then save a new copy or download.
Behaviour: clicking a tool adds a step with defaults and previews live (400 ms debounce); AI and generative steps preview only when the user presses Generate; locked tools stay visible with a lock and Pro/Ultra mark and open an upgrade dialog with the pricing table. The server re-checks every step (getPreviewUrl, saveEdit).
Unresolved: on-canvas crop box (crop uses numeric fields for now).

## Direction contract

THESIS: The image is the sheet on the press and every tool is a pass over it; a small group bar floats on the canvas and the panel holds the pass you are setting. Refuses the icon-rail editor that buries the image under chrome.

OWN-WORLD: The Proof Sheet. Canvas is the neutral grey surround with the image on a crop-marked sheet; the group bar is a slim ruled strip of five segments, the active one filled paper-white. Tool rows are ruled: solid for tools you have, dashed with a lock and a cyan (Pro) or magenta (Ultra) cell for locked ones. Steps are a numbered ruled list where numbers carry order. Values sit in fixed tabular cells.

STORY: The user opens an image and sees it large; picks a group, picks a tool, nudges its settings and watches the image change; AI passes wait for an explicit Generate. They compare before and after, then save a new copy without touching the original.

FIRST VIEWPORT: Top bar across the full width: asset name left; Undo, Redo, Compare, Download and Save as new right. Below: the crop-marked image filling the left area with the group bar centred near its foot; the right panel (about 22rem) with the active group's tools, the open tool's settings, and the steps list.

FORM: Canvas Toolbar (translated to keep the plan's right-hand tools panel), position 7 of my ordered list, seed key a0e2143a.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
