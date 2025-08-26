import { NextRequest, NextResponse } from 'next/server';
import { client } from '../db';

export async function GET(
  request: NextRequest
) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const result = await client.episodesByFeedId(Number(id),{max:10});
    return NextResponse.json(result.items);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch posts' },
      { status: 500 }
    );
  }
}