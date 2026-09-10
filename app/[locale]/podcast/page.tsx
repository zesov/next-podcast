import { EpisodeProvider } from '@/app/contexts/EpisodeContext';
import {client} from '@/app/api/db';
import Navbar  from '@/components/Navbar';
import { TopPodcast } from '@/app/types';
import PodcastPage from '@/components/Podcast/Podcast';
import { setRequestLocale } from 'next-intl/server';
import { routing } from '@/i18n/routing';

interface Props {
  params: Promise<{ tag: string; locale: string }>;
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function EpisodeFeedPage({ params }: Props) {
  const { tag, locale } = await params;
  setRequestLocale(locale);
  const { feeds } = await client.raw(`/podcasts/bytag?podcast-value=${tag}&max=20&pretty`) as {feeds: TopPodcast[]};

  return (
    <>
    <Navbar />
      <EpisodeProvider>
        <PodcastPage feeds={feeds} />
      </EpisodeProvider>
    </>
  );
}