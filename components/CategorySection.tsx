'use client';
import { useTranslations } from 'next-intl';

export default function CategorySection() {
  const t = useTranslations('home');
  const ct = useTranslations('categoryNames');
  const categories = [
    { key: 'history', icon: 'fas fa-history' },
    { key: 'healthFitness', icon: 'fas fa-heartbeat' },
    { key: 'investing', icon: 'fas fa-chart-line' },
    { key: 'mentalHealth', icon: 'fas fa-brain' },
    { key: 'fiction', icon: 'fas fa-book' },
    { key: 'tvFilm', icon: 'fas fa-film' },
    { key: 'selfImprovement', icon: 'fas fa-user-edit' },
    { key: 'comedy', icon: 'fas fa-laugh' },
  ];

  return (
    <section className="mb-8">
      <h2 className="text-xl font-bold mb-4">{t('browseCategories')}</h2>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {categories.map((category, index) => (
          <div key={index} className="bg-white rounded-lg shadow p-4 hover:bg-indigo-50 transition-colors">
            <div className="flex items-center">
              <i className={`${category.icon} text-indigo-500 mr-2`}></i>
              <span className="font-medium">{ct(category.key)}</span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
