'use client';
import Head from 'next/head'
import Navbar from './Navbar'
import FeaturedSection from './FeaturedSection'
import CategorySection from './CategorySection'
import TopPodcasts from './TopPodcasts'
import TopEpisodes from './TopEpisodes'
import Player from './Player'
import Recommended from './Recommended'
import Categories from './Categories'
import Footer from './Footer'

export default function Index({feeds,topPodcasts,recentEpisodes}: any) {

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
