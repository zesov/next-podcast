// 香港電台直播频道数据 —— SQLite 只读访问层
// 数据库由 scripts/seedLiveChannels.ts 初始化（npm run db:seed），此处仅读取。
import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import type {
  LiveChannel,
  CategoryKey,
  ChannelType,
} from '@/components/LiveTV/liveChannels';

// DB 文件位于仓库内 data/ 目录（已 git 追踪），初始化写在 scripts/seedLiveChannels.ts
const DB_PATH = path.join(process.cwd(), 'data', 'liveChannels.db');

let db: DatabaseSync | null = null;

function getDb(): DatabaseSync {
  if (db) return db;
  // 只读打开：应用不负责建表/写入，缺失时提示先运行 db:seed
  try {
    db = new DatabaseSync(DB_PATH, { readOnly: true });
  } catch {
    throw new Error(
      `找不到 ${DB_PATH}，请先运行 npm run db:seed 初始化直播频道数据库`
    );
  }
  return db;
}

// 返回所有频道（含 EPG，按 sort_order 排序）
export async function getAllLiveChannels(): Promise<LiveChannel[]> {
  const database = getDb();

  const channels = database
    .prepare('SELECT * FROM live_channels ORDER BY sort_order ASC')
    .all() as Array<{
    id: string;
    name: string;
    category: CategoryKey;
    type: ChannelType;
    logo: string | null;
    stream_url: string;
    description: string;
  }>;

  const epgStmt = database.prepare(
    'SELECT time, title, description FROM live_epg WHERE channel_id = ? ORDER BY position ASC'
  );

  return channels.map((row) => ({
    id: row.id,
    name: row.name,
    category: row.category,
    type: row.type,
    ...(row.logo ? { logo: row.logo } : {}),
    streamUrl: row.stream_url,
    description: row.description,
    // node:sqlite 返回行是 null-prototype 对象，RSC 服务器→客户端序列化要求纯对象，
    // 这里显式重建为普通对象以通过组件边界。
    epg: (epgStmt.all(row.id) as Array<{ time: string; title: string; description: string }>).map(
      (s) => ({ time: s.time, title: s.title, description: s.description })
    ),
  }));
}
