'use client';
import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link, usePathname, useRouter } from '@/i18n/navigation';
import { Search, Podcast } from 'lucide-react';

export default function Navbar() {
  const t = useTranslations('navbar');
  const [searchTerm, setSearchTerm] = useState('');
  const pathname = usePathname();
  const router = useRouter();

  const isLivePage = pathname?.startsWith('/live');

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      if (searchTerm.trim()) {
        if (isLivePage) {
          router.push(`/live?search=${encodeURIComponent(searchTerm.trim())}`);
        } else {
          router.push(`/podcast/?tag=${encodeURIComponent(searchTerm.trim())}`);
        }
      }
    }
  };

  // 切换语言（保持当前路径，仅替换语言前缀）
  const switchLocale = (locale: string) => {
    router.replace(pathname, { locale });
  };

  return (
    <nav className="bg-white shadow-sm sticky top-0 z-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <div className="flex-shrink-0 flex items-center">
              <Podcast className="text-gray-600 text-2xl mr-2" aria-hidden="true" />
              <span className="font-semibold text-xl">{t('brand')}</span>
            </div>
            <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
              <Link href="/" className="border-indigo-500 text-gray-900 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium">{t('browse')}</Link>
              <Link href="/peertube" className="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium">{t('peertube')}</Link>
              <Link href="/live" className="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium">{t('live')}</Link>
              <Link href="#" className="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium">{t('ranking')}</Link>
              <Link href="#" className="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium">{t('categories')}</Link>
            </div>
          </div>
          <div className="hidden sm:ml-6 sm:flex sm:items-center sm:space-x-4">
            <div className="relative rounded-md shadow-sm">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-gray-400" aria-hidden="true" />
              </div>
              <input
                type="text"
                className="focus:ring-indigo-500 focus:border-indigo-500 block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 sm:text-sm"
                placeholder={isLivePage ? t('liveSearchPlaceholder') : t('searchPlaceholder')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={handleKeyDown}
              />
            </div>
            {/* 语言切换 */}
            <div className="flex items-center space-x-1 text-sm font-medium">
              <button
                onClick={() => switchLocale('zh')}
                className="px-2 py-1 rounded hover:bg-gray-100 text-gray-700"
              >
                中
              </button>
              <span className="text-gray-300">|</span>
              <button
                onClick={() => switchLocale('en')}
                className="px-2 py-1 rounded hover:bg-gray-100 text-gray-700"
              >
                EN
              </button>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
