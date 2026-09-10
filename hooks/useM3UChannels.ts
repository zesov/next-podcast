'use client';

import { useState, useEffect, useCallback } from 'react';
import { M3UChannel, parseM3U } from '@/lib/m3uParser';
import {
  saveChannels,
  getAllChannels,
  deleteChannelsBySource,
  saveSource,
  getSources,
  deleteSource,
  M3USource,
} from '@/lib/m3uStore';

interface UseM3UChannelsReturn {
  channels: M3UChannel[];
  sources: M3USource[];
  loading: boolean;
  error: string | null;
  loadFromUrl: (url: string) => Promise<void>;
  loadFromFile: (file: File) => Promise<void>;
  removeSource: (url: string) => Promise<void>;
  search: (query: string) => M3UChannel[];
}

export function useM3UChannels(): UseM3UChannelsReturn {
  const [channels, setChannels] = useState<M3UChannel[]>([]);
  const [sources, setSources] = useState<M3USource[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load all channels from IndexedDB on mount
  useEffect(() => {
    getAllChannels().then(setChannels);
    getSources().then(setSources);
  }, []);

  const loadFromUrl = useCallback(async (url: string) => {
    setLoading(true);
    setError(null);
    try {
      // Try client-side fetch first
      let text: string;
      try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        text = await res.text();
      } catch {
        // CORS or network error — fallback to server proxy
        const proxyRes = await fetch('/api/parseM3u', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url }),
        });
        if (!proxyRes.ok) {
          const err = await proxyRes.json();
          throw new Error(err.error || 'Failed to load playlist');
        }
        const data = await proxyRes.json();
        await saveChannels(data.channels);
        await saveSource({ url, channelCount: data.channelCount, loadedAt: Date.now() });
        setChannels(await getAllChannels());
        setSources(await getSources());
        setLoading(false);
        return;
      }

      const result = parseM3U(text, url);
      await saveChannels(result.channels);
      await saveSource({ url, channelCount: result.channelCount, loadedAt: Date.now() });
      setChannels(await getAllChannels());
      setSources(await getSources());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load playlist');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadFromFile = useCallback(async (file: File) => {
    setLoading(true);
    setError(null);
    try {
      const text = await file.text();
      const result = parseM3U(text, `file://${file.name}`);
      await saveChannels(result.channels);
      await saveSource({
        url: `file://${file.name}`,
        channelCount: result.channelCount,
        loadedAt: Date.now(),
      });
      setChannels(await getAllChannels());
      setSources(await getSources());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to parse file');
    } finally {
      setLoading(false);
    }
  }, []);

  const removeSource = useCallback(async (url: string) => {
    await deleteChannelsBySource(url);
    await deleteSource(url);
    setChannels(await getAllChannels());
    setSources(await getSources());
  }, []);

  const search = useCallback(
    (query: string) => {
      const q = query.toLowerCase();
      return channels.filter(
        (ch) =>
          ch.name.toLowerCase().includes(q) ||
          ch.groupTitle?.toLowerCase().includes(q)
      );
    },
    [channels]
  );

  return { channels, sources, loading, error, loadFromUrl, loadFromFile, removeSource, search };
}
