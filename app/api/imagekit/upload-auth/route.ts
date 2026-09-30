import { auth } from "@clerk/nextjs/server";
import { getUploadAuthParams } from "@imagekit/next/server";
import { fetchMutation, fetchQuery } from "convex/nextjs";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { api } from "@/convex/_generated/api";
import {
  ALLOWED_MIME,
  ASSET_LIMITS,
  UPLOAD_LIMITS,
  getTier,
} from "@/convex/lib/plans";
import { userFolder } from "@/convex/lib/validateUpload";

const UPLOAD_AUTH_TTL_SECONDS = 10 * 60;

const kindSchema = z.enum(["image", "video"]);

export async function GET(request: NextRequest) {
  const { userId, has, getToken } = await auth.protect();

  const kind = kindSchema.safeParse(request.nextUrl.searchParams.get("kind"));
  if (!kind.success) {
    return NextResponse.json({ code: "BAD_KIND" }, { status: 400 });
  }

  const publicKey = process.env.IMAGEKIT_PUBLIC_KEY;
  const privateKey = process.env.IMAGEKIT_PRIVATE_KEY;
  if (!publicKey || !privateKey) {
    console.error("IMAGEKIT_PUBLIC_KEY / IMAGEKIT_PRIVATE_KEY are not set");
    return NextResponse.json({ code: "SERVER_MISCONFIGURED" }, { status: 500 });
  }

  const token = await getToken({ template: "convex" });
  if (!token) {
    return NextResponse.json({ code: "UNAUTHENTICATED" }, { status: 401 });
  }

  // The session's `has()` is live, so this is correct right after an upgrade.
  const tier = getTier(has);

  await fetchMutation(api.users.ensureMe, {}, { token });
  const me = await fetchQuery(api.users.me, {}, { token });
  if (!me) {
    return NextResponse.json({ code: "NO_USER" }, { status: 500 });
  }
  if (me.usage.assets >= ASSET_LIMITS[tier]) {
    return NextResponse.json({ code: "QUOTA_ASSETS" }, { status: 403 });
  }

  const limits = UPLOAD_LIMITS[tier];
  const maxBytes =
    kind.data === "image" ? limits.imageBytes : limits.videoBytes;
  const mimes = ALLOWED_MIME[kind.data].map((m) => `"${m}"`).join(",");
  // Early rejection only: the client controls these params, so
  // convex `assets.register` re-validates the stored file authoritatively.
  const checks = `"file.size" <= ${maxBytes} AND "file.mime" IN [${mimes}]`;

  const { token: uploadToken, expire, signature } = getUploadAuthParams({
    privateKey,
    publicKey,
    expire: Math.floor(Date.now() / 1000) + UPLOAD_AUTH_TTL_SECONDS,
  });

  return NextResponse.json(
    {
      token: uploadToken,
      expire,
      signature,
      publicKey,
      folder: userFolder(userId, kind.data).replace(/\/$/, ""),
      maxBytes,
      checks,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
