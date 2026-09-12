'use client';

import React from 'react';
import { useTranslations } from 'next-intl';

// Unified channel type for the channel list component
// Compatible with LiveChannel, FreeTVChannel, and M3UChannel
export interface ChannelItem {
  id: string;
  name: string;
  logo?: string;
  groupTitle?: string;  // category for M3U/FreeTV, maps to category for LiveChannel
  streamUrl: string;
  source?: string;
}

interface ChannelListProps {
  channels: ChannelItem[];
  activeId: string | null;
  onSelect: (channel: ChannelItem) => void;
  favorites: Set<string>;
  onToggleFavorite: (id: string) => void;
  loading?: boolean;
}

export default function ChannelList({
  channels,
  activeId,
  onSelect,
  favorites,
  onToggleFavorite,
  loading,
}: ChannelListProps) {
  const t = useTranslations('live');

  if (channels.length === 0 && !loading) {
    return (
      <div className="p-8 text-center text-gray-500 dark:text-gray-400 text-sm">
        {t('selectChannel')}
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {channels.map((ch) => {
        const active = ch.id === activeId;
        const isFavorite = favorites.has(ch.id);
        return (
          <div
            key={ch.id}
            onClick={() => onSelect(ch)}
            className={`flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-colors ${
              active
                ? 'bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-600/40'
                : 'hover:bg-gray-100 dark:hover:bg-gray-800/60 border border-transparent'
            }`}
          >
            {/* Logo */}
            {ch.logo ? (
              <img
                src={ch.logo}
                alt={ch.name}
                loading="lazy"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                  (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                }}
                className="w-8 h-6 object-contain shrink-0"
              />
            ) : null}
            <div className={`w-8 h-6 shrink-0 rounded bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-xs font-bold text-gray-500 dark:text-gray-600 ${ch.logo ? 'hidden' : ''}`}>
              {ch.name.slice(0, 1)}
            </div>

            {/* Name + group */}
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{ch.name}</p>
              {ch.groupTitle && (
                <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate">{ch.groupTitle}</p>
              )}
            </div>

            {/* Live indicator */}
            {active && (
              <span className="shrink-0 flex items-center gap-1 bg-red-600 text-white text-[10px] px-1.5 py-0.5 rounded">
                <span className="w-1 h-1 rounded-full bg-white dark:bg-gray-900 animate-pulse" />
                {t('live')}
              </span>
            )}

            {/* Favorite button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleFavorite(ch.id);
              }}
              className="shrink-0 p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
            >
              <svg
                className={`w-4 h-4 ${isFavorite ? 'text-yellow-400 fill-current' : 'text-gray-500 dark:text-gray-400'}`}
                viewBox="0 0 24 24"
                fill={isFavorite ? 'currentColor' : 'none'}
                stroke="currentColor"
                strokeWidth={2}
              >
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
              </svg>
            </button>
          </div>
        );
      })}

      {loading && (
        <div className="p-4 text-center text-sm text-gray-500 dark:text-gray-400">{t('loading')}</div>
      )}
    </div>
  );
}
