'use client';
import React, { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { CATEGORIES, LiveChannel, CategoryKey } from './liveChannels';
import LiveTvPlayer from './LiveTvPlayer';
import LiveChannelGrid from './LiveChannelGrid';
import LiveEpw from './LiveEpw';

interface LiveTvPageProps {
  channels: LiveChannel[];
}

export default function LiveTvPage({ channels }: LiveTvPageProps) {
  const t = useTranslations('live');
  const [activeCategory, setActiveCategory] = useState<CategoryKey | 'all'>(CATEGORIES[0]);
  const [activeChannel, setActiveChannel] = useState<LiveChannel | null>(
    channels[0] ?? null
  );

  const filteredChannels = useMemo(
    () =>
      activeCategory === 'all'
        ? channels
        : channels.filter((c) => c.category === activeCategory),
    [activeCategory, channels]
  );

  const tabs: (CategoryKey | 'all')[] = ['all', ...CATEGORIES];

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-gray-900">{t('title')}</h1>
          <span className="text-xs text-gray-500">{t('subtitle')}</span>
        </div>
        <div className="flex flex-wrap gap-2 mb-6">
          {tabs.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                activeCategory === cat
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
              }`}
            >
              {cat === 'all' ? t('all') : t(`categories.${cat}`)}
            </button>
          ))}
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <LiveTvPlayer channel={activeChannel} />
            <LiveEpw channel={activeChannel} />
          </div>

          <div>
            <h2 className="text-lg font-bold text-gray-900 mb-3">
              {t('categoryName', {
                name:
                  activeCategory === 'all'
                    ? t('all')
                    : t(`categories.${activeCategory}`),
              })}
              <span className="ml-2 text-sm font-normal text-gray-500">
                {t('channelCount', { count: filteredChannels.length })}
              </span>
            </h2>
            <LiveChannelGrid
              channels={filteredChannels}
              activeId={activeChannel?.id ?? null}
              onSelect={setActiveChannel}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
