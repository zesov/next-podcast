export default function Player() {
  return (
    <div className="bg-white rounded-lg shadow p-4 mb-6 sticky top-20">
      <div className="flex items-center mb-4">
        <div className="w-16 h-16 bg-indigo-100 rounded-lg flex items-center justify-center">
          <i className="fas fa-play text-indigo-500 text-xl"></i>
        </div>
        <div className="ml-4">
          <h3 className="font-medium">什么叫爱自己?</h3>
          <p className="text-sm text-gray-500">天真不天真 杨天真本真</p>
        </div>
      </div>
      <div className="mb-4">
        <div className="h-1 bg-gray-200 rounded-full w-full mb-1">
          <div className="h-1 bg-indigo-500 rounded-full" style={{ width: '30%' }}></div>
        </div>
        <div className="flex justify-between text-xs text-gray-500">
          <span>12:45</span>
          <span>41:32</span>
        </div>
      </div>
      <div className="flex justify-between items-center">
        <button className="text-gray-500 hover:text-gray-700">
          <i className="fas fa-step-backward"></i>
        </button>
        <button className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-full w-10 h-10 flex items-center justify-center">
          <i className="fas fa-play"></i>
        </button>
        <button className="text-gray-500 hover:text-gray-700">
          <i className="fas fa-step-forward"></i>
        </button>
        <button className="text-gray-500 hover:text-gray-700">
          <i className="fas fa-volume-up"></i>
        </button>
        <div className="w-20">
          <div className="h-1 bg-gray-200 rounded-full w-full">
            <div className="h-1 bg-indigo-500 rounded-full" style={{ width: '70%' }}></div>
          </div>
        </div>
      </div>
    </div>
  )
}