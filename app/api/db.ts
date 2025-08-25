import PodcastIndexClient from "podcastdx-client";

export function createClient(key: string, secret: string) {
  // if (!key) {
  //   return new Error(`PODCAST_INDEX_KEY is not set`);
  // }
  return new PodcastIndexClient({ key, secret, disableAnalytics: true });
}

export const client = createClient(process.env.PODCAST_INDEX_KEY || "", "3uuzqcjnttENB5J$nPj83BaLx8dydvYR6fTGcfwg");