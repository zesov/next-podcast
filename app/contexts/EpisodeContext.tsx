'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';
import { Espisode } from '../types';

interface EpisodeContextType {
  episodes: Espisode[];
  setEpisodes: (episodes: Espisode[]) => void;
  currentEpisode: Espisode | null;
  setCurrentEpisode: (episode: Espisode | null) => void;
  toPlay: boolean;
  setToPlay: (toPlay: boolean) => void;
}

const EpisodeContext = createContext<EpisodeContextType | undefined>(undefined);

export function EpisodeProvider({ children }: { children: ReactNode }) {
  const [episodes, setEpisodes] = useState<Espisode[]>([]);
  const [currentEpisode, setCurrentEpisode] = useState<Espisode | null>(null);
  const [toPlay, setToPlay] = useState<boolean>(false);

  return (
    <EpisodeContext.Provider value={{ 
      episodes, 
      setEpisodes, 
      currentEpisode, 
      setCurrentEpisode,
      toPlay,
      setToPlay
    }}>
      {children}
    </EpisodeContext.Provider>
  );
}

export function useEpisode() {
  const context = useContext(EpisodeContext);
  if (context === undefined) {
    throw new Error('useEpisode must be used within an EpisodeProvider');
  }
  return context;
}
