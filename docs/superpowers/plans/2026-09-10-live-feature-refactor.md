# /live Feature Refactor — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor `/live` to add M3U playlist loading and direct HLS stream playback, using a Tab-driven layout with left channel list + right player.

**Architecture:** Unified `LiveTvPage` with 3 tabs (Built-in / M3U / Direct). M3U parsing via client-first with server-side proxy fallback. Channel data stored in IndexedDB. HLS playback via existing `hls.js` + `LiveTvPlayer`.

**Tech Stack:** Next.js 16, TypeScript, Tailwind v4, hls.js, IndexedDB (via `idb` or raw), next-intl, vitest

---

## File Structure

```
NEW FILES:
  lib/m3uParser.ts                  — M3U/M3U8 format parser
  lib/m3uParser.test.ts             — Parser unit tests
  lib/m3uStore.ts                   — IndexedDB CRUD for M3U channels
  hooks/useM3UChannels.ts           — React hook for M3U channel management
  hooks/useDirectStream.ts          — React hook for direct stream URL management
  components/LiveTV/M3UInput.tsx    — URL input + file upload form
  components/LiveTV/DirectStreamInput.tsx — Direct HLS URL input
  components/LiveTV/ChannelList.tsx — Unified channel list (multi-source)
  app/api/parseM3u/route.ts         — Server-side M3U proxy API

MODIFIED FILES:
  components/LiveTV/LiveTvPage.tsx  — Refactored: tabs, state hub
  app/[locale]/live/page.tsx        — Minor: pass categories to refactored LiveTvPage
  app/[locale]/live/free-tv/page.tsx — Redirect to /live?tab=builtin
  messages/en.json                  — New translation keys
  messages/zh.json                  — New translation keys (Chinese)
```

---

## Task 1: M3U Parser (TDD)

**Files:**
- Create: `lib/m3uParser.ts`
- Create: `lib/m3uParser.test.ts`

### Step 1: Write failing tests

Create `lib/m3uParser.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { parseM3U, M3UChannel } from './m3uParser';

const SAMPLE_M3U = `#EXTM3U
#EXTINF:-1 tvg-logo="https://example.com/logo.png" group-title="News",CNN
http://stream.example.com/cnn.m3u8
#EXTINF:-1 group-title="Sports",ESPN
http://stream.example.com/espn.m3u8
#EXTINF:-1,BBC News
http://stream.example.com/bbc.m3u8`;

const EMPTY_M3U = `#EXTM3U`;

const MALFORMED = `This is not an M3U file`;

describe('parseM3U', () => {
  it('parses channels with all metadata', () => {
    const result = parseM3U(SAMPLE_M3U, 'http://source.com/playlist.m3u');
    expect(result.channels).toHaveLength(3);
    expect(result.channels[0]).toEqual({
      id: expect.any(String),
      name: 'CNN',
      logo: 'https://example.com/logo.png',
      groupTitle: 'News',
      streamUrl: 'http://stream.example.com/cnn.m3u8',
      sourceUrl: 'http://source.com/playlist.m3u',
    });
  });

  it('handles missing group-title gracefully', () => {
    const result = parseM3U(SAMPLE_M3U, 'http://source.com/playlist.m3u');
    expect(result.channels[2].groupTitle).toBeUndefined();
    expect(result.channels[2].name).toBe('BBC News');
  });

  it('generates deterministic IDs from stream URL', () => {
    const result1 = parseM3U(SAMPLE_M3U, 'http://source.com/playlist.m3u');
    const result2 = parseM3U(SAMPLE_M3U, 'http://source.com/playlist.m3u');
    expect(result1.channels[0].id).toBe(result2.channels[0].id);
  });

  it('returns empty array for empty M3U', () => {
    const result = parseM3U(EMPTY_M3U, 'http://source.com/playlist.m3u');
    expect(result.channels).toHaveLength(0);
  });

  it('throws on non-M3U content', () => {
    expect(() => parseM3U(MALFORMED, 'http://source.com/playlist.m3u')).toThrow('Invalid M3U format');
  });

  it('extracts tvg-url from header if present', () => {
    const m3u = `#EXTM3U x-tvg-url="http://epg.example.com/epg.xml"
#EXTINF:-1,Test
http://stream.example.com/test.m3u8`;
    const result = parseM3U(m3u, 'http://source.com/playlist.m3u');
    expect(result.epgUrl).toBe('http://epg.example.com/epg.xml');
  });
});
```

### Step 2: Run tests to verify they fail

Run: `npx vitest run lib/m3uParser.test.ts`
Expected: FAIL — `Cannot find module './m3uParser'`

### Step 3: Implement `lib/m3uParser.ts`

```typescript
import { createHash } from 'crypto';

