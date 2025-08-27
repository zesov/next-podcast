import { EpisodeProvider } from '@/app/contexts/EpisodeContext';
import EpisodePage from '@/components/EpisodeFeed';
import Navbar  from '@/components/Navbar';

export default async function EpisodeFeedPage({ params }: { params: { id: number } }) {
  const {id} = await params;
  return (
    <>
    <Navbar />
      <EpisodeProvider>
        <EpisodePage id={id} />
      </EpisodeProvider>
    </>
  );
}
