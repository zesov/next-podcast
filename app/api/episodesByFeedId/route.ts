import { NextResponse } from 'next/server';
// @ts-ignore
import { PIApiEpisodeInfo } from 'podcastdx-client/types';
import { client } from '../db';

export async function GET({ params }: { params: { id: number } }) {
  try {
    const result = await client.episodesByFeedId(params.id,{max:10});
    const episodes: PIApiEpisodeInfo[] = result.items;
    return NextResponse.json(episodes);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch posts' },
      { status: 500 }
    );
  }
}