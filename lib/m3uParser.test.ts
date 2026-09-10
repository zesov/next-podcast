import { describe, it, expect } from 'vitest';
import { parseM3U } from './m3uParser';

const SAMPLE_M3U = `#EXTM3U
#EXTINF:-1 tvg-logo="https://example.com/logo.png" group-title="News",CNN
http://stream.example.com/cnn.m3u8
#EXTINF:-1 group-title="Sports",ESPN
http://stream.example.com/espn.m3u8
#EXTINF:-1,BBC News
http://stream.example.com/bbc.m3u8`;

const EMPTY_M3U = `#EXTM3U`;

const MALFORMED = `This is not an M3U file`;

describe('parseM3U', () => {
  it('parses channels with all metadata', () => {
    const result = parseM3U(SAMPLE_M3U, 'http://source.com/playlist.m3u');
    expect(result.channels).toHaveLength(3);
    expect(result.channels[0]).toEqual({
      id: expect.any(String),
      name: 'CNN',
      logo: 'https://example.com/logo.png',
      groupTitle: 'News',
      streamUrl: 'http://stream.example.com/cnn.m3u8',
      sourceUrl: 'http://source.com/playlist.m3u',
    });
  });

  it('handles missing group-title gracefully', () => {
    const result = parseM3U(SAMPLE_M3U, 'http://source.com/playlist.m3u');
    expect(result.channels[2].groupTitle).toBeUndefined();
    expect(result.channels[2].name).toBe('BBC News');
  });

  it('generates deterministic IDs from stream URL', () => {
    const result1 = parseM3U(SAMPLE_M3U, 'http://source.com/playlist.m3u');
    const result2 = parseM3U(SAMPLE_M3U, 'http://source.com/playlist.m3u');
    expect(result1.channels[0].id).toBe(result2.channels[0].id);
  });

  it('returns empty array for empty M3U', () => {
    const result = parseM3U(EMPTY_M3U, 'http://source.com/playlist.m3u');
    expect(result.channels).toHaveLength(0);
  });

  it('throws on non-M3U content', () => {
    expect(() => parseM3U(MALFORMED, 'http://source.com/playlist.m3u')).toThrow('Invalid M3U format');
  });

  it('extracts tvg-url from header if present', () => {
    const m3u = `#EXTM3U x-tvg-url="http://epg.example.com/epg.xml"
#EXTINF:-1,Test
http://stream.example.com/test.m3u8`;
    const result = parseM3U(m3u, 'http://source.com/playlist.m3u');
    expect(result.epgUrl).toBe('http://epg.example.com/epg.xml');
  });
});
