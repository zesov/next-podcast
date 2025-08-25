import Image from "next/image";
import PodcastIndexClient from "podcastdx-client";
import {feeds} from "./demo";
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

export function createClient(key: string, secret: string) {
  // if (!key) {
  //   console.log(`PODCAST_INDEX_KEY is not set`);
  //   return;
  // }
  return new PodcastIndexClient({ key, secret, disableAnalytics: true });
}

export default async function Home() {
  console.log(process.env.PODCAST_INDEX_KEY);
  const query = "rthk";
  const {feeds} = await client.search(query,{max:4});
  // console.log(client,feeds);
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
            <TopPodcasts />
            <TopEpisodes />
          </div>

          <div className="lg:w-1/3">
            <Player />
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
