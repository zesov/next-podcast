import { defineRouting } from 'next-intl/routing';

// i18n 路由配置：中英双语
// i18n routing config: Chinese + English locales
export const routing = defineRouting({
  // 支持的语言列表（列出全部）
  locales: ['zh', 'en'],
  // 默认语言（无语言前缀时使用）
  defaultLocale: 'zh',
});
