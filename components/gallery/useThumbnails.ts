"use client";

import { useCallback, useEffect, useReducer, useRef } from "react";
import { getThumbnailUrls, type ThumbnailSize } from "@/actions/gallery";

// Signed URLs last an hour on the server; stop reusing them a little earlier.
const TTL_MS = 50 * 60 * 1000;
const BATCH = 48;

const cache = new Map<string, { url: string; expires: number }>();
const inflight = new Set<string>();
const keyOf = (size: ThumbnailSize, id: string) => `${size}:${id}`;

function fresh(key: string) {
  const entry = cache.get(key);
  return entry && entry.expires > Date.now() ? entry.url : undefined;
}

/**
 * Signed thumbnail URLs for a set of assets, fetched in batches and cached
 * across the page. `invalidate` drops one URL (e.g. after an image error) so
 * it is signed again.
 */
export function useThumbnails(ids: readonly string[], size: ThumbnailSize) {
  const [version, bump] = useReducer((n: number) => n + 1, 0);
  const mounted = useRef(true);
  const idKey = ids.join(",");

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    const wanted = idKey ? idKey.split(",") : [];
    const missing = wanted.filter((id) => {
      const key = keyOf(size, id);
      return !fresh(key) && !inflight.has(key);
    });
    if (missing.length === 0) return;
    for (const id of missing) inflight.add(keyOf(size, id));

    void (async () => {
      for (let i = 0; i < missing.length; i += BATCH) {
        const chunk = missing.slice(i, i + BATCH);
        try {
          const urls = await getThumbnailUrls(chunk, size);
          const expires = Date.now() + TTL_MS;
          for (const [id, url] of Object.entries(urls)) {
            cache.set(keyOf(size, id), { url, expires });
          }
        } catch (err) {
          console.error("Thumbnail signing failed:", err);
        } finally {
          for (const id of chunk) inflight.delete(keyOf(size, id));
        }
        if (mounted.current) bump();
      }
    })();
  }, [idKey, size, version]);

  const get = useCallback(
    (id: string) => fresh(keyOf(size, id)),
    // Re-read the cache whenever a batch lands.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [size, version],
  );

  const invalidate = useCallback(
    (id: string) => {
      cache.delete(keyOf(size, id));
      bump();
    },
    [size],
  );

  return { get, invalidate };
}
