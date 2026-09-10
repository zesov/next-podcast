import { createHash } from 'crypto';

export interface M3UChannel {
  id: string;
  name: string;
  logo?: string;
  groupTitle?: string;
  streamUrl: string;
  sourceUrl: string;
}

export interface ParseM3UResult {
  channels: M3UChannel[];
  sourceUrl: string;
  channelCount: number;
  epgUrl?: string;
}

export function parseM3U(content: string, sourceUrl: string): ParseM3UResult {
  const lines = content.split('\n').map((l) => l.trim());

  // Validate M3U header
  if (!lines[0]?.startsWith('#EXTM3U')) {
    throw new Error('Invalid M3U format');
  }

  // Extract EPG URL from header
  const headerMatch = lines[0].match(/x-tvg-url="([^"]+)"/);
  const epgUrl = headerMatch?.[1];

  const channels: M3UChannel[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line || line.startsWith('#')) continue;

    // This line should be a stream URL. Find the preceding #EXTINF line.
    let extinfLine = '';
    for (let j = i - 1; j >= 1; j--) {
      if (lines[j].startsWith('#EXTINF')) {
        extinfLine = lines[j];
        break;
      }
      if (lines[j] && !lines[j].startsWith('#')) break; // hit another URL
    }

    if (!extinfLine) continue;

    const streamUrl = line;
    const id = createHash('sha256').update(streamUrl).digest('hex').slice(0, 12);

    // Parse logo
    const logoMatch = extinfLine.match(/tvg-logo="([^"]+)"/);
    const logo = logoMatch?.[1];

    // Parse group-title
    const groupMatch = extinfLine.match(/group-title="([^"]+)"/);
    const groupTitle = groupMatch?.[1];

    // Parse channel name (after the last comma)
    const commaIdx = extinfLine.lastIndexOf(',');
    const name = commaIdx >= 0 ? extinfLine.slice(commaIdx + 1).trim() : streamUrl;

    channels.push({ id, name, logo, groupTitle, streamUrl, sourceUrl });
  }

  return { channels, sourceUrl, channelCount: channels.length, epgUrl };
}