export interface M3UChannel {
  id: string;
  name: string;
  logo?: string;
  groupTitle?: string;
  streamUrl: string;
  sourceUrl: string;
}

export interface ParseM3UResult {
  channels: M3UChannel[];
  sourceUrl: string;
  channelCount: number;
  epgUrl?: string;
}

export function parseM3U(content: string, sourceUrl: string): ParseM3UResult {
  const lines = content.split('\n').map((l) => l.trim());

  // Validate M3U header
  if (!lines[0]?.startsWith('#EXTM3U')) {
    throw new Error('Invalid M3U format');
  }

  // Extract EPG URL from header
  const headerMatch = lines[0].match(/x-tvg-url="([^"]+)"/);
  const epgUrl = headerMatch?.[1];

  const channels: M3UChannel[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line || line.startsWith('#')) continue;

    // This line should be a stream URL. Find the preceding #EXTINF line.
    let extinfLine = '';
    for (let j = i - 1; j >= 1; j--) {
      if (lines[j].startsWith('#EXTINF')) {
        extinfLine = lines[j];
        break;
      }
      if (lines[j] && !lines[j].startsWith('#')) break; // hit another URL
    }

    if (!extinfLine) continue;

    const streamUrl = line;
    const id = createHash('sha256').update(streamUrl).digest('hex').slice(0, 12);

    // Parse logo
    const logoMatch = extinfLine.match(/tvg-logo="([^"]+)"/);
    const logo = logoMatch?.[1];

    // Parse group-title
    const groupMatch = extinfLine.match(/group-title="([^"]+)"/);
    const groupTitle = groupMatch?.[1];

    // Parse channel name (after the last comma)
    const commaIdx = extinfLine.lastIndexOf(',');
    const name = commaIdx >= 0 ? extinfLine.slice(commaIdx + 1).trim() : streamUrl;

    channels.push({ id, name, logo, groupTitle, streamUrl, sourceUrl });
  }

  return { channels, sourceUrl, channelCount: channels.length, epgUrl };
}
```

### Step 4: Run tests to verify they pass

Run: `npx vitest run lib/m3uParser.test.ts`
Expected: ALL PASS

### Step 5: Commit

```bash
git add lib/m3uParser.ts lib/m3uParser.test.ts
git commit -m "feat: add M3U parser with tests"
```

---

## Task 2: M3U IndexedDB Store

**Files:**
- Create: `lib/m3uStore.ts`

### Step 1: Implement M3U store

```typescript
import { openDB, IDBPDatabase } from 'idb';
import { M3UChannel } from './m3uParser';

const DB_NAME = 'live-m3u';
const DB_VERSION = 1;
const CHANNELS_STORE = 'channels';
const SOURCES_STORE = 'sources';

export interface M3USource {
  url: string;
  channelCount: number;
  loadedAt: number;
}

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(CHANNELS_STORE)) {
          const store = db.createObjectStore(CHANNELS_STORE, { keyPath: 'id' });
          store.createIndex('sourceUrl', 'sourceUrl');
          store.createIndex('groupTitle', 'groupTitle');
        }
        if (!db.objectStoreNames.contains(SOURCES_STORE)) {
          db.createObjectStore(SOURCES_STORE, { keyPath: 'url' });
        }
      },
    });
  }
  return dbPromise;
}

