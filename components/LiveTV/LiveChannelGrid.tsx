'use client';
import React from 'react';
import { useTranslations } from 'next-intl';
import { LiveChannel } from './liveChannels';

interface LiveChannelGridProps {
  channels: LiveChannel[];
  activeId: string | null;
  onSelect: (channel: LiveChannel) => void;
}

// 频道卡片网格（Plex 风格：缩略图 + 频道名 + 分类/来源）
export default function LiveChannelGrid({ channels, activeId, onSelect }: LiveChannelGridProps) {
  const t = useTranslations('live');
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
      {channels.map((channel) => {
        const active = channel.id === activeId;
        return (
          <button
            key={channel.id}
            onClick={() => onSelect(channel)}
            className={`group bg-white dark:bg-gray-900 rounded-lg overflow-hidden border-2 transition-all text-left ${
              active
                ? 'border-indigo-500 shadow-md'
                : 'border-transparent hover:border-gray-200 hover:shadow'
            }`}
          >
            <div className="bg-gray-100 dark:bg-gray-800 aspect-video flex items-center justify-center relative">
              {channel.logo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={channel.logo}
                  alt={channel.name}
                  loading="lazy"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                    (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                  }}
                  className="w-full h-full object-contain p-2"
                />
              ) : null}
              <span className={`text-4xl font-bold text-gray-400 dark:text-gray-500 group-hover:text-indigo-500 ${channel.logo ? 'hidden' : ''}`}>
                {channel.name.slice(0, 1)}
              </span>
              {active && (
                <span className="absolute top-2 left-2 flex items-center space-x-1 bg-red-600 text-white text-xs px-2 py-0.5 rounded">
                  <span className="w-1.5 h-1.5 rounded-full bg-white dark:bg-gray-900 animate-pulse"></span>
                  {t('live')}
                </span>
              )}
              {channel.number != null && (
                <span className="absolute bottom-2 right-2 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded">
                  CH {channel.number}
                </span>
              )}
            </div>
            <div className="p-2">
              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{channel.name}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                {channel.category}
                {channel.language ? ` · ${channel.language.toUpperCase()}` : ''}
              </p>
            </div>
          </button>
        );
      })}
    </div>
  );
}
