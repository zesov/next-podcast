"use client"; // 添加这行指令
import React, { useState, useRef, useEffect } from 'react';
import {Episode} from '../app/types';
import { useEpisode } from '../app/contexts/EpisodeContext';

const defaultEpisode: Episode = {
  id: 1,
  title: '未选择节目',
  description: '',
  enclosureUrl: 'https://podcast.rthk.hk/podcast/media/enca_hktoday/78_2508250850_71679.mp3',
  enclosureType: 'audio/mpeg',
  feedTitle: '',
  image: 'https://podcast.rthk.hk/podcast/upload_photo/item_photo/1400x1400_78.jpg',
  datePublishedPretty: '',
  datePublished: 1234567890,
  enclosureLength: 10,
  feedImage: 'https://podcast.rthk.hk/podcast/upload_photo/item_photo/1400x1400_78.jpg',
};

export default function Player({title=true}: {title?: boolean}) {
  const { currentEpisode: contextEpisode, toPlay, setToPlay } = useEpisode();
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.7);
  const [isMuted, setIsMuted] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  const currentEpisode = contextEpisode || defaultEpisode;
  if(!currentEpisode) return null;
  

  // 初始化音频元素
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateTime = () => setCurrentTime(audio.currentTime);
    const updateDuration = () => setDuration(audio.duration);
    const handleEnd = () => setIsPlaying(false);

    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('loadedmetadata', updateDuration);
    audio.addEventListener('ended', handleEnd);

    // 设置音量
    audio.volume = volume;
    audio.muted = isMuted;

    return () => {
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('loadedmetadata', updateDuration);
      audio.removeEventListener('ended', handleEnd);
    };
  }, [volume, isMuted]);

  // 播放/暂停切换
  const togglePlayPause = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
    } else {
      audio.play().catch(error => {
        console.error("播放失败:", error);
      });
    }
    setIsPlaying(!isPlaying);
  };

  // 前进15秒
  const forward = () => {
    const audio = audioRef.current;
    if (!audio) return;
    
    audio.currentTime = Math.min(audio.currentTime + 15, duration);
  };

  // 后退15秒
  const backward = () => {
    const audio = audioRef.current;
    if (!audio) return;
    
    audio.currentTime = Math.max(audio.currentTime - 15, 0);
  };

  // 调整进度
  const handleSeek = (e: React.MouseEvent) => {
    const audio = audioRef.current;
    if (!audio || !duration) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    audio.currentTime = percent * duration;
  };

  // 调整音量
  const handleVolumeChange = (e: React.MouseEvent) => {
    const audio = audioRef.current;
    if (!audio) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const newVolume = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    
    setVolume(newVolume);
    audio.volume = newVolume;
    
    // 如果音量调整为0，则静音
    if (newVolume === 0 && !isMuted) {
      setIsMuted(true);
    } else if (newVolume > 0 && isMuted) {
      setIsMuted(false);
    }
  };

  // 切换静音
  const toggleMute = () => {
    const audio = audioRef.current;
    if (!audio) return;
    
    audio.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  // 格式化时间显示
  const formatTime = (seconds:number) => {
    if (isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  // 计算进度百分比
  const progressPercent = duration ? (currentTime / duration) * 100 : 0;
  const volumePercent = isMuted ? 0 : volume * 100;

  // 自动播放
  useEffect(() => {
    if (toPlay) {
      const audio = audioRef.current;
      if (!audio) return;  
      setCurrentTime(0);
      setDuration(audio.duration);
        audio.play().catch(error => {
          console.error("播放失败:", error);
        });
      setIsPlaying(true);
      setToPlay(false);
    }
  }, [toPlay, isPlaying]); 

  return (
<>
      <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css"
          crossOrigin="anonymous"
        />
      {/* 隐藏的音频元素 */}
      <audio
        ref={audioRef}
        src={currentEpisode.enclosureUrl}
        preload="metadata"
      />
      
      {/* 播放器界面 */}
      <div className="bg-white rounded-lg shadow p-4 mb-6 lg:sticky lg:top-20 mobile-fixed-bottom">
        {title && (
        <div className="flex items-center mb-4">
          <div className="w-16 h-16 bg-indigo-100 rounded-lg flex items-center justify-center">
            <img className=" text-indigo-500 text-xl" src={currentEpisode.image || currentEpisode.feedImage || '/music.svg'}></img>
          </div>
          <div className="ml-4">
            <h3 className="font-medium">{currentEpisode.title}</h3>
            <p className="text-sm text-gray-500">{currentEpisode.feedTitle}</p>
          </div>
        </div>)}
        
        {/* 进度条 */}
        <div className="mb-4">
          <div 
            className="h-1 bg-gray-200 rounded-full w-full mb-1 cursor-pointer"
            onClick={handleSeek}
          >
            <div 
              className="h-1 bg-indigo-500 rounded-full" 
              style={{ width: `${progressPercent}%` }}
            ></div>
          </div>
          <div className="flex justify-between text-xs text-gray-500">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>
        
        {/* 控制按钮 */}
        <div className="flex justify-between items-center">
          <button 
            className="text-gray-500 hover:text-gray-700"
            onClick={backward}
          >
            <i className="fas fa-step-backward"></i>
          </button>
          
          <button 
            className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-full w-10 h-10 flex items-center justify-center"
            onClick={togglePlayPause}
          >
            <i className={isPlaying ? "fas fa-pause" : "fas fa-play"}></i>
          </button>
          
          <button 
            className="text-gray-500 hover:text-gray-700"
            onClick={forward}
          >
            <i className="fas fa-step-forward"></i>
          </button>
          
          <button 
            className="text-gray-500 hover:text-gray-700"
            onClick={toggleMute}
          >
            <i className={isMuted ? "fas fa-volume-mute" : "fas fa-volume-up"}></i>
          </button>
          
          <div className="w-20">
            <div 
              className="h-1 bg-gray-200 rounded-full w-full cursor-pointer"
              onClick={handleVolumeChange}
            >
              <div 
                className="h-1 bg-indigo-500 rounded-full" 
                style={{ width: `${volumePercent}%` }}
              ></div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}