export async function saveChannels(channels: M3UChannel[]): Promise<void> {
  const db = await getDB();
  const tx = db.transaction(CHANNELS_STORE, 'readwrite');
  for (const ch of channels) {
    await tx.store.put(ch);
  }
  await tx.done;
}

export async function getChannelsBySource(sourceUrl: string): Promise<M3UChannel[]> {
  const db = await getDB();
  return db.getAllFromIndex(CHANNELS_STORE, 'sourceUrl', sourceUrl);
}

export async function getAllChannels(): Promise<M3UChannel[]> {
  const db = await getDB();
  return db.getAll(CHANNELS_STORE);
}

export async function deleteChannelsBySource(sourceUrl: string): Promise<void> {
  const db = await getDB();
  const tx = db.transaction(CHANNELS_STORE, 'readwrite');
  const index = tx.store.index('sourceUrl');
  let cursor = await index.openCursor(sourceUrl);
  while (cursor) {
    await cursor.delete();
    cursor = await cursor.continue();
  }
  await tx.done;
}

export async function saveSource(source: M3USource): Promise<void> {
  const db = await getDB();
  await db.put(SOURCES_STORE, source);
}

export async function getSources(): Promise<M3USource[]> {
  const db = await getDB();
  return db.getAll(SOURCES_STORE);
}

export async function deleteSource(url: string): Promise<void> {
  const db = await getDB();
  await db.delete(SOURCES_STORE, url);
}
```

### Step 2: Verify build passes

Run: `npm run build`
Expected: PASS (no type errors)

### Step 3: Commit

```bash
git add lib/m3uStore.ts
git commit -m "feat: add M3U IndexedDB store"
```

---

## Task 3: useM3UChannels Hook

**Files:**
- Create: `hooks/useM3UChannels.ts`

### Step 1: Implement the hook

```typescript
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
```

### Step 2: Verify build passes

Run: `npm run build`
Expected: PASS

### Step 3: Commit

```bash
git add hooks/useM3UChannels.ts
git commit -m "feat: add useM3UChannels hook"
```

---

## Task 4: Server-Side M3U Proxy API

**Files:**
- Create: `app/api/parseM3u/route.ts`

### Step 1: Implement the API route

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { parseM3U } from '@/lib/m3uParser';

// Simple in-memory rate limiter (per IP, 10 req/min)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 10;
const RATE_WINDOW = 60_000;

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW });
    return true;
  }
  if (entry.count >= RATE_LIMIT) return false;
  entry.count++;
  return true;
}

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    if (!checkRateLimit(ip)) {
      return NextResponse.json({ error: 'Rate limit exceeded. Try again later.' }, { status: 429 });
    }

    const body = await request.json();
    const { url } = body as { url?: string };

    if (!url || typeof url !== 'string') {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    // Validate URL
    const parsed = new URL(url);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return NextResponse.json({ error: 'Only HTTP/HTTPS URLs are allowed' }, { status: 400 });
    }

    // Fetch M3U file
    const res = await fetch(url, {
      headers: { 'User-Agent': 'M3U-Proxy/1.0' },
      signal: AbortSignal.timeout(15_000),
    });

    if (!res.ok) {
      return NextResponse.json({ error: `Failed to fetch: HTTP ${res.status}` }, { status: 502 });
    }

    const text = await res.text();
    const result = parseM3U(text, url);

    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
```

### Step 2: Verify build passes

Run: `npm run build`
Expected: PASS

### Step 3: Commit

```bash
git add app/api/parseM3u/route.ts
git commit -m "feat: add server-side M3U proxy with rate limiting"
```

---

## Task 5: useDirectStream Hook

**Files:**
- Create: `hooks/useDirectStream.ts`

### Step 1: Implement the hook

```typescript
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
```

