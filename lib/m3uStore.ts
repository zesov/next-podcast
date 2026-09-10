import { openDB, IDBPDatabase } from 'idb';
import { M3UChannel } from './m3uParser';

const DB_NAME = 'live-m3u';
const DB_VERSION = 1;
const CHANNELS_STORE = 'channels';
const SOURCES_STORE = 'sources';

export interface M3USource {
  url: string;
  channelCount: number;
  loadedAt: number;
}

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(CHANNELS_STORE)) {
          const store = db.createObjectStore(CHANNELS_STORE, { keyPath: 'id' });
          store.createIndex('sourceUrl', 'sourceUrl');
          store.createIndex('groupTitle', 'groupTitle');
        }
        if (!db.objectStoreNames.contains(SOURCES_STORE)) {
          db.createObjectStore(SOURCES_STORE, { keyPath: 'url' });
        }
      },
    });
  }
  return dbPromise;
}

export async function saveChannels(channels: M3UChannel[]): Promise<void> {
  const db = await getDB();
  const tx = db.transaction(CHANNELS_STORE, 'readwrite');
  for (const ch of channels) {
    await tx.store.put(ch);
  }
  await tx.done;
}

export async function getChannelsBySource(sourceUrl: string): Promise<M3UChannel[]> {
  const db = await getDB();
  return db.getAllFromIndex(CHANNELS_STORE, 'sourceUrl', sourceUrl);
}

export async function getAllChannels(): Promise<M3UChannel[]> {
  const db = await getDB();
  return db.getAll(CHANNELS_STORE);
}

export async function deleteChannelsBySource(sourceUrl: string): Promise<void> {
  const db = await getDB();
  const tx = db.transaction(CHANNELS_STORE, 'readwrite');
  const index = tx.store.index('sourceUrl');
  let cursor = await index.openCursor(sourceUrl);
  while (cursor) {
    await cursor.delete();
    cursor = await cursor.continue();
  }
  await tx.done;
}

export async function saveSource(source: M3USource): Promise<void> {
  const db = await getDB();
  await db.put(SOURCES_STORE, source);
}

export async function getSources(): Promise<M3USource[]> {
  const db = await getDB();
  return db.getAll(SOURCES_STORE);
}

export async function deleteSource(url: string): Promise<void> {
  const db = await getDB();
  await db.delete(SOURCES_STORE, url);
}
