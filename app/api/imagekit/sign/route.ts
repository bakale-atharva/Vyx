import { auth } from "@clerk/nextjs/server";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { firstLockedFeature } from "@/lib/editor/gate";
import { parseSignedRequest } from "@/lib/editor/recipe";
import { getUrlEndpoint, signUrl } from "@/lib/imagekit/server";

const SIGN_TTL_SECONDS = 60 * 60;

const bodySchema = z.object({ url: z.string().min(1).max(4000) });

/**
 * Sign an ImageKit URL for the video player (`signerFn`) and gallery
 * thumbnails. The URL must be inside the caller's own folder and every
 * transformation in it must be allowlisted and unlocked by the caller's plan.
 * Returns the signed URL as plain text, as the player expects.
 */
export async function POST(request: NextRequest) {
  const { userId, has } = await auth.protect();

  const body = bodySchema.safeParse(await request.json().catch(() => null));
  if (!body.success) {
    return NextResponse.json({ code: "BAD_REQUEST" }, { status: 400 });
  }

  const check = parseSignedRequest(body.data.url, {
    urlEndpoint: getUrlEndpoint(),
    userId,
  });
  if (!check.ok) {
    return NextResponse.json(
      { code: "FORBIDDEN", reason: check.reason },
      { status: 403 },
    );
  }

  const locked = firstLockedFeature(has, check.features);
  if (locked) {
    return NextResponse.json({ code: "LOCKED", feature: locked }, { status: 403 });
  }

  // `tr` was validated above, so it can be passed through verbatim.
  const signed = signUrl({
    src: check.path,
    transformation: check.tr
      ? check.tr.split(":").map((raw) => ({ raw }))
      : undefined,
    queryParameters: check.queryParameters,
    expiresIn: SIGN_TTL_SECONDS,
  });

  return new NextResponse(signed, {
    headers: { "Content-Type": "text/plain", "Cache-Control": "no-store" },
  });
}
