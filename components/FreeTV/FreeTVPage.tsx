'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { FreeTVChannel } from '@/lib/freeTvParser';
import { EpgSlot } from '@/components/LiveTV/liveChannels';
import LiveTvPlayer from '@/components/LiveTV/LiveTvPlayer';
import { FreeTVGuide } from '@/components/FreeTV';
import { useFreeTVCache } from '@/hooks/useFreeTVCache';

const PAGE_SIZE = 10;

export default function FreeTVPage() {
  const t = useTranslations('live');

  const [activeCategory, setActiveCategory] = useState<string | 'all'>('all');
  const [channels, setChannels] = useState<FreeTVChannel[]>([]);
  const [allCategories, setAllCategories] = useState<string[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [categoriesExpanded, setCategoriesExpanded] = useState(false);
  const [activeEpg, setActiveEpg] = useState<EpgSlot[]>([]);
  const [activeChannel, setActiveChannel] = useState<FreeTVChannel | null>(null);
  const [epgMap, setEpgMap] = useState<Map<string, EpgSlot[]>>(new Map());
  const [now, setNow] = useState(() => Date.now());
  const [cacheStatus, setCacheStatus] = useState<'fresh' | 'stale' | 'loading'>('loading');
  const [categoriesLoaded, setCategoriesLoaded] = useState(false);
  const [priorityLoaded, setPriorityLoaded] = useState(false);

  const loadMoreRef = useRef<HTMLDivElement>(null);
  const requestSeqRef = useRef(0);
  const epgMapRef = useRef<Map<string, EpgSlot[]>>(new Map());
  const loadedCountRef = useRef(0);

  const { getChannels, setChannels: cacheSetChannels, getEpg, setEpg, isChannelsStale, isEpgStale, getFavorites, setFavorite, getCategories, setCategories } = useFreeTVCache();

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    epgMapRef.current = epgMap;
  }, [epgMap]);

  useEffect(() => {
    getCategories().then(cats => {
      if (cats && cats.length > 0) {
        setAllCategories(cats);
      }
      setCategoriesLoaded(true);
    }).catch(() => setCategoriesLoaded(true));
  }, [getCategories]);

  useEffect(() => {
    let cancelled = false;
    const loadPriority = async () => {
      try {
        const [cachedChannels, favoriteIds] = await Promise.all([
          getChannels(),
          getFavorites()
        ]);
        
        if (cancelled) return;
        
        if (cachedChannels && cachedChannels.length > 0) {
          const locale = typeof navigator !== 'undefined' ? navigator.language : 'en-US';
          const localCountry = locale.split('-')[1]?.toUpperCase() || 'US';
          
          const countryToCategory: Record<string, string> = {
            'HK': 'Hong Kong', 'TW': 'Taiwan', 'CN': 'China', 'JP': 'Japan', 'KR': 'Korea',
            'SG': 'Singapore', 'MY': 'Malaysia', 'TH': 'Thailand', 'VN': 'Vietnam', 'ID': 'Indonesia',
            'PH': 'Philippines', 'US': 'USA', 'GB': 'UK', 'CA': 'Canada', 'AU': 'Australia',
            'NZ': 'New Zealand', 'DE': 'Germany', 'FR': 'France', 'IT': 'Italy', 'ES': 'Spain',
            'PT': 'Portugal', 'NL': 'Netherlands', 'BE': 'Belgium', 'CH': 'Switzerland', 'AT': 'Austria',
            'SE': 'Sweden', 'NO': 'Norway', 'DK': 'Denmark', 'FI': 'Finland', 'PL': 'Poland',
            'CZ': 'Czech Republic', 'HU': 'Hungary', 'RO': 'Romania', 'BG': 'Bulgaria', 'HR': 'Croatia',
            'RS': 'Serbia', 'SK': 'Slovakia', 'SI': 'Slovenia', 'LT': 'Lithuania', 'LV': 'Latvia',
            'EE': 'Estonia', 'IE': 'Ireland', 'GR': 'Greece', 'TR': 'Turkey', 'RU': 'Russia',
            'UA': 'Ukraine', 'BY': 'Belarus', 'MD': 'Moldova', 'GE': 'Georgia', 'AM': 'Armenia',
            'AZ': 'Azerbaijan', 'KZ': 'Kazakhstan', 'UZ': 'Uzbekistan', 'KG': 'Kyrgyzstan', 'TJ': 'Tajikistan',
            'TM': 'Turkmenistan', 'MN': 'Mongolia', 'IN': 'India', 'PK': 'Pakistan', 'BD': 'Bangladesh',
            'LK': 'Sri Lanka', 'NP': 'Nepal', 'MM': 'Myanmar', 'KH': 'Cambodia', 'LA': 'Laos',
            'BN': 'Brunei', 'MO': 'Macau', 'IL': 'Israel', 'SA': 'Saudi Arabia', 'AE': 'UAE',
            'QA': 'Qatar', 'KW': 'Kuwait', 'BH': 'Bahrain', 'OM': 'Oman', 'JO': 'Jordan',
            'LB': 'Lebanon', 'SY': 'Syria', 'IQ': 'Iraq', 'IR': 'Iran', 'AF': 'Afghanistan',
            'ZA': 'South Africa', 'NG': 'Nigeria', 'KE': 'Kenya', 'EG': 'Egypt', 'MA': 'Morocco',
            'DZ': 'Algeria', 'TN': 'Tunisia', 'LY': 'Libya', 'ET': 'Ethiopia', 'GH': 'Ghana',
            'UG': 'Uganda', 'TZ': 'Tanzania', 'ZW': 'Zimbabwe', 'BW': 'Botswana', 'MU': 'Mauritius',
            'SC': 'Seychelles', 'BR': 'Brazil', 'AR': 'Argentina', 'CL': 'Chile', 'CO': 'Colombia',
            'PE': 'Peru', 'VE': 'Venezuela', 'EC': 'Ecuador', 'BO': 'Bolivia', 'PY': 'Paraguay',
            'UY': 'Uruguay', 'CR': 'Costa Rica', 'PA': 'Panama', 'GT': 'Guatemala', 'SV': 'El Salvador',
            'HN': 'Honduras', 'NI': 'Nicaragua', 'DO': 'Dominican Republic', 'CU': 'Cuba', 'JM': 'Jamaica',
            'TT': 'Trinidad and Tobago', 'PR': 'Puerto Rico', 'MX': 'Mexico',
          };
          
          const localCategory = countryToCategory[localCountry] || '';
          
          const favoriteChannels = cachedChannels.filter(ch => favoriteIds.has(ch.id));
          const localChannels = cachedChannels.filter(ch => 
            ch.groupTitle === localCategory && !favoriteIds.has(ch.id)
          );
          const otherChannels = cachedChannels.filter(ch => 
            !favoriteIds.has(ch.id) && ch.groupTitle !== localCategory
          );
          
          const priorityChannels = [...favoriteChannels, ...localChannels, ...otherChannels];
          
          setChannels(priorityChannels.slice(0, PAGE_SIZE));
          setHasMore(priorityChannels.length > PAGE_SIZE);
          loadedCountRef.current = Math.min(priorityChannels.length, PAGE_SIZE);
          setFavoriteChannelIds(favoriteIds);
          setPriorityLoaded(true);
          setCacheStatus('fresh');
        } else {
          loadChannels(0, 'all', true);
          setPriorityLoaded(true);
        }
      } catch (e) {
        console.error('load priority channels failed', e);
        setPriorityLoaded(true);
      }
    };
    
    loadPriority();
    return () => { cancelled = true; };
  }, [getChannels, getFavorites]);

  const loadChannels = useCallback(async (offset: number, category: string | 'all', reset: boolean) => {
    const seq = ++requestSeqRef.current;
    setLoading(true);

    try {
      if (offset === 0 && reset) {
        const cached = await getChannels();
        const stale = await isChannelsStale();
        if (cached && !stale) {
          const filtered = category === 'all' ? cached : cached.filter(c => c.groupTitle === category);
          setChannels(filtered.slice(0, PAGE_SIZE));
          setHasMore(filtered.length > PAGE_SIZE);
          setAllCategories([...new Set(cached.map(c => c.groupTitle).filter((t): t is string => Boolean(t)))].sort());
          setCacheStatus('fresh');
          setLoading(false);
          return;
        }
        setCacheStatus(stale ? 'stale' : 'loading');
      }

      // On first load (reset=true), fetch ALL channels to cache them, then paginate locally
      const fetchLimit = reset && offset === 0 ? 5000 : PAGE_SIZE;
      const params = new URLSearchParams({ offset: '0', limit: String(fetchLimit) });
      if (category !== 'all') params.set('category', category);
      const res = await fetch(`/api/free-tv/channels?${params.toString()}`);
      if (!res.ok) throw new Error('fetch failed');
      const data = (await res.json()) as { channels: FreeTVChannel[]; total: number; hasMore: boolean };

      if (seq !== requestSeqRef.current) return;

      if (reset) {
        // Update categories from all channels
        const allCats = [...new Set(data.channels.map((c: FreeTVChannel) => c.groupTitle).filter((t): t is string => Boolean(t)))].sort();
        setAllCategories(allCats as string[]);
        await setCategories(allCats);

        // Cache ALL channels from first fetch
        if (fetchLimit > PAGE_SIZE) {
          await cacheSetChannels(data.channels);
        }

        // Display only first PAGE_SIZE
        const displayChannels = data.channels.slice(offset, offset + PAGE_SIZE);
        setChannels(displayChannels);
        setHasMore(data.channels.length > offset + PAGE_SIZE);
      } else {
        // For infinite scroll, we already have all channels cached, just slice more
        const cached = await getChannels();
        if (cached) {
          const filtered = category === 'all' ? cached : cached.filter(c => c.groupTitle === category);
          const displayChannels = filtered.slice(offset, offset + PAGE_SIZE);
          setChannels(prev => [...prev, ...displayChannels]);
          loadedCountRef.current = offset + displayChannels.length;
          setHasMore(filtered.length > offset + PAGE_SIZE);
        }
      }
      setCacheStatus('fresh');
    } catch (e) {
      console.error('load channels failed', e);
      const cached = await getChannels();
      if (cached && offset === 0) {
        const filtered = category === 'all' ? cached : cached.filter(c => c.groupTitle === category);
        setChannels(filtered.slice(0, PAGE_SIZE));
        setHasMore(filtered.length > PAGE_SIZE);
        setCacheStatus('stale');
      }
    } finally {
      if (seq === requestSeqRef.current) setLoading(false);
    }
  }, [getChannels, cacheSetChannels, isChannelsStale]);

  useEffect(() => {
    if (activeCategory === 'all') return;
    
    const filterFromCache = async () => {
      const cached = await getChannels();
      if (cached && cached.length > 0) {
        const filtered = cached.filter(c => c.groupTitle === activeCategory);
        setChannels(filtered.slice(0, PAGE_SIZE));
        setHasMore(filtered.length > PAGE_SIZE);
      }
    };
    filterFromCache();
  }, [activeCategory, getChannels]);

  const handleSelect = useCallback((channel: FreeTVChannel) => {
    setActiveChannel(channel);
  }, []);

  useEffect(() => {
    const sentinel = loadMoreRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading) {
          loadChannels(loadedCountRef.current, activeCategory, false);
        }
      },
      { rootMargin: '200px' }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, loading, activeCategory, loadChannels]);

  useEffect(() => {
    if (channels.length === 0) return;
    const ids = channels
      .map((c) => c.id)
      .filter((id) => !epgMapRef.current.has(id));
    if (ids.length === 0) return;

    const batchSize = 10;
    for (let i = 0; i < ids.length; i += batchSize) {
      const batch = ids.slice(i, i + batchSize);
      Promise.all(
        batch.map(id =>
          getEpg(id).then(cached => {
            if (cached) return { id, programs: cached };
            return fetch(`/api/free-tv/epg?channelId=${id}`)
              .then(res => res.ok ? res.json() : [])
              .then(programs => {
                if (programs.length > 0) setEpg(id, programs);
                return { id, programs };
              })
              .catch(() => ({ id, programs: [] }));
          })
        )
      ).then(results => {
        setEpgMap(prev => {
          const next = new Map(prev);
          for (const { id, programs } of results) {
            if (programs.length > 0) next.set(id, programs);
          }
          return next;
        });
      });
    }
  }, [channels.length, activeCategory, getEpg, setEpg]);

  const effectiveChannel = activeChannel ?? channels[0] ?? null;
  useEffect(() => {
    if (!effectiveChannel) return;
    const cached = epgMapRef.current.get(effectiveChannel.id) || [];
    if (cached.length > 0) {
      setActiveEpg(cached);
      return;
    }
    let stale = false;
    fetch(`/api/free-tv/epg?channelId=${effectiveChannel.id}`)
      .then(res => res.ok ? res.json() : [])
      .then((epg: EpgSlot[]) => {
        if (!stale) setActiveEpg(epg);
      })
      .catch(() => {
        if (!stale) setActiveEpg([]);
      });
    return () => { stale = true; };
  }, [effectiveChannel?.id]);

  const currentProgram = activeEpg.find((p) => now >= p.start && now < p.end);
  const nextProgram = activeEpg.find((p) => p.start > now);

  const [favoriteChannelIds, setFavoriteChannelIds] = useState<Set<string>>(new Set());

  const toggleFavorite = useCallback(async (channelId: string) => {
    const isFav = favoriteChannelIds.has(channelId);
    const newFavs = new Set(favoriteChannelIds);
    if (isFav) newFavs.delete(channelId); else newFavs.add(channelId);
    setFavoriteChannelIds(newFavs);
    await setFavorite(channelId, !isFav);
  }, [favoriteChannelIds, setFavorite]);

  const channelsWithFavorites = useMemo(() => {
    return channels.map(ch => ({ ...ch, favorite: favoriteChannelIds.has(ch.id) }));
  }, [channels, favoriteChannelIds]);

  const [allCachedChannels, setAllCachedChannels] = useState<FreeTVChannel[]>([]);
  
  useEffect(() => {
    getChannels().then(cached => {
      if (cached) setAllCachedChannels(cached);
    });
  }, [getChannels]);

  const categories = useMemo(() => {
    const cats = allCategories.length > 0 ? allCategories : [...new Set(channels.map(c => c.groupTitle).filter(Boolean))] as string[];
    
    const locale = typeof navigator !== 'undefined' ? navigator.language : 'en-US';
    const localCountry = locale.split('-')[1]?.toUpperCase() || 'US';
    
    const countryToCategory: Record<string, string> = {
      'HK': 'Hong Kong', 'TW': 'Taiwan', 'CN': 'China', 'JP': 'Japan', 'KR': 'Korea',
      'SG': 'Singapore', 'MY': 'Malaysia', 'TH': 'Thailand', 'VN': 'Vietnam', 'ID': 'Indonesia',
      'PH': 'Philippines', 'US': 'USA', 'GB': 'UK', 'CA': 'Canada', 'AU': 'Australia',
      'NZ': 'New Zealand', 'DE': 'Germany', 'FR': 'France', 'IT': 'Italy', 'ES': 'Spain',
      'PT': 'Portugal', 'NL': 'Netherlands', 'BE': 'Belgium', 'CH': 'Switzerland', 'AT': 'Austria',
      'SE': 'Sweden', 'NO': 'Norway', 'DK': 'Denmark', 'FI': 'Finland', 'PL': 'Poland',
      'CZ': 'Czech Republic', 'HU': 'Hungary', 'RO': 'Romania', 'BG': 'Bulgaria', 'HR': 'Croatia',
      'RS': 'Serbia', 'SK': 'Slovakia', 'SI': 'Slovenia', 'LT': 'Lithuania', 'LV': 'Latvia',
      'EE': 'Estonia', 'IE': 'Ireland', 'GR': 'Greece', 'TR': 'Turkey', 'RU': 'Russia',
      'UA': 'Ukraine', 'BY': 'Belarus', 'MD': 'Moldova', 'GE': 'Georgia', 'AM': 'Armenia',
      'AZ': 'Azerbaijan', 'KZ': 'Kazakhstan', 'UZ': 'Uzbekistan', 'KG': 'Kyrgyzstan', 'TJ': 'Tajikistan',
      'TM': 'Turkmenistan', 'MN': 'Mongolia', 'IN': 'India', 'PK': 'Pakistan', 'BD': 'Bangladesh',
      'LK': 'Sri Lanka', 'NP': 'Nepal', 'MM': 'Myanmar', 'KH': 'Cambodia', 'LA': 'Laos',
      'BN': 'Brunei', 'MO': 'Macau', 'IL': 'Israel', 'SA': 'Saudi Arabia', 'AE': 'UAE',
      'QA': 'Qatar', 'KW': 'Kuwait', 'BH': 'Bahrain', 'OM': 'Oman', 'JO': 'Jordan',
      'LB': 'Lebanon', 'SY': 'Syria', 'IQ': 'Iraq', 'IR': 'Iran', 'AF': 'Afghanistan',
      'ZA': 'South Africa', 'NG': 'Nigeria', 'KE': 'Kenya', 'EG': 'Egypt', 'MA': 'Morocco',
      'DZ': 'Algeria', 'TN': 'Tunisia', 'LY': 'Libya', 'ET': 'Ethiopia', 'GH': 'Ghana',
      'UG': 'Uganda', 'TZ': 'Tanzania', 'ZW': 'Zimbabwe', 'BW': 'Botswana', 'MU': 'Mauritius',
      'SC': 'Seychelles', 'BR': 'Brazil', 'AR': 'Argentina', 'CL': 'Chile', 'CO': 'Colombia',
      'PE': 'Peru', 'VE': 'Venezuela', 'EC': 'Ecuador', 'BO': 'Bolivia', 'PY': 'Paraguay',
      'UY': 'Uruguay', 'CR': 'Costa Rica', 'PA': 'Panama', 'GT': 'Guatemala', 'SV': 'El Salvador',
      'HN': 'Honduras', 'NI': 'Nicaragua', 'DO': 'Dominican Republic', 'CU': 'Cuba', 'JM': 'Jamaica',
      'TT': 'Trinidad and Tobago', 'PR': 'Puerto Rico', 'MX': 'Mexico',
    };
    
    const localCategory = countryToCategory[localCountry] || '';
    
    const favoriteCategories = new Set<string>();
    const geoFreeCategories = new Set<string>();
    const youtubeCategories = new Set<string>();
    
    for (const ch of allCachedChannels) {
      const groupTitle = ch.groupTitle;
      if (groupTitle && favoriteChannelIds.has(ch.id)) {
        favoriteCategories.add(groupTitle);
      }
      const hasG = /[ⒼⒼ]/.test(ch.name) || /[ⒼⒼ]/.test(ch.groupTitle || '');
      if (!hasG && groupTitle) {
        geoFreeCategories.add(groupTitle);
      }
      const isY = /[ⓎⓎ]/.test(ch.name) || /[ⓎⓎ]/.test(ch.groupTitle || '');
      if (isY && groupTitle) {
        youtubeCategories.add(groupTitle);
      }
    }
    
    return cats.sort((a, b) => {
      const aIsFav = favoriteCategories.has(a);
      const bIsFav = favoriteCategories.has(b);
      if (aIsFav && !bIsFav) return -1;
      if (!aIsFav && bIsFav) return 1;
      
      const aIsLocal = a === localCategory;
      const bIsLocal = b === localCategory;
      if (aIsLocal && !bIsLocal) return -1;
      if (!aIsLocal && bIsLocal) return 1;
      
      const aIsGeoFree = geoFreeCategories.has(a);
      const bIsGeoFree = geoFreeCategories.has(b);
      if (aIsGeoFree && !bIsGeoFree) return -1;
      if (!aIsGeoFree && bIsGeoFree) return 1;
      
      const aIsY = youtubeCategories.has(a);
      const bIsY = youtubeCategories.has(b);
      if (aIsY && !bIsY) return -1;
      if (!aIsY && bIsY) return 1;
      
      return a.localeCompare(b);
    });
  }, [allCategories, channels, allCachedChannels, favoriteChannelIds]);

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <div className="w-full bg-black">
        <LiveTvPlayer
          channel={effectiveChannel ? {
            id: effectiveChannel.id,
            name: effectiveChannel.name,
            type: 'video' as const,
            category: effectiveChannel.groupTitle || 'Other',
            source: 'free-tv',
            logo: effectiveChannel.logo,
            streamUrl: effectiveChannel.streamUrl,
            description: '',
            epg: activeEpg,
          } : null}
          className="w-full max-w-6xl mx-auto"
          overlay={
            effectiveChannel && (
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-4 sm:p-6">
                <div className="flex items-end gap-3">
                  {effectiveChannel.logo && (
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
                      <span className="text-xs text-gray-200">{effectiveChannel.name}</span>
                    </div>
                    {currentProgram ? (
                      <>
                        <h2 className="text-lg sm:text-2xl font-bold text-white leading-tight truncate">
                          {currentProgram.title}
                        </h2>
                        <p className="text-xs text-gray-300">
                          {`${new Date(currentProgram.start).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })} – ${new Date(currentProgram.end).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}`}
                        </p>
                      </>
                    ) : (
                      <h2 className="text-lg sm:text-2xl font-bold text-white">{effectiveChannel.name}</h2>
                    )}
                  </div>
                </div>
              </div>
            )
          }
        />
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
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
          {categories.slice(0, categoriesExpanded ? undefined : 10).map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${
                activeCategory === cat
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white'
              }`}
            >
              {cat}
            </button>
          ))}
          {categories.length > 10 && (
            <button
              onClick={() => setCategoriesExpanded(!categoriesExpanded)}
              className="px-3 py-1.5 rounded-full text-sm font-medium transition-colors whitespace-nowrap bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white"
            >
              {categoriesExpanded ? t('collapse') : `${t('more')} (+${categories.length - 10})`}
            </button>
          )}
        </div>

        {cacheStatus === 'stale' && (
          <div className="mb-4 px-4 py-2 bg-yellow-900/30 border border-yellow-800 rounded-lg text-yellow-300 text-sm flex items-center justify-between">
            <span>{t('freeTv.cacheStale')}</span>
            <button
              onClick={() => loadChannels(0, activeCategory, true)}
              className="px-3 py-1 text-xs bg-yellow-600 hover:bg-yellow-500 rounded text-white"
            >
              {t('freeTv.refresh')}
            </button>
          </div>
        )}

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <FreeTVGuide
              channels={channels}
              epgMap={epgMap}
              activeId={effectiveChannel?.id ?? null}
              onSelect={handleSelect}
              favoriteIds={favoriteChannelIds}
              onToggleFavorite={toggleFavorite}
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
                            ((now - currentProgram.start) / (currentProgram.end - currentProgram.start)) * 100
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