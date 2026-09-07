# Free-TV IPTV Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a new `/live/free-tv` page that fetches channels from Free-TV IPTV playlist.m3u8, parses EPG from tvg-url, caches in IndexedDB, and displays with the existing LiveTV UI components.

**Architecture:** Server-side API routes fetch and parse M3U8/EPG from Free-TV GitHub repo. Client uses IndexedDB for persistence, infinite scroll pagination, and batch EPG loading. Reuses existing LiveTvPlayer and LiveGuide components with new FreeTVPage/FreeTVGuide wrappers.

**Tech Stack:** Next.js 15 App Router, TypeScript, IndexedDB (native), next-intl for i18n, hls.js (existing), react-slick (existing)

---

### Task 1: Create M3U8 Parser Utility (`lib/freeTvParser.ts`)

**Files:**
- Create: `lib/freeTvParser.ts`
- Test: `lib/freeTvParser.test.ts` (run via `npm run test` if available, otherwise manual verification)

- [ ] **Step 1: Write the failing test**

```typescript
// lib/freeTvParser.test.ts
import { parseM3U8, parseEpgXML, FreeTVChannel, FreeTVEpgProgram } from './freeTvParser';

const sampleM3U8 = `#EXTM3U x-tvg-url="https://example.com/epg.xml"
#EXTINF:-1 tvg-id="channel1" tvg-name="Test Channel 1" tvg-logo="https://example.com/logo1.png" group-title="News" tvg-country="US" tvg-language="en" tvg-url="https://example.com/epg1.xml",Test Channel 1
https://stream.example.com/channel1.m3u8
#EXTINF:-1 tvg-id="channel2" tvg-name="Test Channel 2" tvg-logo="https://example.com/logo2.png" group-title="Sports",Test Channel 2
https://stream.example.com/channel2.m3u8
#EXTINF:-1 tvg-name="No ID Channel",Test Channel 3
https://stream.example.com/channel3.m3u8`;

const sampleXMLTV = `<?xml version="1.0" encoding="utf-8"?>
<tv>
  <channel id="channel1">
    <display-name>Test Channel 1</display-name>
  </channel>
  <programme channel="channel1" start="20260907120000 +0000" stop="20260907130000 +0000">
    <title>News Hour</title>
    <desc>Latest news</desc>
  </programme>
  <programme channel="channel1" start="20260907130000 +0000" stop="20260907140000 +0000">
    <title>Weather</title>
    <desc>Weather forecast</desc>
  </programme>
</tv>`;

test('parseM3U8 extracts channels with all attributes', () => {
  const channels = parseM3U8(sampleM3U8);
  expect(channels).toHaveLength(3);
  expect(channels[0]).toMatchObject({
    id: 'channel1',
    name: 'Test Channel 1',
    logo: 'https://example.com/logo1.png',
    groupTitle: 'News',
    streamUrl: 'https://stream.example.com/channel1.m3u8',
    tvgUrl: 'https://example.com/epg1.xml',
    country: 'US',
    language: 'en',
  });
  expect(channels[1].id).toBe('channel2');
  expect(channels[2].id).toMatch(/^generated-/); // auto-generated ID
});

test('parseM3U8 handles missing optional attributes', () => {
  const minimal = `#EXTM3U
#EXTINF:-1,Minimal Channel
https://stream.example.com/minimal.m3u8`;
  const channels = parseM3U8(minimal);
  expect(channels).toHaveLength(1);
  expect(channels[0].name).toBe('Minimal Channel');
  expect(channels[0].logo).toBeUndefined();
  expect(channels[0].groupTitle).toBeUndefined();
});

