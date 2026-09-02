import { NextRequest, NextResponse } from 'next/server';
import { getLiveChannelsPage, PAGE_SIZE } from '@/lib/liveChannelsDb';

// GET /api/liveChannels?offset=0&limit=48&category=Sports
// 分页返回启用频道列表（不含 EPG），供客户端无限滚动加载。
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const offset = Number(searchParams.get('offset') ?? 0);
    const limit = Math.min(Number(searchParams.get('limit') ?? PAGE_SIZE), 200);
    const category = searchParams.get('category') || null;

    const result = await getLiveChannelsPage({ offset, limit, category });
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch channels' },
      { status: 500 }
    );
  }
}