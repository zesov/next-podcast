import { getClient, PlaybackKeys } from '@/lib/analytics';
import { client } from '@/app/api/db';
import { TopPodcast } from '@/app/types';
import RankingsContent from './RankingsContent';

export default async function RankingPage({
  params
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  
  let rankings: { podcast: TopPodcast; count: number }[] | null = null;
  let error: string | null = null;

  try {
    const kvClient = getClient();
    const prefix = ['playback', 'podcast'] as const;
    const result = await kvClient.list<number>({ prefix, limit: 1000 });
    
    const podcastCounts = result.entries.map(entry => ({
      contentId: (entry.key as string[])[2],
      count: entry.value ?? 0
    }));
    
    const top10 = podcastCounts
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
    
    const podcastPromises = top10.map(async ({ contentId, count }) => {
      try {
        const { feed } = await client.raw(`/podcasts/byfeedid?id=${contentId}`) as { feed: TopPodcast };
        return { podcast: feed, count };
      } catch (err) {
        console.error(`Failed to fetch podcast for contentId ${contentId}:`, err);
        return null;
      }
    });
    
    const podcastResults = await Promise.all(podcastPromises);
    rankings = podcastResults.filter((result): result is { podcast: TopPodcast; count: number } => result !== null);
  } catch (err) {
    console.error('Failed to fetch rankings:', err);
    error = 'Failed to load rankings. Please try again later.';
  }
  
  return (
    <RankingsContent rankings={rankings} error={error} locale={locale} />
  );
}