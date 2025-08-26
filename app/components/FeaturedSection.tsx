'use client'; 
import {FeaturedItem} from '../types';
import { useEpisode } from '../contexts/EpisodeContext';
import FeaturedCarousel from './FeaturedCarousel';

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
      <FeaturedCarousel featuredItems={featuredItems} />
    </section>
  )
}