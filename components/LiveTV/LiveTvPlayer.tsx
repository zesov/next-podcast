'use client';
import React, { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import type Hls from 'hls.js';
import { LiveChannel } from './liveChannels';
import { usePlaybackTracking } from '@/hooks/usePlaybackTracking';

// 直播播放器（HLS 视频/音频）
// Safari 原生支持 HLS；其他浏览器使用 hls.js（动态导入避免 SSR window 报错）。
// 部分频道地址为 bally:// 等自定义协议或短链，浏览器无法直接播放，需解析后才能播。
interface LiveTvPlayerProps {
  channel: LiveChannel | null;
  className?: string;
  overlay?: React.ReactNode; // 叠加在视频上的元数据（Plex hero 风格：频道 logo + 当前节目）
}

// 是否为可由 <video>/hls.js 直接播放的 http(s) 地址
function isHttpUrl(url: string): boolean {
  return /^https?:\/\//i.test(url);
}

export default function LiveTvPlayer({ channel, className = '', overlay }: LiveTvPlayerProps) {
  const t = useTranslations('live');
  const mediaRef = useRef<HTMLMediaElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isSupported, setIsSupported] = useState(true);
  const hasStartedRef = useRef(false);

  const playableUrl = channel && isHttpUrl(channel.streamUrl) ? channel.streamUrl : null;

  const { startTracking, stopTracking, heartbeat } = usePlaybackTracking({
    contentType: 'live',
    contentId: channel?.id || '',
    contentTitle: channel?.name,
    enabled: !!channel && !!playableUrl,
  });

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
    hasStartedRef.current = false;

    return () => {
      destroyed = true;
      if (hls) {
        hls.destroy();
        hlsRef.current = null;
      }
    };
  }, [channel]);

  // 播放 / 暂停
  const togglePlay = async () => {
    const media = mediaRef.current;
    if (!media) return;
    if (media.paused) {
      if (!hasStartedRef.current) {
        hasStartedRef.current = true;
        await startTracking({ title: channel?.name });
      }
      media.play().catch(() => setIsPlaying(false));
    } else {
      media.pause();
    }
  };

  // 心跳定时器
  const heartbeatIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // 监听播放状态变化以管理心跳
  useEffect(() => {
    const media = mediaRef.current;
    if (!media) return;

    const handlePlay = () => {
      if (heartbeatIntervalRef.current) return;
      heartbeatIntervalRef.current = setInterval(() => {
        if (!media.paused && !media.ended) {
          heartbeat(media.currentTime);
        }
      }, 30000);
    };

    const handlePause = () => {
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
        heartbeatIntervalRef.current = null;
      }
    };

    const handleEnded = async () => {
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
        heartbeatIntervalRef.current = null;
      }
      await stopTracking(media.currentTime);
      hasStartedRef.current = false;
    };

    media.addEventListener('play', handlePlay);
    media.addEventListener('pause', handlePause);
    media.addEventListener('ended', handleEnded);

    return () => {
      media.removeEventListener('play', handlePlay);
      media.removeEventListener('pause', handlePause);
      media.removeEventListener('ended', handleEnded);
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
      }
    };
  }, [heartbeat, stopTracking, channel?.id]);

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
    <div className={`live-player-container bg-gray-900 rounded-xl overflow-hidden ${className}`}>
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
        <div className="relative">
          <video
            ref={mediaRef as React.RefObject<HTMLVideoElement>}
            className="w-full aspect-video bg-black"
            controls={false}
            playsInline
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
          />
          {overlay && <div className="absolute inset-0 pointer-events-none">{overlay}</div>}
        </div>
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
          {isPlaying ? <PauseIcon className="w-5 h-5" /> : <PlayIcon className="w-5 h-5" />}
        </button>
        <button
          onClick={toggleMute}
          disabled={!playableUrl}
          className="w-10 h-10 rounded-full bg-gray-700 hover:bg-gray-600 text-white flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed"
          aria-label={isMuted ? t("unmute") : t("mute")}
        >
          {isMuted ? <MuteIcon className="w-5 h-5" /> : <VolumeIcon className="w-5 h-5" />}
        </button>
        <button
          onClick={toggleFullscreen}
          disabled={!playableUrl}
          className="w-10 h-10 rounded-full bg-gray-700 hover:bg-gray-600 text-white flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed"
          aria-label={t("fullscreen")}
        >
          <FullscreenIcon className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}

// 内联 SVG 图标（不依赖外部 FontAwesome CDN，避免加载失败导致按钮只有颜色无图标）
function PlayIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}

function PauseIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
    </svg>
  );
}

function VolumeIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3A4.5 4.5 0 0 0 14 7.97v8.05c1.48-.73 2.5-2.25 2.5-4.02z" />
    </svg>
  );
}

function MuteIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M16.5 12a4.5 4.5 0 0 0-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51A8.9 8.9 0 0 0 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06a8.99 8.99 0 0 0 3.69-1.81L19.73 21 21 19.73 4.27 3zM12 4L9.91 6.09 12 8.18V4z" />
    </svg>
  );
}

function FullscreenIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z" />
    </svg>
  );
}
