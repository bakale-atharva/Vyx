"use client";

import { IKVideoPlayer, type IKVideoPlayerRef } from "@imagekit/video-player/react";
import type { SourceOptions, Player, IKPlayerOptions } from "@imagekit/video-player/react";
import "@imagekit/video-player/styles.css";
import { useEffect, useRef } from "react";

export interface VideoStageProps {
  imagekitId: string;
  source: SourceOptions;
  abs?: IKPlayerOptions["abs"];
  signerFn: (url: string) => Promise<string>;
  /** Receives the Video.js player once it exists. */
  onPlayer?: (player: Player | null) => void;
}

/**
 * The ImageKit video player (Video.js). Every URL it requests (video, poster,
 * subtitles, chapters, HLS) goes through `signerFn`, so the server checks
 * ownership and the plan for each one. Loaded client-only by the editor.
 */
export default function VideoStage({ imagekitId, source, abs, signerFn, onPlayer }: VideoStageProps) {
  const ref = useRef<IKVideoPlayerRef>(null);

  useEffect(() => {
    let frame = 0;
    let cancelled = false;
    // The player mounts asynchronously; poll briefly for the instance.
    const find = () => {
      if (cancelled) return;
      const player = ref.current?.getPlayer() ?? null;
      if (player) onPlayer?.(player);
      else frame = requestAnimationFrame(find);
    };
    find();
    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
      onPlayer?.(null);
    };
    // The editor remounts this component when the source changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="absolute inset-0 [&_.video-js]:size-full [&_.video-js]:bg-transparent">
      <IKVideoPlayer
        ref={ref}
        ikOptions={{
          imagekitId,
          signerFn,
          seekThumbnails: false,
          maxTries: 30,
          delayInMS: 3000,
          ...(abs ? { abs } : {}),
        }}
        videoJsOptions={{ controls: true, fill: true, preload: "auto" }}
        source={source}
      />
    </div>
  );
}
