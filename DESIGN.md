---
name: Vyx
description: A browser photo and video editor drawn as an offset-press proof sheet; every edit is a new proof, the original is the plate.
colors:
  surface: "oklch(0.27 0 0)"
  panel: "oklch(0.31 0 0)"
  raised: "oklch(0.37 0 0)"
  line: "oklch(1 0 0 / 0.13)"
  line-strong: "oklch(1 0 0 / 0.26)"
  fg: "oklch(0.96 0.006 90)"
  muted: "oklch(0.8 0.004 90)"
  subtle: "oklch(0.7 0.003 90)"
  accent: "oklch(0.96 0.006 90)"
  accent-strong: "oklch(1 0 0)"
  accent-fg: "oklch(0.18 0 0)"
  accent-soft: "oklch(1 0 0 / 0.1)"
  ink: "oklch(0.14 0 0)"
  cyan: "oklch(0.74 0.13 225)"
  magenta: "oklch(0.66 0.26 350)"
  yellow: "oklch(0.88 0.17 95)"
  danger: "oklch(0.72 0.19 27)"
  danger-soft: "oklch(0.72 0.19 27 / 0.14)"
  warn: "oklch(0.88 0.17 95)"
  warn-soft: "oklch(0.88 0.17 95 / 0.13)"
typography:
  display:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "4.5rem"
    fontWeight: 600
    lineHeight: 1.02
    letterSpacing: "-0.03em"
    fontFeature: "\"tnum\" 1, \"cv11\" 1"
  headline:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.875rem"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "-0.02em"
    fontFeature: "\"tnum\" 1, \"cv11\" 1"
  title:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 600
    lineHeight: 1.5556
    fontFeature: "\"tnum\" 1, \"cv11\" 1"
  body:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.4286
    fontFeature: "\"tnum\" 1, \"cv11\" 1"
  body-lead:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 400
    lineHeight: 1.625
    fontFeature: "\"tnum\" 1, \"cv11\" 1"
  label:
    fontFamily: "Geist Mono, ui-monospace, monospace"
    fontSize: "0.75rem"
    fontWeight: 500
    lineHeight: 1.3333
    letterSpacing: "0.025em"
    fontFeature: "\"tnum\" 1"
  numeric:
    fontFamily: "Geist Mono, ui-monospace, monospace"
    fontSize: "0.75rem"
    fontWeight: 400
    lineHeight: 1.3333
    fontFeature: "\"tnum\" 1"
rounded:
  none: "0px"
  sm: "2px"
  md: "3px"
  lg: "4px"
spacing:
  "1": "4px"
  "2": "8px"
  "3": "12px"
  "4": "16px"
  "5": "20px"
  "6": "24px"
  "8": "32px"
  "12": "48px"
  "16": "64px"
  crop-mark: "14px"
  crop-gap: "8px"