test('parseEpgXML converts XMLTV to EpgSlot format', () => {
  const programs = parseEpgXML(sampleXMLTV, 'channel1');
  expect(programs).toHaveLength(2);
  expect(programs[0]).toMatchObject({
    channelId: 'channel1',
    title: 'News Hour',
    description: 'Latest news',
  });
  expect(programs[0].start).toBeLessThan(programs[0].end);
  expect(typeof programs[0].start).toBe('number');
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd /home/junius/Workspace/ts/next-podcast
npx tsx lib/freeTvParser.test.ts 2>&1 || true
```
Expected: ReferenceError / TypeError (module not found)

- [ ] **Step 3: Write minimal implementation**

```typescript
// lib/freeTvParser.ts
export interface FreeTVChannel {
  id: string;
  name: string;
  logo?: string;
  groupTitle?: string;
  streamUrl: string;
  tvgUrl?: string;
  country?: string;
  language?: string;
}

export interface FreeTVEpgProgram {
  channelId: string;
  title: string;
  description: string;
  start: number;
  end: number;
  isLive?: boolean;
}

// Parse M3U8 playlist content into FreeTVChannel array
export function parseM3U8(content: string): FreeTVChannel[] {
  const lines = content.split('\n').map(l => l.trim()).filter(Boolean);
  const channels: FreeTVChannel[] = [];
  let currentExtinf: string | null = null;
  let globalTvgUrl: string | undefined;

  // Extract global x-tvg-url from #EXTM3U line
  const extm3uLine = lines.find(l => l.startsWith('#EXTM3U'));
  if (extm3uLine) {
    const match = extm3uLine.match(/x-tvg-url=["']([^"']+)["']/i);
    if (match) globalTvgUrl = match[1];
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.startsWith('#EXTINF:')) {
      currentExtinf = line.slice('#EXTINF:'.length).trim();
    } else if (currentExtinf && !line.startsWith('#')) {
      // This is the stream URL
      const channel = parseExtinfLine(currentExtinf, line, globalTvgUrl);
      if (channel) channels.push(channel);
      currentExtinf = null;
    }
  }

  return channels;
}

function parseExtinfLine(extinf: string, streamUrl: string, globalTvgUrl?: string): FreeTVChannel | null {
  // Parse attributes: tvg-id="..." tvg-name="..." etc.
  const attrs: Record<string, string> = {};
  const attrRegex = /(\w+)=["']([^"']*)["']/g;
  let match;
  while ((match = attrRegex.exec(extinf)) !== null) {
    attrs[match[1].toLowerCase()] = match[2];
  }

  // Channel name is after the last comma
  const nameMatch = extinf.match(/,([^,]+)$/);
  const name = nameMatch ? nameMatch[1].trim() : attrs['tvg-name'] || 'Unknown';

  const id = attrs['tvg-id'] || `generated-${hashString(streamUrl)}`;
  const tvgUrl = attrs['tvg-url'] || globalTvgUrl;

  return {
    id,
    name,
    logo: attrs['tvg-logo'] || undefined,
    groupTitle: attrs['group-title'] || undefined,
    streamUrl,
    tvgUrl,
    country: attrs['tvg-country'] || undefined,
    language: attrs['tvg-language'] || undefined,
  };
}

function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}

// Parse XMLTV format EPG
export function parseEpgXML(content: string, channelId: string): FreeTVEpgProgram[] {
  // Simple regex-based XMLTV parser (avoids DOMParser in Node)
  const programmes: FreeTVEpgProgram[] = [];
  const programmeRegex = /<programme\s+[^>]*channel=["']([^"']+)["']\s+start=["']([^"']+)["']\s+stop=["']([^"']+)["'][^>]*>([\s\S]*?)<\/programme>/gi;

  let match;
  while ((match = programmeRegex.exec(content)) !== null) {
    const [, progChannelId, startStr, stopStr, inner] = match;
    if (progChannelId !== channelId) continue;

    const titleMatch = inner.match(/<title[^>]*>([^<]+)<\/title>/i);
    const descMatch = inner.match(/<desc[^>]*>([^<]+)<\/desc>/i);

    programmes.push({
      channelId,
      title: titleMatch?.[1] || 'Unknown Program',
      description: descMatch?.[1] || '',
      start: parseXmltvTime(startStr),
      end: parseXmltvTime(stopStr),
    });
  }

  return programmes.sort((a, b) => a.start - b.start);
}

function parseXmltvTime(str: string): number {
  // Format: "20260907120000 +0000" or "20260907120000"
  const clean = str.replace(/\s.*$/, '');
  const year = parseInt(clean.slice(0, 4), 10);
  const month = parseInt(clean.slice(4, 6), 10) - 1;
  const day = parseInt(clean.slice(6, 8), 10);
  const hour = parseInt(clean.slice(8, 10), 10);
  const minute = parseInt(clean.slice(10, 12), 10);
  const second = parseInt(clean.slice(12, 14), 10) || 0;
  return Date.UTC(year, month, day, hour, minute, second);
}

