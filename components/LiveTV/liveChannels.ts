export type ChannelType = 'video' | 'audio';

export interface EpgSlot {
  start: number;
  end: number;
  title: string;
  description: string;
  isLive?: boolean;
}

export interface LiveChannel {
  id: string;
  name: string;
  category: string;
  type: ChannelType;
  source: string;
  logo?: string;
  streamUrl: string;
  description: string;
  number?: number;
  language?: string;
  country?: string;
  epg: EpgSlot[];
}
