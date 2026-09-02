// 初始化脚本：创建 data/liveChannels.db 并写入香港電台直播频道 + EPG 初始数据。
// 运行 `npm run db:seed` 或直接 `node scripts/seedLiveChannels.ts`（Node 23 原生类型擦除）。
// 幂等：每次运行会重建表并重新写入，保证与下方 SEED_CHANNELS 数据一致。
import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';

interface EpgSlot {
  time: string;
  title: string;
  description: string;
}

interface SeedChannel {
  id: string;
  name: string;
  category: string;
  type: string;
  streamUrl: string;
  description: string;
  epg: EpgSlot[];
}

const DB_DIR = path.join(process.cwd(), 'data');
const DB_PATH = path.join(DB_DIR, 'liveChannels.db');

// 频道数据（应用唯一数据源；lib/liveChannelsDb.ts 只读不写）
const SEED_CHANNELS: SeedChannel[] = [
  {
    id: 'rthk-tv31',
    name: '港台電視31',
    category: 'culture',
    type: 'video',
    streamUrl: 'https://rthktv31-live.akamaized.net/hls/live/2036818/RTHKTV31/master.m3u8',
    description: '香港電台綜合頻道：時事、文化、紀錄片與戲劇節目。',
    epg: [
      { time: '08:00', title: '晨早新聞', description: '即時新聞與天氣資訊' },
      { time: '09:00', title: '城市論壇', description: '每週時事討論節目' },
      { time: '10:00', title: '香港故事', description: '本地人文紀錄片' },
      { time: '12:00', title: '午間新聞', description: '正午新聞報道' },
      { time: '20:00', title: '鏗鏘集', description: '深度調查報道' },
      { time: '21:30', title: '晚間新聞', description: '深夜新聞報道' },
    ],
  },
  {
    id: 'rthk-tv32',
    name: '港台電視32',
    category: 'news',
    type: 'video',
    streamUrl: 'https://rthktv32-live.akamaized.net/hls/live/2036819/RTHKTV32/master.m3u8',
    description: '24小時新聞頻道：即時新聞、財經與天氣報道。',
    epg: [
      { time: '08:00', title: '新聞報道', description: '24小時新聞直播' },
      { time: '09:00', title: '財經資訊', description: '股市與財經分析' },
      { time: '12:00', title: '新聞報道', description: '午間新聞' },
      { time: '18:00', title: '新聞報道', description: '傍晚新聞' },
      { time: '22:00', title: '晚間新聞', description: '深夜新聞綜合' },
    ],
  },
  {
    id: 'rthk-tv33',
    name: '港台電視33',
    category: 'english',
    type: 'video',
    streamUrl: 'https://rthktv33-live.akamaized.net/hls/live/2101641/RTHKTV33/master.m3u8',
    description: '英語綜合頻道：英語新聞與國際節目。',
    epg: [
      { time: '09:00', title: 'News Report', description: 'English news bulletin' },
      { time: '10:00', title: 'Culture Vulture', description: 'Arts and culture programme' },
      { time: '12:00', title: 'News Report', description: 'Midday news' },
      { time: '18:00', title: 'News Report', description: 'Evening news' },
    ],
  },
  {
    id: 'rthk-tv34',
    name: '港台電視34',
    category: 'mandarin',
    type: 'video',
    streamUrl: 'https://rthktv34-live.akamaized.net/hls/live/2101642/RTHKTV34/master.m3u8',
    description: '普通話綜合頻道：普通話新聞與國語節目。',
    epg: [
      { time: '09:00', title: '新聞報道', description: '普通話新聞' },
      { time: '12:00', title: '新聞報道', description: '午間新聞' },
      { time: '19:00', title: '普通話台', description: '國語綜合節目' },
    ],
  },
  {
    id: 'rthk-tv35',
    name: '港台電視35',
    category: 'english',
    type: 'video',
    streamUrl: 'https://rthktv35-live.akamaized.net/hls/live/2101643/RTHKTV35/master.m3u8',
    description: '英語頻道：英語新聞與資訊節目。',
    epg: [
      { time: '09:00', title: 'News Report', description: 'English news' },
      { time: '13:00', title: 'Documentary', description: 'English documentary' },
    ],
  },
  {
    id: 'rthk-tv36',
    name: '港台電視36',
    category: 'culture',
    type: 'video',
    streamUrl: 'https://rthktv36-live.akamaized.net/hls/live/2112176/RTHKTV36/master.m3u8',
    description: '文化藝術頻道：音樂、紀錄片與文化節目。',
    epg: [
      { time: '10:00', title: '文化節目', description: '文化藝術專題' },
      { time: '20:00', title: '紀錄片', description: '人文紀錄片' },
    ],
  },
  {
    id: 'rthk-r1',
    name: '香港電台第一台',
    category: 'news',
    type: 'audio',
    streamUrl: 'https://rthkaudio1-lh.akamaihd.net/i/radio1_1@355864/master.m3u8',
    description: 'AM 567 新聞資訊頻道：新聞、時事與公共事務。',
    epg: [
      { time: '07:00', title: '千禧年代', description: '晨早新聞時事節目' },
      { time: '12:00', title: '午間新聞', description: '正午新聞' },
      { time: '18:00', title: '自由風自由Phone', description: '晚間時事討論' },
    ],
  },
  {
    id: 'rthk-r2',
    name: '香港電台第二台',
    category: 'music',
    type: 'audio',
    streamUrl: 'https://rthkaudio2-lh.akamaihd.net/i/radio2_1@355865/master.m3u8',
    description: 'FM 94.8 年輕與流行音樂頻道：音樂、娛樂與活力節目。',
    epg: [
      { time: '08:00', title: '晨光第一線', description: '晨早音樂娛樂節目' },
      { time: '12:00', title: '音樂速遞', description: '流行音樂' },
      { time: '19:00', title: '超倫音樂', description: '夜間音樂節目' },
    ],
  },
  {
    id: 'rthk-r3',
    name: '香港電台第三台',
    category: 'english',
    type: 'audio',
    streamUrl: 'https://rthkaudio3-lh.akamaihd.net/i/radio3_1@355866/master.m3u8',
    description: 'FM 97.9 英語頻道：英語新聞與資訊節目。',
    epg: [
      { time: '09:00', title: 'Backchat', description: 'Current affairs discussion' },
      { time: '12:00', title: 'News', description: 'Midday news' },
      { time: '18:00', title: 'The Close', description: 'Evening news programme' },
    ],
  },
];

