'use client';

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';

interface DirectStreamInputProps {
  onPlay: (url: string) => void;
  recentUrls: string[];
}

export default function DirectStreamInput({ onPlay, recentUrls }: DirectStreamInputProps) {
  const t = useTranslations('live');
  const [url, setUrl] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (url.trim()) onPlay(url.trim());
  };

  return (
    <div className="space-y-4">
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder={t('direct.enterUrl')}
          className="flex-1 px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <button
          type="submit"
          disabled={!url.trim()}
          className="px-4 py-2 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {t('direct.play')}
        </button>
      </form>

      {/* Recent URLs */}
      {recentUrls.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-gray-500 font-medium">{t('direct.recentUrls')}</p>
          <div className="flex flex-wrap gap-2">
            {recentUrls.map((u) => (
              <button
                key={u}
                onClick={() => {
                  setUrl(u);
                  onPlay(u);
                }}
                className="text-xs px-2 py-1 rounded bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white truncate max-w-[200px]"
                title={u}
              >
                {u.length > 30 ? u.slice(0, 30) + '…' : u}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
