---
version: 1
slug: "app-studio-page-tsx"
primary_target: "app/studio/page.tsx"
related_targets: ["components/gallery"]
---

# Surface brief: Studio gallery (F2)

Scope and mode: Operate. A whole surface inside the settled Proof Sheet world (see the F1 brief); the world is not re-decided here.
Task: find a file and open it to edit. Each item shows name and dimensions (images) or length (videos). Saved edits appear in one flat newest-first stream with an "Edited" mark; in-flight and failed edits appear as pending and struck frames. Usage meter with an upgrade nudge at 80% of the plan's asset limit.
Constraints: signed thumbnail URLs only (batched server action, client cache); Convex pagination with Load more; delete confirms in a dialog; keyboard operable; works at phone width.
Unresolved: no bulk select; no sort options beyond newest first.

## Direction contract

THESIS: One large frame under the loupe, with the whole library running as a filmstrip beneath it. Refuses the uniform thumbnail grid as the page.

OWN-WORLD: The Proof Sheet. Selected frame sits on a neutral grey sheet with crop marks at its trim corners; filmstrip frames are ruled boxes with mono captions; the selected frame is marked by a paper-white rule, never a tint. State is rule form: solid for stored files, dashed for processing, struck name for failed. Dimensions and counts sit in fixed tabular cells.

STORY: The user lands on their newest file already large and clear, sees its name and size, and opens it in one click. Scrolling the strip scans the library; arrow keys step through it. They know how much of their plan they have used.

FIRST VIEWPORT: Heading and filter tabs (All, Images, Videos) with the usage readout at the right; below them the crop-marked selected frame filling the width at roughly 16:9; an info bar under it (name, dimensions or length, Edited mark) with Open as the primary action beside Download and Delete; the filmstrip across the bottom of the viewport, newest at the left, Load more at its end.

FORM: Loupe and Filmstrip, position 6 of my ordered list of structures, seed key e2cf2c63.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
