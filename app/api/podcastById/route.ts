import { NextResponse } from 'next/server';
// @ts-ignore
import { PodcastById } from 'podcastdx-client/types';
import { client } from '../db';

export async function GET({ params }: { params: { id: number } }) {
  try {
    const result:PodcastById = await client.podcastById(params.id);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch posts' },
      { status: 500 }
    );
  }
}