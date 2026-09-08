'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { FreeTVChannel } from '@/lib/freeTvParser';
import { EpgSlot } from '@/components/LiveTV/liveChannels';

interface FreeTVGuideProps {
  channels: FreeTVChannel[];
  epgMap: Map<string, EpgSlot[]>;
  activeId: string | null;
  onSelect: (channel: FreeTVChannel) => void;
  favoriteIds: Set<string>;
  onToggleFavorite: (channelId: string) => void;
}

const WINDOW_HOURS = 6;

function roundToHour(ms: number): number {
  const d = new Date(ms);
  d.setMinutes(0, 0, 0);
  return d.getTime();
}

function fmtTime(ms: number): string {
  return new Date(ms).toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

const HOUR_MS = 60 * 60 * 1000;

function AiringsStrip({
  epg,
  guideStart,
  windowMs,
}: {
  epg: EpgSlot[];
  guideStart: number;
  windowMs: number;
}) {
  const visible = epg.filter((p) => p.end > guideStart && p.start < guideStart + windowMs);
  if (visible.length === 0) {
    return (
      <div className="relative h-16 w-full">
        <span className="absolute inset-0 flex items-center px-3 text-xs text-gray-500">—</span>
      </div>
    );
  }
  return (
    <div className="relative h-16 w-full">
      {visible.map((p, i) => {
        const left = ((p.start - guideStart) / windowMs) * 100;
        const width = ((p.end - p.start) / windowMs) * 100;
        return (
          <div
            key={`${p.start}-${i}`}
            className={`absolute top-0 bottom-0 border-r border-gray-700/60 px-2 py-1 overflow-hidden ${
              p.isLive
                ? 'bg-indigo-600/30 text-white'
                : 'bg-gray-800 text-gray-200 hover:bg-gray-700'
            }`}
            style={{ left: `${left}%`, width: `${width}%` }}
            title={p.description || p.title}
          >
            {p.isLive && (
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-500 mr-1 align-middle animate-pulse" />
            )}
            <span className="text-xs font-medium leading-tight block truncate">
              {p.title || '\u00a0'}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export default function FreeTVGuide({ channels, epgMap, activeId, onSelect, favoriteIds, onToggleFavorite }: FreeTVGuideProps) {
  const t = useTranslations('live');
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(timer);
  }, []);

  const guideStart = useMemo(() => roundToHour(now), [now]);
  const guideEnd = guideStart + WINDOW_HOURS * HOUR_MS;
  const windowMs = guideEnd - guideStart;

  const intervals = Array.from({ length: WINDOW_HOURS }, (_, i) => guideStart + i * HOUR_MS);

  const nowPct = Math.max(0, Math.min(100, ((now - guideStart) / windowMs) * 100));

  return (
    <div className="bg-gray-900 rounded-xl overflow-hidden border border-gray-800">
      <div className="flex border-b border-gray-800 bg-gray-800/60">
        <div className="w-36 sm:w-44 shrink-0 px-3 py-2 flex items-center text-xs font-semibold text-gray-400">
          {t('epgTitle')}
        </div>
        <div className="relative flex-1 h-full overflow-x-auto">
          <div className="relative h-9 min-w-full" style={{ width: '100%' }}>
            {intervals.map((tick) => (
              <div
                key={tick}
                className="absolute top-0 bottom-0 border-l border-gray-700/60 px-2 text-[11px] text-gray-500 flex items-center whitespace-nowrap"
                style={{ left: `${((tick - guideStart) / windowMs) * 100}%` }}
              >
                {fmtTime(tick)}
              </div>
            ))}
            <div
              className="absolute top-0 bottom-0 w-px bg-red-500/80"
              style={{ left: `${nowPct}%` }}
              suppressHydrationWarning
            />
          </div>
        </div>
      </div>

      <div className="max-h-[520px] overflow-y-auto">
        {channels.map((channel) => {
          const epg = epgMap.get(channel.id) || [];
          const active = channel.id === activeId;
          const isFavorite = favoriteIds.has(channel.id);
          return (
            <div
              key={channel.id}
              onClick={() => onSelect(channel)}
              className={`flex border-b border-gray-800/70 last:border-b-0 cursor-pointer transition-colors ${
                active ? 'bg-indigo-900/20' : 'hover:bg-gray-800/40'
              }`}
            >
              <div className="w-36 sm:w-44 shrink-0 px-3 py-2 flex items-center gap-2 min-w-0">
                {channel.logo ? (
                  <img
                    src={channel.logo}
                    alt={channel.name}
                    loading="lazy"
                    className="w-9 h-6 object-contain shrink-0"
                  />
                ) : (
                  <div className="w-9 h-6 shrink-0 rounded bg-gray-700 flex items-center justify-center text-xs font-bold text-gray-300">
                    {channel.name.slice(0, 1)}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-sm font-medium text-white truncate">{channel.name}</p>
                  <p className="text-[11px] text-gray-500 truncate">
                    {channel.groupTitle}
                  </p>
                </div>
                {active && (
                  <span className="ml-auto shrink-0 flex items-center gap-1 bg-red-600 text-white text-[10px] px-1.5 py-0.5 rounded">
                    <span className="w-1 h-1 rounded-full bg-white animate-pulse" />
                    {t('live')}
                  </span>
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleFavorite(channel.id);
                  }}
                  className="ml-auto shrink-0 p-1.5 rounded hover:bg-gray-700 transition-colors"
                  aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                >
                  <svg
                    className={`w-5 h-5 ${isFavorite ? 'text-yellow-400 fill-current' : 'text-gray-500'}`}
                    viewBox="0 0 24 24"
                    fill={isFavorite ? 'currentColor' : 'none'}
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                  </svg>
                </button>
              </div>

              <div className="flex-1 relative">
                <AiringsStrip epg={epg} guideStart={guideStart} windowMs={windowMs} />
                <div
                  className="absolute top-0 bottom-0 w-px bg-red-500/60 pointer-events-none"
                  style={{ left: `${nowPct}%` }}
                  suppressHydrationWarning
                />
              </div>
            </div>
          );
        })}

        {channels.length === 0 && (
          <div className="px-3 py-8 text-center text-sm text-gray-500">
            {t('selectChannel')}
          </div>
        )}
      </div>
    </div>
  );
}