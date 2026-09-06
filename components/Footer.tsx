'use client';
import { useTranslations } from 'next-intl';

export default function Footer() {
  const t = useTranslations('footer');
  return (
    <footer className="bg-gray-800 text-white py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <h3 className="text-lg font-semibold mb-4">{t('explore')}</h3>
            <ul className="space-y-2">
              <li><a href="#" className="text-gray-300 hover:text-white">{t('browse')}</a></li>
              <li><a href="#" className="text-gray-300 hover:text-white">{t('ranking')}</a></li>
              <li><a href="#" className="text-gray-300 hover:text-white">{t('categories')}</a></li>
            </ul>
          </div>
          <div>
            <h3 className="text-lg font-semibold mb-4">{t('about')}</h3>
            <ul className="space-y-2">
              <li><a href="#" className="text-gray-300 hover:text-white">{t('aboutUs')}</a></li>
              <li><a href="#" className="text-gray-300 hover:text-white">{t('creators')}</a></li>
              <li><a href="#" className="text-gray-300 hover:text-white">{t('jobs')}</a></li>
            </ul>
          </div>
          <div>
            <h3 className="text-lg font-semibold mb-4">{t('support')}</h3>
            <ul className="space-y-2">
              <li><a href="#" className="text-gray-300 hover:text-white">{t('help')}</a></li>
              <li><a href="#" className="text-gray-300 hover:text-white">{t('guidelines')}</a></li>
              <li><a href="#" className="text-gray-300 hover:text-white">{t('feedback')}</a></li>
            </ul>
          </div>
          <div>
            <h3 className="text-lg font-semibold mb-4">{t('disclaimer')}</h3>
            <div className="flex space-x-4">
                <p className="text-gray-200 text-sm leading-relaxed">
                    <svg className="w-4 h-4 text-amber-500 inline-block mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">  
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                    All content is collected from public sources. We respect copyright and will remove any infringing content immediately upon valid notice.
                </p>
            </div>
          </div>
        </div>
        <div className="border-t border-gray-700 mt-8 pt-8 text-sm text-gray-400">
          <p>{t('copyright')}</p>
        </div>
      </div>
    </footer>
  );
}
