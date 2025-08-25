import { client } from "./api/db";
import Main from './components/main';
import { EpisodeProvider } from './contexts/EpisodeContext';

export default async function Home() {
  const query = "rthk";
  const {feeds} = await client.search(query,{max:4});
  const topPodcasts = await client.trending({max:6});
  const recentEpisodes = await client.recentEpisodes({max:6});
  return (
    <EpisodeProvider>
      <Main feeds={feeds} topPodcasts={topPodcasts} recentEpisodes={recentEpisodes} />
    </EpisodeProvider>
  );
}
