import Navbar from '@/components/Navbar';
import LiveTvPage from '@/components/LiveTV/LiveTvPage';
import { getCategoriesWithCount } from '@/lib/liveChannelsDb';
import { setRequestLocale } from 'next-intl/server';
import { routing } from '@/i18n/routing';

interface Props {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ search?: string }>;
}

// 电视直播页面（路由 /{locale}/live）—— 服务端外壳：只读取分类元数据（轻量），
// 频道列表由客户端通过 /api/liveChannels 无限分页加载，EPG 由 /api/liveChannels/epg 按需获取。
// 静态页每 15 分钟重生成，刷新分类与频道总数。
export const revalidate = 900;

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LivePage({ params, searchParams }: Props) {
  const { locale } = await params;
  const { search } = await searchParams;
  setRequestLocale(locale);
  const categories = await getCategoriesWithCount();
  return (
    <>
      <Navbar />
      <LiveTvPage categories={categories} searchTerm={search} />
    </>
  );
}