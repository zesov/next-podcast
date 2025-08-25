'use client'
import { useState, useEffect } from 'react';
import Head from 'next/head';
import Image from 'next/image';
import { Episode } from "../../types";

interface Podcast {
  id: string;
  title: string;
  author: string;
  description: string;
  image: string;
  category: string;
  episodes: Episode[];
}
const fetchData = async (id: number) => {
  const podcast = await fetch(`/api/podcastById?id=${id}`);
  const res = await fetch(`/api/episodesByFeedId?id=${id}`);
  return {
    podcast: await podcast.json(),
    episodes: await res.json(),
  };
}
export default function EpisodePage({ params }: { params: { id: number } }) {
  const episodeId = params.id;
  console.log('params',episodeId)

  const [currentEpisode, setCurrentEpisode] = useState<Episode | null>(null);
  const [podcast, setPodcast] = useState<Podcast | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);


  // 模拟数据获取
  useEffect(() => {
    fetchData(episodeId).then(res=>{
      console.log('res', res);
      const {podcast, episodes} = res;
      setPodcast({...podcast.feed, episodes});
      setCurrentEpisode(episodes[0]);
    });
  }, [episodeId]);

  // 播放控制函数
  const togglePlay = () => setIsPlaying(!isPlaying);
  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseInt(e.target.value);
    setCurrentTime(newTime);
    // 实际应用中应该更新音频元素的当前时间
  };

  if (!podcast || !currentEpisode) {
    return <div className="flex justify-center items-center min-h-screen">Loading...</div>;
  }

  return (
    <>
      <Head>
        <title>{currentEpisode.title} - {podcast.title}</title>
        <meta name="description" content={currentEpisode.description} />
      </Head>

      <div className="min-h-screen bg-gray-50">
        {/* 导航栏 */}
        <nav className="bg-white shadow-sm border-b">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center">
                <button onClick={() => {}} className="mr-4">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <h1 className="text-xl font-semibold text-gray-900">{podcast.title}</h1>
              </div>
            </div>
          </div>
        </nav>

        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* 播客信息头部 */}
          <div className="flex flex-col md:flex-row items-start space-y-6 md:space-y-0 md:space-x-8 mb-12">
            <div className="flex-shrink-0">
              <Image
                src={podcast.image}
                alt={podcast.title}
                width={300}
                height={300}
                className="rounded-2xl shadow-lg"
              />
            </div>
            
            <div className="flex-1">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">{currentEpisode.title}</h2>
              <p className="text-lg text-gray-600 mb-4">{podcast.author}</p>
              
              <div className="flex items-center space-x-4 mb-6">
                <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm">
                  {podcast.category}
                </span>
                <span className="text-gray-500 text-sm">{currentEpisode.datePublishedPretty}</span>
                <span className="text-gray-500 text-sm">{currentEpisode.duration}</span>
              </div>

              <p className="text-gray-700 mb-6 leading-relaxed">
                {currentEpisode.description}
              </p>

              {/* 播放控制 */}
              <div className="bg-white rounded-2xl shadow-md p-6">
                <div className="flex items-center justify-between mb-4">
                  <button
                    onClick={togglePlay}
                    className="bg-gray-900 hover:bg-gray-800 text-white rounded-full p-3 transition-colors"
                  >
                    <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                      {isPlaying ? (
                        <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                      ) : (
                        <path d="M8 5v14l11-7z" />
                      )}
                    </svg>
                  </button>
                  
                  <div className="flex-1 ml-6">
                    <div className="flex justify-between text-sm text-gray-500 mb-1">
                      <span>{formatTime(currentTime)}</span>
                      <span>{formatTime(duration)}</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max={duration}
                      value={currentTime}
                      onChange={handleSeek}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <button className="text-gray-600 hover:text-gray-900">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M19 12v7c0 1.1-.9 2-2 2H7c-1.1 0-2-.9-2-2v-7c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2zM12 2v5l3 3-3 3v5h-2v-5l-3-3 3-3V2h2z" />
                    </svg>
                  </button>
                  
                  <div className="flex space-x-4">
                    <button className="text-gray-600 hover:text-gray-900">
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z" />
                      </svg>
                    </button>
                    <button className="text-gray-600 hover:text-gray-900">
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 剧集列表 */}
          <div className="bg-white rounded-2xl shadow-md overflow-hidden">
            <div className="px-6 py-4 border-b">
              <h3 className="text-xl font-semibold text-gray-900">All Episodes</h3>
            </div>
            
            <div className="divide-y">
              {podcast.episodes.map((episode, index) => (
                <div
                  key={episode.id}
                  className={`p-6 hover:bg-gray-50 cursor-pointer transition-colors ${
                    episode.id === currentEpisode.id ? 'bg-blue-50' : ''
                  }`}
                  onClick={() => setCurrentEpisode(episode)}
                >
                  <div className="flex items-start space-x-4">
                    <div className="flex-shrink-0 w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center">
                      <span className="text-gray-500 font-medium">{episode.id}</span>
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <h4 className="text-lg font-semibold text-gray-900 truncate">
                        {episode.title}
                      </h4>
                      <p className="text-gray-600 text-sm mb-2">{episode.datePublishedPretty} • {episode.duration}</p>
                      <p className="text-gray-700 line-clamp-2">{episode.description}</p>
                    </div>
                    
                    <button className="flex-shrink-0 text-gray-400 hover:text-gray-600">
                      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// 辅助函数：格式化时间
function formatTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}