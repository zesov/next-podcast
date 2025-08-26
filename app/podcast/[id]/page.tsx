import { EpisodeProvider } from '../../contexts/EpisodeContext';
import EpisodePage from '../../components/EpisodeFeed';

export default async function EpisodeFeedPage({ params }: { params: { id: number } }) {
  const {id} = await params;
  return (
    <>
      <EpisodeProvider>
        <EpisodePage id={id} />
      </EpisodeProvider>
    </>
  );
}
