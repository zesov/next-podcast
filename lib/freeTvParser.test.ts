import { parseM3U8, parseEpgXML, parseEpgXMLWithChannels, prioritizeEpgUrls, searchFreeTVChannels, FreeTVChannel, FreeTVEpgProgram } from './freeTvParser';

const sampleM3U8 = `#EXTM3U x-tvg-url="https://example.com/epg.xml"
#EXTINF:-1 tvg-id="channel1" tvg-name="Test Channel 1" tvg-logo="https://example.com/logo1.png" group-title="News" tvg-country="US" tvg-language="en" tvg-url="https://example.com/epg1.xml",Test Channel 1
https://stream.example.com/channel1.m3u8
#EXTINF:-1 tvg-id="channel2" tvg-name="Test Channel 2" tvg-logo="https://example.com/logo2.png" group-title="Sports",Test Channel 2
https://stream.example.com/channel2.m3u8
#EXTINF:-1 tvg-name="No ID Channel",Test Channel 3
https://stream.example.com/channel3.m3u8`;

const sampleXMLTV = `<?xml version="1.0" encoding="utf-8"?>
<tv>
  <channel id="channel1">
    <display-name>Test Channel 1</display-name>
  </channel>
  <programme channel="channel1" start="20260907120000 +0000" stop="20260907130000 +0000">
    <title>News Hour</title>
    <desc>Latest news</desc>
  </programme>
  <programme channel="channel1" start="20260907130000 +0000" stop="20260907140000 +0000">
    <title>Weather</title>
    <desc>Weather forecast</desc>
  </programme>
</tv>`;

function test(name: string, fn: () => void) {
  try {
    fn();
    console.log(`✅ ${name}`);
  } catch (e) {
    console.error(`❌ ${name}:`, e);
    process.exit(1);
  }
}

function expect(actual: any) {
  return {
    toHaveLength: (expected: number) => {
      if (actual.length !== expected) throw new Error(`Expected length ${expected}, got ${actual.length}`);
    },
    toMatchObject: (expected: any) => {
      for (const [key, value] of Object.entries(expected)) {
        if (actual[key] !== value) throw new Error(`Expected ${key}=${value}, got ${actual[key]}`);
      }
    },
    toBe: (expected: any) => {
      if (actual !== expected) throw new Error(`Expected ${expected}, got ${actual}`);
    },
    toMatch: (regex: RegExp) => {
      if (!regex.test(actual)) throw new Error(`Expected ${actual} to match ${regex}`);
    },
    toBeLessThan: (expected: number) => {
      if (actual >= expected) throw new Error(`Expected ${actual} < ${expected}`);
    },
    toBeUndefined: () => {
      if (actual !== undefined) throw new Error(`Expected undefined, got ${actual}`);
    },
  };
}

test('parseM3U8 extracts channels with all attributes', () => {
  const channels = parseM3U8(sampleM3U8);
  expect(channels).toHaveLength(3);
  expect(channels[0]).toMatchObject({
    id: 'channel1',
    name: 'Test Channel 1',
    logo: 'https://example.com/logo1.png',
    groupTitle: 'News',
    streamUrl: 'https://stream.example.com/channel1.m3u8',
    tvgUrl: 'https://example.com/epg1.xml',
    country: 'US',
    language: 'en',
  });
  expect(channels[1].id).toBe('channel2');
  expect(channels[2].id).toMatch(/^generated-/);
});

test('parseM3U8 handles missing optional attributes', () => {
  const minimal = `#EXTM3U
#EXTINF:-1,Minimal Channel
https://stream.example.com/minimal.m3u8`;
  const channels = parseM3U8(minimal);
  expect(channels).toHaveLength(1);
  expect(channels[0].name).toBe('Minimal Channel');
  expect(channels[0].logo).toBeUndefined();
  expect(channels[0].groupTitle).toBeUndefined();
});

