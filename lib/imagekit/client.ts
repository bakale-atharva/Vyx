/** Public ImageKit settings for client code (no secrets here). */
export const URL_ENDPOINT = (process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT ?? "").replace(/\/+$/, "");

/** The ImageKit ID is the first path segment of a default ik.imagekit.io endpoint. */
export const IMAGEKIT_ID = (() => {
  try {
    return new URL(URL_ENDPOINT).pathname.split("/").filter(Boolean)[0] ?? "";
  } catch {
    return "";
  }
})();
