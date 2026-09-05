// 检查脚本：验证 data/fastchannels.db 的表结构与数据概况（只读，不重建）。
// 直播频道数据库由外部 scraper 写入（channels / programs / sources 表），
// 本文档不再负责建表或种子数据 —— 运行 `npm run db:seed` 仅打印统计信息。
import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';

const DB_PATH = path.join(process.cwd(), 'data', 'fastchannels.db');

if (!fs.existsSync(DB_PATH)) {
  console.error(`找不到 ${DB_PATH} —— 请先将直播频道数据库放入 data/ 目录。`);
  process.exit(1);
}

const db = new DatabaseSync(DB_PATH, { readOnly: true });

function count(sql: string): number {
  try {
    const row = db.prepare(sql).get() as { n: number };
    return Number(row.n);
  } catch {
    return -1;
  }
}

console.log('=== liveChannels.db 数据概况 ===');
console.log(`channels   : ${count('SELECT COUNT(*) AS n FROM channels')}`);
console.log(`启用的频道  : ${count('SELECT COUNT(*) AS n FROM channels WHERE is_active = 1 AND is_enabled = 1')}`);
console.log(`programs   : ${count('SELECT COUNT(*) AS n FROM programs')}`);
console.log(`sources    : ${count('SELECT COUNT(*) AS n FROM sources')}`);

const categories = db
  .prepare('SELECT category, COUNT(*) AS n FROM channels WHERE is_active = 1 GROUP BY category ORDER BY n DESC LIMIT 12')
  .all() as Array<{ category: string; n: number }>;
console.log('\n主要分类:');
for (const c of categories) console.log(`  ${c.category.padEnd(22)} ${c.n}`);

db.close();