test('parseEpgXML converts XMLTV to EpgSlot format', () => {
  const programs = parseEpgXML(sampleXMLTV, 'channel1');
  expect(programs).toHaveLength(2);
  expect(programs[0]).toMatchObject({
    channelId: 'channel1',
    title: 'News Hour',
    description: 'Latest news',
  });
  expect(programs[0].start).toBeLessThan(programs[0].end);
  expect(typeof programs[0].start).toBe('number');
});

// epgshare01（如 AL1.xml.gz）把 channel 属性放在 start/stop 之后，parser 必须兼容这种顺序
const sampleXMLTVChannelLast = `<?xml version="1.0" encoding="UTF-8"?>
<tv generator-info-name="none">
  <channel id="Kanali.7.al">
    <display-name lang="sq">Kanali 7</display-name>
  </channel>
  <programme start="20260908040000 +0000" stop="20260908050000 +0000" channel="Kanali.7.al">
    <title lang="sq">Program A</title>
    <desc lang="sq">Description A</desc>
  </programme>
  <programme start="20260908050000 +0000" stop="20260908060000 +0000" channel="Kanali.7.al">
    <title lang="sq">Program B</title>
  </programme>
</tv>`;

test('parseEpgXMLWithChannels handles programme with channel attribute LAST (epgshare01 format)', () => {
  const playlist: FreeTVChannel[] = [
    { id: 'Kanali7.al', name: 'Kanali 7', streamUrl: 'https://stream.example.com/k7.m3u8' },
  ];
  const programs = parseEpgXMLWithChannels(sampleXMLTVChannelLast, playlist);
  expect(programs).toHaveLength(2);
  expect(programs[0]).toMatchObject({
    channelId: 'Kanali7.al',
    title: 'Program A',
    description: 'Description A',
  });
});

test('parseEpgXMLWithChannels still handles channel attribute FIRST', () => {
  const playlist: FreeTVChannel[] = [
    { id: 'channel1', name: 'Test Channel 1', streamUrl: 'https://stream.example.com/c1.m3u8' },
  ];
  const programs = parseEpgXMLWithChannels(sampleXMLTV, playlist);
  expect(programs).toHaveLength(2);
  expect(programs[0].channelId).toBe('channel1');
});

test('prioritizeEpgUrls moves country-matching URLs to front', () => {
  const tvgUrl = 'https://epgshare01.online/epg_ripper_AL1.xml.gz, https://epgshare01.online/epg_ripper_HK1.xml.gz, https://epgshare01.online/epg_ripper_IT1.xml.gz';
  const ordered = prioritizeEpgUrls(tvgUrl, 'HK');
  expect(ordered).toHaveLength(3);
  expect(ordered[0]).toMatch(/HK1/);
});

test('prioritizeEpgUrls keeps original order when country has no match', () => {
  const tvgUrl = 'https://epgshare01.online/epg_ripper_AL1.xml.gz, https://epgshare01.online/epg_ripper_IT1.xml.gz';
  const ordered = prioritizeEpgUrls(tvgUrl, 'ZZ');
  expect(ordered[0]).toMatch(/AL1/);
  expect(ordered[1]).toMatch(/IT1/);
});

test('prioritizeEpgUrls handles undefined country and empty string', () => {
  const tvgUrl = 'https://epgshare01.online/epg_ripper_AL1.xml.gz';
  expect(prioritizeEpgUrls(tvgUrl, undefined)).toHaveLength(1);
  expect(prioritizeEpgUrls('', 'HK')).toHaveLength(0);
});

test('prioritizeEpgUrls maps GB country to UK1 file (epgshare01 uses UK not GB)', () => {
  const tvgUrl = 'https://epgshare01.online/epg_ripper_AL1.xml.gz, https://epgshare01.online/epg_ripper_UK1.xml.gz';
  const ordered = prioritizeEpgUrls(tvgUrl, 'GB');
  expect(ordered).toHaveLength(2);
  expect(ordered[0]).toMatch(/UK1/);
});

test('prioritizeEpgUrls drops ALL_SOURCES (decompress exceeds Node string limit)', () => {
  const tvgUrl = 'https://epgshare01.online/epg_ripper_AL1.xml.gz, https://epgshare01.online/epg_ripper_ALL_SOURCES1.xml.gz';
  const ordered = prioritizeEpgUrls(tvgUrl, 'AL');
  expect(ordered).toHaveLength(1);
  expect(ordered[0]).toMatch(/AL1/);
});

