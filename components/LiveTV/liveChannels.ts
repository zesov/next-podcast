// 电视直播频道 —— 类型定义与分类常量
// 说明：频道数据已迁移至 SQLite（见 lib/liveChannelsDb.ts，数据源仍为香港电台 RTHK 免费直播流）。
// 本文件仅保留编译期类型定义与 CATEGORIES 常量（types can't come from the DB at compile time）。
export type ChannelType = 'video' | 'audio';

export interface EpgSlot {
  time: string;      // 节目开始时间，如 "09:00"
  title: string;     // 节目名称
  description: string;
}

export interface LiveChannel {
  id: string;
  name: string;        // 频道名称
  category: CategoryKey; // 分类 key：news / music / culture / english / mandarin
  type: ChannelType;   // video = 电视, audio = 电台
  logo?: string;       // 频道标志（可选）
  streamUrl: string;   // HLS m3u8 直播地址
  description: string;
  epg: EpgSlot[];      // 简易节目表（示例数据）
}

export type CategoryKey = 'news' | 'music' | 'culture' | 'english' | 'mandarin';

export const CATEGORIES: CategoryKey[] = ['news', 'music', 'culture', 'english', 'mandarin'];
