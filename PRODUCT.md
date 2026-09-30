# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Casual users who want to fix or polish personal photos and videos quickly in the browser, and content creators and small sellers who make product shots, thumbnails and short clips regularly. Casual users start on Free; creators are the paying core, converting to Pro or Ultra for AI tools.

## Product Purpose

Vyx is a browser-based photo and video editor. A signed-in user keeps a gallery of their uploads, opens an image or video editor, applies ImageKit-powered edits from a right-side tools panel, and saves the result. Success is a user getting a finished edit fast, then upgrading when they want AI tools.

## Positioning

Edits are non-destructive: every edit is saved as a new copy and the original is never changed. Tools run server-side through ImageKit, and every tool is clearly sorted and unlocked by plan (Free, Pro, Ultra), so users see what each plan gives them before paying.

## Capabilities and Constraints

- Plans via Clerk Billing (user plans, features only): Free, Pro ($15/mo), Ultra ($39/mo). Feature gating is enforced server-side; the UI mirrors it with locks and upgrade prompts.
- Quotas per plan: stored assets, image size, video size and length (see `lib/billing/plans.ts`).
- Stack: Next.js, Tailwind, Clerk, Convex, ImageKit. UI components are hand-rolled; ask before adding a UI library.
- Terminology: assets, recipe (ordered list of edit steps), tools, gallery, studio.

## Evidence on Hand

No real customers, testimonials, reviews or usage statistics exist yet. Do not fabricate them. The "Vyx" wordmark in the header is a placeholder, not a confirmed logo.

## Product Principles

- Originals are sacred: never destructive, always save as new.
- Plan gating is honest and visible; nothing is hidden, locked tools show what unlocks them.
- Free must be genuinely useful; AI is the upgrade, not a paywall on basics.
- The studio is a tool people return to: speed and clarity beat decoration.

## Accessibility & Inclusion

No product-specific standard confirmed beyond the plan's accessibility pass (phase F6: keyboard-operable tools panel, focus rings, labelled sliders, reduced motion).
