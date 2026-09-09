import FreeTVPage from '@/components/FreeTV/FreeTVPage';
import Navbar from '@/components/Navbar';
import { setRequestLocale } from 'next-intl/server';
import { routing } from '@/i18n/routing';
import { Suspense } from 'react';

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
      <Suspense fallback={<div className="min-h-screen bg-gray-950 flex items-center justify-center"><p className="text-gray-400">Loading...</p></div>}>
        <FreeTVPage />
      </Suspense>
    </>
  );
}