components:
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.accent-fg}"
    rounded: "{rounded.md}"
    padding: "0 16px"
    height: "40px"
  button-primary-hover:
    backgroundColor: "{colors.accent-strong}"
    textColor: "{colors.accent-fg}"
  button-secondary:
    backgroundColor: "{colors.raised}"
    textColor: "{colors.fg}"
    rounded: "{rounded.md}"
    padding: "0 16px"
    height: "40px"
  button-secondary-hover:
    backgroundColor: "{colors.line}"
  button-ghost:
    textColor: "{colors.muted}"
    rounded: "{rounded.md}"
    padding: "0 16px"
    height: "40px"
  button-ghost-hover:
    backgroundColor: "{colors.raised}"
    textColor: "{colors.fg}"
  button-danger:
    backgroundColor: "{colors.danger-soft}"
    textColor: "{colors.danger}"
    rounded: "{rounded.md}"
    padding: "0 16px"
    height: "40px"
  button-sm:
    padding: "0 12px"
    height: "32px"
  button-lg:
    padding: "0 24px"
    height: "48px"
  icon-button:
    textColor: "{colors.muted}"
    rounded: "{rounded.md}"
    size: "40px"
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.fg}"
    rounded: "{rounded.md}"
    padding: "0 12px"
    height: "40px"
  tier-badge:
    textColor: "{colors.fg}"
    typography: "{typography.label}"
    height: "20px"
  control-strip-free:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.fg}"
    typography: "{typography.label}"
    rounded: "{rounded.none}"
    padding: "0 8px"
    height: "40px"
  control-strip-pro:
    backgroundColor: "{colors.cyan}"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.none}"
    padding: "0 8px"
    height: "40px"
  control-strip-ultra:
    backgroundColor: "{colors.magenta}"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.none}"
    padding: "0 8px"
    height: "40px"
  tool-row:
    textColor: "{colors.fg}"
    typography: "{typography.body}"
    rounded: "{rounded.none}"
    padding: "10px 12px"
  tool-row-locked:
    textColor: "{colors.muted}"
  group-bar-segment:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.muted}"
    rounded: "{rounded.none}"
    padding: "0 16px"
    height: "36px"
  group-bar-segment-active:
    backgroundColor: "{colors.fg}"
    textColor: "{colors.accent-fg}"
  sheet:
    backgroundColor: "{colors.panel}"
    rounded: "{rounded.none}"
  dialog:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.fg}"
    rounded: "{rounded.lg}"
    padding: "24px"
    width: "min(32rem, calc(100vw - 2rem))"
  toast:
    backgroundColor: "{colors.raised}"
    textColor: "{colors.fg}"
    rounded: "{rounded.lg}"
    padding: "16px"
    width: "min(22rem, calc(100vw - 2rem))"
---

# Design System: Vyx

## Overview

**Creative North Star: "The Proof Sheet"**

Vyx is drawn as an offset-press proof. Every edit is a proof pulled from the press and the original is the plate that never changes. The surround is a hueless photographic grey so it never tints the picture; the ink is paper white; and colour enters only where a press puts it, as the cyan, magenta and black cells of a control strip and as the magenta of the registration target. The photograph is always the loudest thing on screen.

Structure comes from rules, not boxes. Panels read as ruled legends: hairline rows, a heavier rule at the head, numerals locked in fixed tabular cells. State is carried by the form of the rule itself: a solid rule for what you have or what is stored, a dashed rule for what is locked, pending or waiting for a drop, a struck name for what failed. The primary frame on any view (the landing's tool legend, the gallery's loupe, the drop sheet, the editor canvas) sits inside eight hairline crop marks at its trim corners. With all content removed, the crop marks and the control strip still identify the product.

The density is that of a working tool: compact controls (40px), 14px body text, mono captions, and generous grey margin around the image. Motion is a single soft rise on entry and colour transitions on hover; nothing bounces. The world refuses the dark-panels-plus-neon-accent editor default, the generic SaaS card grid, and the icon-rail editor that buries the image under chrome.

**Key Characteristics:**
- Hueless grey surround in three steps (surface, panel, raised); zero chroma on every background.
- Paper-white primary action with near-black ink; no brand hue.
- Tier identity as press ink cells: black for Free, cyan for Pro, magenta for Ultra.
- Rule-form state: solid, dashed, struck.
- Crop marks around the focal frame; square-cut corners everywhere that matters.
- Every numeral in Geist Mono with tabular figures, zero-padded where it counts order.

## Colors

A neutral grey press room with paper-white ink and three process inks reserved for meaning.

### Primary
- **Proof Paper** (`accent`, same value as `fg`): the primary action is the paper itself. Primary buttons, the active group-bar segment, the selected filmstrip outline, the upload progress rule, the crop box and the compare divider are all paper white with near-black ink (`accent-fg`) on top. Hover lifts to **Pure Sheet** (`accent-strong`).
- **Pure Sheet** (`accent-strong`): hover state of the primary action only.
- **Press Black Ink** (`accent-fg`): text on any paper-white fill.

### Secondary
- **Process Cyan** (`cyan`): the Pro tier. Appears as a control-strip cell, a 10px tier swatch in badges, and the head band of the Pro plan column. The CSS alias `--color-pro` points at it.

