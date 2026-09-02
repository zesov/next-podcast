'use client';
import React, { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { LiveChannel } from './liveChannels';

// 简易节目指南（EPG）：显示频道的节目表，高亮当前时段
// 注：RTHK 无公开 EPG API，此处使用频道数据内嵌的示例节目表
interface LiveEpwProps {
  channel: LiveChannel | null;
}

function nowMinutes(): number {
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes();
}

export default function LiveEpw({ channel }: LiveEpwProps) {
  const t = useTranslations('live');
  const currentMinutes = useMemo(() => nowMinutes(), []);

  if (!channel || channel.epg.length === 0) {
    return (
      <div className="bg-white rounded-xl p-6 shadow">
        <h3 className="font-bold mb-2">{t('epgTitle')}</h3>
        <p className="text-sm text-gray-500">{t('epgEmpty')}</p>
      </div>
    );
  }

  const currentIndex = channel.epg.findIndex((slot) => {
    const [h, m] = slot.time.split(':').map(Number);
    return h * 60 + m <= currentMinutes;
  });

  const activeIndex = currentIndex === -1 ? 0 : currentIndex;

  return (
    <div className="bg-white rounded-xl p-6 shadow">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold">{t("epgTitle")} · {channel.name}</h3>
        <span className="text-xs text-gray-400">{t("epgSample")}</span>
      </div>
      <ul className="space-y-3">
        {channel.epg.map((slot, index) => {
          const isActive = index === activeIndex;
          return (
            <li
              key={index}
              className={`rounded-lg p-3 border ${
                isActive ? 'bg-indigo-50 border-indigo-300' : 'border-gray-100'
              }`}
            >
              <div className="flex items-start">
                <span className="text-sm font-medium text-indigo-600 w-12 shrink-0">
                  {slot.time}
                </span>
                <div className="flex-1">
                  <p className={`text-sm font-semibold ${isActive ? 'text-indigo-800' : 'text-gray-900'}`}>
                    {slot.title}
                    {isActive && (
                      <span className="ml-2 text-xs text-red-600 font-medium">{t("nowPlaying")}</span>
                    )}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">{slot.description}</p>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