// Parse JSON EPG (some sources provide JSON)
export function parseEpgJSON(content: string, channelId: string): FreeTVEpgProgram[] {
  try {
    const data = JSON.parse(content);
    // Handle various JSON EPG formats
    if (Array.isArray(data)) {
      return data
        .filter((p: any) => p.channelId === channelId || p.channel_id === channelId)
        .map((p: any) => ({
          channelId,
          title: p.title || p.name || 'Unknown',
          description: p.description || p.desc || '',
          start: typeof p.start === 'number' ? p.start : new Date(p.start_time || p.startTime || 0).getTime(),
          end: typeof p.end === 'number' ? p.end : new Date(p.end_time || p.endTime || 0).getTime(),
        }))
        .sort((a, b) => a.start - b.start);
    }
    return [];
  } catch {
    return [];
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd /home/junius/Workspace/ts/next-podcast
npx tsx lib/freeTvParser.test.ts
```
Expected: All tests pass

- [ ] **Step 5: Commit**

```bash
git add lib/freeTvParser.ts lib/freeTvParser.test.ts
git commit -m "feat: add M3U8 and EPG parser for Free-TV IPTV"
```

---

### Task 2: Create IndexedDB Cache Hook (`hooks/useFreeTVCache.ts`)

**Files:**
- Create: `hooks/useFreeTVCache.ts`
- Test: Manual verification in browser console

- [ ] **Step 1: Write the failing test (manual)**

```typescript
// Run in browser console after implementation
const cache = await import('/hooks/useFreeTVCache').then(m => m.useFreeTVCache.getState());
// Test: cache.setChannels([{id:'1',name:'Test',streamUrl:'http://x.m3u8'}])
// Test: const ch = await cache.getChannels()
// Test: cache.setEpg('1', [{channelId:'1',title:'Show',description:'',start:0,end:3600000}])
// Test: const epg = await cache.getEpg('1')
```

- [ ] **Step 2: Write implementation**

```typescript
// hooks/useFreeTVCache.ts
'use client';

import { create } from 'zustand';
import { FreeTVChannel } from '@/lib/freeTvParser';
import { EpgSlot } from '@/components/LiveTV/liveChannels';

const DB_NAME = 'free-tv-cache';
const CHANNELS_STORE = 'channels';
const EPG_STORE = 'epg';
const DB_VERSION = 1;

interface CacheState {
  db: IDBDatabase | null;
  init: () => Promise<void>;
  getChannels: () => Promise<FreeTVChannel[] | null>;
  setChannels: (channels: FreeTVChannel[]) => Promise<void>;
  getEpg: (channelId: string) => Promise<EpgSlot[] | null>;
  setEpg: (channelId: string, programs: EpgSlot[]) => Promise<void>;
  isChannelsStale: (maxAgeMs?: number) => Promise<boolean>;
  isEpgStale: (channelId: string, maxAgeMs?: number) => Promise<boolean>;
  clear: () => Promise<void>;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(CHANNELS_STORE)) {
        db.createObjectStore(CHANNELS_STORE);
      }
      if (!db.objectStoreNames.contains(EPG_STORE)) {
        db.createObjectStore(EPG_STORE);
      }
    };
  });
}

