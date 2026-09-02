// 直播频道数据 —— SQLite 只读访问层
// 数据库 data/fastchannels.db 含以下表：channels / programs / sources / feeds / app_settings 等。
// 本模块读取 channels（频道元数据）、sources（provider 名）与 programs（EPG 节目）。
// 频道列表以分页读取（数据量大，避免一次全量加载）；EPG 按需为单一频道读取。
import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import type {
  LiveChannel,
  ChannelType,
  EpgSlot,
} from '@/components/LiveTV/liveChannels';

// DB 文件位于仓库内 data/ 目录（.gitignore 忽略，由外部 scraper 写入）。
const DB_PATH = path.join(process.cwd(), 'data', 'fastchannels.db');

// 分页默认页大小
export const PAGE_SIZE = 48;

let db: DatabaseSync | null = null;

function getDb(): DatabaseSync {
  if (db) return db;
  // 只读打开：应用不负责建表/写入，缺失时提示先放入数据库文件。
  try {
    db = new DatabaseSync(DB_PATH, { readOnly: true });
  } catch {
    throw new Error(
      `找不到 ${DB_PATH}，请先将直播频道数据库放入该路径`
    );
  }
  return db;
}

interface ChannelRow {
  id: number;
  name: string;
  logo_url: string | null;
  stream_url: string;
  stream_type: string | null;
  category: string | null;
  language: string | null;
  country: string | null;
  number: number | null;
  description: string | null;
  is_active: number;
  is_enabled: number;
  source: string | null;
}

function rowToChannel(row: ChannelRow): LiveChannel {
  return {
    id: String(row.id),
    name: row.name,
    // 无 TV/Radio 区分字段，统一按视频处理
    type: 'video' as ChannelType,
    category: row.category || 'Other',
    source: row.source || 'unknown',
    ...(row.logo_url ? { logo: row.logo_url } : {}),
    streamUrl: row.stream_url,
    description: row.description || '',
    ...(row.number != null ? { number: row.number } : {}),
    ...(row.language ? { language: row.language } : {}),
    ...(row.country ? { country: row.country } : {}),
    // EPG 按需由 /api/liveChannels/epg 读取，列表查询不含 EPG。
    epg: [],
  };
}

const SELECT_CHANNEL = `
  SELECT c.id, c.name, c.logo_url, c.stream_url, c.stream_type, c.category,
         c.language, c.country, c.number, c.description, c.is_active, c.is_enabled,
         s.name AS source
  FROM channels c
  JOIN sources s ON s.id = c.source_id
  WHERE c.is_active = 1 AND c.is_enabled = 1
`;

const ORDER_CHANNEL = 'ORDER BY c.number ASC';

// 分页读取频道列表（不含 EPG）。category 为空则返回全部频道。
// 返回 { channels, total, hasMore }，供 API 路由与无限分页使用。
export async function getLiveChannelsPage(
  options: { offset?: number; limit?: number; category?: string | null } = {}
): Promise<{ channels: LiveChannel[]; total: number; hasMore: boolean }> {
  const database = getDb();
  const { offset = 0, limit = PAGE_SIZE, category = null } = options;

  const whereSql = category ? `${SELECT_CHANNEL} AND c.category = ?` : SELECT_CHANNEL;
  const whereParams = category ? [category] : [];

  const totalRow = database
    .prepare(`SELECT COUNT(*) AS n FROM (${whereSql})`)
    .get(...whereParams) as { n: number };
  const total = Number(totalRow.n);

  const rows = database
    .prepare(`${whereSql} ${ORDER_CHANNEL} LIMIT ? OFFSET ?`)
    .all(...whereParams, limit, offset) as ChannelRow[];

  return {
    channels: rows.map(rowToChannel),
    total,
    hasMore: offset + rows.length < total,
  };
}

// 读取某频道的节目表（EPG）：查询 programs 表当日起始的节目，按开始时间排序。
export async function getProgramsForChannel(
  channelId: number,
  limit = 24
): Promise<EpgSlot[]> {
  const database = getDb();

  const dayStart = new Date();
  dayStart.setHours(0, 0, 0, 0);

  const programs = database
    .prepare(
      `SELECT title, description, start_time, end_time, is_live
       FROM programs
       WHERE channel_id = ? AND end_time >= ?
       ORDER BY start_time ASC
       LIMIT ?`
    )
    .all(channelId, dayStart.toISOString(), limit) as Array<{
    title: string;
    description: string | null;
    start_time: string;
    end_time: string;
    is_live: number | null;
  }>;

  return programs.map((p) => ({
    start: new Date(p.start_time).getTime(),
    end: new Date(p.end_time).getTime(),
    title: p.title,
    description: p.description || '',
    isLive: p.is_live === 1,
  }));
}

// 返回频道分类列表（含各分类频道数），供分类导航展示。
export async function getCategoriesWithCount(): Promise<
  Array<{ category: string; count: number }>
> {
  const database = getDb();

  const rows = database
    .prepare(
      `SELECT category, COUNT(*) AS n
       FROM channels
       WHERE is_active = 1 AND is_enabled = 1 AND category IS NOT NULL
       GROUP BY category
       ORDER BY n DESC`
    )
    .all() as Array<{ category: string; n: number }>;

  return rows.map((r) => ({ category: r.category, count: Number(r.n) }));
}