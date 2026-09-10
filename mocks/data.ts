// MSW mock 数据 —— 模拟 Podcast Index API 返回的真实结构
// 覆盖客户端 fetch(`/api/podcastById`) 与 fetch(`/api/episodesByFeedId`)
// 数据形状以 podcastdx-client 的 PodcastById / Episode 结构为准

export interface MockEpisode {
  id: number;
  title: string;
  description: string;
  image: string;
  feedImage: string;
  enclosureType: string;
  datePublishedPretty: string;
  datePublished: number;
  enclosureLength: number;
  enclosureUrl: string;
  feedTitle: string;
  feedId: number;
}

export interface MockFeed {
  id: number;
  title: string;
  description: string;
  image: string;
  url: string;
  author: string;
  language: string;
}

// 为描述提供非空文本（客户端渲染用，避免空描述导致布局跳动）
const DESC =
  '<p>香港電台（RTHK）官方播客。緊貼時事、文化、科技與生活，用廣東話和普通話為你帶來多元內容。</p>';

function makeEpisode(
  id: number,
  title: string,
  feedId: number,
  feedTitle: string,
  minutes: number
): MockEpisode {
  return {
    id,
    title,
    description: DESC,
    image: '/music.svg',
    feedImage: '/music.svg',
    enclosureType: 'audio/mpeg',
    datePublishedPretty: 'Sep 01, 2026',
    datePublished: 1780000000 + id * 3600,
    enclosureLength: minutes * 60 * 1000,
    enclosureUrl:
      'https://podcast.rthk.hk/podcast/media/enca_hktoday/78_2508250850_71679.mp3',
    feedTitle,
    feedId,
  };
}

// 示例播客（feed）
export const mockFeeds: MockFeed[] = [
  { id: 1, title: '鏗鏘集', description: DESC, image: '/music.svg', url: 'https://www.rthk.hk/radio/radio1', author: 'RTHK 香港電台', language: 'zh' },
  { id: 2, title: '城市論壇', description: DESC, image: '/music.svg', url: 'https://www.rthk.hk/radio/radio1', author: 'RTHK 香港電台', language: 'zh' },
  { id: 3, title: '精靈一點', description: DESC, image: '/music.svg', url: 'https://www.rthk.hk/radio/radio5', author: 'RTHK 香港電台', language: 'zh' },
  { id: 4, title: 'English in News', description: DESC, image: '/music.svg', url: 'https://www.rthk.hk/radio/radio3', author: 'RTHK Radio 3', language: 'en' },
];

// 每个 feed 的节目（episodes）
export const mockEpisodesByFeed: Record<number, MockEpisode[]> = {
  1: [
    makeEpisode(101, '鏗鏘集：都市更新', 1, '鏗鏘集', 23),
    makeEpisode(102, '鏗鏘集：土地與房屋', 1, '鏗鏘集', 22),
    makeEpisode(103, '鏗鏘集：醫療改革', 1, '鏗鏘集', 23),
  ],
  2: [
    makeEpisode(201, '城市論壇：樓市前瞻', 2, '城市論壇', 47),
    makeEpisode(202, '城市論壇：交通運輸', 2, '城市論壇', 46),
  ],
  3: [
    makeEpisode(301, '精靈一點：中醫養生', 3, '精靈一點', 58),
    makeEpisode(302, '精靈一點：心理健康', 3, '精靈一點', 59),
  ],
  4: [
    makeEpisode(401, 'English in News: Tech Update', 4, 'English in News', 15),
    makeEpisode(402, 'English in News: Culture', 4, 'English in News', 14),
  ],
};

// podcastById 返回 { feed, episodes }
export function podcastById(id: number): { feed: MockFeed | null; episodes: MockEpisode[] } {
  const feed = mockFeeds.find((f) => f.id === id) ?? null;
  return { feed, episodes: feed ? mockEpisodesByFeed[id] ?? [] : [] };
}

// episodesByFeedId 返回 episodes 数组（对应 /api/episodesByFeedId 返回的 result.items）
export function episodesByFeedId(id: number): MockEpisode[] {
  return mockEpisodesByFeed[id] ?? [];
}
