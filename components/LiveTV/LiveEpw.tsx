'use client';
import React, { useMemo, useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { LiveChannel, EpgSlot } from './liveChannels';

// 节目指南（EPG）：显示频道当日节目表（来自 /api/liveChannels/epg），高亮当前时段。
interface LiveEpwProps {
  channel: LiveChannel | null;
  epg: EpgSlot[];
  loading?: boolean;
}

function fmtTime(ms: number): string {
  const d = new Date(ms);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export default function LiveEpw({ channel, epg, loading = false }: LiveEpwProps) {
  const t = useTranslations('live');
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(timer);
  }, []);

  const currentIndex = useMemo(() => {
    if (epg.length === 0) return -1;
    return epg.findIndex((slot) => now >= slot.start && now < slot.end);
  }, [epg, now]);

  if (!channel) {
    return (
      <div className="bg-white dark:bg-gray-900 rounded-xl p-6 shadow">
        <h3 className="font-bold mb-2">{t('epgTitle')}</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">{t('epgEmpty')}</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-900 rounded-xl p-6 shadow">
        <h3 className="font-bold mb-2">
          {t('epgTitle')} · {channel.name}
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">{t('loading')}</p>
      </div>
    );
  }

  if (epg.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-900 rounded-xl p-6 shadow">
        <h3 className="font-bold mb-2">
          {t('epgTitle')} · {channel.name}
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">{t('epgEmpty')}</p>
      </div>
    );
  }

  const activeIndex = currentIndex === -1 ? 0 : currentIndex;

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl p-6 shadow">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold">
          {t('epgTitle')} · {channel.name}
        </h3>
        <span className="text-xs text-gray-400 dark:text-gray-500">
          {epg.length} {t('epgCount')}
        </span>
      </div>
      <ul className="space-y-3">
        {epg.map((slot, index) => {
          const isActive = index === activeIndex;
          return (
            <li
              key={`${slot.start}-${index}`}
              className={`rounded-lg p-3 border ${
                isActive ? 'bg-indigo-50 border-indigo-300' : 'border-gray-100 dark:border-gray-800'
              }`}
            >
              <div className="flex items-start">
                <span className="text-sm font-medium text-indigo-600 dark:text-indigo-400 w-16 shrink-0">
                  {fmtTime(slot.start)}
                  {slot.end > slot.start && (
                    <span className="text-gray-400 dark:text-gray-500">-{fmtTime(slot.end)}</span>
                  )}
                </span>
                <div className="flex-1">
                  <p
                    className={`text-sm font-semibold ${
                      isActive ? 'text-indigo-800' : 'text-gray-900 dark:text-gray-100'
                    }`}
                  >
                    {slot.title || t('noTitle')}
                    {slot.isLive && (
                      <span className="ml-2 text-xs text-red-600 font-medium">
                        {t('live')}
                      </span>
                    )}
                    {isActive && (
                      <span className="ml-2 text-xs text-red-600 font-medium">
                        {t('nowPlaying')}
                      </span>
                    )}
                  </p>
                  {slot.description && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">
                      {slot.description}
                    </p>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}