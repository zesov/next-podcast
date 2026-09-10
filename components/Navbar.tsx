'use client';
import React, { useState, useRef, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { Link, usePathname, useRouter } from '@/i18n/navigation';
import { Podcast } from 'lucide-react';
import PeerTubeFiltersComp, { PeerTubeFiltersRef } from '@/components/PeerTube/PeerTubeFilters';
import SearchInput from '@/components/SearchInput';

export default function Navbar() {
  const t = useTranslations('navbar');
  const pathname = usePathname();
  const router = useRouter();

  const isPeertubePage = pathname?.startsWith('/peertube');
  const peertubeFiltersRef = useRef<PeerTubeFiltersRef | null>(null);
  const [isPeertubeFiltersOpen, setIsPeertubeFiltersOpen] = useState(false);

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
              {[ 
                { href: '/', key: 'browse', exact: true, label: t('browse') },
                { href: '/peertube', key: 'peertube', exact: false, label: t('peertube') },
                { href: '/live', key: 'live', exact: false, label: t('live') },
                // { href: '/ranking', key: 'ranking', exact: false, label: t('ranking') },
                // { href: '/categories', key: 'categories', exact: false, label: t('categories') }
              ].map(({ href, key, exact, label }) => (
                <Link 
                  key={key}
                  href={href}
                  className={`
                    ${exact ? (pathname === href ? 'border-indigo-500' : 'border-transparent') : 
                      (pathname?.startsWith(href) ? 'border-indigo-500' : 'border-transparent')}
                    text-gray-900 hover:border-gray-300 hover:text-gray-700 
                    inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium
                  `}
                >
                  {label}
                </Link>
              ))}
            </div>
          </div>
          <div className="hidden sm:ml-6 sm:flex sm:items-center sm:space-x-4">
            <SearchInput
              peertubeFiltersRef={peertubeFiltersRef}
              onPeertubeFiltersOpenChange={setIsPeertubeFiltersOpen}
            />

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