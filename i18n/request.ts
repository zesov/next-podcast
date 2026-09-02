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

  return {
    locale,
    // 加载语言包（相对于 i18n/ 目录）
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
