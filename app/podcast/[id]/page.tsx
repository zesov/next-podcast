import {client} from "../../api/db";
export default async function PodcastPage({ params }: { params: { id: number } }) {
  const { id } = await params;
  const podcast = await client.podcastById(id);
  const episodes = await client.episodesByFeedId(id,{max:10});
  const post = podcast.feed;
  return (
  <>
      <div className="container mx-auto px-4 py-8">
        {/* 上部分：播客信息 */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row items-center sm:items-start">
            <img src={post.image} alt={post.title} className="w-80 h-80 rounded-lg shadow-lg mb-4 sm:mb-0 sm:mr-6" />
            <div>
              <h1 className="text-3xl font-bold mb-2">{post.title}</h1>
              <p className="text-gray-600 mb-4">{post.author}</p>
              <div className="flex flex-wrap gap-2 mb-4">
                {Object.entries(post.categories??{}).map(([id, category]) => (
                  <span key={id} className="bg-gray-200 text-gray-700 px-2 py-1 rounded-full text-sm">
                    {category}
                  </span>
                ))}
              </div>
              <p className="text-gray-700 mb-4 line-clamp-6">{post.description}</p>
              {/* <div className="flex space-x-4">
                <a href={post.url} className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600">
                  订阅
                </a>
                <a href={post.link} className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300">
                  访问网站
                </a>
              </div> */}
            </div>
          </div>
        </div>

        {/* 下部分：剧集列表 */}
        <div>
          <h2 className="text-2xl font-bold mb-4">最新剧集</h2>
          {episodes.items.map((episode) => (
            <div key={episode.id} className="bg-white shadow-md rounded-lg p-4 mb-4">
              <h3 className="text-xl font-semibold mb-2">{episode.title}</h3>
              <p className="text-gray-600 mb-2">{episode.datePublishedPretty}</p>
              <p className="text-gray-700 mb-4" dangerouslySetInnerHTML={{ __html: episode.description }} />
              <audio controls className="w-full">
                <source src={episode.enclosureUrl} type={episode.enclosureType} />
                Your browser does not support the audio element.
              </audio>
            </div>
          ))}
        </div>
      </div>
  </>
)
}