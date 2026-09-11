# app/ AGENTS.md

## OVERVIEW
Next.js App Router containing server components, API routes, context providers, and internationalization configuration.

## STRUCTURE
```
app/
├── [locale]/             # Internationalized routes (zh, en)
│   ├── page.tsx          # Home page with random category podcasts
│   ├── layout.tsx        # Locale-specific layout with i18n and PWA
│   ├── live/             # Live TV routes
│   ├── podcast/          # Podcast browsing and episode pages
│   └── peertube/         # PeerTube video search and browsing
├── api/                  # API route handlers
│   ├── db.ts             # Podcast Index client configuration
│   ├── podcastById/      # Podcast metadata endpoint
│   ├── episodesByFeedId/ # Podcast episodes endpoint
│   ├── track/            # Playback tracking endpoints
│   └── youtube/          # YouTube live stream proxy
├── contexts/             # React context providers
│   └── EpisodeContext.ts # Playback state sharing
├── types.ts              # TypeScript interfaces for API responses
├── manifest.ts           # PWA manifest configuration
└── globals.css           # Global styles and Tailwind configuration
```

## WHERE TO LOOK
| Task | Location | Notes |
|------|----------|-------|
| Understanding data flow | app/ | See "Data flow (critical to understand before editing)" in root AGENTS.md |
| Adding new page | app/[locale]/ | Create route.tsx file following existing patterns |
| Adding API endpoint | app/api/ | Create route.ts file following existing patterns |
| Modifying context | app/contexts/ | Follow EpisodeContext pattern |
| Changing i18n config | app/[locale]/layout.tsx | Uses next-intl for language switching |
| Updating PWA | app/manifest.ts | PWA manifest configuration |
| Modifying global styles | app/globals.css | Tailwind v4 configuration |

## CONVENTIONS
- **Server vs Client Components**: Server components (app/*) import Podcast Index client directly; client components (components/*) must fetch via internal API routes
- **Route Files**: Use `route.ts` for API endpoints, `page.tsx` for pages, `layout.tsx` for layouts
- **Internationalization**: Uses next-intl with `setRequestLocale` in layout.tsx and page.tsx
- **Context Pattern**: EpisodeContext wraps pages that need playback state (Home, podcast pages)
- **API Response Handling**: All API routes validate required fields and handle errors gracefully
- **Environment Variables**: Uses process.env for configuration with fallback values

## UNIQUE STYLES
- **Deno KV Integration**: Uses Deno Deploy KV for persistent playback tracking with HTTP proxy fallback in lib/analytics.ts
- **Privacy-First Tracking**: IP hashing, anonymous session IDs, no PII stored in playback tracking (lib/privacy.ts)
- **Route Segmentation**: API routes organized by feature (podcast, track, youtube) under app/api/
- **Metadata Configuration**: PWA manifest and viewport configured in app/manifest.ts and app/[locale]/layout.tsx