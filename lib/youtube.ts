// YouTube URL 判定：youtube.com 及其子域名、youtu.be 短链接

export function isYoutubeUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return (
      u.hostname === 'youtu.be' ||
      u.hostname === 'youtube.com' ||
      u.hostname.endsWith('.youtube.com')
    );
  } catch {
    return false;
  }
}