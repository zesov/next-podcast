export interface FreeTVChannel {
  id: string;
  name: string;
  logo?: string;
  groupTitle?: string;
  streamUrl: string;
  tvgUrl?: string;
  country?: string;
  language?: string;
  number?: number;
  favorite?: boolean;
}

export interface FreeTVEpgProgram {
  channelId: string;
  title: string;
  description: string;
  start: number;
  end: number;
  isLive?: boolean;
}

function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}

export function parseM3U8(content: string): FreeTVChannel[] {
  const lines = content.split('\n').map(l => l.trim()).filter(Boolean);
  const channels: FreeTVChannel[] = [];
  let currentExtinf: string | null = null;
  let globalTvgUrl: string | undefined;

  const extm3uLine = lines.find(l => l.startsWith('#EXTM3U'));
  if (extm3uLine) {
    const match = extm3uLine.match(/x-tvg-url=["']([^"']+)["']/i);
    if (match) globalTvgUrl = match[1];
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.startsWith('#EXTINF:')) {
      currentExtinf = line.slice('#EXTINF:'.length).trim();
    } else if (currentExtinf && !line.startsWith('#')) {
      const channel = parseExtinfLine(currentExtinf, line, globalTvgUrl);
      if (channel) channels.push(channel);
      currentExtinf = null;
    }
  }
  return channels;
}

function parseExtinfLine(extinf: string, streamUrl: string, globalTvgUrl?: string): FreeTVChannel | null {
  const attrs: Record<string, string> = {};
  const attrRegex = /([\w-]+)=["']([^"']*)["']/g;
  let match;
  while ((match = attrRegex.exec(extinf)) !== null) {
    attrs[match[1].toLowerCase()] = match[2];
  }

  const nameMatch = extinf.match(/,([^,]+)$/);
  const name = nameMatch ? nameMatch[1].trim() : attrs['tvg-name'] || 'Unknown';

  const id = attrs['tvg-id'] || `generated-${hashString(streamUrl)}`;
  const tvgUrl = attrs['tvg-url'] || globalTvgUrl;

  return {
    id,
    name,
    logo: attrs['tvg-logo'] || undefined,
    groupTitle: attrs['group-title'] || undefined,
    streamUrl,
    tvgUrl,
    country: attrs['tvg-country'] || undefined,
    language: attrs['tvg-language'] || undefined,
    number: attrs['tvg-chno'] ? parseInt(attrs['tvg-chno'], 10) : undefined,
  };
}

export function parseEpgXMLWithChannels(content: string, playlistChannels: FreeTVChannel[]): FreeTVEpgProgram[] {
  const epgChannelNames = new Map<string, string>();
  const epgChannelIds = new Map<string, string>(); // epg channel id -> display name
  const channelRegex = /<channel\s+id=["']([^"']+)["'][^>]*>([\s\S]*?)<\/channel>/gi;
  let channelMatch;
  while ((channelMatch = channelRegex.exec(content)) !== null) {
    const [, epgChannelId, inner] = channelMatch;
    const displayNameMatch = inner.match(/<display-name[^>]*>([^<]+)<\/display-name>/i);
    if (displayNameMatch) {
      epgChannelNames.set(epgChannelId, displayNameMatch[1]);
      epgChannelIds.set(epgChannelId, displayNameMatch[1]);
    }
  }

  // Build lookups from playlist channels
  const nameToChannel = new Map<string, FreeTVChannel>();
  const idToChannel = new Map<string, FreeTVChannel>();
  for (const ch of playlistChannels) {
    const normalizedName = normalizeName(ch.name);
    if (!nameToChannel.has(normalizedName)) {
      nameToChannel.set(normalizedName, ch);
    }
    if (ch.id) {
      const normalizedId = normalizeId(ch.id);
      if (!idToChannel.has(normalizedId)) {
        idToChannel.set(normalizedId, ch);
      }
    }
  }

  const programmes: FreeTVEpgProgram[] = [];
  const programmeRegex = /<programme\s+[^>]*channel=["']([^"']+)["']\s+start=["']([^"']+)["']\s+stop=["']([^"']+)["'][^>]*>([\s\S]*?)<\/programme>/gi;

  let match;
  while ((match = programmeRegex.exec(content)) !== null) {
    const [, epgChannelId, startStr, stopStr, inner] = match;
    const epgDisplayName = epgChannelNames.get(epgChannelId);
    if (!epgDisplayName) continue;

    // Try multiple matching strategies:
    // 1. Match by normalized EPG channel ID to playlist tvg-id
    const normalizedEpgId = normalizeId(epgChannelId);
    let playlistChannel = idToChannel.get(normalizedEpgId);
    
    // 2. Fallback: match by normalized display name
    if (!playlistChannel && epgDisplayName) {
      const normalizedEpgName = normalizeName(epgDisplayName);
      playlistChannel = nameToChannel.get(normalizedEpgName);
    }
    
    if (!playlistChannel) continue;

    const titleMatch = inner.match(/<title[^>]*>([^<]+)<\/title>/i);
    const descMatch = inner.match(/<desc[^>]*>([^<]+)<\/desc>/i);

    programmes.push({
      channelId: playlistChannel.id,
      title: titleMatch?.[1] || 'Unknown Program',
      description: descMatch?.[1] || '',
      start: parseXmltvTime(startStr),
      end: parseXmltvTime(stopStr),
    });
  }
  return programmes.sort((a, b) => a.start - b.start);
}

