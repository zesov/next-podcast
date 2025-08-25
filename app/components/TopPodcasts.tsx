import {TopPodcast} from "../types";
import { useEpisode } from '../contexts/EpisodeContext';
import React, { useState, useRef, useEffect } from 'react';

export default function TopPodcasts({data}:{data:TopPodcast[]}) {
//   const topPodcasts = [
//     { name: "岩中花述 GIADA | JustPod", update: "8月8日更新" },
//     { name: "天真不天真 杨天真本真", update: "每周更新" },
//     { name: "声动早咖啡 声动活泼", update: "每日更新" },
//     { name: "凹凸电波 凹凸电波", update: "每周更新" },
//     { name: "西西弗高速 西西弗高速", update: "每周更新" }
//   ];
  const topPodcasts = data;
  const { setCurrentEpisode, setToPlay } = useEpisode();
  const handleClick = async (item: any) => {
    // console.log(item);
    const res = await fetch(`/api/episodesByFeedId?id=${item.id}`)
    const episodes = await res.json();    
    setCurrentEpisode(episodes[0]);
    setToPlay(true);
  };  
  return (
    <section className="mb-8">
      <h2 className="text-xl font-bold mb-4">热门节目排行</h2>
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <ul className="divide-y divide-gray-200">
          {topPodcasts.map((podcast, index) => (
            <li key={index} className="p-4 hover:bg-gray-50">
              <div className="flex items-center">
                <span className="text-gray-500 w-6 text-center">{index + 1}</span>
                <div className="ml-4 flex-1">
                  <h3 className="font-medium">{podcast.title}</h3>
                  <p className="text-sm text-gray-500">最新更新: {(new Date(podcast.newestItemPublishTime*1000)).toDateString()}</p>
                </div>
                <button className="text-indigo-600 hover:text-indigo-800"
                  onClick={() => handleClick(podcast)}
                >
                  <i className="fas fa-play"></i>
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}