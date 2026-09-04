import { NextRequest, NextResponse } from 'next/server';
import { getLiveChannelsPage, searchLiveChannels, PAGE_SIZE } from '@/lib/liveChannelsDb';

// GET /api/liveChannels?offset=0&limit=48&category=Sports&search=query
// 分页返回启用频道列表（不含 EPG），供客户端无限滚动加载。
// 支持 search 参数进行关键词搜索（名称、分类、描述等）。
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const offset = Number(searchParams.get('offset') ?? 0);
    const limit = Math.min(Number(searchParams.get('limit') ?? PAGE_SIZE), 200);
    const category = searchParams.get('category') || null;
    const search = searchParams.get('search') || null;

    let result;
    if (search) {
      result = await searchLiveChannels(search, { offset, limit });
    } else {
      result = await getLiveChannelsPage({ offset, limit, category });
    }
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch channels' },
      { status: 500 }
    );
  }
}