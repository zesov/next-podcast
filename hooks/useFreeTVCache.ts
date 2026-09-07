'use client';

import { create } from 'zustand';
import { FreeTVChannel } from '@/lib/freeTvParser';
import { EpgSlot } from '@/components/LiveTV/liveChannels';

const DB_NAME = 'free-tv-cache';
const CHANNELS_STORE = 'channels';
const EPG_STORE = 'epg';
const DB_VERSION = 1;

interface CacheState {
  db: IDBDatabase | null;
  init: () => Promise<void>;
  getChannels: () => Promise<FreeTVChannel[] | null>;
  setChannels: (channels: FreeTVChannel[]) => Promise<void>;
  getEpg: (channelId: string) => Promise<EpgSlot[] | null>;
  setEpg: (channelId: string, programs: EpgSlot[]) => Promise<void>;
  isChannelsStale: (maxAgeMs?: number) => Promise<boolean>;
  isEpgStale: (channelId: string, maxAgeMs?: number) => Promise<boolean>;
  clear: () => Promise<void>;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(CHANNELS_STORE)) {
        db.createObjectStore(CHANNELS_STORE);
      }
      if (!db.objectStoreNames.contains(EPG_STORE)) {
        db.createObjectStore(EPG_STORE);
      }
    };
  });
}

export const useFreeTVCache = create<CacheState>((set, get) => ({
  db: null,

  init: async () => {
    if (get().db) return;
    const db = await openDB();
    set({ db });
  },

  getChannels: async () => {
    const { db } = get();
    if (!db) await get().init();
    return new Promise((resolve, reject) => {
      const tx = db!.transaction(CHANNELS_STORE, 'readonly');
      const store = tx.objectStore(CHANNELS_STORE);
      const request = store.get('channels');
      request.onsuccess = () => {
        const data = request.result;
        if (data && data.channels) {
          resolve(data.channels as FreeTVChannel[]);
        } else {
          resolve(null);
        }
      };
      request.onerror = () => reject(request.error);
    });
  },

  setChannels: async (channels: FreeTVChannel[]) => {
    const { db } = get();
    if (!db) await get().init();
    return new Promise((resolve, reject) => {
      const tx = db!.transaction(CHANNELS_STORE, 'readwrite');
      const store = tx.objectStore(CHANNELS_STORE);
      const request = store.put({ channels, fetchedAt: Date.now() }, 'channels');
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  },

  getEpg: async (channelId: string) => {
    const { db } = get();
    if (!db) await get().init();
    return new Promise((resolve, reject) => {
      const tx = db!.transaction(EPG_STORE, 'readonly');
      const store = tx.objectStore(EPG_STORE);
      const request = store.get(channelId);
      request.onsuccess = () => {
        const data = request.result;
        if (data && data.programs) {
          resolve(data.programs as EpgSlot[]);
        } else {
          resolve(null);
        }
      };
      request.onerror = () => reject(request.error);
    });
  },

  setEpg: async (channelId: string, programs: EpgSlot[]) => {
    const { db } = get();
    if (!db) await get().init();
    return new Promise((resolve, reject) => {
      const tx = db!.transaction(EPG_STORE, 'readwrite');
      const store = tx.objectStore(EPG_STORE);
      const request = store.put({ programs, fetchedAt: Date.now() }, channelId);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  },

  isChannelsStale: async (maxAgeMs = 3600000) => {
    const { db } = get();
    if (!db) await get().init();
    return new Promise((resolve, reject) => {
      const tx = db!.transaction(CHANNELS_STORE, 'readonly');
      const store = tx.objectStore(CHANNELS_STORE);
      const request = store.get('channels');
      request.onsuccess = () => {
        const data = request.result;
        if (!data?.fetchedAt) {
          resolve(true);
        } else {
          resolve(Date.now() - data.fetchedAt > maxAgeMs);
        }
      };
      request.onerror = () => reject(request.error);
    });
  },

  isEpgStale: async (channelId: string, maxAgeMs = 1800000) => {
    const { db } = get();
    if (!db) await get().init();
    return new Promise((resolve, reject) => {
      const tx = db!.transaction(EPG_STORE, 'readonly');
      const store = tx.objectStore(EPG_STORE);
      const request = store.get(channelId);
      request.onsuccess = () => {
        const data = request.result;
        if (!data?.fetchedAt) {
          resolve(true);
        } else {
          resolve(Date.now() - data.fetchedAt > maxAgeMs);
        }
      };
      request.onerror = () => reject(request.error);
    });
  },

  clear: async () => {
    const { db } = get();
    if (!db) await get().init();
    return new Promise((resolve, reject) => {
      const tx = db!.transaction([CHANNELS_STORE, EPG_STORE], 'readwrite');
      tx.objectStore(CHANNELS_STORE).clear();
      tx.objectStore(EPG_STORE).clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  },
}));

if (typeof window !== 'undefined') {
  useFreeTVCache.getState().init().catch(console.error);
}