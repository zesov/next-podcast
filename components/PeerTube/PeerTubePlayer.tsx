"use client";
import { useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import type { ComponentType } from "react";
import type { PeerTubeVideo } from "@/app/types";
import { usePlaybackTracking } from "@/hooks/usePlaybackTracking";

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
  const videoRef = useRef<HTMLDivElement>(null);
  const hasStartedRef = useRef(false);

  const { startTracking, stopTracking, heartbeat } = usePlaybackTracking({
    contentType: "peertube",
    contentId: video.uuid,
    contentTitle: video.name,
    enabled: true,
  });

  // PeerTube video element exposes events on the underlying video element
  useEffect(() => {
    const container = videoRef.current;
    if (!container) return;

    // Wait for the custom element to be ready
    const checkElement = () => {
      const videoEl = container.querySelector("peertube-video")?.shadowRoot?.querySelector("video") ||
                      container.querySelector("video");
      return videoEl;
    };

    const videoEl = checkElement();
    if (!videoEl) {
      // Retry after a short delay
      const timer = setTimeout(() => {
        const el = checkElement();
        if (el) attachListeners(el);
      }, 500);
      return () => clearTimeout(timer);
    }

    attachListeners(videoEl);
    return () => detachListeners(videoEl);
  }, [video.uuid]);

  const attachListeners = (videoEl: HTMLVideoElement) => {
    const handlePlay = async () => {
      if (!hasStartedRef.current) {
        hasStartedRef.current = true;
        await startTracking({ title: video.name });
      }
      // Start heartbeat
      heartbeatInterval.current = setInterval(() => {
        if (!videoEl.paused && !videoEl.ended) {
          heartbeat(videoEl.currentTime);
        }
      }, 30000);
    };

    const handlePause = () => {
      if (heartbeatInterval.current) {
        clearInterval(heartbeatInterval.current);
        heartbeatInterval.current = null;
      }
    };

    const handleEnded = async () => {
      if (heartbeatInterval.current) {
        clearInterval(heartbeatInterval.current);
        heartbeatInterval.current = null;
      }
      await stopTracking(videoEl.currentTime);
      hasStartedRef.current = false;
    };

    videoEl.addEventListener("play", handlePlay);
    videoEl.addEventListener("pause", handlePause);
    videoEl.addEventListener("ended", handleEnded);

    return () => {
      videoEl.removeEventListener("play", handlePlay);
      videoEl.removeEventListener("pause", handlePause);
      videoEl.removeEventListener("ended", handleEnded);
      if (heartbeatInterval.current) {
        clearInterval(heartbeatInterval.current);
      }
    };
  };

  const detachListeners = (videoEl: HTMLVideoElement) => {
    // Cleanup handled by returned function in attachListeners
  };

  const heartbeatInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  return (
    <div ref={videoRef} className="rounded-xl overflow-hidden bg-black shadow-lg">
      <PeerTubeVideoElement
        controls
        src={video.embedUrl}
        poster={video.previewUrl || video.thumbnailUrl}
        className="w-full aspect-video"
      />
    </div>
  );
}
