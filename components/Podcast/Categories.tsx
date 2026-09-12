'use client';
import { useTranslations } from 'next-intl';

export default function Categories({items}: { items: { name: string }[] }) {
  const t = useTranslations('home');
  const categories = ["社会与文化", "商业", "教育", "健康", "休闲", "小说", "喜剧", "自我完善"];

  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-4">
      <h3 className="font-bold mb-4">{t('hotCategories')}</h3>
      <div className="flex flex-wrap gap-2">
        {items.map((category, index) => (
          <a href={`/podcast/?tag=${category.name}`} key={index} className="bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 px-3 py-1 rounded-full text-sm">
            {category.name}
          </a>
        ))}
      </div>
    </div>
  );
}
