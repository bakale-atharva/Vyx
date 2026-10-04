import assert from "node:assert/strict";
import { describe, test } from "node:test";
import ImageKit from "@imagekit/nodejs";
import { FEATURES, planHasFeature, type FeatureSlug, type Plan } from "../../lib/billing/plans";
import { firstLockedFeature } from "../../lib/editor/gate";
import { OPERATIONS, encodePrompt } from "../../lib/editor/operations";
import { parseSignedRequest, recipeToTransformations, requiredFeatures } from "../../lib/editor/recipe";

const ENDPOINT = "https://ik.imagekit.io/vyxtest";
const USER = "user_abc";
const IMAGE = `/vyx/users/${USER}/images/photo.jpg`;
const VIDEO = `/vyx/users/${USER}/videos/clip.mp4`;
const LOGO_ID = "logo-asset";
const ctx = { assetPaths: { [LOGO_ID]: `/vyx/users/${USER}/images/logo.png` } };

const helper = new ImageKit({ privateKey: "private_test" }).helper;
const check = (url: string) => parseSignedRequest(url, { urlEndpoint: ENDPOINT, userId: USER });
const hasFor = (plan: Plan) => ({ feature }: { feature: string }) => planHasFeature(plan, feature as FeatureSlug);

/** Params that pass each op's schema (defaults, plus what defaults leave out). */
function paramsFor(op: (typeof OPERATIONS)[number]): unknown {
  const extra: Record<string, unknown> = {
    watermark: { assetId: LOGO_ID },
    v_watermark: { assetId: LOGO_ID },
    change_bg: { prompt: "a sunny beach" },
    ai_edit: { prompt: "make the sky orange" },
  };
  const params = { ...(op.defaults as object), ...(extra[op.id] as object | undefined) };
  const parsed = op.params.safeParse(params);
  assert.ok(parsed.success, `${op.id} test params should be valid: ${parsed.error?.message}`);
  return parsed.data;
}

describe("tool registry ↔ signing gate", () => {
  for (const op of OPERATIONS.filter((o) => !o.playerOnly)) {
    test(`${op.id}: built URL is accepted and needs ${op.feature}`, () => {
      const steps = [{ opId: op.id, params: paramsFor(op) }];
      const built = recipeToTransformations(steps, ctx);
      const src = (op.kind === "image" ? IMAGE : VIDEO) + (built.pathSuffix ?? "");
      const url = helper.buildSrc({
        urlEndpoint: ENDPOINT,
        src,
        transformation: built.transformation,
        queryParameters: built.queryParameters,
      });

      const result = check(url);
      assert.ok(result.ok, `${op.id} rejected: ${!result.ok && result.reason} (${url})`);
      assert.ok(result.features.includes(op.feature), `${op.id} features: ${result.features}`);
      assert.deepEqual(requiredFeatures(steps), [op.feature]);
    });
  }
});

