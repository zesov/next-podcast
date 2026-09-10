'use client';
import { useTranslations } from 'next-intl';
import Link from 'next/link';

export default function CategorySection() {
  const t = useTranslations('home');
  const ct = useTranslations('categoryNames');
  const categories = [
    { key: 'history', icon: 'fas fa-history', tag: 'History' },
    { key: 'healthFitness', icon: 'fas fa-heartbeat', tag: 'Health' },
    { key: 'investing', icon: 'fas fa-chart-line', tag: 'Investing' },
    { key: 'mentalHealth', icon: 'fas fa-brain', tag: 'Health' },
    { key: 'fiction', icon: 'fas fa-book', tag: 'Fiction' },
    { key: 'tvFilm', icon: 'fas fa-film', tag: 'TV' },
    { key: 'selfImprovement', icon: 'fas fa-user-edit', tag: 'Self-Improvement' },
    { key: 'comedy', icon: 'fas fa-laugh', tag: 'Comedy' },
  ];

  return (
    <section className="mb-8">
      <h2 className="text-xl font-bold mb-4">{t('browseCategories')}</h2>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {categories.map((category, index) => (
           <Link href={`/podcast/?tag=${category.tag}`} key={index}>
             <div className="bg-white rounded-lg shadow p-4 hover:bg-indigo-50 transition-colors">
               <div className="flex items-center">
                 <i className={`${category.icon} text-indigo-500 mr-2`}></i>
                 <span className="font-medium">{ct(category.key)}</span>
               </div>
             </div>
           </Link>
         ))}
      </div>
    </section>
  );
}
