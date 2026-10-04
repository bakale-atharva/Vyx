# Vyx

A photo and video editor app, inspired by Sonny Sangha, vibecoded using Claude.

This file gives Claude Code the context it needs to work in this repo. Keep it short, current, and specific — update it as the project changes.

## Project Overview

- **Type:** Web app
- **Primary language:** TypeScript
- **Framework(s):** Next.js, Tailwind
- **Package manager:** pnpm

## Commands

- **Install:** `pnpm install`
- **Dev / run:** `pnpm run backend` and `pnpm run frontend` in separate terminals (each keeps running)
- **Build:** `pnpm run build`
- **Test:** `pnpm test` (unit tests on Node's built-in test runner — don't add Vitest) · `pnpm test:e2e` (Playwright + `@clerk/testing`; needs `E2E_CLERK_USER_EMAIL`, a Free-plan user)
- **Lint / format:** `pnpm run lint`

## Architecture

- `lib/billing/plans.ts` (plans, features, quotas) and `lib/editor/*` (tool registry, recipes, signing gate) are pure TS shared by Next.js and Convex. Add a tool in `operations.ts` and its URL params to the `parseSignedRequest` allowlist in `recipe.ts`; `tests/unit/signing-gate.test.ts` fails if they drift.
- Every ImageKit URL is signed server-side after ownership + `has({ feature })` checks (`actions/editor.ts`, `app/api/imagekit/sign`). Convex re-checks plans in `assets.saveEdit`.
- Env var names are listed in `docs/SETUP.md`.

## Git Workflow

The plan is divided into phases. The user will tell you to do a phase. At that time, you need to complete the phase on a separate branch and then create a pull request. Only after the user approves it should it be merged.

## Guardrails — Never Do This

- Never commit environment variables.

## Notes For Claude

- Ask before making architectural changes not covered above.
- Prefer editing existing files over creating new ones unless the project structure calls for it.
- If a command above fails or looks out of date, flag it rather than guessing a replacement.

<!-- convex-ai-start -->

This project uses [Convex](https://convex.dev) as its backend.

When working on Convex code, **always read
`convex/_generated/ai/guidelines.md` first** for important guidelines on
how to correctly use Convex APIs and patterns. The file contains rules that
override what you may have learned about Convex from training data.

Convex agent skills for common tasks can be installed by running
`npx convex ai-files install`.

<!-- convex-ai-end -->
