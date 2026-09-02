'use client';
import React, { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import type Hls from 'hls.js';
import { LiveChannel } from './liveChannels';

// 直播播放器（HLS 视频/音频）
// Safari 原生支持 HLS；其他浏览器使用 hls.js（动态导入避免 SSR window 报错）。
// 部分频道地址为 bally:// 等自定义协议或短链，浏览器无法直接播放，需解析后才能播。
interface LiveTvPlayerProps {
  channel: LiveChannel | null;
}

// 是否为可由 <video>/hls.js 直接播放的 http(s) 地址
function isHttpUrl(url: string): boolean {
  return /^https?:\/\//i.test(url);
}

export default function LiveTvPlayer({ channel }: LiveTvPlayerProps) {
  const t = useTranslations('live');
  const mediaRef = useRef<HTMLMediaElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isSupported, setIsSupported] = useState(true);

  const playableUrl = channel && isHttpUrl(channel.streamUrl) ? channel.streamUrl : null;

  // 切换频道时重建播放器
  useEffect(() => {
    if (!channel || !mediaRef.current) return;

    // 非 http(s) 地址无法直接播放，提示
    if (!isHttpUrl(channel.streamUrl)) {
      setIsSupported(false);
      return () => {};
    }

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
    setIsSupported(true);

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
        <span className="text-sm text-gray-300 truncate">
          {channel.name}
          {channel.number != null && <span className="ml-2 text-gray-500">CH {channel.number}</span>}
        </span>
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

      {!isSupported && channel && (
        <p className="px-4 py-2 text-sm text-yellow-400 bg-gray-800">
          {playableUrl
            ? t('unsupported')
            : `${t('nonHttpStream')} (${channel.streamUrl.slice(0, 30)}…)`}
        </p>
      )}

      <div className="flex items-center justify-center space-x-4 px-4 py-3 bg-gray-800">
        <button
          onClick={togglePlay}
          disabled={!playableUrl}
          className="w-12 h-12 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed"
          aria-label={isPlaying ? t("pause") : t("play")}
        >
          <i className={`fas ${isPlaying ? 'fa-pause' : 'fa-play'}`}></i>
        </button>
        <button
          onClick={toggleMute}
          disabled={!playableUrl}
          className="w-10 h-10 rounded-full bg-gray-700 hover:bg-gray-600 text-white flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed"
          aria-label={isMuted ? t("unmute") : t("mute")}
        >
          <i className={`fas ${isMuted ? 'fa-volume-mute' : 'fa-volume-up'}`}></i>
        </button>
        <button
          onClick={toggleFullscreen}
          disabled={!playableUrl}
          className="w-10 h-10 rounded-full bg-gray-700 hover:bg-gray-600 text-white flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed"
          aria-label={t("fullscreen")}
        >
          <i className="fas fa-expand"></i>
        </button>
      </div>
    </div>
  );
}
