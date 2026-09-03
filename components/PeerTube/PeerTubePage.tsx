"use client";
import { useState } from "react";
import { useTranslations, useFormatter } from "next-intl";
import type { PeerTubeVideo } from "@/app/types";
import PeerTubeVideoCard from "./PeerTubeVideoCard";
import PeerTubePlayer from "./PeerTubePlayer";

interface Props {
  initialVideos: PeerTubeVideo[];
  initialTotal?: number;
}

export default function PeerTubePage({ initialVideos, initialTotal = 0 }: Props) {
  const t = useTranslations("peertube");
  const format = useFormatter();
  const [videos, setVideos] = useState<PeerTubeVideo[]>(initialVideos);
  const [total, setTotal] = useState(initialTotal);
  const [searchTerm, setSearchTerm] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState("");
  const [selected, setSelected] = useState<PeerTubeVideo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const runSearch = async (query: string) => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(
        `/api/peertube?search=${encodeURIComponent(query)}&start=0&count=12`,
      );
      if (!res.ok) throw new Error("bad response");
      const data = await res.json();
      setVideos(data.data || []);
      setTotal(data.total || 0);
      setSubmittedQuery(query);
    } catch {
      setError(t("searchError"));
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (video: PeerTubeVideo) => {
    setSelected(video);
    const el = document.getElementById("peertube-player");
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      runSearch(searchTerm.trim());
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">
          {t("title")} 🎬
        </h1>
        <p className="text-sm text-gray-500 mt-1">{t("subtitle")}</p>
      </div>

      {/* 搜索框 */}
      <div className="mb-6 flex gap-2 max-w-2xl">
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={t("searchPlaceholder")}
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 text-gray-900"
        />
        <button
          type="button"
          onClick={() => runSearch(searchTerm.trim())}
          disabled={loading}
          className="px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-medium disabled:opacity-50"
        >
          {loading ? t("searching") : t("search")}
        </button>
      </div>

      {/* 内联播放器 */}
      {selected && (
        <div id="peertube-player" className="mb-6 scroll-mt-20">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-medium text-gray-900 truncate">
              {selected.name}
            </h2>
            <button
              type="button"
              onClick={() => setSelected(null)}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              ✕ {t("close")}
            </button>
          </div>
          <PeerTubePlayer video={selected} />
        </div>
      )}

      {/* 状态提示 */}
      {error && (
        <div className="mb-4 p-4 rounded-lg bg-red-50 text-red-700 text-sm">
          {error}
        </div>
      )}

      {!error && !loading && videos.length === 0 && !submittedQuery && (
        <div className="mb-4 p-8 text-center rounded-lg bg-gray-50 text-gray-500">
          {t("initialEmpty")}
        </div>
      )}
      {!error && !loading && videos.length === 0 && submittedQuery && (
        <div className="mb-4 p-8 text-center rounded-lg bg-gray-50 text-gray-500">
          {t("emptyResult", { query: submittedQuery })}
        </div>
      )}

      {/* 视频网格 */}
      {videos.length > 0 && (
        <>
          <div className="mb-4 text-sm text-gray-500">
            {t("resultCount", { count: format.number(total) })}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {videos.map((video) => (
              <PeerTubeVideoCard
                key={video.uuid}
                video={video}
                active={selected?.uuid === video.uuid}
                onSelect={handleSelect}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
