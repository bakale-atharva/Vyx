"use node";

import ImageKit from "@imagekit/nodejs";
import { v } from "convex/values";
import { internalAction } from "./_generated/server";

function getClient() {
  const privateKey = process.env.IMAGEKIT_PRIVATE_KEY;
  if (!privateKey) throw new Error("IMAGEKIT_PRIVATE_KEY is not set");
  return new ImageKit({ privateKey });
}

function isNotFound(err: unknown) {
  return (err as { status?: number }).status === 404;
}

/** Trusted file metadata straight from ImageKit, or null if the file doesn't exist. */
export const getFileDetails = internalAction({
  args: { fileId: v.string() },
  handler: async (_ctx, { fileId }) => {
    try {
      const f = await getClient().files.get(fileId);
      return {
        fileId: f.fileId ?? fileId,
        filePath: f.filePath ?? "",
        name: f.name ?? "",
        mime: f.mime ?? "",
        size: f.size ?? 0,
        width: f.width,
        height: f.height,
        duration: f.duration,
      };
    } catch (err) {
      if (isNotFound(err)) return null;
      throw err;
    }
  },
});

export const deleteFile = internalAction({
  args: { fileId: v.string() },
  handler: async (_ctx, { fileId }) => {
    try {
      await getClient().files.delete(fileId);
    } catch (err) {
      if (!isNotFound(err)) throw err; // already gone: fine
    }
    return null;
  },
});

export const deleteFolder = internalAction({
  args: { folderPath: v.string() },
  handler: async (_ctx, { folderPath }) => {
    try {
      await getClient().folders.delete({ folderPath });
    } catch (err) {
      if (!isNotFound(err)) throw err; // never uploaded: nothing to purge
    }
    return null;
  },
});

/** Copy a (signed) transformed URL into the media library. Used by Phase B5. */
export const uploadFromUrl = internalAction({
  args: { url: v.string(), fileName: v.string(), folder: v.string() },
  handler: async (_ctx, { url, fileName, folder }) => {
    const f = await getClient().files.upload({
      file: url,
      fileName,
      folder,
      useUniqueFileName: true,
    });
    return { fileId: f.fileId ?? "" };
  },
});

export const signUrl = internalAction({
  args: {
    src: v.string(),
    transformation: v.optional(v.array(v.any())),
    queryParameters: v.optional(v.record(v.string(), v.string())),
    expiresIn: v.number(),
  },
  handler: async (_ctx, { src, transformation, queryParameters, expiresIn }) => {
    const urlEndpoint = process.env.IMAGEKIT_URL_ENDPOINT;
    if (!urlEndpoint) throw new Error("IMAGEKIT_URL_ENDPOINT is not set");
    return getClient().helper.buildSrc({
      urlEndpoint,
      src,
      transformation,
      queryParameters,
      signed: true,
      expiresIn,
    });
  },
});