function normalizeId(id: string): string {
  return id.toLowerCase().replace(/[.\s]/g, '');
}

function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, '')
    .replace(/[ⓈⒸⓉⓇ]/g, '');
}

export function parseEpgXML(content: string, channelId: string): FreeTVEpgProgram[] {
  const programmes: FreeTVEpgProgram[] = [];
  const programmeRegex = /<programme\s+[^>]*channel=["']([^"']+)["']\s+start=["']([^"']+)["']\s+stop=["']([^"']+)["'][^>]*>([\s\S]*?)<\/programme>/gi;

  let match;
  while ((match = programmeRegex.exec(content)) !== null) {
    const [, progChannelId, startStr, stopStr, inner] = match;
    if (progChannelId !== channelId) continue;

    const titleMatch = inner.match(/<title[^>]*>([^<]+)<\/title>/i);
    const descMatch = inner.match(/<desc[^>]*>([^<]+)<\/desc>/i);

    programmes.push({
      channelId,
      title: titleMatch?.[1] || 'Unknown Program',
      description: descMatch?.[1] || '',
      start: parseXmltvTime(startStr),
      end: parseXmltvTime(stopStr),
    });
  }
  return programmes.sort((a, b) => a.start - b.start);
}

function parseXmltvTime(str: string): number {
  const clean = str.replace(/\s.*$/, '');
  const year = parseInt(clean.slice(0, 4), 10);
  const month = parseInt(clean.slice(4, 6), 10) - 1;
  const day = parseInt(clean.slice(6, 8), 10);
  const hour = parseInt(clean.slice(8, 10), 10);
  const minute = parseInt(clean.slice(10, 12), 10);
  const second = parseInt(clean.slice(12, 14), 10) || 0;
  return Date.UTC(year, month, day, hour, minute, second);
}

export function parseEpgJSON(content: string, channelId: string): FreeTVEpgProgram[] {
  try {
    const data = JSON.parse(content);
    if (Array.isArray(data)) {
      return data
        .filter((p: any) => p.channelId === channelId || p.channel_id === channelId)
        .map((p: any) => ({
          channelId,
          title: p.title || p.name || 'Unknown',
          description: p.description || p.desc || '',
          start: typeof p.start === 'number' ? p.start : new Date(p.start_time || p.startTime || 0).getTime(),
          end: typeof p.end === 'number' ? p.end : new Date(p.end_time || p.endTime || 0).getTime(),
        }))
        .sort((a, b) => a.start - b.start);
    }
    return [];
  } catch {
    return [];
  }
}
