'use client';

import { useState, useCallback } from 'react';

const STORAGE_KEY = 'live:recentUrls';
const MAX_RECENT = 5;

interface DirectStreamReturn {
  recentUrls: string[];
  playUrl: (url: string) => void;
}

export function useDirectStream(): DirectStreamReturn {
  const [recentUrls, setRecentUrls] = useState<string[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    } catch {
      return [];
    }
  });

  const playUrl = useCallback((url: string) => {
    setRecentUrls((prev) => {
      const next = [url, ...prev.filter((u) => u !== url)].slice(0, MAX_RECENT);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  return { recentUrls, playUrl };
}
