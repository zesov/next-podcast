import { NextRequest, NextResponse } from 'next/server';
import { parseM3U8, parseEpgXML, parseEpgJSON, parseEpgXMLWithChannels, FreeTVChannel } from '@/lib/freeTvParser';

const PLAYLIST_URL = 'https://raw.githubusercontent.com/Free-TV/IPTV/master/playlist.m3u8';
const EPG_CACHE_DURATION = 5 * 60 * 1000;

const epgCache = new Map<string, { data: any; timestamp: number }>();

let channelsCache: { data: FreeTVChannel[]; timestamp: number } | null = null;

async function getChannelTvgUrl(channelId: string): Promise<string | null> {
  const now = Date.now();
  let channels: FreeTVChannel[];

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

async function fetchEpg(tvgUrl: string): Promise<any[]> {
  const urls = tvgUrl.split(',').map(u => u.trim()).filter(Boolean);
  
  for (const url of urls) {
    try {
      const now = Date.now();
      const cached = epgCache.get(url);
      if (cached && now - cached.timestamp < EPG_CACHE_DURATION) {
        return cached.data;
      }

      const response = await fetch(url, {
        headers: { 
          'User-Agent': 'Mozilla/5.0 (compatible; NextPodcast/1.0)',
          'Accept-Encoding': 'gzip, deflate',
        },
      });

      if (!response.ok) {
        continue;
      }

      const contentEncoding = response.headers.get('content-encoding') || '';
      const isGzipped = contentEncoding.includes('gzip') || url.endsWith('.gz');
      
      let text: string;
      if (isGzipped) {
        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        text = gunzipSync(buffer).toString('utf-8');
      } else {
        text = await response.text();
      }

      const contentType = response.headers.get('content-type') || '';
      
      let programs: any[] = [];
      if (contentType.includes('xml') || text.trim().startsWith('<?xml') || text.includes('<tv>')) {
        programs = [{ rawXml: text }];
      } else if (contentType.includes('json') || text.trim().startsWith('{') || text.trim().startsWith('[')) {
        programs = [{ rawJson: text }];
      } else {
        continue;
      }

      epgCache.set(url, { data: programs, timestamp: now });
      return programs;
    } catch {
      continue;
    }
  }
  
  throw new Error('All EPG URLs failed');
}

function gunzipSync(buffer: Buffer): Buffer {
  const zlib = require('zlib');
  return zlib.gunzipSync(buffer);
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
      return NextResponse.json([], { status: 200 });
    }

    // Fetch all playlist channels for name matching
    let allChannels: FreeTVChannel[];
    if (channelsCache && Date.now() - channelsCache.timestamp < 15 * 60 * 1000) {
      allChannels = channelsCache.data;
    } else {
      const response = await fetch(PLAYLIST_URL, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; NextPodcast/1.0)' },
      });
      const text = await response.text();
      allChannels = parseM3U8(text);
      channelsCache = { data: allChannels, timestamp: Date.now() };
    }

    const epgData = await fetchEpg(tvgUrl);
    let programs: any[] = [];

    for (const item of epgData) {
      if (item.rawXml) {
        const matched = parseEpgXMLWithChannels(item.rawXml, allChannels);
        console.log(`EPG matched ${matched.length} programmes for ${channelId}`);
        programs.push(...matched);
      } else if (item.rawJson) {
        programs.push(...parseEpgJSON(item.rawJson, channelId));
      }
    }

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