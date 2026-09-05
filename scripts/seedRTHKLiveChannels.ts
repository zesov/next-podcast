// RTHK 直播频道初始化脚本
// 将 RTHK TV 31-36 频道写入 data/fastchannels.db
// 若数据库不存在，自动创建表结构

import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';

const DB_PATH = path.join(process.cwd(), 'data', 'fastchannels.db');

// 确保 data 目录存在
const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
  console.log(`创建目录: ${dataDir}`);
}

// 打开数据库（读写模式，自动创建文件）
const db = new DatabaseSync(DB_PATH);
console.log(`连接数据库: ${DB_PATH}`);

// ===== 1. 创建表结构 =====
console.log('\n=== 创建表结构 ===');

db.exec(`
  CREATE TABLE IF NOT EXISTS sources (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE
  );
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS channels (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    logo_url TEXT,
    stream_url TEXT NOT NULL,
    stream_type TEXT,
    category TEXT,
    language TEXT,
    country TEXT,
    number INTEGER,
    description TEXT,
    is_active INTEGER NOT NULL DEFAULT 1,
    is_enabled INTEGER NOT NULL DEFAULT 1,
    source_id INTEGER NOT NULL REFERENCES sources(id)
  );
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS programs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    channel_id INTEGER NOT NULL REFERENCES channels(id),
    title TEXT NOT NULL,
    description TEXT,
    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL,
    is_live INTEGER DEFAULT 0
  );
`);

db.exec(`
  CREATE INDEX IF NOT EXISTS idx_channels_source ON channels(source_id);
  CREATE INDEX IF NOT EXISTS idx_channels_active ON channels(is_active, is_enabled);
  CREATE INDEX IF NOT EXISTS idx_channels_number ON channels(number);
  CREATE INDEX IF NOT EXISTS idx_programs_channel ON programs(channel_id);
  CREATE INDEX IF NOT EXISTS idx_programs_time ON programs(start_time, end_time);
`);

console.log('表结构创建完成');

// ===== 2. 插入/获取 RTHK source =====
console.log('\n=== 插入 RTHK 数据源 ===');

const insertSource = db.prepare('INSERT OR IGNORE INTO sources (name) VALUES (?)');
insertSource.run('RTHK');
console.log('Source "RTHK" 插入/已存在');

const source = db.prepare('SELECT id FROM sources WHERE name = ?').get('RTHK') as { id: number };
const sourceId = source.id;
console.log(`RTHK source_id: ${sourceId}`);

// ===== 3. RTHK 频道数据 =====
const rthkChannels = [
  {
    name: 'RTHK TV 31',
    number: 31,
    stream_url: 'https://rthktv31-live.akamaized.net/hls/live/2036818/RTHKTV31/master.m3u8',
    logo_url: 'https://i.imgur.com/kf818kM.png',
    category: 'News & Public Affairs',
    language: 'zh',
    country: 'HK',
    description: '香港电台电视31台 - 资讯、时事、文化、教育节目',
    stream_type: 'hls',
  },
  {
    name: 'RTHK TV 32',
    number: 32,
    stream_url: 'https://rthktv32-live.akamaized.net/hls/live/2036819/RTHKTV32/master.m3u8',
    logo_url: 'https://i.imgur.com/MXLuUoU.png',
    category: 'News & Public Affairs',
    language: 'zh',
    country: 'HK',
    description: '香港电台电视32台 - 立法会会议、记者会、公共事务直播',
    stream_type: 'hls',
  },
  {
    name: 'RTHK TV 33',
    number: 33,
    stream_url: 'https://rthktv33-live.akamaized.net/hls/live/2101641/RTHKTV33/master.m3u8',
    logo_url: 'https://i.imgur.com/kf818kM.png',
    category: 'News & Public Affairs',
    language: 'zh',
    country: 'HK',
    description: '香港电台电视33台 - 财经、经济资讯',
    stream_type: 'hls',
  },
  {
    name: 'RTHK TV 34',
    number: 34,
    stream_url: 'https://rthktv34-live.akamaized.net/hls/live/2101642/RTHKTV34/master.m3u8',
    logo_url: 'https://i.imgur.com/kf818kM.png',
    category: 'News & Public Affairs',
    language: 'en',
    country: 'HK',
    description: '香港电台电视34台 - 英文节目、国际视野',
    stream_type: 'hls',
  },
  {
    name: 'RTHK TV 35',
    number: 35,
    stream_url: 'https://rthktv35-live.akamaized.net/hls/live/2101643/RTHKTV35/master.m3u8',
    logo_url: 'https://i.imgur.com/kf818kM.png',
    category: 'News & Public Affairs',
    language: 'zh',
    country: 'HK',
    description: '香港电台电视35台 - 文化、艺术、纪录片',
    stream_type: 'hls',
  },
  {
    name: 'RTHK TV 36',
    number: 36,
    stream_url: 'https://rthktv36-live.akamaized.net/hls/live/2112176/RTHKTV36/master.m3u8',
    logo_url: 'https://i.imgur.com/kf818kM.png',
    category: 'News & Public Affairs',
    language: 'zh',
    country: 'HK',
    description: '香港电台电视36台 - 4K 超高清频道',
    stream_type: 'hls',
  },
];

// ===== 4. 插入频道数据 =====
console.log('\n=== 插入 RTHK 频道 (31-36) ===');

const insertChannel = db.prepare(`
  INSERT OR REPLACE INTO channels (
    name, logo_url, stream_url, stream_type, category, 
    language, country, number, description, is_active, is_enabled, source_id
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 1, ?)
`);

