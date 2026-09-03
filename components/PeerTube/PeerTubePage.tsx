"use client";
import { useState, useCallback } from "react";
import { useTranslations, useFormatter } from "next-intl";
import type { PeerTubeVideo } from "@/app/types";
import type { PeerTubeFilters as PeerTubeFiltersType } from "@/app/types";
import PeerTubeVideoCard from "./PeerTubeVideoCard";
import PeerTubePlayer from "./PeerTubePlayer";
import PeerTubeFilters from "./PeerTubeFilters";

interface Props {
  initialVideos: PeerTubeVideo[];
  initialTotal?: number;
}

const DEFAULT_FILTERS: PeerTubeFiltersType = {
  sort: "-match",
  nsfw: null,
  resultType: "videos",
  isLive: null,
  publishedDateRange: "any_published_date",
  durationRange: "any_duration",
  categoryOneOf: "",
  licenceOneOf: "",
  languageOneOf: "",
  tagsAllOf: [],
  tagsOneOf: [],
  host: "",
};

function filtersToQueryParams(filters: Partial<PeerTubeFiltersType>): URLSearchParams {
  const qs = new URLSearchParams();
  if (filters.sort) qs.set("sort", filters.sort);
  if (filters.nsfw !== null) qs.set("nsfw", String(filters.nsfw));
  if (filters.isLive !== null) qs.set("isLive", String(filters.isLive));
  if (filters.publishedDateRange && filters.publishedDateRange !== "any_published_date") {
    const now = new Date();
    let startDate: string | undefined;
    switch (filters.publishedDateRange) {
      case "today":
        startDate = new Date(now.setHours(0, 0, 0, 0)).toISOString();
        break;
      case "last_7days":
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
        break;
      case "last_30days":
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
        break;
      case "last_365days":
        startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000).toISOString();
        break;
    }
    if (startDate) qs.set("startDate", startDate);
  }
  if (filters.durationRange && filters.durationRange !== "any_duration") {
    switch (filters.durationRange) {
      case "short":
        qs.set("durationMax", "240");
        break;
      case "medium":
        qs.set("durationMin", "240");
        qs.set("durationMax", "600");
        break;
      case "long":
        qs.set("durationMin", "600");
        break;
    }
  }
  if (filters.categoryOneOf) qs.set("categoryOneOf", filters.categoryOneOf);
  if (filters.licenceOneOf) qs.set("licenceOneOf", filters.licenceOneOf);
  if (filters.languageOneOf) qs.set("languageOneOf", filters.languageOneOf);
  if (filters.tagsAllOf?.length) qs.set("tagsAllOf", filters.tagsAllOf.join(","));
  if (filters.tagsOneOf?.length) qs.set("tagsOneOf", filters.tagsOneOf.join(","));
  if (filters.host) qs.set("host", filters.host);
  return qs;
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
  const [filters, setFilters] = useState<Partial<PeerTubeFiltersType>>(DEFAULT_FILTERS);

  const runSearch = useCallback(async (query: string) => {
    setLoading(true);
    setError("");
    try {
      const filterParams = filtersToQueryParams(filters);
      const baseUrl = `/api/peertube?search=${encodeURIComponent(query)}&start=0&count=12`;
      const fullUrl = `${baseUrl}&${filterParams.toString()}`;

      const res = await fetch(fullUrl);
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
  }, [filters, t]);

  const handleApplyFilters = useCallback((newFilters: Partial<PeerTubeFiltersType>) => {
    setFilters((prev) => ({ ...prev, ...newFilters }));
    runSearch(searchTerm.trim() || "");
  }, [runSearch, searchTerm]);

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

      {/* 主内容区：左侧筛选器 + 右侧视频网格 */}
      <div className="flex flex-col lg:flex-row gap-8">
        {/* 左侧筛选器面板 */}
        <aside className="w-full lg:w-72 flex-shrink-0">
          <PeerTubeFilters
            initialFilters={filters}
            onApply={handleApplyFilters}
          />
        </aside>

        {/* 右侧视频网格 */}
        <main className="flex-1 min-w-0">
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
        </main>
      </div>
    </div>
  );
}