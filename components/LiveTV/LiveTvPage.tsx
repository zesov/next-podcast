'use client';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { LiveChannel, EpgSlot } from './liveChannels';
import LiveTvPlayer from './LiveTvPlayer';
import LiveChannelGrid from './LiveChannelGrid';
import LiveEpw from './LiveEpw';

interface CategoryMeta {
  category: string;
  count: number;
}

interface LiveTvPageProps {
  categories: CategoryMeta[];
}

const PAGE_SIZE = 48;
const EPG_CACHE_TTL = 10 * 60 * 1000;

export default function LiveTvPage({ categories }: LiveTvPageProps) {
  const t = useTranslations('live');

  const [activeCategory, setActiveCategory] = useState<string | 'all'>('all');
  const [channels, setChannels] = useState<LiveChannel[]>([]);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [epgLoading, setEpgLoading] = useState(false);
  const [activeChannel, setActiveChannel] = useState<LiveChannel | null>(null);
  const [activeEpg, setActiveEpg] = useState<EpgSlot[]>([]);

  const epgCacheRef = useRef<Map<string, { epg: EpgSlot[]; ts: number }>>(new Map());
  const scrollRef = useRef<HTMLDivElement>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const requestSeqRef = useRef(0);

  // 分页加载
  const loadPage = useCallback(
    async (offset: number, category: string | 'all', reset: boolean) => {
      const seq = ++requestSeqRef.current;
      setLoading(true);
      try {
        const params = new URLSearchParams({ offset: String(offset), limit: String(PAGE_SIZE) });
        if (category !== 'all') params.set('category', category);
        const res = await fetch(`/api/liveChannels?${params.toString()}`);
        if (!res.ok) throw new Error('fetch failed');
        const data = (await res.json()) as {
          channels: LiveChannel[];
          total: number;
          hasMore: boolean;
        };
        if (seq !== requestSeqRef.current) return;
        setChannels((prev) => (reset ? data.channels : [...prev, ...data.channels]));
        setTotal(data.total);
        setHasMore(data.hasMore);
      } catch (e) {
        console.error('load channels failed', e);
      } finally {
        if (seq === requestSeqRef.current) setLoading(false);
      }
    },
    []
  );

  // 首屏/分类切换后，保证始终有一个选中频道：无选中时自动落到首个，并加载其 EPG。
  const effectiveChannel = activeChannel ?? channels[0] ?? null;

  // 分类切换或首屏：重置分页，加载第一页
  useEffect(() => {
    requestSeqRef.current++; // 使旧请求失效
    setChannels([]);
    setHasMore(true);
    loadPage(0, activeCategory, true);
  }, [activeCategory, loadPage]);

  // 选中频道：更新状态即可，EPG 由下方 useEffect（监听 effectiveChannel）统一加载
  const handleSelect = useCallback((channel: LiveChannel) => {
    setActiveChannel(channel);
  }, []);

  // 无限滚动：IntersectionObserver 监听底部哨兵加载下一页
  useEffect(() => {
    const sentinel = loadMoreRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading) {
          loadPage(channels.length, activeCategory, false);
        }
      },
      { root: scrollRef.current, rootMargin: '400px' }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, loading, channels.length, activeCategory, loadPage]);

  // 选中频道变化（含自动落到首个）时按需加载其 EPG
  useEffect(() => {
    if (!effectiveChannel) return;
    const cache = epgCacheRef.current.get(effectiveChannel.id);
    if (cache && Date.now() - cache.ts < EPG_CACHE_TTL) {
      setActiveEpg(cache.epg);
      return;
    }
    setEpgLoading(true);
    let stale = false;
    fetch(`/api/liveChannels/epg?channelId=${effectiveChannel.id}`)
      .then((res) => (res.ok ? res.json() : []))
      .then((epg: EpgSlot[]) => {
        if (stale) return;
        epgCacheRef.current.set(effectiveChannel.id, { epg, ts: Date.now() });
        setActiveEpg(epg);
      })
      .catch(() => {
        if (!stale) setActiveEpg([]);
      })
      .finally(() => {
        if (!stale) setEpgLoading(false);
      });
    return () => {
      stale = true;
    };
  }, [effectiveChannel]);

  const totalLabel = `${total} ${t('channelCountLabel')}`;

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-gray-900">{t('title')}</h1>
          <span className="text-xs text-gray-500">{totalLabel}</span>
        </div>
        <div className="flex flex-wrap gap-2 mb-6">
          <button
            key="all"
            onClick={() => setActiveCategory('all')}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              activeCategory === 'all'
                ? 'bg-indigo-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
            }`}
          >
            {t('all')}
          </button>
          {categories.map(({ category }) => (
            <button
              key={category}
              onClick={() => setActiveCategory(category)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                activeCategory === category
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
              }`}
            >
              {t(`categories.${category}`) !== `categories.${category}`
                ? t(`categories.${category}`)
                : category}
            </button>
          ))}
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <LiveTvPlayer channel={effectiveChannel} />
            <LiveEpw channel={effectiveChannel} epg={activeEpg} loading={epgLoading} />
          </div>

          <div>
            <h2 className="text-lg font-bold text-gray-900 mb-3">
              {activeCategory === 'all'
                ? t('all')
                : (t(`categories.${activeCategory}`) !== `categories.${activeCategory}`
                  ? t(`categories.${activeCategory}`)
                  : activeCategory)}
              <span className="ml-2 text-sm font-normal text-gray-500">
                {t('channelCount', { count: channels.length })}
              </span>
            </h2>
            <LiveChannelGrid
              channels={channels}
              activeId={effectiveChannel?.id ?? null}
              onSelect={handleSelect}
            />
            <div ref={loadMoreRef} className="py-4 text-center text-sm text-gray-400">
              {loading ? t('loading') : hasMore ? t('scrollMore') : t('allLoaded')}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}