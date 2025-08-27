import { client } from "./api/db";
import Main from '../components/main';
import { EpisodeProvider } from './contexts/EpisodeContext';

export default async function Home() {
  const query = "rthk";
  const [feedsData, topPodcastsData, recentEpisodesData, episodesRandomData, categoriesData] = await Promise.all([
    client.search(query,{max:8}),
    client.trending({ max: 6 }),
    client.recentEpisodes({ max: 6 }),
    client.episodesRandom({ max: 3 }),
    client.categories(),
  ]);

  const { feeds } = feedsData;
  const topPodcasts = topPodcastsData;
  const recentEpisodes = recentEpisodesData;
  const episodesRandom = episodesRandomData;
  const categories = categoriesData;

  return (
    <EpisodeProvider>
      <Main feeds={feeds} topPodcasts={topPodcasts} 
      recentEpisodes={recentEpisodes} episodesRandom={episodesRandom} categories={categories}/>
    </EpisodeProvider>
  );
}