### Tertiary
- **Process Magenta** (`magenta`): the Ultra tier (alias `--color-ultra`), and the registration colour: the 2px focus ring (offset 2px), the text selection fill (with `ink` text) and the text caret.
- **Process Yellow** (`yellow`): the warn cell in the badge set. `warn` carries the same value for warning text; `warn-soft` is its 13% tint for warning banners.

### Neutral
- **Eighteen-Percent Surround** (`surface`): page and `html` background, input wells, tab trays. Zero chroma by rule.
- **Sheet Grey** (`panel`): the sheet a frame sits on: studio rail, landing tools band, dialogs, image frames, the mobile tools sheet.
- **Raised Grey** (`raised`): secondary buttons, hover fills, the selected step row, skeleton blocks, toasts.
- **Hairline** (`line`, 13% white): quiet dividers (rail edge, studio header, plan quota table).
- **Rule** (`line-strong`, 26% white): the working rule. Frame borders, legend rows, the dashed locked rule, input borders, tool and step rows.
- **Paper Ink** (`fg`): primary text, faintly warm (hue 90) so white reads as paper rather than screen.
- **Muted Ink** (`muted`): secondary text, field labels, ghost-button text.
- **Faint Ink** (`subtle`): captions, placeholders, crop-mark hairlines, lock icons.
- **Key Black** (`ink`): the Free cell, and the 80% scrim behind on-image captions and the Play mark.
- **Paper Tint** (`accent-soft`, 10% white): defined, reserved.

### Status
- **Proof Red** (`danger`): destructive actions, failed edits (dashed border and struck name), field errors, over-limit usage. `danger-soft` (14%) fills the danger button and danger banners.

### Named Rules
**The Neutral Surround Rule.** Every background is zero-chroma grey. Nothing behind the photograph may carry a hue, because the surround must never tint the picture.

**The Ink Means Tier Rule.** Black, cyan and magenta cells name Free, Pro and Ultra and nothing else. Magenta's only other job is registration (focus ring, selection, caret). The inks are never decoration, gradients or backgrounds for content.

**The Paper Is the Action Rule.** The one primary action on a view is paper white with black ink. There is no brand accent colour to reach for instead.

## Typography

**Display Font:** Geist (via `next/font`, token `--font-sans`: `var(--font-geist-sans), ui-sans-serif, system-ui, sans-serif`)
**Body Font:** Geist (same stack)
**Label/Mono Font:** Geist Mono (token `--font-mono`: `var(--font-geist-mono), ui-monospace, monospace`)

**Character:** One neutral grotesque, tightly tracked at display sizes, paired with its own mono for everything a press would print in a fixed cell: captions, sizes, counts, tier names, step numbers. The body sets `font-feature-settings: "tnum" 1, "cv11" 1` globally, so figures are tabular everywhere.

### Hierarchy
- **Display** (600, 3rem, rising to 3.75rem at `sm` and 4.5rem at `lg`, line-height 1.02, -0.03em): the landing headline only, max 13ch, balanced.
- **Headline** (600, 1.875rem rising to 2.25rem at `sm`, -0.02em): landing section heads and the gallery page title. The pricing page title runs one step larger (2.25rem to 3rem, -0.03em).
- **Title** (600, 1.125rem to 1.25rem): file names in the loupe and editor bar, dialog titles (tracking tight), empty-state heads.
- **Body** (400, 0.875rem, 1.4286): the working size for controls, rows, labels and banners. Field labels use 500 in `muted`. Section subheads in the editor panel are 0.875rem 600.
- **Body lead** (400, 1.125rem, 1.625): the landing intro paragraph, max 52ch, in `muted`. Plain explanatory paragraphs elsewhere run at 1rem, max 52 to 60ch.
- **Label** (Geist Mono 500, 0.75rem, uppercase, 0.025em): tier badges, control-strip cells, plan column heads, "Original" and "Edited" captions.
- **Numeric** (Geist Mono 400, 0.75rem, tabular): dimensions, durations, byte sizes, usage counts, slider readouts, the progress percentage, step numbers.

