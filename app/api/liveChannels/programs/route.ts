import { NextRequest, NextResponse } from 'next/server';
import { getProgramsForChannels } from '@/lib/liveChannelsDb';

// GET /api/liveChannels/programs?ids=1,2,3
// 批量返回多个频道的节目表（EPG），供节目单网格（grid guide）一次性渲染多频道节目条。
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const raw = searchParams.get('ids') || '';
    const ids = raw
      .split(',')
      .map((s) => Number(s.trim()))
      .filter((n) => Number.isInteger(n) && n > 0)
      .slice(0, 60);
    if (ids.length === 0) {
      return NextResponse.json({ channels: {} }, { status: 200 });
    }
    const programs = await getProgramsForChannels(ids);
    const channels = Object.fromEntries(programs);
    return NextResponse.json({ channels });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch programs' },
      { status: 500 }
    );
  }
}
