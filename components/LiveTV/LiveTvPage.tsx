'use client';
import React, { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { EpgSlot } from './liveChannels';
import { FreeTVChannel } from '@/lib/freeTvParser';
import LiveTvPlayer from './LiveTvPlayer';
import ChannelList, { ChannelItem } from './ChannelList';
import M3UInput from './M3UInput';
import DirectStreamInput from './DirectStreamInput';
import { useM3UChannels } from '@/hooks/useM3UChannels';
import { useDirectStream } from '@/hooks/useDirectStream';
import { M3UChannel } from '@/lib/m3uParser';

type TabType = 'builtin' | 'm3u' | 'direct';

function toChannelItem(ch: FreeTVChannel | M3UChannel): ChannelItem {
  return {
    id: ch.id,
    name: ch.name,
    logo: ch.logo,
    groupTitle: 'groupTitle' in ch ? ch.groupTitle : undefined,
    streamUrl: ch.streamUrl,
  };
}

export default function LiveTvPage() {
  const t = useTranslations('live');

  const [activeTab, setActiveTab] = useState<TabType>('builtin');
  // hydration 后从 localStorage 恢复上次选中的 tab
  useEffect(() => {
    const saved = localStorage.getItem('live:activeTab') as TabType | null;
    if (saved && saved !== activeTab) setActiveTab(saved);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [builtinChannels, setBuiltinChannels] = useState<FreeTVChannel[]>([]);
  const [builtinCategories, setBuiltinCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [activeEpg, setActiveEpg] = useState<EpgSlot[]>([]);
  const [activeChannel, setActiveChannel] = useState<FreeTVChannel | M3UChannel | null>(null);
  const [favorites, setFavorites] = useState<Set<string>>(() => {
    if (typeof window === 'undefined') return new Set();
    try {
      return new Set(JSON.parse(localStorage.getItem('live:favorites') || '[]'));
    } catch {
      return new Set();
    }
  });
  const [directUrl, setDirectUrl] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());

  const requestSeqRef = useRef(0);
  const channelsFetchedAtRef = useRef(0);
  const CHANNELS_CACHE_TTL = 30 * 60 * 1000;

  const epgCacheRef = useRef<Map<string, { epg: EpgSlot[]; fetchedAt: number }>>(new Map());
  const EPG_CACHE_TTL = 15 * 60 * 1000;

  const m3u = useM3UChannels();
  const direct = useDirectStream();

  const loadAllChannels = useCallback(async () => {
    if (Date.now() - channelsFetchedAtRef.current < CHANNELS_CACHE_TTL) return;
    const seq = ++requestSeqRef.current;
    setLoading(true);
    try {
      let offset = 0;
      const all: FreeTVChannel[] = [];
      while (true) {
        const res = await fetch(`/api/free-tv/channels?offset=${offset}&limit=9999`);
        if (!res.ok) break;
        const data = (await res.json()) as { channels: FreeTVChannel[]; hasMore: boolean };
        if (seq !== requestSeqRef.current) return;
        all.push(...data.channels);
        if (!data.hasMore) break;
        offset += data.channels.length;
      }
      if (seq !== requestSeqRef.current) return;
      const cats = [...new Set(all.map((c) => c.groupTitle).filter(Boolean))] as string[];
      setBuiltinCategories(cats.sort());
      setBuiltinChannels(all);
      channelsFetchedAtRef.current = Date.now();
    } catch (e) {
      console.error('load all channels failed', e);
    } finally {
      if (seq === requestSeqRef.current) setLoading(false);
    }
  }, []);

  // 分钟级 EPG 刷新 + Tab 持久化
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    localStorage.setItem('live:activeTab', activeTab);
  }, [activeTab]);

  // 搜索防抖
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchInput.trim()), 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // 收藏切换
  const toggleFavorite = useCallback((id: string) => {
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      localStorage.setItem('live:favorites', JSON.stringify([...next]));
      return next;
    });
  }, []);

  // 频道数据：启动时一次性加载，All 分类按过期时间决定是否刷新
  useEffect(() => {
    if (activeTab !== 'builtin') return;
    loadAllChannels();
  }, [activeTab, loadAllChannels]);

  // 选中频道的 EPG（仅 Built-in）— 带客户端缓存，过期或节目全部过时则重新拉取
  const effectiveChannel = activeChannel ?? builtinChannels[0] ?? null;
  useEffect(() => {
    if (activeTab !== 'builtin' || !effectiveChannel) return;
    const channelId = effectiveChannel.id;
    const cached = epgCacheRef.current.get(channelId);
    const nowMs = Date.now();

    if (cached) {
      const withinTtl = nowMs - cached.fetchedAt < EPG_CACHE_TTL;
      const hasFutureProgram = cached.epg.some((p) => p.end > nowMs);
      if (withinTtl && hasFutureProgram) {
        setActiveEpg(cached.epg);
        return;
      }
    }

    let stale = false;
    setActiveEpg([]);
    fetch(`/api/free-tv/epg?channelId=${channelId}`)
      .then((res) => (res.ok ? res.json() : []))
      .then((epg: EpgSlot[]) => {
        if (stale) return;
        epgCacheRef.current.set(channelId, { epg, fetchedAt: nowMs });
        setActiveEpg(epg);
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

  // === 频道选择 ===
  const handleSelect = useCallback(
    (channel: ChannelItem) => {
      const original =
        builtinChannels.find((c) => c.id === channel.id) ||
        m3u.channels.find((c) => c.id === channel.id);
      if (original) setActiveChannel(original);
    },
    [builtinChannels, m3u.channels]
  );

  // === Direct 播放 ===
  const handleDirectPlay = useCallback(
    (url: string) => {
      setDirectUrl(url);
      direct.playUrl(url);
      setActiveChannel({
        id: 'direct-' + url,
        name: url.split('/').pop() || 'Stream',
        streamUrl: url,
      });
    },
    [direct]
  );

  // === 列表数据（按 Tab）===
  const listItems: ChannelItem[] = useMemo(() => {
    const q = searchInput.trim().toLowerCase();
    if (activeTab === 'm3u') {
      const filtered = q
        ? m3u.channels.filter(
            (c) => c.name.toLowerCase().includes(q) || (c.groupTitle || '').toLowerCase().includes(q)
          )
        : m3u.channels;
      return filtered.map(toChannelItem);
    }
    let filtered = builtinChannels.map(toChannelItem);
    if (activeCategory === 'favorite') {
      filtered = filtered.filter((ch) => favorites.has(ch.id));
    } else if (activeCategory !== 'all') {
      filtered = filtered.filter((ch) => ch.groupTitle === activeCategory);
    }
    if (q) {
      filtered = filtered.filter(
        (ch) => ch.name.toLowerCase().includes(q) || (ch.groupTitle || '').toLowerCase().includes(q)
      );
    }
    return filtered;
  }, [activeTab, builtinChannels, m3u.channels, searchInput, activeCategory, favorites]);

  const listLoading = activeTab === 'builtin' ? loading : m3u.loading;
  const listEmptyText =
    activeTab === 'm3u' && m3u.error ? t('m3u.noChannels') : t('selectChannel');

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
        {/* 标题（居中，m3u8player 风格） */}
        <header className="text-center">
          <h1 className="text-2xl sm:text-3xl font-bold">{t('title')}</h1>
          <p className="mt-1 text-sm text-gray-400">{t('subtitle')}</p>
        </header>

        {/* Tab 切换（居中） */}
        <nav className="flex justify-center">
          <div className="inline-flex bg-gray-900 rounded-lg p-1">
            {(['builtin', 'm3u', 'direct'] as TabType[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-5 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === tab
                    ? 'bg-indigo-600 text-white'
                    : 'text-gray-400 hover:text-white hover:bg-gray-800'
                }`}
              >
                {t(`tabs.${tab}`)}
              </button>
            ))}
          </div>
        </nav>

        {/* 左右分栏：左列表 + 右播放器（md 起并排——笔记本常见 ~1000px CSS 宽也要 PC 布局） */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* ===== 左侧面板 ===== */}
          <aside className="md:col-span-1 bg-gray-900 rounded-xl border border-gray-800 shadow-sm flex flex-col overflow-hidden">
            {/* M3U 输入区（仅 M3U tab） */}
            {activeTab === 'm3u' && (
              <div className="p-4 border-b border-gray-800">
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

            {/* Direct 输入区（仅 Direct tab） */}
            {activeTab === 'direct' && (
              <div className="p-4 border-b border-gray-800">
                <DirectStreamInput onPlay={handleDirectPlay} recentUrls={direct.recentUrls} />
              </div>
            )}

            {/* 搜索 + 分类（Built-in / M3U tab 显示） */}
            {activeTab !== 'direct' && (
              <div className="p-3 border-b border-gray-800 space-y-2">
                <input
                  type="search"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder={t('searchPlaceholder')}
                  className="w-full px-3 py-1.5 rounded-md bg-gray-800 border border-gray-700 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-indigo-500"
                />
                {activeTab === 'builtin' && (
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      onClick={() => setActiveCategory('all')}
                      className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                        activeCategory === 'all'
                          ? 'bg-indigo-600 text-white'
                          : 'bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700'
                      }`}
                    >
                      {t('all')}
                    </button>
                    <button
                      onClick={() => setActiveCategory('favorite')}
                      className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                        activeCategory === 'favorite'
                          ? 'bg-indigo-600 text-white'
                          : 'bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700'
                      }`}
                    >
                      ★ {t('favorite')}
                    </button>
                    {builtinCategories.slice(0, 10).map((category) => (
                      <button
                        key={category}
                        onClick={() => setActiveCategory(category)}
                        className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors whitespace-nowrap ${
                          activeCategory === category
                            ? 'bg-indigo-600 text-white'
                            : 'bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700'
                        }`}
                      >
                        {category}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* 频道列表（滚动） */}
            <div className="flex-1 min-h-[300px] max-h-[480px] overflow-y-auto">
              <ChannelList
                channels={listItems}
                activeId={effectiveChannel?.id ?? null}
                onSelect={handleSelect}
                favorites={favorites}
                onToggleFavorite={toggleFavorite}
                loading={listLoading}
              />
            </div>
          </aside>

          {/* ===== 右侧面板 ===== */}
          <main className="md:col-span-2 space-y-4">
            {/* 播放器 */}
            <div className="bg-gray-900 rounded-xl border border-gray-800 shadow-sm overflow-hidden">
              <LiveTvPlayer channel={effectiveChannel} className="w-full" />
            </div>

            {/* 节目信息 */}
            <div className="space-y-3">
              {activeTab === 'builtin' && currentProgram && (
                <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
                  <h4 className="text-xs font-semibold text-gray-400 mb-2">{t('nowPlaying')}</h4>
                  <p className="font-semibold text-white">{currentProgram.title}</p>
                  {currentProgram.description && (
                    <p className="mt-1 text-sm text-gray-400 line-clamp-2">
                      {currentProgram.description}
                    </p>
                  )}
                  <div className="mt-3 h-1.5 bg-gray-800 rounded-full overflow-hidden">
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
              )}

              {activeTab === 'builtin' && nextProgram && (
                <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
                  <h4 className="text-xs font-semibold text-gray-400 mb-2">{t('nextUp')}</h4>
                  <div className="flex items-start gap-3">
                    <div className="text-indigo-400 font-mono text-sm w-14 shrink-0">
                      {new Date(nextProgram.start).toLocaleTimeString('zh-CN', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </div>
                    <p className="font-semibold text-white">{nextProgram.title}</p>
                  </div>
                </div>
              )}

              {activeTab === 'm3u' && effectiveChannel && (
                <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
                  <h4 className="text-xs font-semibold text-gray-400 mb-1">
                    {t('channelInfo')}
                  </h4>
                  <p className="font-semibold text-white">{effectiveChannel.name}</p>
                  {'groupTitle' in effectiveChannel && effectiveChannel.groupTitle && (
                    <p className="mt-0.5 text-sm text-gray-400">{effectiveChannel.groupTitle}</p>
                  )}
                  <p className="mt-2 text-xs text-gray-500 truncate">{effectiveChannel.streamUrl}</p>
                </div>
              )}

              {activeTab === 'direct' && directUrl && (
                <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
                  <h4 className="text-xs font-semibold text-gray-400 mb-1">{t('streamUrl')}</h4>
                  <p className="text-sm text-gray-300 break-all">{directUrl}</p>
                </div>
              )}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}