### Named Rules
**The Tabular Cell Rule.** Every number sits in Geist Mono with tabular figures. Counts that carry order or tier are zero-padded to two digits ("01", "02"), and readouts that change live get a fixed-width cell so nothing jitters.

**The Mono Is Print Rule.** Mono marks what the press prints on the sheet (captions, measures, tier names); sans carries everything a person reads or acts on.

## Layout

Public pages sit in a centred 72rem container (`max-w-6xl`) with 16px gutters, 24px from `sm`. The landing hero is a two-column grid at `lg` (1.15fr headline, 0.85fr crop-marked tool legend, 64px gap) and stacks below it. Sections are separated by full-bleed rules (`line-strong`) and alternate `surface` and `panel` grounds rather than floating as cards; section padding is 64px, 96px at `lg`.

The studio is a fixed left rail (16rem, `panel`, ruled on its right edge) with the logo, navigation and, in its footer, the plan control strip. Below `lg` the rail becomes a top header with horizontally scrolling nav. Main content pads 16px (32px from `sm`), 24px top (40px at `lg`).

The gallery is a loupe-and-filmstrip: one large 16:9 crop-marked frame, an info bar beneath it, and a horizontally scrolling strip of square frames (128px, 144px from `sm`, 12px gap), newest first. The upload drop sheet covers the gallery region in place (minimum 28rem tall), never a separate page.

The image editor is a full-width top bar ruled underneath, a crop-marked canvas taking the remaining width (minimum 50vh), and a 22rem tools panel ruled on its left with 24px inset. Below `lg` the panel becomes a fixed bottom sheet capped at 60dvh, collapsing to a 56px handle. The group bar floats centred 32px above the canvas foot on large screens and drops into flow below the canvas on small ones.

Spacing follows Tailwind's 4px step. The common rhythm is 4/8/12/16/24/32px inside components and 48/64px between page sections. Crop marks reserve 22px of padding around their frame (14px mark plus 8px gap).

The plan control strip uses a container query: each cell shows its zero-padded tool count only when the cell is at least 5.5rem wide, so the narrow studio rail shows tier names alone.

## Elevation & Depth

The system is flat. Depth comes from three tonal steps (`surface` 0.27, `panel` 0.31, `raised` 0.37) and two rule weights (`line` and `line-strong`), not shadow. A frame is a sheet on the surround, outlined by a rule and placed by crop marks. Only things that float above the page as a separate layer carry a shadow, and the shadow is soft, black and downward.

### Shadow Vocabulary
- **Dialog lift** (`box-shadow: 0 24px 64px -12px oklch(0 0 0 / 0.6)`): modal dialogs, over a `dialog::backdrop` of `oklch(0.12 0 0 / 0.72)` with a 6px blur.
- **Toast lift** (`box-shadow: 0 12px 32px -8px oklch(0 0 0 / 0.6)`): notification toasts, bottom right.
- **Crop dim** (`box-shadow: 0 0 0 100vmax oklch(0.12 0 0 / 0.62)`): darkens everything outside the crop box. Functional, not elevation.

### Named Rules
**The Flat Sheet Rule.** Surfaces at rest are flat. A frame earns its edge from a rule and its place from crop marks; shadows belong only to layers that float over the page (dialogs, toasts).

## Shapes

Proofs are cut square. The radius scale stops at 4px: 2px (`sm`) for tab buttons, 3px (`md`) for buttons, icon buttons, inputs, selects and Clerk widgets (`borderRadius: 0.1875rem`), 4px (`lg`) for dialogs, toasts and banners. Everything that belongs to the sheet is 0: image frames, filmstrip frames, the drop sheet, legend rows, the group bar, tier swatches, control-strip cells, position-grid cells, multi-select chips, the crop box and its handles. Spinners are the only round form.

Crop marks are the signature geometry: eight 1px hairlines, 14px long, in `subtle`, set 8px outside each trim corner (the `.crop-marks` utility, built from background gradients so it adds no DOM). The logo repeats the motif: a V inside four corner marks.

Rules are 1px. The dashed rule is the browser's native 1px dashed border in `line-strong`, or paper white (`fg`) when the drop sheet is waiting for a file. Selection on a frame is a 2px paper-white outline offset 2px, never a fill.

