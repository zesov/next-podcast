'use client';
import React, { useState, useRef, useEffect, Suspense } from 'react';
import { useTranslations } from 'next-intl';
import { Link, usePathname, useRouter } from '@/i18n/navigation';
import { useSearchParams } from 'next/navigation';
import { Search, Podcast, X } from 'lucide-react';
import PeerTubeFiltersComp, { PeerTubeFiltersRef } from '@/components/PeerTube/PeerTubeFilters';
import type { PeerTubeFilters } from '@/app/types';

function PeertubeSearchFilters({ isPeertubePage, isPeertubeFiltersOpen, setIsPeertubeFiltersOpen, peertubeFiltersRef, dropdownRef, searchInputRef }: {
  isPeertubePage: boolean;
  isPeertubeFiltersOpen: boolean;
  setIsPeertubeFiltersOpen: (open: boolean) => void;
  peertubeFiltersRef: React.RefObject<PeerTubeFiltersRef | null>;
  dropdownRef: React.RefObject<HTMLDivElement | null>;
  searchInputRef: React.RefObject<HTMLInputElement | null>;
}) {
  const searchParams = useSearchParams();
  
  if (!isPeertubePage || !isPeertubeFiltersOpen) return null;
  
  return (
    <div
      ref={dropdownRef}
      className="absolute top-full left-0 right-0 z-50 mt-1 bg-white border border-gray-200 rounded-lg p-3 max-h-96 overflow-y-auto"
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-gray-900">Filters</span>
        <button
          type="button"
          onClick={() => setIsPeertubeFiltersOpen(false)}
          className="text-gray-400 hover:text-gray-600"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <PeerTubeFiltersComp
        ref={peertubeFiltersRef}
        initialFilters={{
          sort: (searchParams.get('sort') as PeerTubeFilters["sort"]) || '-match',
          nsfw: searchParams.get('nsfw') ? searchParams.get('nsfw') === 'true' : null,
          resultType: (searchParams.get('resultType') as PeerTubeFilters["resultType"]) || 'videos',
          isLive: searchParams.get('isLive') ? searchParams.get('isLive') === 'true' : null,
          publishedDateRange: (searchParams.get('publishedDateRange') as PeerTubeFilters["publishedDateRange"]) || 'any_published_date',
          durationRange: (searchParams.get('durationRange') as PeerTubeFilters["durationRange"]) || 'any_duration',
          categoryOneOf: searchParams.get('categoryOneOf') || '',
          licenceOneOf: searchParams.get('licenceOneOf') || '',
          languageOneOf: searchParams.get('languageOneOf') || '',
          tagsAllOf: searchParams.get('tagsAllOf') ? searchParams.get('tagsAllOf')!.split(',') : [],
          tagsOneOf: searchParams.get('tagsOneOf') ? searchParams.get('tagsOneOf')!.split(',') : [],
          host: searchParams.get('host') || '',
        }}
      />
    </div>
  );
}

export default function Navbar() {
  const t = useTranslations('navbar');
  const [searchTerm, setSearchTerm] = useState('');
  const pathname = usePathname();
  const router = useRouter();

  const isLivePage = pathname?.startsWith('/live');
  const isPeertubePage = pathname?.startsWith('/peertube');
  const [isPeertubeFiltersOpen, setIsPeertubeFiltersOpen] = useState(false);
  const peertubeFiltersRef = useRef<PeerTubeFiltersRef | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Click outside to close peertube filters dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      const isOutsideDropdown = dropdownRef.current && !dropdownRef.current.contains(target);
      const isOutsideSearchInput = searchInputRef.current && !searchInputRef.current.contains(target);
      if (isOutsideDropdown && isOutsideSearchInput) {
        setIsPeertubeFiltersOpen(false);
      }
    };
    if (isPeertubeFiltersOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isPeertubeFiltersOpen]);

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      if (searchTerm.trim()) {
        if (isLivePage) {
          router.push(`/live?search=${encodeURIComponent(searchTerm.trim())}`);
        } else if (isPeertubePage) {
          const currentFilters = peertubeFiltersRef.current?.getFilters() ?? {};
          const filterParams = new URLSearchParams();
          Object.entries(currentFilters).forEach(([key, value]) => {
            if (value !== null && value !== undefined && value !== '' && !(Array.isArray(value) && value.length === 0)) {
              if (Array.isArray(value)) {
                filterParams.set(key, value.join(','));
              } else {
                filterParams.set(key, String(value));
              }
            }
          });
          const queryString = filterParams.toString();
          router.push(`/peertube?search=${encodeURIComponent(searchTerm.trim())}${queryString ? `&${queryString}` : ''}`);
        } else {
          router.push(`/podcast/?tag=${encodeURIComponent(searchTerm.trim())}`);
        }
      }
    }
  };

  const handlePeertubeSearchClick = () => {
    if (searchTerm.trim() || (peertubeFiltersRef.current && Object.keys(peertubeFiltersRef.current.getFilters()).length > 0)) {
      const currentFilters = peertubeFiltersRef.current?.getFilters() ?? {};
      const filterParams = new URLSearchParams();
      Object.entries(currentFilters).forEach(([key, value]) => {
        if (value !== null && value !== undefined && value !== '' && !(Array.isArray(value) && value.length === 0)) {
          if (Array.isArray(value)) {
            filterParams.set(key, value.join(','));
          } else {
            filterParams.set(key, String(value));
          }
        }
      });
      const queryString = filterParams.toString();
      router.push(`/peertube?search=${encodeURIComponent(searchTerm.trim())}${queryString ? `&${queryString}` : ''}`);
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
                ref={searchInputRef}
                type="text"
                className="focus:ring-indigo-500 focus:border-indigo-500 block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 sm:text-sm"
                placeholder={
                  isLivePage
                    ? t('liveSearchPlaceholder')
                    : isPeertubePage
                    ? 'Search PeerTube videos…'
                    : t('searchPlaceholder')
                }
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={handleKeyDown}
                onFocus={() => isPeertubePage && setIsPeertubeFiltersOpen(true)}
                onClick={() => isPeertubePage && setIsPeertubeFiltersOpen(true)}
              />
            </div>

            {/* Peertube Filters Dropdown - wrapped in Suspense for useSearchParams */}
            <Suspense fallback={null}>
              <PeertubeSearchFilters
                isPeertubePage={isPeertubePage}
                isPeertubeFiltersOpen={isPeertubeFiltersOpen}
                setIsPeertubeFiltersOpen={setIsPeertubeFiltersOpen}
                peertubeFiltersRef={peertubeFiltersRef}
                dropdownRef={dropdownRef}
                searchInputRef={searchInputRef}
              />
            </Suspense>

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