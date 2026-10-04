# Vyx setup checklist

The code contract for everything below lives in `lib/billing/plans.ts`. If you change a plan, feature or quota in a dashboard, change it there too.

## 1. Clerk Billing

Dashboard → **Billing → Settings**: enable Billing and **User plans** (use the Clerk development gateway for dev). Then **Billing → Plans → User Plans** tab (not Organization Plans, or `<PricingTable />` renders empty).

Features are created inside a plan's *Features* section. The **same feature slug must be attached to every plan that includes it**. Features are checked with `has({ feature: '<slug>' })`; Clerk permissions are not used (they only exist inside Organizations).

### Plans

- [ ] **Free** — slug `free_user` (auto-created), $0, publicly visible, default
- [ ] **Pro** — slug `pro`, $15/mo, $12.50/mo billed annually ($150/yr), publicly visible
- [ ] **Ultra** — slug `ultra`, $39/mo, $32.50/mo billed annually ($390/yr), publicly visible

Optional: 7-day free trial on Pro.

**Descriptions**

- Free: Start creating at no cost. Upload and edit up to 25 photos and videos with core tools: resize, crop, rotate, format conversion, filters, text overlays, video trimming and thumbnails. Images up to 10 MB, videos up to 50 MB and 60 seconds.
- Pro: For creators who want AI on their side. Everything in Free, plus AI background removal, upscaling, retouching, drop shadows, smart crop, watermarks, and video audio tools like mute and audio extraction. Store up to 500 assets; images up to 25 MB, videos up to 200 MB and 5 minutes.
- Ultra: The full generative studio. Everything in Pro, plus prompt-based AI editing, AI background replacement, generative fill, image variations, AI-generated subtitles with translation, and adaptive streaming for videos. Store up to 5,000 assets; images up to 50 MB, videos up to 1 GB and 30 minutes.

### Features

| Done | Name | Slug | Free | Pro | Ultra |
|---|---|---|---|---|---|
| [ ] | Image Basic Edits | `image_basic_edits` | ✓ | ✓ | ✓ |
| [ ] | Image Filters | `image_filters` | ✓ | ✓ | ✓ |
| [ ] | Image Text Overlay | `image_text_overlay` | ✓ | ✓ | ✓ |
| [ ] | Image Watermark | `image_watermark` | | ✓ | ✓ |
| [ ] | Smart Crop | `image_smart_crop` | | ✓ | ✓ |
| [ ] | AI Background Removal | `image_bg_remove` | | ✓ | ✓ |
| [ ] | AI Drop Shadow | `image_drop_shadow` | | ✓ | ✓ |
| [ ] | AI Upscale | `image_upscale` | | ✓ | ✓ |
| [ ] | AI Retouch | `image_retouch` | | ✓ | ✓ |
| [ ] | AI Background Change | `image_bg_change` | | | ✓ |
| [ ] | AI Generative Fill | `image_gen_fill` | | | ✓ |
| [ ] | AI Prompt Edit | `image_ai_edit` | | | ✓ |
| [ ] | AI Variations | `image_variations` | | | ✓ |
| [ ] | Video Basic Edits | `video_basic_edits` | ✓ | ✓ | ✓ |
| [ ] | Video Trim | `video_trim` | ✓ | ✓ | ✓ |
| [ ] | Video Thumbnail | `video_thumbnail` | ✓ | ✓ | ✓ |
| [ ] | Mute Video | `video_mute` | | ✓ | ✓ |
| [ ] | Extract Audio | `video_audio_extract` | | ✓ | ✓ |
| [ ] | Video Text Overlay | `video_text_overlay` | | ✓ | ✓ |
| [ ] | Video Watermark | `video_watermark` | | ✓ | ✓ |
| [ ] | AI Subtitles | `video_ai_subtitles` | | | ✓ |
| [ ] | Subtitle Translation | `video_subtitle_translate` | | | ✓ |
| [ ] | Adaptive Streaming | `video_streaming` | | | ✓ |

Totals: Free 6, Pro 16, Ultra 23.

### Quotas (code constants, not Clerk features)

| | Free | Pro | Ultra |
|---|---|---|---|
| Max stored assets | 25 | 500 | 5,000 |
| Max image size | 10 MB | 25 MB | 50 MB |
| Max video size / length | 50 MB / 60 s | 200 MB / 5 min | 1 GB / 30 min |

## 2. Clerk webhook

- [ ] Dashboard → Webhooks → endpoint `https://<deployment>.convex.site/clerk-webhook` (note `.convex.site`, not `.convex.cloud`)
- [ ] Subscribe to: `user.created`, `user.updated`, `user.deleted`, `subscription.created`, `subscription.updated`, `subscription.active`, `subscription.pastDue`, `subscriptionItem.canceled`, `subscriptionItem.ended`, `subscriptionItem.upcoming`, `subscriptionItem.pastDue`, `subscriptionItem.freeTrialEnding`
- [ ] Set `CLERK_WEBHOOK_SIGNING_SECRET` on the Convex deployment (dev and prod separately)

## 3. ImageKit

- [ ] Note your URL endpoint
- [ ] Settings → **Restrict unsigned URLs** ON (every delivery URL is signed server-side after a plan check)
- [ ] AI transformations consume ImageKit extension units; watch usage

## 4. Environment variables (names only, never commit values)

`.env.local` (Next.js):

- `NEXT_PUBLIC_CONVEX_URL`, `NEXT_PUBLIC_CONVEX_SITE_URL`, `CONVEX_DEPLOYMENT`
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, `CLERK_FRONTEND_API_URL`
- `NEXT_PUBLIC_CLERK_SIGN_IN_URL`, `NEXT_PUBLIC_CLERK_SIGN_UP_URL`, `NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL`, `NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL`
- `NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT`, `IMAGEKIT_PUBLIC_KEY`, `IMAGEKIT_PRIVATE_KEY`
- E2E only: `E2E_CLERK_USER_EMAIL` (a **Free-plan** dev user; a `+clerk_test` address suppresses emails), optional `E2E_BASE_URL` (defaults to `http://localhost:3000`)

Convex deployment env (`npx convex env set NAME value`):

- `CLERK_FRONTEND_API_URL`
- `CLERK_SECRET_KEY`
- `CLERK_WEBHOOK_SIGNING_SECRET`
- `IMAGEKIT_PRIVATE_KEY`
- `IMAGEKIT_URL_ENDPOINT`

## 5. Optional: diff dashboard vs code

```bash
clerk config pull --keys billing > billing.json
```

Compare against `lib/billing/plans.ts`. Do not commit `billing.json` if it contains instance ids.