### Named Rules
**The Square Cut Rule.** Nothing exceeds a 4px radius, and anything that represents the sheet, a frame or a cell has none.

**The Rule-Form State Rule.** State is drawn in the rule: solid for tools you have, stored files and an accepted upload; dashed for locked tools, processing edits and a sheet awaiting a drop; a struck name in `danger` for a failed edit. Locked tool names are never struck, so they stay readable.

## Components

### Buttons
Compact, square-shouldered, quiet until primary.
- **Shape:** gently squared (3px), heights 32 / 40 / 48px with 12 / 16 / 24px side padding; sm and md use 0.875rem text, lg uses 1rem. Icon and label gap 8px.
- **Primary:** paper white with black ink, weight 600; hover to pure white. One per view.
- **Secondary:** `raised` fill, `line-strong` border, `fg` text, weight 500; hover fill `line`.
- **Ghost:** no fill, `muted` text; hover `raised` fill and `fg` text. Used for navigation links, Cancel and Delete in the loupe.
- **Danger:** `danger-soft` fill, `danger` text, 40% danger border; hover to a 25% danger fill. Confirm-delete only.
- **States:** 150ms colour transitions; disabled at 50% opacity with no pointer events; loading shows a 16px ring spinner and sets `aria-busy`. Focus is the global magenta ring.
- **Icon button:** 40px square (32px in step rows), `muted` icon, hover `raised` fill; requires a label, exposed as `aria-label` and `title`.

### Tier Badges and the Control Strip
- **Tier badge:** a 10px square ink cell followed by a mono uppercase label (0.75rem, 500, 0.025em) in `fg`. Tones: neutral (`ink` with a `line-strong` ring), accent (paper, used for "Edited"), pro (cyan), ultra (magenta), warn (yellow).
- **Control strip:** three equal 40px cells in a row, Free (`ink`, inset `line-strong` ring, `fg` text), Pro (`cyan`, `ink` text), Ultra (`magenta`, `ink` text), mono uppercase names left and zero-padded tool counts right. With a current plan set, the other cells drop to 45% opacity. Counts hide below a 5.5rem cell width.
- **Plan columns (landing):** each plan column is headed by a 40px band in its ink, then a ruled body with a tabular quota table.

### Legends and Tool Rows
- **Style:** lists are ruled, not carded: a `line-strong` top rule, a `line-strong` bottom rule per row, 10px by 12px padding, label in `fg` over a one-line `subtle` description.
- **Locked:** the row's rule turns dashed, the label drops to `muted`, and a 14px lock icon and the Pro or Ultra badge sit at the right. Clicking opens the upgrade dialog; the row never hides.
- **Hover:** `raised` fill.
- **Steps list:** the same ruled rows, each led by a zero-padded mono step number in `subtle`; the selected step takes a `raised` fill; move up, move down and remove are 32px icon buttons.

### Group Bar
A slim ruled toolbar of up to five segments (Adjust, Filters, Overlays, AI, Generative), 36px tall, `line-strong` outline and dividers, on 95% `panel`. The active segment fills paper white with black ink; the rest are `muted`, with a `raised` hover.

### Frames and Sheets
- **Crop-marked frame:** a `panel` sheet with a `line-strong` 1px border inside the `.crop-marks` wrapper, square corners, image `object-contain`. Loupe frames are 16:9; editor canvases fill the available area.
- **On-image captions:** mono uppercase on an 80% `ink` scrim, 6px side padding, pinned to a corner.
- **Status overlays:** a full-width 80% `ink` bar along the top with a spinner (rendering, AI processing); prompts such as Generate or See plans in an 85% `ink` block centred above the canvas foot.
- **Drop sheet:** the gallery region becomes one crop-marked sheet over a 95% `surface` veil. Waiting: dashed paper-white border, a 32px upload icon, a centred title and a mono limits line. Accepted: solid `line-strong` border, the file preview at 60% opacity, and a bottom bar holding a 1px progress rule that fills paper white, a fixed-width percentage cell and Cancel.
- **Filmstrip frame:** square, `line-strong` border with `subtle` hover; selected frames swap the border for the 2px paper-white outline. Mono name and measure sit underneath.

