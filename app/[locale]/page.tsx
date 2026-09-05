import { client } from "@/app/api/db";
import Main from "@/components/main";
import { EpisodeProvider } from "@/app/contexts/EpisodeContext";
import { setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";

interface Props {
  params: Promise<{ locale: string }>;
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function Home({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const query = "rthk";
  const [searchPodcastsData, trendingPodcastsData, recentEpisodesData, episodesRandomData, categoriesData] = await Promise.all([
    client.search(query,{max:6}),
    client.trending({ max: 8 }),
    client.recentEpisodes({ max: 6 }),
    client.episodesRandom({ max: 3 }),
    client.categories(),
  ]);

  const { feeds } = trendingPodcastsData; 

  return (
    <EpisodeProvider>
      <Main feeds={feeds} topPodcasts={searchPodcastsData} 
      recentEpisodes={recentEpisodesData} episodesRandom={episodesRandomData} categories={categoriesData}/>
    </EpisodeProvider>
  );
}
