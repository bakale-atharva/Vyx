import "server-only";

import ImageKit from "@imagekit/nodejs";
import type { Transformation } from "@imagekit/nodejs/resources/shared";

let client: ImageKit | undefined;

export function getImageKit() {
  if (!client) {
    const privateKey = process.env.IMAGEKIT_PRIVATE_KEY;
    if (!privateKey) throw new Error("IMAGEKIT_PRIVATE_KEY is not set");
    client = new ImageKit({ privateKey });
  }
  return client;
}

export function getUrlEndpoint() {
  const urlEndpoint = process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT;
  if (!urlEndpoint) {
    throw new Error("NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT is not set");
  }
  return urlEndpoint;
}

/** Build a signed, expiring delivery URL. Callers must authorize first. */
export function signUrl({
  src,
  transformation,
  queryParameters,
  expiresIn,
}: {
  src: string;
  transformation?: Transformation[];
  queryParameters?: Record<string, string>;
  expiresIn: number;
}) {
  return getImageKit().helper.buildSrc({
    urlEndpoint: getUrlEndpoint(),
    src,
    transformation,
    queryParameters,
    signed: true,
    expiresIn,
  });
}
