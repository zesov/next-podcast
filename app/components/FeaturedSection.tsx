'use client'; 
import {FeaturedItem} from '../types';
import { useEpisode } from '../contexts/EpisodeContext';

export default function FeaturedSection({data}: { data: FeaturedItem[] }) {
//   const featuredItems = [
//     {
//       title: "解读非暴力沟通的深层含义",
//       description: "通过正面方式化解人际冲突"
//     },
//     {
//       title: "漫步历史长河寻觅闪耀身影",
//       description: "与百余位传奇女性并肩而立"
//     },
//     {
//       title: "炎炎夏日充电指南",
//       description: "邀您用耳朵畅游精彩世界"
//     },
//     {
//       title: "多部悬疑经典有声剧持续更新",
//       description: "抽丝剥茧探寻真相与人性谜团"
//     }
//   ];
  const featuredItems = data;
  const { currentEpisode, setCurrentEpisode, episodes, setEpisodes, setToPlay } = useEpisode();
  const handleClick = async (item: FeaturedItem) => {
    const res = await fetch(`/api/episodesByFeedId?id=${item.id}`)
    const episodes = await res.json();
    setCurrentEpisode(episodes[0]);
    setToPlay(true);
  };

  return (
    <section className="mb-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold">精选播客</h2>
        <a href="#" className="text-indigo-600 hover:text-indigo-800 text-sm font-medium">
          查看全部
        </a>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {featuredItems.map((item, index) => (
          <div 
            key={index} 
            className="group bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden"
          >
            <div className="relative aspect-square">
              <img 
                className="w-full h-full object-cover"
                src={item.image || "/radio_list/img/music_note_black_48dp.svg"} 
                alt={item.title}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
              
              {/* 播放按钮 - 悬停时显示 */}
              <button className="absolute bottom-4 right-4 w-10 h-10 bg-indigo-600 hover:bg-indigo-700 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                      onClick={() => handleClick(item)}
              >
                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M6.3 2.841A1.5 1.5 0 004 4.11v11.78a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
                </svg>
              </button>
            </div>
            
            <div className="p-4">
              <a href={"/podcast/"+item.id} className="font-semibold text-lg mb-1 line-clamp-2">{item.title}</a>
              {/* <p className="text-gray-600 text-sm line-clamp-2">{item.description}</p> */}
              
              <div className="mt-3 flex items-center justify-between">
                <span className="text-xs text-gray-500">{item.duration || '--:--'}</span>
                <span className="text-xs text-gray-500">{(new Date(item.lastUpdateTime*1000)).toDateString() || '最新更新'}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}