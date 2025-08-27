import { useEpisode } from '../app/contexts/EpisodeContext';
import React, { useState, useRef, useEffect } from 'react';

export default function Recommended({items}: { items: any[] }) {
  const recommended = [
    { name: "思文,败类", author: "思文败类" },
    { name: "声动早咖啡", author: "声动活泼" },
    { name: "知行小酒馆", author: "有知有行" }
  ];
  const { setCurrentEpisode, setToPlay } = useEpisode();
  const handleClick = async (item: any) => {
    setCurrentEpisode(item);
    setToPlay(true);
  };  
  useEffect(() => {
    setCurrentEpisode(items[0]);
  }, [items]);
  return (
    <div className="bg-white rounded-lg shadow p-4 mb-6">
      <h3 className="font-bold mb-4">为你推荐</h3>
      <div className="space-y-4">
        {items.map((item, index) => (
          <div key={index} className="flex items-center relative cursor-pointer"
             onClick={() => handleClick(item)}
          >
            <div className="w-12 h-12 bg-indigo-100 rounded-lg flex-shrink-0">
              <img src={item.image} alt={item.title} className="w-full h-full rounded-lg" />
            </div>
            <div className="ml-3">
              <h4 className="font-medium text-sm">{item.title}</h4>
              <p className="text-xs text-gray-500">{item.datePublishedPretty}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}