### Step 2: Verify build passes

Run: `npm run build`
Expected: PASS

### Step 3: Commit

```bash
git add hooks/useDirectStream.ts
git commit -m "feat: add useDirectStream hook"
```

---

## Task 6: M3UInput Component

**Files:**
- Create: `components/LiveTV/M3UInput.tsx`

### Step 1: Implement M3UInput

```tsx
'use client';

import React, { useState, useRef } from 'react';
import { useTranslations } from 'next-intl';

interface M3UInputProps {
  onLoad: (url: string) => Promise<void>;
  onFileLoad: (file: File) => Promise<void>;
  loading: boolean;
  error: string | null;
  sources: { url: string; channelCount: number }[];
  onRemoveSource: (url: string) => void;
}

export default function M3UInput({
  onLoad,
  onFileLoad,
  loading,
  error,
  sources,
  onRemoveSource,
}: M3UInputProps) {
  const t = useTranslations('live');
  const [url, setUrl] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (url.trim()) onLoad(url.trim());
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onFileLoad(file);
    if (fileRef.current) fileRef.current.value = '';
  };

  return (
    <div className="space-y-4">
      {/* URL input form */}
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder={t('m3u.enterUrl')}
          className="flex-1 px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          disabled={loading}
        />
        <button
          type="submit"
          disabled={loading || !url.trim()}
          className="px-4 py-2 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? t('m3u.loading') : t('m3u.load')}
        </button>
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={loading}
          className="px-4 py-2 rounded-lg bg-gray-700 text-gray-300 hover:bg-gray-600 disabled:opacity-50 transition-colors"
        >
          {t('m3u.uploadFile')}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept=".m3u,.m3u8"
          onChange={handleFileChange}
          className="hidden"
        />
      </form>

      {/* Error display */}
      {error && (
        <div className="p-3 rounded-lg bg-red-900/30 border border-red-700 text-red-300 text-sm">
          {error}
        </div>
      )}

      {/* Loaded sources list */}
      {sources.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-gray-500 font-medium">{t('m3u.loadedSources')}</p>
          {sources.map((s) => (
            <div
              key={s.url}
              className="flex items-center justify-between p-2 rounded bg-gray-800/50 text-sm"
            >
              <span className="text-gray-300 truncate flex-1 mr-2">{s.url}</span>
              <span className="text-gray-500 shrink-0">{s.channelCount} ch</span>
              <button
                onClick={() => onRemoveSource(s.url)}
                className="ml-2 text-red-400 hover:text-red-300 shrink-0"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

### Step 2: Verify build passes

Run: `npm run build`
Expected: PASS

### Step 3: Commit

```bash
git add components/LiveTV/M3UInput.tsx
git commit -m "feat: add M3UInput component"
```

---

## Task 7: DirectStreamInput Component

**Files:**
- Create: `components/LiveTV/DirectStreamInput.tsx`

### Step 1: Implement DirectStreamInput

```tsx
'use client';

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';

interface DirectStreamInputProps {
  onPlay: (url: string) => void;
  recentUrls: string[];
}

