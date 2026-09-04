'use client';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { LiveChannel, EpgSlot } from './liveChannels';
import LiveTvPlayer from './LiveTvPlayer';
import LiveGuide from './LiveGuide';

interface CategoryMeta {
  category: string;
  count: number;
}

interface LiveTvPageProps {
  categories: CategoryMeta[];
  searchTerm?: string;
}

const PAGE_SIZE = 48;

export default function LiveTvPage({ categories, searchTerm }: LiveTvPageProps) {
  const t = useTranslations('live');

  const [activeCategory, setActiveCategory] = useState<string | 'all'>('all');
  const [channels, setChannels] = useState<LiveChannel[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [activeEpg, setActiveEpg] = useState<EpgSlot[]>([]);
  const [activeChannel, setActiveChannel] = useState<LiveChannel | null>(null);
  const [epgMap, setEpgMap] = useState<Map<string, EpgSlot[]>>(new Map());
  const [now, setNow] = useState(() => Date.now());

  const loadMoreRef = useRef<HTMLDivElement>(null);
  const requestSeqRef = useRef(0);
  const epgMapRef = useRef<Map<string, EpgSlot[]>>(new Map());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    epgMapRef.current = epgMap;
  }, [epgMap]);

  // 分页加载
  const loadPage = useCallback(
    async (offset: number, category: string | 'all', reset: boolean) => {
      const seq = ++requestSeqRef.current;
      setLoading(true);
      try {
        const params = new URLSearchParams({ offset: String(offset), limit: String(PAGE_SIZE) });
        if (category !== 'all') params.set('category', category);
        if (searchTerm) params.set('search', searchTerm);
        const res = await fetch(`/api/liveChannels?${params.toString()}`);
        if (!res.ok) throw new Error('fetch failed');
        const data = (await res.json()) as {
          channels: LiveChannel[];
          total: number;
          hasMore: boolean;
        };
        if (seq !== requestSeqRef.current) return;
        setChannels((prev) => (reset ? data.channels : [...prev, ...data.channels]));
        setHasMore(data.hasMore);
      } catch (e) {
        console.error('load channels failed', e);
      } finally {
        if (seq === requestSeqRef.current) setLoading(false);
      }
    },
    [searchTerm]
  );

  // 首屏/分类切换：重置分页，加载第一页
  useEffect(() => {
    requestSeqRef.current++;
    setChannels([]);
    setHasMore(true);
    setEpgMap(new Map());
    loadPage(0, activeCategory, true);
  }, [activeCategory, loadPage]);

  // 选中频道
  const handleSelect = useCallback((channel: LiveChannel) => {
    setActiveChannel(channel);
  }, []);

  // 频道列表无限滚动
  useEffect(() => {
    const sentinel = loadMoreRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading) {
          loadPage(channels.length, activeCategory, false);
        }
      },
      { rootMargin: '200px' }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, loading, channels.length, activeCategory, loadPage]);

  // 已加载频道批量拉取 EPG（用于网格各行节目条）
  useEffect(() => {
    if (channels.length === 0) return;
    const ids = channels
      .map((c) => c.id)
      .filter((id) => !epgMapRef.current.has(id));
    if (ids.length === 0) return;
    fetch(`/api/liveChannels/programs?ids=${ids.join(',')}`)
      .then((res) => (res.ok ? res.json() : { channels: {} }))
      .then((data: { channels: Record<string, EpgSlot[]> }) => {
        setEpgMap((prev) => {
          const next = new Map(prev);
          for (const [key, value] of Object.entries(data.channels)) {
            next.set(key, value);
          }
          return next;
        });
      })
      .catch((e) => console.error('load programs failed', e));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channels.length, activeCategory]);

  // 选中频道变化时按需加载完整 EPG（右侧详情）
  const effectiveChannel = activeChannel ?? channels[0] ?? null;
  useEffect(() => {
    if (!effectiveChannel) return;
    const mapEpEpg = epgMapRef.current.get(effectiveChannel.id) || [];
    if (mapEpEpg.length > 0) {
      setActiveEpg(mapEpEpg);
      return;
    }
    let stale = false;
    fetch(`/api/liveChannels/epg?channelId=${effectiveChannel.id}`)
      .then((res) => (res.ok ? res.json() : []))
      .then((epg: EpgSlot[]) => {
        if (!stale) setActiveEpg(epg);
      })
      .catch(() => {
        if (!stale) setActiveEpg([]);
      });
    return () => {
      stale = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveChannel?.id]);

  const currentProgram = activeEpg.find((p) => now >= p.start && now < p.end);
  const nextProgram = activeEpg.find((p) => p.start > now);

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      {/* Plex hero：视频播放器 + 元数据浮层 */}
      <div className="w-full bg-black">
        <LiveTvPlayer
          channel={effectiveChannel}
          className="w-full max-w-6xl mx-auto"
          overlay={
            effectiveChannel && (
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-4 sm:p-6">
                <div className="flex items-end gap-3">
                  {effectiveChannel.logo && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={effectiveChannel.logo}
                      alt={effectiveChannel.name}
                      className="w-12 h-12 object-contain rounded bg-black/40 p-1"
                    />
                  )}
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="flex items-center gap-1 bg-red-600 text-white text-[10px] px-1.5 py-0.5 rounded font-bold">
                        <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                        {t('live')}
                      </span>
                      <span className="text-xs text-gray-200">
                        {effectiveChannel.name}
                        {effectiveChannel.number != null && ` · CH ${effectiveChannel.number}`}
                      </span>
                    </div>
                    {currentProgram ? (
                      <>
                        <h2 className="text-lg sm:text-2xl font-bold text-white leading-tight truncate">
                          {currentProgram.title}
                        </h2>
                        <p className="text-xs text-gray-300">
                          {`${new Date(currentProgram.start).toLocaleTimeString('zh-CN', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })} – ${new Date(currentProgram.end).toLocaleTimeString('zh-CN', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}`}
                        </p>
                      </>
                    ) : (
                      <h2 className="text-lg sm:text-2xl font-bold text-white">
                        {effectiveChannel.name}
                      </h2>
                    )}
                  </div>
                </div>
              </div>
            )
          }
        />
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* 分类标签栏 */}
        <div className="flex flex-wrap gap-2 mb-4">
          <button
            onClick={() => setActiveCategory('all')}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${
              activeCategory === 'all'
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white'
            }`}
          >
            {t('all')}
          </button>
          {categories.slice(0, 12).map(({ category }) => (
            <button
              key={category}
              onClick={() => setActiveCategory(category)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${
                activeCategory === category
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white'
              }`}
            >
              {t(`categories.${category}`) !== `categories.${category}`
                ? t(`categories.${category}`)
                : category}
            </button>
          ))}
        </div>

        {/* 双栏：左侧 Plex 节目单网格，右侧当前/下个节目详情 */}
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <LiveGuide
              channels={channels}
              epgMap={epgMap}
              activeId={effectiveChannel?.id ?? null}
              onSelect={handleSelect}
            />
            <div ref={loadMoreRef} className="py-4 text-center text-sm text-gray-500">
              {loading ? t('loading') : hasMore ? t('scrollMore') : t('allLoaded')}
            </div>
          </div>

          <div className="lg:col-span-1 space-y-4">
            <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
              <h4 className="text-sm font-medium text-gray-400 mb-2">{t('nowPlaying')}</h4>
              {currentProgram ? (
                <div className="space-y-2">
                  <div className="flex items-start gap-3">
                    <div className="text-indigo-400 font-mono text-sm w-16 shrink-0">
                      {new Date(currentProgram.start).toLocaleTimeString('zh-CN', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-white">{currentProgram.title}</p>
                      {currentProgram.description && (
                        <p className="text-sm text-gray-400">{currentProgram.description}</p>
                      )}
                    </div>
                  </div>
                  <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-indigo-500 transition-all duration-1000"
                      style={{
                        width: `${Math.min(
                          100,
                          Math.max(
                            0,
                            ((now - currentProgram.start) /
                              (currentProgram.end - currentProgram.start)) *
                              100
                          )
                        )}%`,
                      }}
                    />
                  </div>
                </div>
              ) : (
                <p className="text-gray-500">{t('epgEmpty')}</p>
              )}
            </div>

            {nextProgram && (
              <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
                <h4 className="text-sm font-medium text-gray-400 mb-2">{t('nextUp')}</h4>
                <div className="flex items-start gap-3">
                  <div className="text-indigo-400 font-mono text-sm w-16 shrink-0">
                    {new Date(nextProgram.start).toLocaleTimeString('zh-CN', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-white">{nextProgram.title}</p>
                    {nextProgram.description && (
                      <p className="text-sm text-gray-400">{nextProgram.description}</p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
