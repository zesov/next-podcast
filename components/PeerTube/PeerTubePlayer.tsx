"use client";
import dynamic from "next/dynamic";
import type { ComponentType } from "react";
import type { PeerTubeVideo } from "@/app/types";

interface PlayerElementProps {
  controls?: boolean;
  src?: string;
  poster?: string;
  className?: string;
}

const PeerTubeVideoElement = dynamic(
  () =>
    import("peertube-video-element/react").then(
      (mod) => mod.default as ComponentType<PlayerElementProps>,
    ),
  { ssr: false, loading: () => <PlayerLoading /> },
);

function PlayerLoading() {
  return (
    <div className="aspect-video rounded-xl bg-gray-900 flex items-center justify-center text-white">
      正在加载 PeerTube 播放器…
    </div>
  );
}

interface Props {
  video: PeerTubeVideo;
}

export default function PeerTubePlayer({ video }: Props) {
  return (
    <div className="rounded-xl overflow-hidden bg-black shadow-lg">
      <PeerTubeVideoElement
        controls
        src={video.embedUrl}
        poster={video.previewUrl || video.thumbnailUrl}
        className="w-full aspect-video"
      />
    </div>
  );
}