export default function DirectStreamInput({ onPlay, recentUrls }: DirectStreamInputProps) {
  const t = useTranslations('live');
  const [url, setUrl] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (url.trim()) onPlay(url.trim());
  };

  return (
    <div className="space-y-4">
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder={t('direct.enterUrl')}
          className="flex-1 px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <button
          type="submit"
          disabled={!url.trim()}
          className="px-4 py-2 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {t('direct.play')}
        </button>
      </form>

      {/* Recent URLs */}
      {recentUrls.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-gray-500 font-medium">{t('direct.recentUrls')}</p>
          <div className="flex flex-wrap gap-2">
            {recentUrls.map((u) => (
              <button
                key={u}
                onClick={() => {
                  setUrl(u);
                  onPlay(u);
                }}
                className="text-xs px-2 py-1 rounded bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white truncate max-w-[200px]"
                title={u}
              >
                {u.length > 30 ? u.slice(0, 30) + '…' : u}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
```

### Step 2: Verify build passes

Run: `npm run build`
Expected: PASS

### Step 3: Commit

```bash
git add components/LiveTV/DirectStreamInput.tsx
git commit -m "feat: add DirectStreamInput component"
```

---

## Task 8: Unified ChannelList Component

**Files:**
- Create: `components/LiveTV/ChannelList.tsx`

### Step 1: Implement ChannelList

```tsx
'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import { LiveChannel } from '@/lib/liveChannels'; // existing type or define new

interface ChannelListProps {
  channels: LiveChannel[];
  activeId: string | null;
  onSelect: (channel: LiveChannel) => void;
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
      <div className="p-8 text-center text-gray-500 text-sm">
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
                ? 'bg-indigo-900/30 border border-indigo-600/40'
                : 'hover:bg-gray-800/60 border border-transparent'
            }`}
          >
            {/* Logo */}
            {ch.logo ? (
              <img
                src={ch.logo}
                alt={ch.name}
                loading="lazy"
                className="w-8 h-6 object-contain shrink-0"
              />
            ) : (
              <div className="w-8 h-6 shrink-0 rounded bg-gray-700 flex items-center justify-center text-xs font-bold text-gray-300">
                {ch.name.slice(0, 1)}
              </div>
            )}

            {/* Name + group */}
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-white truncate">{ch.name}</p>
              {ch.groupTitle && (
                <p className="text-[11px] text-gray-500 truncate">{ch.groupTitle}</p>
              )}
            </div>

            {/* Live indicator */}
            {active && (
              <span className="shrink-0 flex items-center gap-1 bg-red-600 text-white text-[10px] px-1.5 py-0.5 rounded">
                <span className="w-1 h-1 rounded-full bg-white animate-pulse" />
                {t('live')}
              </span>
            )}

            {/* Favorite button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleFavorite(ch.id);
              }}
              className="shrink-0 p-1 rounded hover:bg-gray-700 transition-colors"
              aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
            >
              <svg
                className={`w-4 h-4 ${isFavorite ? 'text-yellow-400 fill-current' : 'text-gray-500'}`}
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
        <div className="p-4 text-center text-sm text-gray-500">{t('loading')}</div>
      )}
    </div>
  );
}
```

**Note:** Define a unified `LiveChannel` type in `lib/liveChannels.ts` (or a new `lib/types.ts`) that both `FreeTVChannel` and `M3UChannel` satisfy:

```typescript
interface LiveChannel {
  id: string;
  name: string;
  logo?: string;
  groupTitle?: string;
  streamUrl: string;
  source?: string;
}
```

Add this type definition as part of Task 8, before the component implementation.

### Step 2: Verify build passes

Run: `npm run build`
Expected: PASS

### Step 3: Commit

```bash
git add components/LiveTV/ChannelList.tsx
git commit -m "feat: add unified ChannelList component"
```

---

## Task 9: Refactor LiveTvPage (Tab System)

**Files:**
- Modify: `components/LiveTV/LiveTvPage.tsx`

### Step 1: Read current LiveTvPage

Read `components/LiveTV/LiveTvPage.tsx` to understand current structure.

### Step 2: Refactor to add tabs

Key changes to `LiveTvPage.tsx`:
1. Add `activeTab` state: `'builtin' | 'm3u' | 'direct'`
2. Import and render `M3UInput`, `DirectStreamInput`, `ChannelList`
3. Switch channel data source based on active tab
4. Keep existing EPG guide and player logic
5. Add tab navigation UI at the top

The refactored component should:
- Render tab buttons: Built-in | M3U | Direct
- Render the appropriate input component below tabs (M3UInput for M3U tab, DirectStreamInput for Direct tab)
- Render `ChannelList` on the left side
- Render `LiveTvPlayer` + EPG on the right side
- Maintain existing state management for channels, activeChannel, EPG

### Step 3: Verify build passes

Run: `npm run build`
Expected: PASS

### Step 4: Commit

```bash
git add components/LiveTV/LiveTvPage.tsx
git commit -m "feat: refactor LiveTvPage with tab-driven data sources"
```

---

## Task 10: i18n Translations

**Files:**
- Modify: `messages/en.json`
- Modify: `messages/zh.json`

### Step 1: Add translation keys

Add to `messages/en.json` under the `live` namespace:

```json
{
  "live": {
    "tabs": {
      "builtin": "Built-in",
      "m3u": "M3U Playlist",
      "direct": "Direct Stream"
    },
    "m3u": {
      "enterUrl": "Enter M3U playlist URL",
      "uploadFile": "Upload M3U file",
      "load": "Load Playlist",
      "loading": "Loading channels...",
      "sourceInfo": "{{count}} channels from {{source}}",
      "noChannels": "No channels found in playlist",
      "invalidFormat": "Invalid M3U format",
      "loadedSources": "Loaded sources"
    },
    "direct": {
      "enterUrl": "Enter HLS stream URL (e.g. https://example.com/stream.m3u8)",
      "play": "Play",
      "recentUrls": "Recent URLs"
    }
  }
}
```

Add equivalent Chinese keys to `messages/zh.json`.

### Step 2: Verify build passes

Run: `npm run build`
Expected: PASS

### Step 3: Commit

```bash
git add messages/en.json messages/zh.json
git commit -m "feat: add i18n translations for M3U and Direct stream tabs"
```

---

## Task 11: Update Free-TV Route Redirect

**Files:**
- Modify: `app/[locale]/live/free-tv/page.tsx`

### Step 1: Add redirect

Update `free-tv/page.tsx` to redirect to `/live?tab=builtin`:

```tsx
import { redirect } from 'next/navigation';
import { routing } from '@/i18n/routing';

interface Props {
  params: Promise<{ locale: string }>;
}

export default async function FreeTVPageRoute({ params }: Props) {
  const { locale } = await params;
  redirect(`/${locale}/live?tab=builtin`);
}
```

### Step 2: Verify build passes

Run: `npm run build`
Expected: PASS

### Step 3: Commit

```bash
git add app/[locale]/live/free-tv/page.tsx
git commit -m "feat: redirect /live/free-tv to /live?tab=builtin"
```

---

## Task 12: Final Build & Verification

### Step 1: Run full build

Run: `npm run build`
Expected: PASS

### Step 2: Run linter

Run: `npm run lint`
Expected: PASS

### Step 3: Run M3U parser tests

Run: `npx vitest run lib/m3uParser.test.ts`
Expected: ALL PASS

### Step 4: Commit any remaining changes

```bash
git add -A
git commit -m "feat: complete /live feature refactor with IPTV + M3U8 support"
```

---

## Summary

| Task | Description | Files |
|------|-------------|-------|
| 1 | M3U Parser (TDD) | `lib/m3uParser.ts`, `lib/m3uParser.test.ts` |
| 2 | M3U IndexedDB Store | `lib/m3uStore.ts` |
| 3 | useM3UChannels Hook | `hooks/useM3UChannels.ts` |
| 4 | Server-Side M3U Proxy | `app/api/parseM3u/route.ts` |
| 5 | useDirectStream Hook | `hooks/useDirectStream.ts` |
| 6 | M3UInput Component | `components/LiveTV/M3UInput.tsx` |
| 7 | DirectStreamInput Component | `components/LiveTV/DirectStreamInput.tsx` |
| 8 | Unified ChannelList | `components/LiveTV/ChannelList.tsx` |
| 9 | Refactor LiveTvPage | `components/LiveTV/LiveTvPage.tsx` |
| 10 | i18n Translations | `messages/en.json`, `messages/zh.json` |
| 11 | Free-TV Route Redirect | `app/[locale]/live/free-tv/page.tsx` |
| 12 | Final Build & Verification | — |
