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
- **Dev / run:** `pnpm run frontend && pnpm run backend`
- **Build:** `pnpm run build`
- **Test:** `pnpm test`
- **Lint / format:** `pnpm run lint`

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
