'use client';

import { TopPodcast } from '@/app/types';
import { useTranslations } from 'next-intl';
import Link from 'next/link';

type RankingsContentProps = {
  rankings: { podcast: TopPodcast; count: number }[] | null;
  error: string | null;
  locale: string;
};

export default function RankingsContent({ rankings, error, locale }: RankingsContentProps) {
  const t = useTranslations('ranking');
  
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-red-500 text-center">{error}</p>
      </div>
    );
  }

  if (!rankings) {
    // This should not happen, but just in case
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500 text-center">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto py-8 px-4">
        <h1 className="text-3xl font-bold mb-6 text-center">{t('title')}</h1>
        
        {rankings.length === 0 ? (
          <p className="text-center text-gray-500 py-12">{t('noData')}</p>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <ul className="divide-y divide-gray-200">
              {rankings.map(({ podcast, count }, index) => (
                <li key={podcast.id} className="p-4 hover:bg-gray-50">
                  <div className="flex items-start">
                    <span className="text-gray-500 w-6 text-center">{index + 1}</span>
                    {podcast.image ? (
                      <img 
                        className="w-16 h-16 rounded-full mr-4 object-cover" 
                        src={podcast.image} 
                        alt={podcast.title} 
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center mr-4">
                        <i className="fas fa-podcast text-gray-500 text-xl"></i>
                      </div>
                    )}
                    <div className="flex-1">
                      <Link href={`/podcast/${podcast.id}`} className="block mb-1">
                        <h3 className="font-medium">{podcast.title}</h3>
                      </Link>
                      <p className="text-sm text-gray-500">
                        {t('by')} {podcast.description?.split('|')[0] || podcast.description || t('unknown')}
                      </p>
                      <p className="text-sm text-indigo-600 font-medium">
                        {t('plays', { count })} {count}
                      </p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}