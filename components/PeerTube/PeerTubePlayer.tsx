"use client";
import { useEffect, useRef, useState } from "react";
import type { ComponentType } from "react";
import type { PeerTubeVideo } from "@/app/types";
import { usePlaybackTracking } from "@/hooks/usePlaybackTracking";

interface PlayerElementProps {
  controls?: boolean;
  src?: string;
  poster?: string;
  className?: string;
}

// 仅在客户端挂载后才加载 peertube-video-element，避免 SSR/水合期间
// 触发 "Channel.build() called without a valid window argument" 错误
// 见 node_modules/peertube-video-element/dist/peertube-video-element.js:165
function PeerTubeVideoElementWrapper({
  controls,
  src,
  poster,
  className,
}: PlayerElementProps) {
  const [mounted, setMounted] = useState(false);
  const [Component, setComponent] = useState<ComponentType<PlayerElementProps> | null>(null);

  useEffect(() => {
    setMounted(true);
    import("peertube-video-element/react").then((mod) => {
      setComponent(() => mod.default as ComponentType<PlayerElementProps>);
    });
  }, []);

  if (!mounted) {
    return (
      <div className="aspect-video rounded-xl bg-gray-900 flex items-center justify-center text-white">
        正在加载 PeerTube 播放器…
      </div>
    );
  }

  if (!Component) {
    return (
      <div className="aspect-video rounded-xl bg-gray-900 flex items-center justify-center text-white">
        正在加载 PeerTube 播放器…
      </div>
    );
  }

  return <Component controls={controls} src={src} poster={poster} className={className} />;
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
      <PeerTubeVideoElementWrapper
        controls
        src={video.embedUrl}
        poster={video.previewUrl || video.thumbnailUrl}
        className="w-full aspect-video"
      />
    </div>
  );
}
