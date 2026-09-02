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
            <h3 className="text-lg font-semibold mb-4">{t('follow')}</h3>
            <div className="flex space-x-4">
              <a href="#" className="text-gray-300 hover:text-white">
                <i className="fab fa-weixin text-xl"></i>
              </a>
              <a href="#" className="text-gray-300 hover:text-white">
                <i className="fab fa-weibo text-xl"></i>
              </a>
              <a href="#" className="text-gray-300 hover:text-white">
                <i className="fab fa-xiaohongshu text-xl"></i>
              </a>
              <a href="#" className="text-gray-300 hover:text-white">
                <i className="fab fa-douyin text-xl"></i>
              </a>
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
