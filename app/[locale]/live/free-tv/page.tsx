import FreeTVPage from '@/components/FreeTV/FreeTVPage';
import Navbar from '@/components/Navbar';
import { setRequestLocale } from 'next-intl/server';
import { routing } from '@/i18n/routing';

interface Props {
  params: Promise<{ locale: string }>;
}

export const revalidate = 900;

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function FreeTVPageRoute({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  return (
    <>
      <Navbar />
      <FreeTVPage />
    </>
  );
}