### Inputs / Fields
- **Style:** 40px, `surface` well, `line-strong` 1px border, 3px radius, 12px side padding, 0.875rem `fg` text, `subtle` placeholders. Label above in `muted` 500, 6px gap; hint below in `subtle` 0.75rem.
- **Hover / Focus:** border lifts to `subtle`; focus is the magenta ring.
- **Error:** border and note turn `danger`; the field gets `aria-invalid`.
- **Number fields** set their value in mono tabular figures. **Sliders** use the native range in paper white with a mono readout right-aligned beside the label. **Selects** share the input shape with a 16px chevron. Checkboxes and the compare slider take `accent-color` paper white.
- **Choice cells:** multi-select chips and the 3 by 3 position grid are square-cut bordered cells; selected fills paper white with black ink.

### Navigation
- **Public header:** 64px, logo left, ghost-button links and one primary action right.
- **Studio rail:** 40px nav links, `muted` text with an 18px icon; the active link takes a `raised` fill, `fg` text and a paper-white icon. The rail footer holds the plan control strip and an underlined "Upgrade for more tools" link.
- **Filter tabs:** a `surface` tray with a `line` border, 4px inset, 32px tab buttons; the selected tab fills `raised`. Arrow keys, Home and End move between tabs.
- **Skip link:** hidden until focused, then a paper-white chip top left.

### Dialogs, Toasts and Banners
- **Dialog:** native `<dialog>`, `panel` fill, `line-strong` border, 4px radius, 24px padding, dialog lift shadow; title at 1.125rem 600, description in `muted`, close icon button top right, actions right-aligned. Width 32rem, or 72rem for the embedded pricing table.
- **Toast:** `raised`, `line-strong` border, 4px radius, 16px padding, toast lift; icon tinted by tone (paper for success, `danger` for error, `muted` for info). Enters with the rise motion and dismisses after 5s.
- **Banner:** a full-width 4px-radius strip with a tone tint (`warn-soft`, `danger-soft` or `raised`), an 18px icon, text at 500 and a small secondary button.

### Motion
One entrance, `rise`: 14px upward translate and fade over 0.7s on `cubic-bezier(0.16, 1, 0.3, 1)`, staggered 70ms per item through the `--i` custom property. Hover changes are 150ms colour transitions; the upload progress rule eases its width over 200ms. Under `prefers-reduced-motion` the rise is removed, transitions collapse to 0.01ms and spinners and skeleton pulses stop.

## Do's and Don'ts

### Do:
- **Do** keep every background on the three zero-chroma greys (`surface` 0.27, `panel` 0.31, `raised` 0.37) so the photograph is the only colour in the room.
- **Do** make the one primary action paper white with black ink (`accent` on `accent-fg`).
- **Do** use cyan for Pro, magenta for Ultra and ink black for Free, always as a square cell or swatch.
- **Do** draw state with the rule: solid for available or stored, dashed for locked or pending, struck name in `danger` for failed.
- **Do** put the focal frame of a view inside `.crop-marks`, with a 1px `line-strong` border and square corners.
- **Do** set every measure, count and size in Geist Mono with tabular figures, in a fixed-width cell when it changes live.
- **Do** mark a selected frame with the 2px paper-white outline at a 2px offset.
- **Do** keep radii at 2, 3 or 4px for controls and 0 for anything that belongs to the sheet.

### Don't:
- **Don't** tint the surround or any panel with a hue, not even the brand's own inks.
- **Don't** use cyan, magenta or yellow as decoration, gradient, glow or text colour for ordinary content.
- **Don't** strike through locked tool names; locked rows use the dashed rule and stay readable.
- **Don't** wrap panels in shadowed cards; legends are ruled rows on a flat sheet.
- **Don't** mark a selected frame with a tinted fill.
- **Don't** set numbers in proportional figures or let a live readout change width.
- **Don't** add shadows to anything that does not float above the page.
