import Image from "next/image";
import { client } from "./api/db";
import Head from 'next/head'
import Navbar from './components/Navbar'
import FeaturedSection from './components/FeaturedSection'
import CategorySection from './components/CategorySection'
import TopPodcasts from './components/TopPodcasts'
import TopEpisodes from './components/TopEpisodes'
import Player from './components/Player'
import Recommended from './components/Recommended'
import Categories from './components/Categories'
import Footer from './components/Footer'


export default async function Home() {
  const query = "rthk";
  const {feeds} = await client.search(query,{max:4});
  const topPodcasts = await client.trending({max:6});
  const recentEpisodes = await client.recentEpisodes({max:6});
  // console.log("recentEpisodes",recentEpisodes);
  const episode = recentEpisodes.items[0];
  return (
    <>
    <div className="bg-gray-100 text-gray-900 font-sans">
      <Head>
        <title>Apple 播客(CN) - 网页播放器</title>
        <meta name="description" content="Apple Podcasts Web Player" />
        <link rel="icon" href="/favicon.ico" />
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />
      </Head>

      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col lg:flex-row gap-6">
          <div className="lg:w-2/3">
            <FeaturedSection data={feeds}/>
            <CategorySection />
            <TopPodcasts data={topPodcasts.feeds}/>
            <TopEpisodes items={recentEpisodes.items}/>
          </div>

          <div className="lg:w-1/3">
            <Player episode={episode}/>
            <Recommended />
            <Categories />
          </div>
        </div>
      </div>

      <Footer />
    </div>
    </>
  );
}