export const useFreeTVCache = create<CacheState>((set, get) => ({
  db: null,

  init: async () => {
    if (get().db) return;
    const db = await openDB();
    set({ db });
  },

  getChannels: async () => {
    const { db } = get();
    if (!db) await get().init();
    return new Promise((resolve, reject) => {
      const tx = db!.transaction(CHANNELS_STORE, 'readonly');
      const store = tx.objectStore(CHANNELS_STORE);
      const request = store.get('channels');
      request.onsuccess = () => {
        const data = request.result;
        if (data && data.channels) {
          resolve(data.channels as FreeTVChannel[]);
        } else {
          resolve(null);
        }
      };
      request.onerror = () => reject(request.error);
    });
  },

  setChannels: async (channels: FreeTVChannel[]) => {
    const { db } = get();
    if (!db) await get().init();
    return new Promise((resolve, reject) => {
      const tx = db!.transaction(CHANNELS_STORE, 'readwrite');
      const store = tx.objectStore(CHANNELS_STORE);
      const request = store.put({ channels, fetchedAt: Date.now() }, 'channels');
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  },

  getEpg: async (channelId: string) => {
    const { db } = get();
    if (!db) await get().init();
    return new Promise((resolve, reject) => {
      const tx = db!.transaction(EPG_STORE, 'readonly');
      const store = tx.objectStore(EPG_STORE);
      const request = store.get(channelId);
      request.onsuccess = () => {
        const data = request.result;
        if (data && data.programs) {
          resolve(data.programs as EpgSlot[]);
        } else {
          resolve(null);
        }
      };
      request.onerror = () => reject(request.error);
    });
  },

  setEpg: async (channelId: string, programs: EpgSlot[]) => {
    const { db } = get();
    if (!db) await get().init();
    return new Promise((resolve, reject) => {
      const tx = db!.transaction(EPG_STORE, 'readwrite');
      const store = tx.objectStore(EPG_STORE);
      const request = store.put({ programs, fetchedAt: Date.now() }, channelId);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  },

  isChannelsStale: async (maxAgeMs = 3600000) => {
    const { db } = get();
    if (!db) await get().init();
    return new Promise((resolve, reject) => {
      const tx = db!.transaction(CHANNELS_STORE, 'readonly');
      const store = tx.objectStore(CHANNELS_STORE);
      const request = store.get('channels');
      request.onsuccess = () => {
        const data = request.result;
        if (!data?.fetchedAt) {
          resolve(true);
        } else {
          resolve(Date.now() - data.fetchedAt > maxAgeMs);
        }
      };
      request.onerror = () => reject(request.error);
    });
  },

  isEpgStale: async (channelId: string, maxAgeMs = 1800000) => {
    const { db } = get();
    if (!db) await get().init();
    return new Promise((resolve, reject) => {
      const tx = db!.transaction(EPG_STORE, 'readonly');
      const store = tx.objectStore(EPG_STORE);
      const request = store.get(channelId);
      request.onsuccess = () => {
        const data = request.result;
        if (!data?.fetchedAt) {
          resolve(true);
        } else {
          resolve(Date.now() - data.fetchedAt > maxAgeMs);
        }
      };
      request.onerror = () => reject(request.error);
    });
  },

  clear: async () => {
    const { db } = get();
    if (!db) await get().init();
    return new Promise((resolve, reject) => {
      const tx = db!.transaction([CHANNELS_STORE, EPG_STORE], 'readwrite');
      tx.objectStore(CHANNELS_STORE).clear();
      tx.objectStore(EPG_STORE).clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  },
}));

// Auto-init on client
if (typeof window !== 'undefined') {
  useFreeTVCache.getState().init().catch(console.error);
}
```

- [ ] **Step 3: Run dev server and test manually**

```bash
cd /home/junius/Workspace/ts/next-podcast
npm run dev
# Open http://localhost:3000, open DevTools console, run test commands from Step 1
```

- [ ] **Step 4: Commit**

```bash
git add hooks/useFreeTVCache.ts
git commit -m "feat: add IndexedDB cache hook for Free-TV data"
```

---

### Task 3: Create Server API Route - Channels (`app/api/free-tv/channels/route.ts`)

**Files:**
- Create: `app/api/free-tv/channels/route.ts`

- [ ] **Step 1: Write implementation**

```typescript
// app/api/free-tv/channels/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { parseM3U8, FreeTVChannel } from '@/lib/freeTvParser';

const PLAYLIST_URL = 'https://raw.githubusercontent.com/Free-TV/IPTV/master/playlist.m3u8';
const CACHE_DURATION = 15 * 60 * 1000; // 15 minutes

let channelsCache: { data: FreeTVChannel[]; timestamp: number } | null = null;

async function fetchChannels(): Promise<FreeTVChannel[]> {
  const now = Date.now();
  if (channelsCache && now - channelsCache.timestamp < CACHE_DURATION) {
    return channelsCache.data;
  }

  const response = await fetch(PLAYLIST_URL, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; NextPodcast/1.0)' },
    next: { revalidate: 900 }, // Next.js cache 15 min
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch playlist: ${response.status}`);
  }

  const text = await response.text();
  const channels = parseM3U8(text);

  channelsCache = { data: channels, timestamp: now };
  return channels;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const offset = Number(searchParams.get('offset') ?? 0);
    const limit = Math.min(Number(searchParams.get('limit') ?? 48), 200);
    const category = searchParams.get('category') || null;
    const search = searchParams.get('search') || null;

    const allChannels = await fetchChannels();

    let filtered = allChannels;

    if (category) {
      filtered = filtered.filter(c => c.groupTitle === category);
    }

    if (search) {
      const term = search.toLowerCase();
      filtered = filtered.filter(c =>
        c.name.toLowerCase().includes(term) ||
        c.groupTitle?.toLowerCase().includes(term) ||
        c.country?.toLowerCase().includes(term)
      );
    }

    const total = filtered.length;
    const paginated = filtered.slice(offset, offset + limit);

    return NextResponse.json({
      channels: paginated,
      total,
      hasMore: offset + paginated.length < total,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch channels' },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 2: Test API route**

```bash
cd /home/junius/Workspace/ts/next-podcast
npm run dev
# In another terminal:
curl "http://localhost:3000/api/free-tv/channels?limit=5"
```
Expected: JSON with channels array, total, hasMore

- [ ] **Step 3: Commit**

```bash
git add app/api/free-tv/channels/route.ts
git commit -m "feat: add /api/free-tv/channels route with pagination and filtering"
```

---

### Task 4: Create Server API Route - EPG (`app/api/free-tv/epg/route.ts`)

**Files:**
- Create: `app/api/free-tv/epg/route.ts`

- [ ] **Step 1: Write implementation**

```typescript
// app/api/free-tv/epg/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { parseM3U8, parseEpgXML, parseEpgJSON, FreeTVChannel } from '@/lib/freeTvParser';

const PLAYLIST_URL = 'https://raw.githubusercontent.com/Free-TV/IPTV/master/playlist.m3u8';
const EPG_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

const epgCache = new Map<string, { data: any; timestamp: number }>();

async function getChannelTvgUrl(channelId: string): Promise<string | null> {
  const now = Date.now();
  let channels: FreeTVChannel[];

  // Use cached playlist or fetch
  if (channelsCache && now - channelsCache.timestamp < 15 * 60 * 1000) {
    channels = channelsCache.data;
  } else {
    const response = await fetch(PLAYLIST_URL, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; NextPodcast/1.0)' },
    });
    const text = await response.text();
    channels = parseM3U8(text);
    channelsCache = { data: channels, timestamp: now };
  }

  const channel = channels.find(c => c.id === channelId);
  return channel?.tvgUrl || null;
}

let channelsCache: { data: FreeTVChannel[]; timestamp: number } | null = null;

async function fetchEpg(tvgUrl: string): Promise<any[]> {
  const now = Date.now();
  const cached = epgCache.get(tvgUrl);
  if (cached && now - cached.timestamp < EPG_CACHE_DURATION) {
    return cached.data;
  }

  const response = await fetch(tvgUrl, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; NextPodcast/1.0)' },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch EPG: ${response.status}`);
  }

  const contentType = response.headers.get('content-type') || '';
  const text = await response.text();

  let programs: any[] = [];
  if (contentType.includes('xml') || text.trim().startsWith('<?xml') || text.includes('<tv>')) {
    // Will parse per-channel in the route
    programs = [{ rawXml: text }];
  } else if (contentType.includes('json') || text.trim().startsWith('{') || text.trim().startsWith('[')) {
    programs = [{ rawJson: text }];
  } else {
    throw new Error('Unsupported EPG format');
  }

  epgCache.set(tvgUrl, { data: programs, timestamp: now });
  return programs;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const channelId = searchParams.get('channelId');

    if (!channelId) {
      return NextResponse.json({ error: 'channelId required' }, { status: 400 });
    }

    const tvgUrl = await getChannelTvgUrl(channelId);
    if (!tvgUrl) {
      return NextResponse.json([], { status: 200 }); // No EPG source
    }

    const epgData = await fetchEpg(tvgUrl);
    let programs: any[] = [];

    for (const item of epgData) {
      if (item.rawXml) {
        programs.push(...parseEpgXML(item.rawXml, channelId));
      } else if (item.rawJson) {
        programs.push(...parseEpgJSON(item.rawJson, channelId));
      }
    }

    // Convert to EpgSlot format (compatible with LiveTV)
    const epgSlots = programs.map(p => ({
      start: p.start,
      end: p.end,
      title: p.title,
      description: p.description,
      isLive: p.isLive || false,
    }));

    return NextResponse.json(epgSlots);
  } catch (error) {
    console.error('EPG fetch error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch EPG' },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 2: Test API route**

```bash
cd /home/junius/Workspace/ts/next-podcast
npm run dev
# First get a channel ID from /api/free-tv/channels
curl "http://localhost:3000/api/free-tv/channels?limit=1"
# Then test EPG with that ID
curl "http://localhost:3000/api/free-tv/epg?channelId=<id-from-above>"
```
Expected: JSON array of EPG slots

- [ ] **Step 3: Commit**

```bash
git add app/api/free-tv/epg/route.ts
git commit -m "feat: add /api/free-tv/epg route for program guide"
```

---

### Task 5: Create FreeTVGuide Component (`components/FreeTV/FreeTVGuide.tsx`)

**Files:**
- Create: `components/FreeTV/FreeTVGuide.tsx`
- Create: `components/FreeTV/index.ts`

- [ ] **Step 1: Write implementation**

```tsx
// components/FreeTV/FreeTVGuide.tsx
'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { FreeTVChannel } from '@/lib/freeTvParser';
import { EpgSlot } from '@/components/LiveTV/liveChannels';

// Reuse types from LiveGuide but adapt for FreeTVChannel
interface FreeTVGuideProps {
  channels: FreeTVChannel[];
  epgMap: Map<string, EpgSlot[]>;
  activeId: string | null;
  onSelect: (channel: FreeTVChannel) => void;
}

const WINDOW_HOURS = 6;

function roundToHour(ms: number): number {
  const d = new Date(ms);
  d.setMinutes(0, 0, 0);
  return d.getTime();
}

function fmtTime(ms: number): string {
  return new Date(ms).toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

const HOUR_MS = 60 * 60 * 1000;

function AiringsStrip({
  epg,
  guideStart,
  windowMs,
}: {
  epg: EpgSlot[];
  guideStart: number;
  windowMs: number;
}) {
  const visible = epg.filter((p) => p.end > guideStart && p.start < guideStart + windowMs);
  if (visible.length === 0) {
    return (
      <div className="relative h-16 w-full">
        <span className="absolute inset-0 flex items-center px-3 text-xs text-gray-500">—</span>
      </div>
    );
  }
  return (
    <div className="relative h-16 w-full">
      {visible.map((p, i) => {
        const left = ((p.start - guideStart) / windowMs) * 100;
        const width = ((p.end - p.start) / windowMs) * 100;
        return (
          <div
            key={`${p.start}-${i}`}
            className={`absolute top-0 bottom-0 border-r border-gray-700/60 px-2 py-1 overflow-hidden ${
              p.isLive
                ? 'bg-indigo-600/30 text-white'
                : 'bg-gray-800 text-gray-200 hover:bg-gray-700'
            }`}
            style={{ left: `${left}%`, width: `${width}%` }}
            title={p.description || p.title}
          >
            {p.isLive && (
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-500 mr-1 align-middle animate-pulse" />
            )}
            <span className="text-xs font-medium leading-tight block truncate">
              {p.title || '\u00a0'}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export default function FreeTVGuide({ channels, epgMap, activeId, onSelect }: FreeTVGuideProps) {
  const t = useTranslations('live');
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(timer);
  }, []);

  const guideStart = useMemo(() => roundToHour(now), [now]);
  const guideEnd = guideStart + WINDOW_HOURS * HOUR_MS;
  const windowMs = guideEnd - guideStart;

  const intervals = Array.from({ length: WINDOW_HOURS }, (_, i) => guideStart + i * HOUR_MS);

  const nowPct = Math.max(0, Math.min(100, ((now - guideStart) / windowMs) * 100));

  return (
    <div className="bg-gray-900 rounded-xl overflow-hidden border border-gray-800">
      {/* Time Bar */}
      <div className="flex border-b border-gray-800 bg-gray-800/60">
        <div className="w-36 sm:w-44 shrink-0 px-3 py-2 flex items-center text-xs font-semibold text-gray-400">
          {t('epgTitle')}
        </div>
        <div className="relative flex-1 h-full overflow-x-auto">
          <div className="relative h-9 min-w-full" style={{ width: '100%' }}>
            {intervals.map((tick) => (
              <div
                key={tick}
                className="absolute top-0 bottom-0 border-l border-gray-700/60 px-2 text-[11px] text-gray-500 flex items-center whitespace-nowrap"
                style={{ left: `${((tick - guideStart) / windowMs) * 100}%` }}
              >
                {fmtTime(tick)}
              </div>
            ))}
            <div
              className="absolute top-0 bottom-0 w-px bg-red-500/80"
              style={{ left: `${nowPct}%` }}
              suppressHydrationWarning
            />
          </div>
        </div>
      </div>

      {/* Channel Rows */}
      <div className="max-h-[520px] overflow-y-auto">
        {channels.map((channel) => {
          const epg = epgMap.get(channel.id) || [];
          const active = channel.id === activeId;
          return (
            <div
              key={channel.id}
              onClick={() => onSelect(channel)}
              className={`flex border-b border-gray-800/70 last:border-b-0 cursor-pointer transition-colors ${
                active ? 'bg-indigo-900/20' : 'hover:bg-gray-800/40'
              }`}
            >
              {/* Channel Column */}
              <div className="w-36 sm:w-44 shrink-0 px-3 py-2 flex items-center gap-2 min-w-0">
                {channel.logo ? (
                  <img
                    src={channel.logo}
                    alt={channel.name}
                    loading="lazy"
                    className="w-9 h-6 object-contain shrink-0"
                  />
                ) : (
                  <div className="w-9 h-6 shrink-0 rounded bg-gray-700 flex items-center justify-center text-xs font-bold text-gray-300">
                    {channel.name.slice(0, 1)}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-sm font-medium text-white truncate">{channel.name}</p>
                  <p className="text-[11px] text-gray-500 truncate">
                    {channel.groupTitle}
                  </p>
                </div>
                {active && (
                  <span className="ml-auto shrink-0 flex items-center gap-1 bg-red-600 text-white text-[10px] px-1.5 py-0.5 rounded">
                    <span className="w-1 h-1 rounded-full bg-white animate-pulse" />
                    {t('live')}
                  </span>
                )}
              </div>

              {/* Airings Strip */}
              <div className="flex-1 relative">
                <AiringsStrip epg={epg} guideStart={guideStart} windowMs={windowMs} />
                <div
                  className="absolute top-0 bottom-0 w-px bg-red-500/60 pointer-events-none"
                  style={{ left: `${nowPct}%` }}
                  suppressHydrationWarning
                />
              </div>
            </div>
          );
        })}

        {channels.length === 0 && (
          <div className="px-3 py-8 text-center text-sm text-gray-500">
            {t('selectChannel')}
          </div>
        )}
      </div>
    </div>
  );
}
```

```typescript
// components/FreeTV/index.ts
export { default as FreeTVGuide } from './FreeTVGuide';
```

- [ ] **Step 2: Commit**

```bash
git add components/FreeTV/FreeTVGuide.tsx components/FreeTV/index.ts
git commit -m "feat: add FreeTVGuide component for program grid"
```

---

### Task 6: Create FreeTVPage Component (`components/FreeTV/FreeTVPage.tsx`)

**Files:**
- Create: `components/FreeTV/FreeTVPage.tsx`

- [ ] **Step 1: Write implementation**

```tsx
// components/FreeTV/FreeTVPage.tsx
'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { FreeTVChannel } from '@/lib/freeTvParser';
import { EpgSlot } from '@/components/LiveTV/liveChannels';
import LiveTvPlayer from '@/components/LiveTV/LiveTvPlayer';
import { FreeTVGuide } from '@/components/FreeTV';
import { useFreeTVCache } from '@/hooks/useFreeTVCache';

const PAGE_SIZE = 48;

export default function FreeTVPage() {
  const t = useTranslations('live');

  const [activeCategory, setActiveCategory] = useState<string | 'all'>('all');
  const [channels, setChannels] = useState<FreeTVChannel[]>([]);
  const [allCategories, setAllCategories] = useState<string[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [activeEpg, setActiveEpg] = useState<EpgSlot[]>([]);
  const [activeChannel, setActiveChannel] = useState<FreeTVChannel | null>(null);
  const [epgMap, setEpgMap] = useState<Map<string, EpgSlot[]>>(new Map());
  const [now, setNow] = useState(() => Date.now());
  const [cacheStatus, setCacheStatus] = useState<'fresh' | 'stale' | 'loading'>('loading');

  const loadMoreRef = useRef<HTMLDivElement>(null);
  const requestSeqRef = useRef(0);
  const epgMapRef = useRef<Map<string, EpgSlot[]>>(new Map());

  // Cache helpers
  const { getChannels, setChannels: cacheSetChannels, getEpg, setEpg, isChannelsStale, isEpgStale } = useFreeTVCache();

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    epgMapRef.current = epgMap;
  }, [epgMap]);

  // Load channels from cache or API
  const loadChannels = useCallback(async (offset: number, category: string | 'all', reset: boolean) => {
    const seq = ++requestSeqRef.current;
    setLoading(true);

    try {
      // Try cache first for first page
      if (offset === 0 && reset) {
        const cached = await getChannels();
        const stale = await isChannelsStale();
        if (cached && !stale) {
          const filtered = category === 'all' ? cached : cached.filter(c => c.groupTitle === category);
          setChannels(filtered.slice(0, PAGE_SIZE));
          setHasMore(filtered.length > PAGE_SIZE);
          setCacheStatus('fresh');
          setLoading(false);
          return;
        }
        setCacheStatus(stale ? 'stale' : 'loading');
      }

      const params = new URLSearchParams({ offset: String(offset), limit: String(PAGE_SIZE) });
      if (category !== 'all') params.set('category', category);
      const res = await fetch(`/api/free-tv/channels?${params.toString()}`);
      if (!res.ok) throw new Error('fetch failed');
      const data = (await res.json()) as { channels: FreeTVChannel[]; total: number; hasMore: boolean };

      if (seq !== requestSeqRef.current) return;

      if (reset) {
        // Update categories from full response (first page only has subset, need all)
        if (offset === 0) {
          const allRes = await fetch(`/api/free-tv/channels?limit=1000`);
          const allData = await allRes.json();
          const cats = [...new Set(allData.channels.map((c: FreeTVChannel) => c.groupTitle).filter(Boolean))].sort();
          setAllCategories(cats as string[]);
        }
        setChannels(data.channels);
        await cacheSetChannels(data.channels); // Cache first page only for simplicity
      } else {
        setChannels(prev => [...prev, ...data.channels]);
      }
      setHasMore(data.hasMore);
      setCacheStatus('fresh');
    } catch (e) {
      console.error('load channels failed', e);
      // Fallback to cache on error
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
  }, [getChannels, setChannels: cacheSetChannels, isChannelsStale]);

  // Initial load / category change
  useEffect(() => {
    requestSeqRef.current++;
    setChannels([]);
    setHasMore(true);
    setEpgMap(new Map());
    loadChannels(0, activeCategory, true);
  }, [activeCategory, loadChannels]);

  // Channel selection
  const handleSelect = useCallback((channel: FreeTVChannel) => {
    setActiveChannel(channel);
  }, []);

  // Infinite scroll
  useEffect(() => {
    const sentinel = loadMoreRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading) {
          loadChannels(channels.length, activeCategory, false);
        }
      },
      { rootMargin: '200px' }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, loading, channels.length, activeCategory, loadChannels]);

  // Batch EPG for visible channels
  useEffect(() => {
    if (channels.length === 0) return;
    const ids = channels
      .map((c) => c.id)
      .filter((id) => !epgMapRef.current.has(id));
    if (ids.length === 0) return;

    // Fetch in batches of 10
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

  // Active channel EPG detail
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

  // Extract unique categories for tabs
  const categories = useMemo(() => {
    const cats = [...new Set(channels.map(c => c.groupTitle).filter(Boolean))].sort();
    return cats as string[];
  }, [channels]);

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      {/* Hero Player */}
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
        {/* Category Tabs */}
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
          {categories.slice(0, 12).map((cat) => (
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
        </div>

        {/* Cache Status Banner */}
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

        {/* Grid + Sidebar */}
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <FreeTVGuide
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
```

- [ ] **Step 2: Update FreeTV index.ts**

```typescript
// components/FreeTV/index.ts
export { default as FreeTVGuide } from './FreeTVGuide';
export { default as FreeTVPage } from './FreeTVPage';
```

- [ ] **Step 3: Commit**

```bash
git add components/FreeTV/FreeTVPage.tsx components/FreeTV/index.ts
git commit -m "feat: add FreeTVPage component with caching and infinite scroll"
```

---

### Task 7: Create Page Route (`app/[locale]/live/free-tv/page.tsx`)

**Files:**
- Create: `app/[locale]/live/free-tv/page.tsx`

- [ ] **Step 1: Write implementation**

```tsx
// app/[locale]/live/free-tv/page.tsx
import FreeTVPage from '@/components/FreeTV/FreeTVPage';
import Navbar from '@/components/Navbar';
import { setRequestLocale } from 'next-intl/server';
import { routing } from '@/i18n/routing';

interface Props {
  params: Promise<{ locale: string }>;
}

export const revalidate = 900; // 15 minutes

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function FreeTVPageRoute({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  return (
    <>
      <Navbar />
      <FreeTVPage />
    </>
  );
}
```

- [ ] **Step 2: Test page**

```bash
cd /home/junius/Workspace/ts/next-podcast
npm run dev
# Open http://localhost:3000/en/live/free-tv and http://localhost:3000/zh/live/free-tv
```
Expected: Page loads, shows channels, can play, EPG loads

- [ ] **Step 3: Commit**

```bash
git add app/[locale]/live/free-tv/page.tsx
git commit -m "feat: add /live/free-tv page route with locale support"
```

---

### Task 8: Add Translations (`messages/en/live.json`, `messages/zh/live.json`)

**Files:**
- Modify: `messages/en/live.json`
- Modify: `messages/zh/live.json`

- [ ] **Step 1: Update English translations**

```json
// Add to messages/en/live.json inside "live" object
"freeTv": {
  "title": "Free-TV IPTV",
  "subtitle": "Global free IPTV channels",
  "source": "Source: Free-TV/IPTV",
  "refresh": "Refresh",
  "cacheStale": "Showing cached data. Tap to refresh.",
  "epgSource": "EPG from {url}"
}
```

- [ ] **Step 2: Update Chinese translations**

```json
// Add to messages/zh/live.json inside "live" object
"freeTv": {
  "title": "Free-TV IPTV",
  "subtitle": "全球免费 IPTV 频道",
  "source": "来源：Free-TV/IPTV",
  "refresh": "刷新",
  "cacheStale": "显示缓存数据。点击刷新。",
  "epgSource": "节目表来源：{url}"
}
```

- [ ] **Step 3: Commit**

```bash
git add messages/en/live.json messages/zh/live.json
git commit -m "feat: add Free-TV translations for EN and ZH"
```

---

### Task 9: Build Verification

**Files:** None (verification step)

- [ ] **Step 1: Run build**

```bash
cd /home/junius/Workspace/ts/next-podcast
npm run build
```
Expected: Exit code 0, no TypeScript errors

- [ ] **Step 2: Run lint**

```bash
npm run lint
```
Expected: Exit code 0, no ESLint errors

- [ ] **Step 3: Manual verification**

```bash
npm run dev
# Test:
# 1. /en/live/free-tv loads
# 2. Channel grid renders with categories
# 3. Click channel -> plays in hero
# 4. EPG loads in guide grid
# 5. Now/Next panel updates
# 6. Category filter works
# 7. Infinite scroll loads more
# 8. Refresh button works
# 9. Data persists after refresh (IndexedDB)
# 10. Chinese locale works: /zh/live/free-tv
```

- [ ] **Step 4: Commit any fixes**

```bash
git add -A
git commit -m "fix: address build/lint issues from Free-TV integration"
```

---

### Task 10: Final Review & Cleanup

- [ ] Verify all acceptance criteria from spec are met
- [ ] Check for any console errors in production build
- [ ] Ensure no `any` types introduced unnecessarily (follow existing codebase looseness)
- [ ] Verify translations appear correctly in both locales
- [ ] Test EPG with channels that have and don't have tvg-url
- [ ] Document any known limitations in code comments

```bash
git log --oneline -10
# Review commits look clean
```