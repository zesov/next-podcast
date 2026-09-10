import { getRequestConfig } from 'next-intl/server';
import { hasLocale } from 'next-intl';
import { routing } from './routing';

// 根据请求语言加载对应的翻译消息
// Load translation messages based on the request locale
export default getRequestConfig(async ({ requestLocale }) => {
  // 从请求解析出的语言（可能是 undefined）
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested)
    ? requested
    : routing.defaultLocale;

  const [shared, podcast, live, peertube] = await Promise.all([
    import(`../messages/${locale}/shared.json`),
    import(`../messages/${locale}/podcast.json`),
    import(`../messages/${locale}/live.json`),
    import(`../messages/${locale}/peertube.json`),
  ]);

  return {
    locale,
    messages: {
      ...shared.default,
      ...podcast.default,
      ...live.default,
      ...peertube.default,
    },
  };
});
