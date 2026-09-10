'use client';
import React, { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { LiveChannel, EpgSlot } from './liveChannels';
import LiveTvPlayer from './LiveTvPlayer';
import LiveGuide from './LiveGuide';
import ChannelList, { ChannelItem } from './ChannelList';
import M3UInput from './M3UInput';
import DirectStreamInput from './DirectStreamInput';
import { useM3UChannels } from '@/hooks/useM3UChannels';
import { useDirectStream } from '@/hooks/useDirectStream';
import { M3UChannel } from '@/lib/m3uParser';

interface CategoryMeta {
  category: string;
  count: number;
}

interface LiveTvPageProps {
  categories: CategoryMeta[];
  searchTerm?: string;
}

type TabType = 'builtin' | 'm3u' | 'direct';

const PAGE_SIZE = 48;

// Convert any channel type to ChannelItem for the unified list
function toChannelItem(ch: LiveChannel | M3UChannel): ChannelItem {
  return {
    id: ch.id,
    name: ch.name,
    logo: ch.logo,
    groupTitle: 'groupTitle' in ch ? ch.groupTitle : ('category' in ch ? ch.category : undefined),
    streamUrl: ch.streamUrl,
    source: 'source' in ch ? ch.source : undefined,
  };
}

export default function LiveTvPage({ categories, searchTerm }: LiveTvPageProps) {
  const t = useTranslations('live');

  // Tab state
  const [activeTab, setActiveTab] = useState<TabType>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('live:activeTab') as TabType) || 'builtin';
    }
    return 'builtin';
  });

  // Built-in tab state
  const [activeCategory, setActiveCategory] = useState<string | 'all'>('all');
  const [builtinChannels, setBuiltinChannels] = useState<LiveChannel[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [activeEpg, setActiveEpg] = useState<EpgSlot[]>([]);
  const [activeChannel, setActiveChannel] = useState<LiveChannel | M3UChannel | null>(null);
  const [epgMap, setEpgMap] = useState<Map<string, EpgSlot[]>>(new Map());
  const [now, setNow] = useState(() => Date.now());

  const loadMoreRef = useRef<HTMLDivElement>(null);
  const requestSeqRef = useRef(0);
  const epgMapRef = useRef<Map<string, EpgSlot[]>>(new Map());

  // M3U tab hooks
  const m3u = useM3UChannels();

  // Direct tab hook
  const direct = useDirectStream();
  const [directUrl, setDirectUrl] = useState<string | null>(null);

  // Timer for EPG updates
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    epgMapRef.current = epgMap;
  }, [epgMap]);

  // Persist active tab
  useEffect(() => {
    localStorage.setItem('live:activeTab', activeTab);
  }, [activeTab]);

  // === Built-in tab: pagination loading ===
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
        setBuiltinChannels((prev) => (reset ? data.channels : [...prev, ...data.channels]));
        setHasMore(data.hasMore);
      } catch (e) {
        console.error('load channels failed', e);
      } finally {
        if (seq === requestSeqRef.current) setLoading(false);
      }
    },
    [searchTerm]
  );

  // Reset and load first page on category change
  useEffect(() => {
    if (activeTab !== 'builtin') return;
    requestSeqRef.current++;
    setBuiltinChannels([]);
    setHasMore(true);
    setEpgMap(new Map());
    loadPage(0, activeCategory, true);
  }, [activeCategory, loadPage, activeTab]);

  // Infinite scroll for built-in channels
  useEffect(() => {
    if (activeTab !== 'builtin') return;
    const sentinel = loadMoreRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading) {
          loadPage(builtinChannels.length, activeCategory, false);
        }
      },
      { rootMargin: '200px' }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, loading, builtinChannels.length, activeCategory, loadPage, activeTab]);

  // Batch EPG fetch for built-in channels
  useEffect(() => {
    if (activeTab !== 'builtin' || builtinChannels.length === 0) return;
    const ids = builtinChannels
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
  }, [builtinChannels.length, activeCategory, activeTab]);

  // EPG for selected channel
  const effectiveChannel = activeChannel ?? builtinChannels[0] ?? null;
  useEffect(() => {
    if (activeTab !== 'builtin' || !effectiveChannel) return;
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
  }, [effectiveChannel?.id, activeTab]);

  const currentProgram = activeEpg.find((p) => now >= p.start && now < p.end);
  const nextProgram = activeEpg.find((p) => p.start > now);

  // === Channel selection handler ===
  const handleSelect = useCallback((channel: ChannelItem) => {
    // Find the original channel object
    const original = builtinChannels.find((c) => c.id === channel.id)
      || m3u.channels.find((c) => c.id === channel.id);
    if (original) setActiveChannel(original);
  }, [builtinChannels, m3u.channels]);

  // === Favorites (simplified — stored in localStorage for now) ===
  const [favorites, setFavorites] = useState<Set<string>>(() => {
    if (typeof window === 'undefined') return new Set();
    try {
      return new Set(JSON.parse(localStorage.getItem('live:favorites') || '[]'));
    } catch {
      return new Set();
    }
  });

  const toggleFavorite = useCallback((id: string) => {
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      localStorage.setItem('live:favorites', JSON.stringify([...next]));
      return next;
    });
  }, []);

  // === Direct stream play handler ===
  const handleDirectPlay = useCallback((url: string) => {
    setDirectUrl(url);
    direct.playUrl(url);
    // Create a virtual channel for the player
    setActiveChannel({
      id: 'direct-' + url,
      name: url.split('/').pop() || 'Stream',
      streamUrl: url,
    } as LiveChannel);
  }, [direct]);

  // === Determine channels to show based on active tab ===
  const displayChannels: ChannelItem[] = useMemo(() => {
    if (activeTab === 'm3u') {
      return m3u.channels.map(toChannelItem);
    }
    return builtinChannels.map(toChannelItem);
  }, [activeTab, builtinChannels, m3u.channels]);

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      {/* Player area */}
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
        {/* Tab navigation */}
        <div className="flex gap-1 mb-6 bg-gray-900 rounded-lg p-1 w-fit">
          {(['builtin', 'm3u', 'direct'] as TabType[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === tab
                  ? 'bg-indigo-600 text-white'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800'
              }`}
            >
              {t(`tabs.${tab}`)}
            </button>
          ))}
        </div>

        {/* Tab-specific input areas */}
        {activeTab === 'm3u' && (
          <div className="mb-6">
            <M3UInput
              onLoad={m3u.loadFromUrl}
              onFileLoad={m3u.loadFromFile}
              loading={m3u.loading}
              error={m3u.error}
              sources={m3u.sources}
              onRemoveSource={m3u.removeSource}
            />
          </div>
        )}

        {activeTab === 'direct' && (
          <div className="mb-6">
            <DirectStreamInput
              onPlay={handleDirectPlay}
              recentUrls={direct.recentUrls}
            />
          </div>
        )}

        {/* Layout: left channel list + right EPG/player details */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left: Channel list (or EPG guide for built-in) */}
          <div className="lg:col-span-2">
            {activeTab === 'builtin' ? (
              <>
                {/* Category filter */}
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

                {/* EPG Guide */}
                <LiveGuide
                  channels={builtinChannels}
                  epgMap={epgMap}
                  activeId={effectiveChannel?.id ?? null}
                  onSelect={(ch) => handleSelect(toChannelItem(ch))}
                />
                <div ref={loadMoreRef} className="py-4 text-center text-sm text-gray-500">
                  {loading ? t('loading') : hasMore ? t('scrollMore') : t('allLoaded')}
                </div>
              </>
            ) : (
              /* M3U or Direct: unified channel list */
              <ChannelList
                channels={displayChannels}
                activeId={effectiveChannel?.id ?? null}
                onSelect={handleSelect}
                favorites={favorites}
                onToggleFavorite={toggleFavorite}
                loading={activeTab === 'm3u' ? m3u.loading : false}
              />
            )}
          </div>

          {/* Right: EPG details (built-in only) or channel info */}
          <div className="lg:col-span-1 space-y-4">
            {activeTab === 'builtin' && currentProgram && (
              <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
                <h4 className="text-sm font-medium text-gray-400 mb-2">{t('nowPlaying')}</h4>
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
              </div>
            )}

            {activeTab === 'builtin' && nextProgram && (
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

            {/* M3U tab: show channel info */}
            {activeTab === 'm3u' && effectiveChannel && (
              <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
                <h4 className="text-sm font-medium text-gray-400 mb-2">{t('channelInfo')}</h4>
                <div className="space-y-2">
                  <p className="font-semibold text-white">{effectiveChannel.name}</p>
                  {'groupTitle' in effectiveChannel && effectiveChannel.groupTitle && (
                    <p className="text-sm text-gray-400">{effectiveChannel.groupTitle}</p>
                  )}
                  <p className="text-xs text-gray-500 truncate">{effectiveChannel.streamUrl}</p>
                </div>
              </div>
            )}

            {/* Direct tab: stream info */}
            {activeTab === 'direct' && directUrl && (
              <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
                <h4 className="text-sm font-medium text-gray-400 mb-2">{t('streamUrl')}</h4>
                <p className="text-xs text-gray-300 break-all">{directUrl}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
