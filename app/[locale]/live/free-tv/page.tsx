import { redirect } from 'next/navigation';
import { routing } from '@/i18n/routing';

export const revalidate = 0;

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function FreeTVPageRoute({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  redirect(`/${locale}/live`);
}
