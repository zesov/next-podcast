# /live Feature Refactor — IPTV + M3U8 Integration

**Date:** 2026-09-10
**Status:** Approved
**Approach:** Tab-driven unified page under `/live`

## Goal

Refactor the `/live` route to implement the functionality of [m3u8player.online/iptv](https://www.m3u8player.online/iptv) and [m3u8player.online/m3u8](https://www.m3u8player.online/m3u8) while preserving the existing built-in free-tv data source.

## Scope

- **In scope:** M3U playlist loading (URL + file upload), direct HLS stream playback, unified channel list UI, localStorage/IndexedDB persistence, export/import, server-side M3U proxy
- **Out of scope:** EPG guide overhaul, new video player features (cast, picture-in-picture), DASH/MP4 support

---

## 1. Page Layout & Tab System

### Layout (m3u8player style — left sidebar + right player)

```
┌─────────────────────────────────────────────────────┐
│  Navbar (existing)                                   │
├──────────────────────┬──────────────────────────────┤
│  Tab: Built-in │ M3U │ Direct                       │
├──────────────────────┼──────────────────────────────┤
│                      │                              │
│   Channel list       │   Player area                 │
│   - Search           │   (HLS.js via LiveTvPlayer)  │
│   - Category filter  │                              │
│   - Favorite toggle  │   EPG detail panel            │
│   - Channel items    │   (current + next program)    │
│                      │                              │
├──────────────────────┴──────────────────────────────┤
│  M3U input area (visible only on M3U tab)            │
│  [URL input] [Upload file] [Load button]             │
└─────────────────────────────────────────────────────┘
```

### Tab Data Sources

| Tab | Data Source | Channel Type | EPG |
|-----|------------|-------------|-----|
| Built-in (default) | `/api/freeTv` | `FreeTVChannel` | Yes (`/api/liveChannels/epg`) |
| M3U Playlist | IndexedDB (user-loaded) | `M3UChannel` | No (unless M3U includes EPG URL) |
| Direct Stream | None (single URL input) | N/A | No |

### Unified Channel Type

Both Built-in (`FreeTVChannel`) and M3U (`M3UChannel`) tabs need a common interface for `ChannelList`. Define a shared `LiveChannel` type:

```typescript
interface LiveChannel {
  id: string;
  name: string;
  logo?: string;
  groupTitle?: string;
  streamUrl: string;
  source?: string;       // 'builtin' | 'm3u' | user-provided M3U URL
}
```

Both `FreeTVChannel` and `M3UChannel` are assignable to `LiveChannel`. The `ChannelList` component operates on `LiveChannel[]` only.

### State Management

- `activeTab: 'builtin' | 'm3u' | 'direct'` — current data source
- `channels: LiveChannel[]` — active channel list (switches on tab change)
- `activeChannel: LiveChannel | null` — currently playing channel
- Channel selection persists across tab switches (stored separately per tab)

---

## 2. M3U Playlist Functionality

### Data Flow

```
User inputs URL → Client fetch → Parse M3U → Channel list
                    ↓ (CORS failure)
              /api/parseM3u → Server fetch → Parse → Return JSON
```

### M3U Parser (`lib/m3uParser.ts`)

Parses standard M3U/M3U8 playlist format:
- Extracts from `#EXTINF` tags: name, logo (`tvg-logo`), group (`group-title`), duration
- Falls back to `#EXTGRP` for group-title
- Supports `#EXTM3U` header with `x-tvg-url` for EPG URL hint
- Returns `M3UChannel[]`:

```typescript
interface M3UChannel {
  id: string;           // hash of stream URL
  name: string;
  logo?: string;
  groupTitle?: string;
  streamUrl: string;
  sourceUrl: string;    // original M3U URL (for multi-source tracking)
}
```

### Server-Side Proxy (`/api/parseM3u`)

- **Route:** `POST /api/parseM3u`
- **Input:** `{ url: string }`
- **Behavior:** Fetches M3U file server-side (bypasses CORS), calls m3uParser, returns JSON
- **Security:** Rate-limited (10 req/min/IP), URL validation (must be HTTP/HTTPS)
- **Response:** `{ channels: M3UChannel[], sourceUrl: string, channelCount: number }`

### M3U Input Component (`components/LiveTV/M3UInput.tsx`)

- URL text input + "Load" button
- File upload (accepts `.m3u`, `.m3u8`)
- Loading spinner during fetch
- Error display with retry
- Shows loaded source info (URL, channel count)

### Channel Management

- Loaded M3U channels stored in IndexedDB via `useM3UChannels` hook
- Multiple M3U sources supported — each channel tagged with `sourceUrl`
- Sources list persisted (show previously loaded URLs for quick reload)
- Favorites, search, category filter — same UX as Built-in tab

---

## 3. Direct Stream Tab

### Component (`components/LiveTV/DirectStreamInput.tsx`)

- Simple URL input + "Play" button
- Accepts any HLS/M3U8 URL
- Plays directly via existing HLS.js player (`LiveTvPlayer`)
- No channel list, no EPG
- Saves last 5 URLs to localStorage for quick access
- Optional: favorite URLs (stored in IndexedDB)

---

## 4. Component Architecture

### File Structure

```
lib/
  m3uParser.ts                    # M3U format parser
  m3uParser.test.ts               # Parser unit tests
  m3uStore.ts                     # IndexedDB storage for M3U channels

hooks/
  useM3UChannels.ts               # M3U channel management hook
  useDirectStream.ts              # Direct stream URL management hook

components/LiveTV/
  LiveTvPage.tsx                  # Refactored: unified entry, tab switching
  LiveTvPlayer.tsx                # Preserved: HLS player (unchanged)
  LiveGuide.tsx                   # Preserved: EPG guide grid (unchanged)
  M3UInput.tsx                    # New: URL input + file upload form
  ChannelList.tsx                 # New: unified channel list (multi-source)
  DirectStreamInput.tsx           # New: direct URL input

app/api/
  parseM3u/route.ts               # New: server-side M3U proxy
  liveChannels/                   # Preserved: existing API
  freeTv/                         # Preserved: existing API
```

### Component Responsibilities

| Component | Role | Props |
|-----------|------|-------|
| `LiveTvPage` | State hub — tabs, channels, activeChannel | `categories`, `searchTerm` |
| `ChannelList` | Pure display — renders channel items with search/filter/favorites | `channels`, `activeId`, `onSelect`, `favorites`, `onToggleFavorite` |
| `M3UInput` | M3U loading form — URL + file upload | `onLoad`, `onError`, `loading` |
| `DirectStreamInput` | Simple URL input for direct HLS playback | `onPlay`, `recentUrls` |
| `LiveTvPlayer` | HLS.js player (existing, unchanged) | `channel`, `overlay` |
| `LiveGuide` | EPG grid (existing, unchanged) | `channels`, `epgMap`, `activeId`, `onSelect` |

### Hooks

| Hook | Purpose | Storage |
|------|---------|---------|
| `useM3UChannels` | Load, search, manage M3U channels | IndexedDB |
| `useDirectStream` | Manage direct stream URLs + recents | localStorage + IndexedDB |
| `useFreeTVCache` (existing) | Built-in channel caching | IndexedDB |

---

## 5. Data Persistence & Error Handling

### Persistence Strategy

| Data | Storage | Key |
|------|---------|-----|
| M3U channels | IndexedDB | sourceUrl hash |
| Favorites (all tabs) | IndexedDB | channel ID set |
| Last played channel | localStorage | `live:lastChannel` |
| Active tab | localStorage | `live:activeTab` |
| Recent direct URLs | localStorage | `live:recentUrls` (max 5) |
| M3U source list | IndexedDB | `m3u:sources` |

### Error Handling

| Error | User Message | Action |
|-------|-------------|--------|
| M3U fetch fails (network) | "Network error — check your connection" | Retry button |
| M3U fetch fails (CORS) | "CORS blocked — trying server proxy..." | Auto-fallback to `/api/parseM3u` |
| M3U parse fails | "Invalid M3U format — check the URL" | Show raw response snippet |
| HLS playback fails | "Stream unavailable — the source may be down" | Show replace-source button |
| Server proxy fails | "Server error — try a different URL" | Retry button |

### Security

- `/api/parseM3u`: rate-limited (10 req/min/IP), URL validation (HTTP/HTTPS only)
- M3U URLs never stored server-side — only proxied for parsing
- All user data remains in client-side IndexedDB/localStorage
- No user authentication required

---

## 6. i18n

New translation keys under `live` namespace:

```json
{
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
    "invalidFormat": "Invalid M3U format"
  },
  "direct": {
    "enterUrl": "Enter HLS stream URL",
    "play": "Play",
    "recentUrls": "Recent URLs"
  }
}
```

---

## 7. Testing Strategy

- **Unit tests:** `lib/m3uParser.test.ts` — M3U parsing edge cases (malformed tags, missing fields, unicode names)
- **Integration:** Manual testing of M3U load flow (client + server proxy fallback)
- **Build verification:** `npm run build` must pass
- **No new test framework** — use existing vitest setup

---

## 8. Migration Notes

- `/live/free-tv` route preserved — redirects to `/live` with `?tab=builtin`
- Existing `LiveTvPage` refactored in-place (not deleted)
- `FreeTVPage` and `FreeTVGuide` components retained as internal implementation of Built-in tab
- No breaking changes to existing API routes