describe("parseSignedRequest", () => {
  test("rejects other hosts, other users and path tricks", () => {
    assert.equal(check(`https://evil.example.com/vyxtest${IMAGE}`).ok, false);
    assert.equal(check(`${ENDPOINT}/vyx/users/someone_else/images/a.jpg`).ok, false);
    assert.equal(check(`${ENDPOINT}/vyx/users/${USER}/images/../../x/images/a.jpg`).ok, false);
    assert.equal(check(`${ENDPOINT}/vyx/users/${USER}/images/%2e%2e/a.jpg`).ok, false);
    assert.equal(check(`${ENDPOINT}/vyx/users/${USER}/other/a.jpg`).ok, false);
  });

  test("rejects unknown params, unknown query keys and injection attempts", () => {
    assert.equal(check(`${ENDPOINT}${IMAGE}?tr=e-unknown`).ok, false);
    assert.equal(check(`${ENDPOINT}${IMAGE}?foo=bar`).ok, false);
    assert.equal(check(`${ENDPOINT}${IMAGE}?tr=w-100&tr=e-bgremove`).ok, false);
    assert.equal(check(`${ENDPOINT}${IMAGE}?tr=w-100%2Ce-bgremove`).ok, false);
    // Plain-text prompts could carry extra params; only base64 is allowed.
    assert.equal(check(`${ENDPOINT}${IMAGE}?tr=e-changebg-prompt-beach`).ok, false);
  });

  test("video-only params are refused on images and vice versa", () => {
    assert.equal(check(`${ENDPOINT}${IMAGE}?tr=ac-none`).ok, false);
    assert.equal(check(`${ENDPOINT}${VIDEO}?tr=e-bgremove`).ok, false);
    assert.equal(check(`${ENDPOINT}${IMAGE}/ik-thumbnail.jpg`).ok, false);
  });

  test("watermark overlays must come from the user's own images", () => {
    const own = check(`${ENDPOINT}${IMAGE}?tr=l-image,i-vyx@@users@@${USER}@@images@@logo.png,l-end`);
    assert.ok(own.ok);
    assert.deepEqual(own.features, [FEATURES.IMAGE_WATERMARK]);
    const foreign = check(`${ENDPOINT}${IMAGE}?tr=l-image,i-vyx@@users@@other@@images@@logo.png,l-end`);
    assert.equal(foreign.ok, false);
    assert.equal(check(`${ENDPOINT}${IMAGE}?tr=l-text,i-hi`).ok, false, "unterminated layer");
  });

  test("thumbnail offsets need the thumbnail feature, not trim", () => {
    const result = check(`${ENDPOINT}${VIDEO}/ik-thumbnail.jpg?tr=so-3.5`);
    assert.ok(result.ok);
    assert.deepEqual(result.features, [FEATURES.VIDEO_THUMBNAIL]);
  });

  test("AI subtitle and chapter resources from the video player", () => {
    const transcript = check(`${ENDPOINT}${VIDEO}/ik-gensubtitle.transcript?tr=so-2,eo-8`);
    assert.ok(transcript.ok);
    assert.deepEqual(transcript.features.toSorted(), [FEATURES.VIDEO_AI_SUBTITLES, FEATURES.VIDEO_TRIM].toSorted());

    const chapters = check(`${ENDPOINT}${VIDEO}/ik-genchapter.vtt`);
    assert.ok(chapters.ok);
    assert.deepEqual(chapters.features, [FEATURES.VIDEO_AI_SUBTITLES]);

    const translated = check(`${ENDPOINT}${VIDEO}/ik-gensubtitle.vtt?tr=lang-fr`);
    assert.ok(translated.ok);
    assert.deepEqual(
      translated.features.toSorted(),
      [FEATURES.VIDEO_SUBTITLE_TRANSLATE, FEATURES.VIDEO_AI_SUBTITLES].toSorted(),
    );

    assert.equal(check(`${ENDPOINT}${VIDEO}/ik-gensubtitle.vtt`).ok, false, "needs a language");
    assert.equal(check(`${ENDPOINT}${VIDEO}/ik-gensubtitle.vtt?tr=lang-fr,lang-de`).ok, false);
    assert.equal(check(`${ENDPOINT}${VIDEO}/ik-genchapter.vtt?tr=ac-none`).ok, false);
  });
});

describe("plan gate", () => {
  const lockedFor = (plan: Plan, url: string) => {
    const result = check(url);
    assert.ok(result.ok, url);
    return firstLockedFeature(hasFor(plan), result.features);
  };

  test("Free can't mute a video (ac-none) — the F5 403 case", () => {
    assert.equal(lockedFor("free", `${ENDPOINT}${VIDEO}?tr=ac-none`), FEATURES.VIDEO_MUTE);
    assert.equal(lockedFor("pro", `${ENDPOINT}${VIDEO}?tr=ac-none`), null);
  });

  test("Free can't remove a background; Pro can", () => {
    assert.equal(lockedFor("free", `${ENDPOINT}${IMAGE}?tr=e-bgremove`), FEATURES.IMAGE_BG_REMOVE);
    assert.equal(lockedFor("pro", `${ENDPOINT}${IMAGE}?tr=e-bgremove`), null);
  });

  test("AI subtitles are Ultra only", () => {
    const url = `${ENDPOINT}${VIDEO}/ik-gensubtitle.transcript`;
    assert.equal(lockedFor("pro", url), FEATURES.VIDEO_AI_SUBTITLES);
    assert.equal(lockedFor("ultra", url), null);
  });

  test("Free keeps its core tools", () => {
    assert.equal(lockedFor("free", `${ENDPOINT}${IMAGE}?tr=w-400,h-300,c-at_max:e-grayscale`), null);
    assert.equal(lockedFor("free", `${ENDPOINT}${VIDEO}?tr=so-1,eo-5`), null);
  });
});

test("prompts are base64 so they can't add params", () => {
  const encoded = encodePrompt("sky, l-image:e-bgremove");
  assert.match(encoded, /^prompte-[A-Za-z0-9%_.~-]+$/);
  assert.doesNotMatch(encoded, /[,:]/);
});
