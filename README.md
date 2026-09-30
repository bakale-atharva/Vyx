# Vyx

An AI image and video studio, inspired by Sonny Sangha and vibecoded with Claude. Signed-in users keep a gallery of everything they upload, open an image or video in an editor, and apply [ImageKit](https://imagekit.io) transformations from a tools panel. Which tools are unlocked depends on the user's [Clerk Billing](https://clerk.com/docs/billing) plan.

## Tech stack

- **App:** Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4
- **Auth and billing:** Clerk (user plans and features, no organizations)
- **Backend:** Convex (database, server functions, Clerk webhook, crons)
- **Media:** ImageKit (storage, delivery and AI transformations)
- **Package manager:** pnpm

## Plans

| | Free | Pro ($15/mo) | Ultra ($39/mo) |
|---|---|---|---|
| Tools | 6 core image and video tools | 16 (adds AI background removal, upscale, retouch, drop shadow, smart crop, watermarks, mute, audio extract) | 23 (adds generative edits, AI subtitles and translation, adaptive streaming) |
| Stored assets | 25 | 500 | 5,000 |
| Image size | 10 MB | 25 MB | 50 MB |
| Video size / length | 50 MB / 60 s | 200 MB / 5 min | 1 GB / 30 min |

Each tool is a Clerk **feature** checked with `has({ feature })`; quotas are code constants. Both live in [`lib/billing/plans.ts`](lib/billing/plans.ts), the single source of truth shared by the app and Convex.

## How it works

- **Feature gating is enforced on the server.** Delivery URLs are signed by our server only after ownership and `has({ feature })` checks, with ImageKit's *Restrict unsigned URLs* turned on. A free user cannot hand-edit a URL to use a paid tool.
- **Clerk webhooks only mirror state.** `POST <convex-site>/clerk-webhook` (a Convex HTTP action) verifies the signature, ignores duplicate deliveries, and syncs users, plans and subscription status into Convex. It never decides what a user is allowed to do in real time.
- **Uploads are validated twice.** `GET /api/imagekit/upload-auth` issues signed upload params after a quota check. After the browser uploads to ImageKit, the `assets.register` Convex action re-reads the file from ImageKit and validates folder, type, size, duration and quota before it becomes an asset.
- **Routes protect themselves.** `proxy.ts` is a bare `clerkMiddleware()`; every page, layout and route handler calls `auth.protect()`.

## Project layout

```
app/                    Next.js routes (sign-in/up, api/imagekit/upload-auth)
components/providers/   ConvexClientProvider
lib/billing/plans.ts    Plans, features, quotas, getTier (shared with Convex)
lib/imagekit/server.ts  Server-only ImageKit client and URL signing
convex/                 schema, http (Clerk webhook), users, billing, assets,
                        imagekit (Node actions), cleanup, crons
docs/SETUP.md           Clerk, ImageKit and env setup checklist
```

## Status

The build is split into phases; each phase is a branch and pull request.

| Phase | Scope | Status |
|---|---|---|
| B1 | Billing config and shared plans module | Done |
| B2 | Convex data layer and Clerk webhook sync | Done |
| B3 | ImageKit upload, register and delete | Done |
| B4 | Tool registry, recipe engine and signing gate | Planned |
| B5 | Save, export and async processing | Planned |
| F1 to F6 | App shell, gallery, upload UI, image editor, video editor, hardening | Planned |

## Getting started

1. Follow [`docs/SETUP.md`](docs/SETUP.md) to configure Clerk Billing (plans and features), the Clerk webhook, and ImageKit.
2. Install dependencies:

   ```bash
   pnpm install
   ```

3. Create `.env.local` (never commit it) with the variable names listed in [`docs/SETUP.md`](docs/SETUP.md), and set the Convex deployment variables with `npx convex env set`.
4. Run the backend and frontend in separate terminals:

   ```bash
   pnpm run backend
   ```

   ```bash
   pnpm run frontend
   ```

5. Open [http://localhost:3000](http://localhost:3000).

## Scripts

| Command | What it does |
|---|---|
| `pnpm run frontend` | Next.js dev server |
| `pnpm run backend` | Convex dev (pushes functions and regenerates types) |
| `pnpm run build` | Production build |
| `pnpm start` | Serve the production build |
| `pnpm run lint` | ESLint |

There is currently no test runner.