function initSchema(database: DatabaseSync) {
  database.exec(`
    DROP TABLE IF EXISTS live_epg;
    DROP TABLE IF EXISTS live_channels;

    CREATE TABLE live_channels (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      type TEXT NOT NULL,
      logo TEXT,
      stream_url TEXT NOT NULL,
      description TEXT NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE live_epg (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      channel_id TEXT NOT NULL REFERENCES live_channels(id) ON DELETE CASCADE,
      position INTEGER NOT NULL,
      time TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL
    );

    CREATE INDEX idx_live_epg_channel ON live_epg(channel_id, position);
  `);
}

function seed(database: DatabaseSync) {
  const insertChannel = database.prepare(`
    INSERT INTO live_channels (id, name, category, type, logo, stream_url, description, sort_order)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const insertEpg = database.prepare(`
    INSERT INTO live_epg (channel_id, position, time, title, description)
    VALUES (?, ?, ?, ?, ?)
  `);

  database.exec('BEGIN');
  try {
    SEED_CHANNELS.forEach((ch, idx) => {
      insertChannel.run(
        ch.id,
        ch.name,
        ch.category,
        ch.type,
        null,
        ch.streamUrl,
        ch.description,
        idx
      );
      ch.epg.forEach((slot, pos) => {
        insertEpg.run(ch.id, pos, slot.time, slot.title, slot.description);
      });
    });
    database.exec('COMMIT');
  } catch (err) {
    database.exec('ROLLBACK');
    throw err;
  }
}

if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

const db = new DatabaseSync(DB_PATH);
initSchema(db);
seed(db);
db.close();

console.log(`已初始化 ${DB_PATH}：${SEED_CHANNELS.length} 個頻道`);
