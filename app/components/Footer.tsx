export default function Footer() {
  return (
    <footer className="bg-gray-800 text-white py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <h3 className="text-lg font-semibold mb-4">探索</h3>
            <ul className="space-y-2">
              <li><a href="#" className="text-gray-300 hover:text-white">浏览</a></li>
              <li><a href="#" className="text-gray-300 hover:text-white">排行榜</a></li>
              <li><a href="#" className="text-gray-300 hover:text-white">分类</a></li>
            </ul>
          </div>
          <div>
            <h3 className="text-lg font-semibold mb-4">关于</h3>
            <ul className="space-y-2">
              <li><a href="#" className="text-gray-300 hover:text-white">关于我们</a></li>
              <li><a href="#" className="text-gray-300 hover:text-white">创作者</a></li>
              <li><a href="#" className="text-gray-300 hover:text-white">工作机会</a></li>
            </ul>
          </div>
          <div>
            <h3 className="text-lg font-semibold mb-4">支持</h3>
            <ul className="space-y-2">
              <li><a href="#" className="text-gray-300 hover:text-white">帮助中心</a></li>
              <li><a href="#" className="text-gray-300 hover:text-white">社区指南</a></li>
              <li><a href="#" className="text-gray-300 hover:text-white">反馈</a></li>
            </ul>
          </div>
          <div>
            <h3 className="text-lg font-semibold mb-4">关注我们</h3>
            <div className="flex space-x-4">
              <a href="#" className="text-gray-300 hover:text-white">
                <i className="fab fa-weixin text-xl"></i>
              </a>
              <a href="#" className="text-gray-300 hover:text-white">
                <i className="fab fa-weibo text-xl"></i>
              </a>
              <a href="#" className="text-gray-300 hover:text-white">
                <i className="fab fa-xiaohongshu text-xl"></i>
              </a>
              <a href="#" className="text-gray-300 hover:text-white">
                <i className="fab fa-douyin text-xl"></i>
              </a>
            </div>
          </div>
        </div>
        <div className="border-t border-gray-700 mt-8 pt-8 text-sm text-gray-400">
          <p>Copyright © 2025 Apple Inc. 保留所有权利。</p>
        </div>
      </div>
    </footer>
  )
}