for (const ch of rthkChannels) {
  const result = insertChannel.run(
    ch.name,
    ch.logo_url,
    ch.stream_url,
    ch.stream_type,
    ch.category,
    ch.language,
    ch.country,
    ch.number,
    ch.description,
    sourceId
  );
  console.log(`  ✓ ${ch.name} (频道号: ${ch.number}) - ID: ${result.lastInsertRowid}`);
}

// ===== 5. 可选：插入示例 EPG 数据 =====
console.log('\n=== 插入示例 EPG 节目数据 ===');

const now = new Date();
const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);

const insertProgram = db.prepare(`
  INSERT INTO programs (channel_id, title, description, start_time, end_time, is_live)
  VALUES (?, ?, ?, ?, ?, ?)
`);

// 为每个频道添加一些示例节目
const samplePrograms: Record<number, Array<{ title: string; description: string; start: number; end: number; isLive: boolean }>> = {
  31: [
    { title: '早安香港', description: '早间新闻及资讯节目', start: 0, end: 2 * 60 * 60 * 1000, isLive: true },
    { title: '鏗鏘集', description: '深度时事纪录片', start: 2 * 60 * 60 * 1000, end: 3 * 60 * 60 * 1000, isLive: false },
    { title: '午间新闻', description: '午间新闻报导', start: 4 * 60 * 60 * 1000, end: 4.5 * 60 * 60 * 1000, isLive: true },
    { title: '城市论坛', description: '公共事务讨论节目', start: 6 * 60 * 60 * 1000, end: 7.5 * 60 * 60 * 1000, isLive: false },
    { title: '晚间新闻', description: '晚间主要新闻', start: 11 * 60 * 60 * 1000, end: 11.5 * 60 * 60 * 1000, isLive: true },
  ],
  32: [
    { title: '立法会会议直播', description: '立法会会议实况转播', start: 1 * 60 * 60 * 1000, end: 5 * 60 * 60 * 1000, isLive: true },
    { title: '记者会直播', description: '政府记者会实况', start: 5.5 * 60 * 60 * 1000, end: 6.5 * 60 * 60 * 1000, isLive: true },
  ],
  33: [
    { title: '财经透视', description: '财经新闻深度分析', start: 3 * 60 * 60 * 1000, end: 4 * 60 * 60 * 1000, isLive: false },
    { title: '市场直击', description: '股市实况报导', start: 9 * 60 * 60 * 1000, end: 10 * 60 * 60 * 1000, isLive: true },
  ],
  34: [
    { title: 'Hong Kong Today', description: 'English current affairs', start: 2 * 60 * 60 * 1000, end: 3 * 60 * 60 * 1000, isLive: false },
    { title: 'The Pulse', description: 'Weekly current affairs programme', start: 8 * 60 * 60 * 1000, end: 9 * 60 * 60 * 1000, isLive: false },
  ],
  35: [
    { title: '文化长河', description: '中华文化纪录片系列', start: 2 * 60 * 60 * 1000, end: 3 * 60 * 60 * 1000, isLive: false },
    { title: '艺术空间', description: '本地艺术家专访', start: 7 * 60 * 60 * 1000, end: 8 * 60 * 60 * 1000, isLive: false },
  ],
  36: [
    { title: '4K 纪录片: 香港地标', description: '4K 超高清纪录片', start: 1 * 60 * 60 * 1000, end: 2.5 * 60 * 60 * 1000, isLive: false },
    { title: '4K 现场直播: 音乐会', description: '4K 现场音乐会直播', start: 8 * 60 * 60 * 1000, end: 10 * 60 * 60 * 1000, isLive: true },
  ],
};

// 获取所有插入的频道 ID
const channelsInDb = db.prepare('SELECT id, number FROM channels WHERE source_id = ?').all(sourceId) as Array<{ id: number; number: number }>;

for (const ch of channelsInDb) {
  const programs = samplePrograms[ch.number];
  if (!programs) continue;
  
  for (const prog of programs) {
    const startTime = new Date(todayStart.getTime() + prog.start).toISOString();
    const endTime = new Date(todayStart.getTime() + prog.end).toISOString();
    
    insertProgram.run(
      ch.id,
      prog.title,
      prog.description,
      startTime,
      endTime,
      prog.isLive ? 1 : 0
    );
  }
  console.log(`  ✓ 频道 ${ch.number} (${ch.id}): ${programs.length} 个示例节目`);
}

console.log('\n=== 完成 ===');

// ===== 6. 验证结果 =====
console.log('\n=== 验证数据 ===');
const totalChannels = db.prepare('SELECT COUNT(*) as n FROM channels WHERE source_id = ?').get(sourceId) as { n: number };
const totalPrograms = db.prepare('SELECT COUNT(*) as n FROM programs p JOIN channels c ON p.channel_id = c.id WHERE c.source_id = ?').get(sourceId) as { n: number };
const totalSources = db.prepare('SELECT COUNT(*) as n FROM sources').get() as { n: number };

console.log(`Sources: ${totalSources.n}`);
console.log(`RTHK Channels: ${totalChannels.n}`);
console.log(`RTHK Programs (EPG): ${totalPrograms.n}`);

// 显示频道列表
const channelList = db.prepare('SELECT number, name, category, stream_url FROM channels WHERE source_id = ? ORDER BY number').all(sourceId) as Array<{ number: number; name: string; category: string; stream_url: string }>;
console.log('\n频道列表:');
for (const ch of channelList) {
  console.log(`  ${ch.number}: ${ch.name} [${ch.category}]`);
  console.log(`     ${ch.stream_url}`);
}

db.close();
console.log('\n✅ RTHK 直播频道初始化完成！');