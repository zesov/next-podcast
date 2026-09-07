import { parseM3U8, parseEpgXML, FreeTVChannel, FreeTVEpgProgram } from './freeTvParser';

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

console.log('All tests passed!');