import { EpisodeProvider } from '@/app/contexts/EpisodeContext';
import {client} from '@/app/api/db';
import Navbar  from '@/components/Navbar';
import TopPodcasts  from '@/components/TopPodcasts';
import EpisodePage  from '@/components/EpisodeFeed';
import { TopPodcast } from '@/app/types';
import PodcastPage from '@/components/Podcast';

export default async function EpisodeFeedPage({ params }: { params: { tag: string } }) {
  const {tag} = await params;
  const {feeds} = await client.raw(`/podcasts/bytag?podcast-value=${tag}&max=20&pretty`) as {feeds: TopPodcast[]};

  return (
    <>
    <Navbar />
      <EpisodeProvider>
        {/* <EpisodePage id={1} /> */}
        <PodcastPage feeds={feeds} />
                    {/* <TopPodcasts data={feeds}/> */}
                    {/* <TopEpisodes items={recentEpisodes.items}/> */}
      </EpisodeProvider>
    </>
  );
}