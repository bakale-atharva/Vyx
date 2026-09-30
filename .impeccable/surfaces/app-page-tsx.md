---
version: 1
slug: "app-page-tsx"
primary_target: "app/page.tsx"
related_targets: ["app/studio/layout.tsx","app/pricing/page.tsx"]
---

# Surface brief: Vyx app shell (landing, pricing, studio shell)

Scope: F1. Landing (Persuade) and studio shell (Operate) share one world. Later phases (gallery, upload, editors) inherit it.
Audience and job: casual and creator users editing photos and video; quick fixes, occasional long sessions. Action: sign up, then open the studio and edit.
Constraints: Next.js + Tailwind v4, hand-rolled UI, Clerk components themed only, no image generation (code-led). Avoid generic SaaS, loud/neon, cold corporate/Adobe-clone.
Unresolved: wordmark is a placeholder; no real proof or testimonials exist.

## Direction contract

THESIS: Every edit is a proof pulled from a press and the original is the plate that never changes. Refuses the dark-panels-plus-neon-accent editor default.

OWN-WORLD: Neutral grey surround (photographic 18% grey, no blue tint) with paper-white ink; colour appears only as CMY(K) control-strip cells (cyan, magenta, yellow, black) and hairline crop and registration marks. Panels are flat ruled legends, not cards. Tool state is rule form: solid live, dashed pending, half-height stale, struck locked. All numerals sit in fixed tabular cells. Recognizable with content removed by the crop marks and the control strip.

STORY: A visitor understands this is a browser editor that keeps originals safe and sorts every tool by plan, believes the plans are honest because the tiers are drawn as a visible strip, and signs up. A user in the studio always sees the photo as the loudest thing and knows which tools are theirs.

FIRST VIEWPORT: Landing: a proof sheet fills the view. Left, the headline set large in a neutral grotesque; right, a photograph-shaped neutral frame with crop marks at its four corners and a CMY control strip along its bottom edge whose cells label Free, Pro and Ultra; the primary action sits under the headline. Studio: ruled left legend rail, canvas area framed by crop marks, plan strip in the rail footer.

FORM: Offset press proof, position 5 of my ordered list, seed key 6a2de6cc. Raises kept: rule-form state (from emission-line rail), fixed tabular numeric cells (from seven-segment), colour confined to hairlines (from iridescent cloud edge).

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
