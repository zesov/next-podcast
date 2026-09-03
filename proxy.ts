import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';

// i18n 中间件：根据请求路径与语言协商，重定向到带语言前缀的 URL
// i18n middleware: negotiates locale and redirects to locale-prefixed URL
export default createMiddleware(routing);

export const config = {
  // 匹配所有路径，但排除 API 路由、静态资源等（API 与内部数据脚本保持无语言前缀）
  matcher: [
    // 匹配所有路径
    '/((?!api|_next|_vercel|.*\\..*).*)',
  ],
};
