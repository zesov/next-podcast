export default function Recommended() {
  const recommended = [
    { name: "思文,败类", author: "思文败类" },
    { name: "声动早咖啡", author: "声动活泼" },
    { name: "知行小酒馆", author: "有知有行" }
  ];

  return (
    <div className="bg-white rounded-lg shadow p-4 mb-6">
      <h3 className="font-bold mb-4">为你推荐</h3>
      <div className="space-y-4">
        {recommended.map((item, index) => (
          <div key={index} className="flex items-center">
            <div className="w-12 h-12 bg-indigo-100 rounded-lg flex-shrink-0"></div>
            <div className="ml-3">
              <h4 className="font-medium text-sm">{item.name}</h4>
              <p className="text-xs text-gray-500">{item.author}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}