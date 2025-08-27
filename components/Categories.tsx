export default function Categories({items}: { items: any[] }) {
  const categories = ["社会与文化", "商业", "教育", "健康", "休闲", "小说", "喜剧", "自我完善"];

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <h3 className="font-bold mb-4">热门分类</h3>
      <div className="flex flex-wrap gap-2">
        {items.map((category, index) => (
          <a href={`/podcast/?tag=${category.name}`} key={index} className="bg-gray-100 hover:bg-gray-200 text-gray-800 px-3 py-1 rounded-full text-sm">
            {category.name}
          </a>
        ))}
      </div>
    </div>
  )
}