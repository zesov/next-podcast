import React, { useState } from 'react';
// @ts-ignore
import Slider from 'react-slick';
import 'slick-carousel/slick/slick.css';
import 'slick-carousel/slick/slick-theme.css';
import {FeaturedItem} from '../types';
import { useEpisode } from '../contexts/EpisodeContext';

const FeaturedCarousel = ({ featuredItems }: {featuredItems: FeaturedItem[]}) => {
  // 手动控制幻灯片索引
  const [currentSlide, setCurrentSlide] = useState(0);

  // 配置react-slick参数
  const sliderSettings = {
    dots: false,
    infinite: true,        // 无限循环
    speed: 500,           // 滑动速度（毫秒）
    slidesToShow: 3,      // 同时显示1张
    slidesToScroll: 1,    // 每次滑动1张
    arrows: true,         // 显示左右箭头
    autoplay: false,      // 关闭自动播放（纯手动）
    beforeChange: (oldIndex: number, newIndex: number) => setCurrentSlide(newIndex), // 更新当前索引
    appendDots: (dots: any) => (
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-2">
        {dots}
      </div>
    ),
    customPaging: (i:number) => (
      <button 
        type="button" 
        className={`w-3 h-3 rounded-full ${i === currentSlide ? 'bg-white' : 'bg-gray-500'}`}
      />
    ),
    responsive: [
        {
          breakpoint: 992,
          settings: { slidesToShow: 3, centerPadding: "50px" }
        },
        {
          breakpoint: 768,
          settings: { slidesToShow: 2, centerPadding: "30px" } // 小屏幕减小间距
        },
        {
          breakpoint: 480,
          settings: { slidesToShow: 1, centerPadding: "20px" } // 超小屏幕进一步减小间距
        }
      ],
  };

  const { currentEpisode, setCurrentEpisode, episodes, setEpisodes, setToPlay } = useEpisode();
  const handleClick = async (item: FeaturedItem) => {
    const res = await fetch(`/api/episodesByFeedId?id=${item.id}`)
    const episodes = await res.json();
    setCurrentEpisode(episodes[0]);
    setToPlay(true);
  };
  return (
    <div className="relative">
      {/* react-slick轮播容器 */}
      <Slider {...sliderSettings}>
        {featuredItems.map((item, index) => (
          <div key={index} className="relative group">
            <div className="aspect-square overflow-hidden rounded-xl">
              <img
                src={item.image || "/radio_list/img/music_note_black_48dp.svg"}
                alt={item.title}
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
              {/* 播放按钮（悬停显示） */}
              <button className="absolute bottom-4 right-4 w-10 h-10 bg-indigo-600 hover:bg-indigo-700 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                 onClick={() => handleClick(item)}
              >
                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M6.3 2.841A1.5 1.5 0 004 4.11v11.78a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z"/>
                </svg>
              </button>
            </div>
            {/* 文字内容 */}
            <div className="p-4">
              <a 
                href={`/podcast/${item.id}`}
                className="font-semibold text-lg mb-1 line-clamp-2 text-black hover:text-indigo-600 transition-colors"
              >
                {item.title}
              </a>
              <div className="mt-3 flex items-center justify-between">
                <span className="text-xs text-gray-500">
                  {(new Date(item.lastUpdateTime * 1000)).toDateString() || '最新更新'}
                </span>
              </div>
            </div>
          </div>
        ))}
      </Slider>
    </div>
  );
};

export default FeaturedCarousel;