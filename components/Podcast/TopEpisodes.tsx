'use client';
import { useEpisode } from '../../app/contexts/EpisodeContext';
import { useTranslations } from 'next-intl';
import React, { useState, useRef, useEffect } from 'react';
import { Episode } from '@/app/types';

export default function TopEpisodes({items}: { items: Episode[] }) {
  const t = useTranslations('home');
//   const topEpisodes = [
//     {
//       title: "什么叫爱自己?",
//       description: "我认为我就是一个很爱自己的人,但是我观察到很多人觉得爱自己的一些表达是自私的,甚至是自恋的,这三者究竟有什么区别...",
//       podcast: "天真不天真 杨天真本真"
//     },
//     {
//       title: "聊聊社保新规:企业、个人与城市生活的三重影响",
//       description: "9月1日起正式执行的「社保新规」对我们的生活意味着什么?企业、个人与城市生活的三重影响分析...",
//       podcast: "知行小酒馆 有知有行"
//     },
//     {
//       title: "亏钱互助会:线下店创业血泪史",
//       description: "当手上有点闲钱时,你是不是也曾想过开家小店?本期自曝的两位听友,都是妥妥被线下店坑了的大冤种...",
//       podcast: "搞钱女孩 搞钱女孩小辉"
//     }
//   ];
  const topEpisodes = items;
  const { setCurrentEpisode, setToPlay } = useEpisode();
  const handleClick = async (item: Episode) => {
    setCurrentEpisode(item);
    setToPlay(true);
};
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    setCurrentEpisode(items[0]);
  }, [items]);
  return (
    <section>
      <h2 className="text-xl font-bold mb-4">{t('topEpisodes')}</h2>
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow overflow-hidden">
        {topEpisodes.map((episode, index) => (
          <div key={index} className={`p-4 ${index < topEpisodes.length - 1 ? 'border-b' : ''}`}>
          <div className="flex items-start space-x-3"> 
            <div className="flex-shrink-0 relative w-24 h-24"> 
              <img
                src={episode.image || episode.feedImage || "/default-icon.png"}
                alt={episode.title}
                className="rounded object-cover" 
              />
            </div>
            <div className="flex-grow"> 
              <h3 className="font-semibold text-lg mb-2">{episode.title}</h3>
              {/* 描述以纯文本呈现（去除 HTML 标签）后截断，避免原始 HTML 被 slice 截断成残缺标签，
                  导致浏览器解析出的 DOM 与 React 客户端构建不一致，从而触发 hydration mismatch */}
              <p className="text-gray-600 dark:text-gray-400 text-sm mb-3">
                {String(episode.description || '')
                  .replace(/<[^>]*>/g, '')
                  .trim()
                  .slice(0, 80)}
              </p>
              
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500 dark:text-gray-400">{episode.feedTitle}</span>
                <div className="flex space-x-2">
                  <button className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200">
                    <i className="far fa-heart"></i>
                  </button>
                  <button 
                    className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-800"
                    onClick={() => handleClick(episode)}
                  >
                    <i className="fas fa-play"></i>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
        ))}
      </div>
    </section>
  )
}