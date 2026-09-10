import Navbar from '@/components/Navbar';
import LiveTvPage from '@/components/LiveTV/LiveTvPage';
import { setRequestLocale } from 'next-intl/server';
import { routing } from '@/i18n/routing';

interface Props {
  params: Promise<{ locale: string }>;
}

// 电视直播页面（路由 /{locale}/live）—— 频道数据由客户端通过 Free-TV IPTV API 加载。
export const revalidate = 900;

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LivePage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  return (
    <>
      <Navbar />
      <LiveTvPage />
    </>
  );
}