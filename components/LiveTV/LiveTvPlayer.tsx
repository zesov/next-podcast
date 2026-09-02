'use client';
import React, { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import type Hls from 'hls.js';
import { LiveChannel } from './liveChannels';

// 电视/电台直播播放器（支持 HLS 视频与音频）
// Safari 原生支持 HLS；其他浏览器使用 hls.js（动态导入避免 SSR window 报错）
interface LiveTvPlayerProps {
  channel: LiveChannel | null;
}

export default function LiveTvPlayer({ channel }: LiveTvPlayerProps) {
  const t = useTranslations('live');
  const mediaRef = useRef<HTMLMediaElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isSupported, setIsSupported] = useState(true);

  // 切换频道时重建播放器
  useEffect(() => {
    if (!channel || !mediaRef.current) return;

    const media = mediaRef.current;
    let hls: Hls | null = null;
    let destroyed = false;

    // 1) Safari 原生 HLS
    if (media.canPlayType('application/vnd.apple.mpegurl')) {
      media.src = channel.streamUrl;
      media.play().catch(() => setIsPlaying(false));
    } else {
      // 2) 其他浏览器：hls.js（动态导入，仅客户端）
      import('hls.js').then(({ default: HlsModule }) => {
        if (destroyed || !mediaRef.current) return;
        if (HlsModule.isSupported()) {
          hls = new HlsModule({
            enableWorker: true,
            lowLatencyMode: true,
          });
          hlsRef.current = hls;
          hls.loadSource(channel.streamUrl);
          hls.attachMedia(mediaRef.current);
          hls.on(HlsModule.Events.MANIFEST_PARSED, () => {
            mediaRef.current?.play().catch(() => setIsPlaying(false));
          });
        } else {
          setIsSupported(false);
        }
      });
    }

    setIsPlaying(false);

    return () => {
      destroyed = true;
      if (hls) {
        hls.destroy();
        hlsRef.current = null;
      }
    };
  }, [channel]);

  // 播放 / 暂停
  const togglePlay = () => {
    const media = mediaRef.current;
    if (!media) return;
    if (media.paused) {
      media.play().catch(() => setIsPlaying(false));
    } else {
      media.pause();
    }
  };

  // 静音
  const toggleMute = () => {
    const media = mediaRef.current;
    if (!media) return;
    media.muted = !media.muted;
    setIsMuted(media.muted);
  };

  // 全屏
  const toggleFullscreen = () => {
    const container = mediaRef.current?.closest('.live-player-container') as HTMLElement | null;
    if (!container) return;
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      container.requestFullscreen().catch(() => {});
    }
  };

  if (!channel) {
    return (
      <div className="bg-gray-900 rounded-xl p-8 text-center text-gray-400">
        <p className="text-lg">{t("selectChannel")}</p>
        <p className="mt-2 text-sm text-gray-500">{t("selectHint")}</p>
      </div>
    );
  }

  return (
    <div className="live-player-container bg-gray-900 rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 bg-gray-800">
        <div className="flex items-center space-x-2">
          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
          <span className="text-sm font-semibold text-white">{t("live")}</span>
        </div>
        <span className="text-sm text-gray-300 truncate">{channel.name}</span>
      </div>

      {channel.type === 'video' ? (
        <video
          ref={mediaRef as React.RefObject<HTMLVideoElement>}
          className="w-full aspect-video bg-black"
          controls={false}
          playsInline
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
        />
      ) : (
        <div className="w-full aspect-video bg-black flex items-center justify-center">
          <audio
            ref={mediaRef as React.RefObject<HTMLAudioElement>}
            className="w-2/3"
            controls
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
          />
        </div>
      )}

      {!isSupported && (
        <p className="px-4 py-2 text-sm text-yellow-400 bg-gray-800">
          此浏览器不支持 HLS 播放，请使用最新版 Chrome / Edge / Safari。
        </p>
      )}

      <div className="flex items-center justify-center space-x-4 px-4 py-3 bg-gray-800">
        <button
          onClick={togglePlay}
          className="w-12 h-12 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white flex items-center justify-center"
          aria-label={isPlaying ? t("pause") : t("play")}
        >
          <i className={`fas ${isPlaying ? 'fa-pause' : 'fa-play'}`}></i>
        </button>
        <button
          onClick={toggleMute}
          className="w-10 h-10 rounded-full bg-gray-700 hover:bg-gray-600 text-white flex items-center justify-center"
          aria-label={isMuted ? t("unmute") : t("mute")}
        >
          <i className={`fas ${isMuted ? 'fa-volume-mute' : 'fa-volume-up'}`}></i>
        </button>
        <button
          onClick={toggleFullscreen}
          className="w-10 h-10 rounded-full bg-gray-700 hover:bg-gray-600 text-white flex items-center justify-center"
          aria-label={t("fullscreen")}
        >
          <i className="fas fa-expand"></i>
        </button>
      </div>
    </div>
  );
}
