import { NextRequest, NextResponse } from 'next/server';
// @ts-ignore
import { PodcastById } from 'podcastdx-client/types';
import { client } from '../db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const result:PodcastById = await client.podcastById(Number(id));
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch posts' },
      { status: 500 }
    );
  }
}