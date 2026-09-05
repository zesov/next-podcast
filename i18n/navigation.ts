import { createNavigation } from 'next-intl/navigation';
import { routing } from './routing';

// 基于路由配置创建带语言前缀的导航助手
export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing);
