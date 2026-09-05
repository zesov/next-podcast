import { NextRequest, NextResponse } from 'next/server';
import { getProgramsForChannel } from '@/lib/liveChannelsDb';

// GET /api/liveChannels/epg?channelId=1
// 按需返回某频道当日节目表（EPG）。
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const channelId = Number(searchParams.get('channelId'));
    if (!Number.isInteger(channelId)) {
      return NextResponse.json({ error: 'Invalid channelId' }, { status: 400 });
    }
    const epg = await getProgramsForChannel(channelId);
    return NextResponse.json(epg);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch EPG' },
      { status: 500 }
    );
  }
}