import { NextRequest, NextResponse } from 'next/server';
import { parseM3U8, FreeTVChannel } from '@/lib/freeTvParser';

const PLAYLIST_URL = 'https://raw.githubusercontent.com/Free-TV/IPTV/master/playlist.m3u8';
const CACHE_DURATION = 15 * 60 * 1000;

let channelsCache: { data: FreeTVChannel[]; timestamp: number } | null = null;

async function fetchChannels(): Promise<FreeTVChannel[]> {
  const now = Date.now();
  if (channelsCache && now - channelsCache.timestamp < CACHE_DURATION) {
    return channelsCache.data;
  }

  const response = await fetch(PLAYLIST_URL, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; NextPodcast/1.0)' },
    next: { revalidate: 900 },
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