'use client';

import React, { useState, useRef } from 'react';
import { useTranslations } from 'next-intl';

interface M3UInputProps {
  onLoad: (url: string) => Promise<void>;
  onFileLoad: (file: File) => Promise<void>;
  loading: boolean;
  error: string | null;
  sources: { url: string; channelCount: number }[];
  onRemoveSource: (url: string) => void;
}

export default function M3UInput({
  onLoad,
  onFileLoad,
  loading,
  error,
  sources,
  onRemoveSource,
}: M3UInputProps) {
  const t = useTranslations('live');
  const [url, setUrl] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (url.trim()) onLoad(url.trim());
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onFileLoad(file);
    if (fileRef.current) fileRef.current.value = '';
  };

  return (
    <div className="space-y-4">
      {/* URL input form */}
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder={t('m3u.enterUrl')}
          className="flex-1 px-3 py-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          disabled={loading}
        />
        <button
          type="submit"
          disabled={loading || !url.trim()}
          className="px-4 py-2 rounded-lg bg-indigo-600 dark:bg-indigo-500 text-white font-medium hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? t('m3u.loading') : t('m3u.load')}
        </button>
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={loading}
          className="px-4 py-2 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50 transition-colors"
        >
          {t('m3u.uploadFile')}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept=".m3u,.m3u8"
          onChange={handleFileChange}
          className="hidden"
        />
      </form>

      {/* Error display */}
      {error && (
        <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/30 border border-red-300 dark:border-red-700 text-red-600 dark:text-red-300 text-sm">
          {error}
        </div>
      )}

      {/* Loaded sources list */}
      {sources.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">{t('m3u.loadedSources')}</p>
          {sources.map((s) => (
            <div
              key={s.url}
              className="flex items-center justify-between p-2 rounded bg-gray-100 dark:bg-gray-800/50 text-sm"
            >
              <span className="text-gray-700 dark:text-gray-300 truncate flex-1 mr-2">{s.url}</span>
              <span className="text-gray-500 dark:text-gray-400 shrink-0">{s.channelCount} ch</span>
              <button
                onClick={() => onRemoveSource(s.url)}
                className="ml-2 text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 shrink-0"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
