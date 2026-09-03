"use client";
import type { PeerTubeVideo } from "@/app/types";

function formatDuration(seconds: number): string {
  if (!seconds || isNaN(seconds)) return "";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

interface Props {
  video: PeerTubeVideo;
  active: boolean;
  onSelect: (video: PeerTubeVideo) => void;
}

export default function PeerTubeVideoCard({ video, active, onSelect }: Props) {
  return (
    <button
      type="button"
      onClick={() => onSelect(video)}
      className={`group text-left w-full rounded-xl overflow-hidden bg-white shadow-sm border transition ${
        active
          ? "border-indigo-500 ring-2 ring-indigo-200"
          : "border-gray-200 hover:shadow-md hover:border-indigo-300"
      }`}
    >
      <div className="relative aspect-video bg-gray-200">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={video.previewUrl || video.thumbnailUrl || "/music.svg"}
          alt={video.name}
          className="w-full h-full object-cover group-hover:opacity-90"
          loading="lazy"
        />
        {video.duration > 0 && (
          <span className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded bg-black/70 text-white text-xs">
            {formatDuration(video.duration)}
          </span>
        )}
      </div>
      <div className="p-3">
        <h3 className="text-sm font-medium text-gray-900 line-clamp-2 group-hover:text-indigo-600">
          {video.name}
        </h3>
        <p className="mt-1 text-xs text-gray-500 truncate">
          {video.channelDisplayName || video.host}
        </p>
        {video.tags.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {video.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="px-1.5 py-0.5 rounded bg-gray-100 text-gray-500 text-[10px]"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </button>
  );
}
