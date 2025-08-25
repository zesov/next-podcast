import Image from "next/image";

export default function Home() {
  const feeds = [
    {
      id: "1",
      title: "Podcast 1",
      description: "This is the description for podcast 1",
      image: "https://picsum.photos/200/300",
    },
    {
      id: "2",
      title: "Podcast 2",
      description: "This is the description for podcast 2",
      image: "https://picsum.photos/200/300",
    }
  ];
  return (
    <>
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
        {feeds.map((p) => (
        <a key={p.id} href={"/podcast/"+p.id} className="ml-2 mr-2 flex flex-col items-center bg-white border border-gray-200 rounded-lg shadow-sm hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700 overflow-hidden">
            <div className="flex w-full h-48">
            <img className="object-cover h-full" src={p.image || "/radio_list/img/music_note_black_48dp.svg"} alt=""/>
            <div className="flex flex-col justify-between p-4 leading-normal w-2/3">
                <h5 className="mb-2 text-xl font-bold tracking-tight text-gray-900 dark:text-white line-clamp-2">{p.title}</h5>
                <p className="mb-3 text-sm font-normal text-gray-700 dark:text-gray-400 line-clamp-4">{p.description}</p>
            </div>
            </div>
        </a>
        ))}
    </div> 
    </>
  );
}
