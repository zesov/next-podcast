export default async function PodcastPage({ params }: { params: { id: string } }) {
  const { id } = await params;
  return <div>Podcast ID: {id}</div>;
}