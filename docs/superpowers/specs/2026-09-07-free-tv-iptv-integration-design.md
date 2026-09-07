# Free-TV IPTV Integration Design

## Overview

Add a new page `/[locale]/live/free-tv` that surfaces channels from the [Free-TV IPTV](https://raw.githubusercontent.com/Free-TV/IPTV/master/playlist.m3u8) playlist, with EPG data fetched from each channel's `x-tvg-url` (tvg-url attribute). The feature runs alongside the existing SQLite-based LiveTV system as a separate page.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    /[locale]/live/free-tv                   │
│                         (New Page)                           │
└──────────────────────┬──────────────────────────────────────┘
                       │
        ┌──────────────┼──────────────┐
        ▼              ▼              ▼
┌──────────────┐ ┌────────────┐ ┌────────────┐
│ FreeTVPage   │ │ FreeTVGuide│ │ LiveTvPlayer│
│ (Client)     │ │ (Client)   │ │ (Reused)    │
└──────┬───────┘ └─────┬──────┘ └────────────┘
       │               │
       ▼               ▼
┌──────────────────────────────────┐
│  IndexedDB Cache (Client)        │
│  - channels: FreeTVChannel[]     │
│  - epgMap: Map<id, EpgSlot[]>    │
│  - lastFetched: timestamp        │
└──────────────┬───────────────────┘
               │
        ┌──────┴──────┐
        ▼             ▼
┌───────────────┐ ┌───────────────┐
│/api/free-tv/  │ │/api/free-tv/  │
│channels       │ │epg            │
│(Server)       │ │(Server)       │
└───────┬───────┘ └───────┬───────┘
        │                 │
        ▼                 ▼
┌──────────────────────────────────────┐
│  Free-TV IPTV Source                 │
│  - playlist.m3u8 (GitHub raw)        │
│  - x-tvg-url (EPG XML/JSON)          │
└──────────────────────────────────────┘
```

## Components

### 1. M3U8 Parser (`lib/freeTvParser.ts`)

Parses the M3U8 playlist from Free-TV GitHub repo.

**Types:**
```typescript
export interface FreeTVChannel {
  id: string;              // tvg-id or generated hash
  name: string;            // tvg-name
  logo?: string;           // tvg-logo
  groupTitle?: string;     // group-title (category)
  streamUrl: string;       // The actual m3u8 URL
  tvgUrl?: string;         // x-tvg-url for EPG
  country?: string;        // tvg-country
  language?: string;       // tvg-language
}

export interface FreeTVEpgProgram {
  channelId: string;
  title: string;
  description: string;
  start: number;           // epoch ms
  end: number;             // epoch ms
  isLive?: boolean;
}
```

**Functions:**
- `parseM3U8(content: string): FreeTVChannel[]` - Parses full playlist
- `parseEpgXML(content: string, channelId: string): FreeTVEpgProgram[]` - Parses XMLTV format EPG
- `parseEpgJSON(content: string, channelId: string): FreeTVEpgProgram[]` - Parses JSON EPG

### 2. Server API Routes

#### `GET /api/free-tv/channels`
Returns paginated, filterable channel list.

**Query params:**
- `offset` (default: 0)
- `limit` (default: 48, max: 200)
- `category` (group-title filter)
- `search` (name/logo/group-title fuzzy match)

**Response:**
```json
{
  "channels": FreeTVChannel[],
  "total": number,
  "hasMore": boolean
}
```

**Caching:** 15-minute server-side cache (Next.js `revalidate` or in-memory)

#### `GET /api/free-tv/epg?channelId=xxx`
Returns EPG for a single channel.

**Response:** `EpgSlot[]` (compatible with existing `LiveChannel.epg`)

**Caching:** 5-minute server-side cache per channel

### 3. IndexedDB Cache (`hooks/useFreeTVCache.ts`)

Client-side persistence using IndexedDB (via `idb` library or native API).

**Schema:**
```
ObjectStore: "free-tv-channels"
  - key: "channels"
  - value: { channels: FreeTVChannel[], fetchedAt: number }

ObjectStore: "free-tv-epg"
  - key: channelId (string)
  - value: { programs: EpgSlot[], fetchedAt: number }
```

**Methods:**
- `getChannels(): Promise<FreeTVChannel[] | null>`
- `setChannels(channels: FreeTVChannel[]): Promise<void>`
- `getEpg(channelId: string): Promise<EpgSlot[] | null>`
- `setEpg(channelId: string, programs: EpgSlot[]): Promise<void>`
- `isChannelsStale(maxAgeMs = 3600000): boolean` // 1 hour
- `isEpgStale(channelId: string, maxAgeMs = 1800000): boolean` // 30 min
- `clear(): Promise<void>`

### 4. FreeTVPage (`components/FreeTV/FreeTVPage.tsx`)

Client component mirroring `LiveTvPage` structure.

**State:**
- `activeCategory: string | 'all'`
- `channels: FreeTVChannel[]`
- `hasMore: boolean`
- `loading: boolean`
- `epgMap: Map<string, EpgSlot[]>`
- `activeChannel: FreeTVChannel | null`
- `activeEpg: EpgSlot[]`

**Effects:**
1. On mount/category change: load page 0 from cache or API
2. Infinite scroll: load more via IntersectionObserver
3. Batch EPG fetch for visible channels
4. Active channel EPG detail fetch

**Render:**
- Hero player with `LiveTvPlayer` + overlay metadata
- Category tabs (from unique `groupTitle` values)
- `FreeTVGuide` grid (left 2/3)
- Now/Next program panel (right 1/3)

### 5. FreeTVGuide (`components/FreeTV/FreeTVGuide.tsx`)

Reuses `LiveGuide` logic with Free-TV data. Props compatible with `LiveGuideProps` but using `FreeTVChannel`.

### 6. Reused Components
- `LiveTvPlayer` - Works as-is for HLS streams
- Translation system via `next-intl`

## Translations

Add `freeTv` namespace to existing live translation files:

**`messages/en/live.json`** and **`messages/zh/live.json`**:
```json
{
  "live": {
    "freeTv": {
      "title": "Free-TV IPTV",
      "subtitle": "Global free IPTV channels",
      "source": "Source: Free-TV/IPTV",
      "refresh": "Refresh channels",
      "lastUpdated": "Updated {timeAgo}",
      "epgSource": "EPG from {url}"
    }
  }
}
```

## URL Structure

- `/en/live/free-tv` and `/zh/live/free-tv` (locale-aware)
- Static generation with `revalidate = 900` (15 min)
- `generateStaticParams` returns all locales

## Error Handling

| Scenario | Behavior |
|----------|----------|
| Network failure fetching playlist | Show cached data with warning banner "Showing cached data" |
| Invalid M3U8 format | Log error, return empty array, show "Failed to load channels" |
| EPG fetch fails (CORS, 404, parse error) | Log error, return empty EPG, show "No program guide available" |
| Channel stream fails to play | `LiveTvPlayer` shows "nonHttpStream" or "unsupported" message |
| IndexedDB unavailable | Fall back to memory-only, log warning |

## Performance Considerations

- **Pagination**: 48 channels per page, infinite scroll
- **Batch EPG**: Fetch EPG for visible channels in batches of 10
- **Server caching**: 15 min channels, 5 min EPG reduces GitHub requests
- **Client caching**: IndexedDB persists across sessions, 1hr/30min TTL
- **Image optimization**: Next.js Image for logos (already configured for all hosts)

## Security

- Server-side EPG fetching avoids CORS issues with `tvg-url`
- No authentication needed (public playlist)
- Sanitize all parsed data before rendering (XSS prevention)
- `tvg-url` only fetched server-side, never exposed to client directly

## Testing Strategy

- Unit tests for `parseM3U8`, `parseEpgXML`, `parseEpgJSON`
- Integration test for `/api/free-tv/channels` with sample M3U8
- Integration test for `/api/free-tv/epg` with sample XMLTV/JSON
- Manual verification: dev server → `/live/free-tv` → play channel → check EPG

## File Structure

```
components/
  FreeTV/
    FreeTVPage.tsx
    FreeTVGuide.tsx
    index.ts
hooks/
  useFreeTVCache.ts
lib/
  freeTvParser.ts
app/
  [locale]/
    live/
      free-tv/
        page.tsx
  api/
    free-tv/
      channels/
        route.ts
      epg/
        route.ts
messages/
  en/
    live.json (updated)
  zh/
    live.json (updated)
```

## Acceptance Criteria

1. ✅ Navigate to `/live/free-tv` → shows channel grid with categories
2. ✅ Click channel → plays in hero player (HLS via hls.js)
3. ✅ EPG loads for visible channels → shows in guide grid
4. ✅ Active channel shows Now/Next program in sidebar
5. ✅ Category filter works → reloads channels
6. ✅ Search works → filters channels
7. ✅ Infinite scroll loads more channels
8. ✅ Refresh button (or cache expiry) refetches from GitHub
9. ✅ Data persists in IndexedDB across browser sessions
10. ✅ Chinese/English translations work
11. ✅ No console errors in production build