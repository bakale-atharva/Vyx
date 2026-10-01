/** 83 -> "1:23", 3725 -> "1:02:05". */
export function formatDuration(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = String(s % 60).padStart(2, "0");
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${sec}` : `${m}:${sec}`;
}

/** "4000 × 3000", or null when the size is unknown. */
export function formatDimensions(
  width?: number | null,
  height?: number | null,
): string | null {
  return width && height ? `${width} × ${height}` : null;
}
