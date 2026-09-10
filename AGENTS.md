# AGENTS.md

## What this is
A **podcast web player** (Next.js 16 App Router) that surfaces Hong Kong / RTHK podcasts from the [Podcast Index](https://podcastindex.org) API. Not generated with a formal design system — hand-rolled Tailwind utility components.

## Commands
- `bun dev` / `npm run build` — run under **Turbopack** (script includes `--turbopack`)
- `npm run lint` — ESLint (next/core-web-vitals + next/typescript). This is the **only** verification; there is **no test suite and no `typecheck` script**. Run `npm run build` to typecheck.
- Package manager is mixed: both `bun.lock` and `package-lock.json` are committed. Use `bun` for installs, but don't remove either lockfile.

## Data flow (critical to understand before editing)
There are **two** fetch paths, and mixing them up is the most common mistake:

1. **Server components** (`app/page.tsx`, `app/podcast/page.tsx`, `app/podcast/[id]/page.tsx`) import the Podcast Index client **directly** from `app/api/db.ts` (e.g. `client.search`, `client.trending`, `client.raw('/podcasts/bytag?...')`).
2. **Client components** (`components/*`) **must not** touch the client — they `fetch()` the internal API routes `/api/podcastById?id=...` and `/api/episodesByFeedId?id=...`.

Playback state is shared via the `EpisodeContext` (`useEpisode` hook), which wraps pages in `app/page.tsx` and `app/podcast/[id]/page.tsx`. The global `<Player>` reads `currentEpisode`/`toPlay` from it.

## Environment / secrets
- `.env` holds `PODCAST_INDEX_KEY` (gitignored). The app **needs it** to hit Podcast Index.
- `app/api/db.ts` also hardcodes a Podcast Index **secret string** in source — this is the App Secret (a static value for this account). Do not rotate it without matching `.env` and the podcastdx account.
- `client.raw(path)` is used for endpoints `podcastdx-client` doesn't surface — the results are cast with `as`, sometimes from untyped `// @ts-ignore`'d imports (`podcastdx-client/types`).

## Project conventions
- **TypeScript is loose here**: `any` and `// @ts-ignore` are used liberally in components (`components/main.tsx`, `components/FeaturedCarousel.tsx`, `app/api/podcastById/route.ts`). Match the surrounding looseness rather than introducing strict typing.
- **Bilingual**: UI text and code comments mix English and Simplified Chinese. Keep this — do not strip or translate comments.
- `@/*` path alias → repo root (so `@/components/...`, `@/app/...`).
- Tailwind v4 (`@import "tailwindcss"` in `app/globals.css`, `@tailwindcss/postcss` plugin). Custom slick overrides live in `globals.css`.
- **react-slick** is used for carousels; its CSS must stay imported (`components/FeaturedCarousel.tsx` imports `slick.css` + `slick-theme.css`).
- Next.js 15: route `params` are async — always `const { id } = await params`.
- `next.config.ts` whitelists **all** remote image hosts (`hostname: '**'`) — required because artwork/audio URLs come from arbitrary podcast RSS feeds, not just RTHK.

## Gotchas
- `tsconfig.json` `include` references `podcast/[id]/page.js` — a stale entry; the real file is `app/podcast/[id]/page.tsx`. Don't "fix" it without checking nothing depends on it.
- `.code-context/` is untracked (agent scratch dir) — don't commit it.
- No test infra exists; if you add behavior, verify via `npm run build` + manual dev-server check rather than inventing a test framework.

## Important
- 使用frontend-design skills
- omo Delegated tasks任务分配10秒超时无反应后，用主agent直接执行
- TDD测试优先开发模式优先
- 不要自动 git commit，要由user明确提出先commit

### browse playwright
- 直接使用bash命令 uvx playwright  