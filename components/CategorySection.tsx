export default function CategorySection() {
  const categories = [
    { name: "历史", icon: "fas fa-history" },
    { name: "健康与健身", icon: "fas fa-heartbeat" },
    { name: "投资", icon: "fas fa-chart-line" },
    { name: "心理健康", icon: "fas fa-brain" },
    { name: "小说", icon: "fas fa-book" },
    { name: "电视与电影", icon: "fas fa-film" },
    { name: "自我完善", icon: "fas fa-user-edit" },
    { name: "喜剧", icon: "fas fa-laugh" }
  ];

  return (
    <section className="mb-8">
      <h2 className="text-xl font-bold mb-4">分类浏览</h2>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {categories.map((category, index) => (
          <div key={index} className="bg-white rounded-lg shadow p-4 hover:bg-indigo-50 transition-colors">
            <div className="flex items-center">
              <i className={`${category.icon} text-indigo-500 mr-2`}></i>
              <span className="font-medium">{category.name}</span>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}