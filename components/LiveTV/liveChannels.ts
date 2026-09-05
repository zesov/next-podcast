// 直播频道 —— 类型定义
// 说明：频道与节目数据来自 SQLite 的 channels / programs / sources 表（见 lib/liveChannelsDb.ts）。
// 本文件仅保留编译期类型定义与可翻译分类常量（types can't come from the DB at compile time）。
export type ChannelType = 'video' | 'audio';

// EPG 节目槽位 —— 来自 DB programs 表的真实节目（含起止时间戳）
export interface EpgSlot {
  start: number; // 节目开始时间（epoch ms）
  end: number;   // 节目结束时间（epoch ms）
  title: string;
  description: string;
  isLive?: boolean; // 是否直播节目（programs.is_live）
}

// 对外暴露的直播频道（聚合 channels + sources + programs）
export interface LiveChannel {
  id: string;            // DB channels.id
  name: string;          // 频道名称
  category: string;      // DB channels.category（如 Sports / News / Movies）
  type: ChannelType;     // video = 电视, audio = 电台（DB 无此字段，当前统一 video）
  source: string;        // 数据来源 provider 名（sources.name，如 pluto / samsung）
  logo?: string;         // DB channels.logo_url
  streamUrl: string;     // HLS m3u8 直播地址
  description: string;   // DB channels.description
  number?: number;       // 频道号（DB channels.number）
  language?: string;     // DB channels.language（en / es）
  country?: string;      // DB channels.country
  epg: EpgSlot[];        // 真实节目表（来自 programs 表）
}