test('searchFreeTVChannels matches channel id (search=Food.Network.it finds id "Food.Network.it" / name "Food Network")', () => {
  const channels: FreeTVChannel[] = [
    { id: 'Food.Network.it', name: 'Food Network', country: 'IT', groupTitle: 'Italy', streamUrl: 'https://s.example/fn.m3u8' },
    { id: 'Rai1.it', name: 'Rai 1', country: 'IT', groupTitle: 'Italy', streamUrl: 'https://s.example/rai1.m3u8' },
    { id: 'BBC.News.uk', name: 'BBC News', country: 'GB', groupTitle: 'UK', streamUrl: 'https://s.example/bbc.m3u8' },
  ];
  // 用户按频道 id 搜索（地址栏常见），必须返回对应频道
  const byId = searchFreeTVChannels(channels, 'Food.Network.it');
  expect(byId).toHaveLength(1);
  expect(byId[0].id).toBe('Food.Network.it');
  // 按显示名搜索仍然有效
  const byName = searchFreeTVChannels(channels, 'Food Network');
  expect(byName).toHaveLength(1);
  expect(byName[0].id).toBe('Food.Network.it');
  // 大小写不敏感
  const caseInsensitive = searchFreeTVChannels(channels, 'food.network.IT');
  expect(caseInsensitive).toHaveLength(1);
  expect(caseInsensitive[0].id).toBe('Food.Network.it');
  // 无匹配返回空数组
  expect(searchFreeTVChannels(channels, 'zzz-none')).toHaveLength(0);
});

test('searchFreeTVChannels also matches name / groupTitle / country', () => {
  const channels: FreeTVChannel[] = [
    { id: 'x1', name: 'Rai 1', country: 'IT', groupTitle: 'Italy', streamUrl: 'https://s.example/a.m3u8' },
    { id: 'x2', name: 'Some News', country: 'GB', groupTitle: 'UK News', streamUrl: 'https://s.example/b.m3u8' },
  ];
  expect(searchFreeTVChannels(channels, 'UK News')).toHaveLength(1);
  expect(searchFreeTVChannels(channels, 'IT')).toHaveLength(1);
  expect(searchFreeTVChannels(channels, 'no-match-here')).toHaveLength(0);
});

test('parseEpgXMLWithChannels tags each programme with its own playlist channel', () => {
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<tv>
  <channel id="ch1"><display-name>Channel One</display-name></channel>
  <channel id="ch2"><display-name>Channel Two</display-name></channel>
  <programme start="20260908040000 +0000" stop="20260908050000 +0000" channel="ch1"><title>Alpha Show</title></programme>
  <programme start="20260908050000 +0000" stop="20260908060000 +0000" channel="ch1"><title>Beta Show</title></programme>
  <programme start="20260908060000 +0000" stop="20260908070000 +0000" channel="ch2"><title>Gamma Show</title></programme>
</tv>`;
  const playlist: FreeTVChannel[] = [
    { id: 'one', name: 'Channel One', streamUrl: 'https://stream1.example.com/a.m3u8' },
    { id: 'two', name: 'Channel Two', streamUrl: 'https://stream2.example.com/b.m3u8' },
  ];
  const programs = parseEpgXMLWithChannels(xml, playlist);
  expect(programs).toHaveLength(3);
  const forOne = programs.filter(p => p.channelId === 'one');
  const forTwo = programs.filter(p => p.channelId === 'two');
  expect(forOne).toHaveLength(2);
  expect(forTwo).toHaveLength(1);
  expect(forOne[0]).toMatchObject({ title: 'Alpha Show', channelId: 'one' });
  expect(forOne[1]).toMatchObject({ title: 'Beta Show', channelId: 'one' });
  expect(forTwo[0]).toMatchObject({ title: 'Gamma Show', channelId: 'two' });
});

console.log('All tests passed!');