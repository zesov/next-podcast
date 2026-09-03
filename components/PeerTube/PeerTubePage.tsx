"use client";
import { useState, useCallback, useRef, useEffect } from "react";
import { useTranslations, useFormatter } from "next-intl";
import type { PeerTubeVideo } from "@/app/types";
import type { PeerTubeFilters as PeerTubeFiltersType } from "@/app/types";
import PeerTubeVideoCard from "./PeerTubeVideoCard";
import PeerTubePlayer from "./PeerTubePlayer";
import PeerTubeFilters, { PeerTubeFiltersRef } from "./PeerTubeFilters";
import { X, Search, SlidersHorizontal } from "lucide-react";

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
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchBtnRef = useRef<HTMLButtonElement>(null);
  const filtersRef = useRef<PeerTubeFiltersRef>(null);

  // Click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      const isOutsideDropdown = dropdownRef.current && !dropdownRef.current.contains(target);
      const isOutsideSearchInput = searchInputRef.current && !searchInputRef.current.contains(target);
      const isOutsideSearchBtn = searchBtnRef.current && !searchBtnRef.current.contains(target);
      if (isOutsideDropdown && isOutsideSearchInput && isOutsideSearchBtn) {
        setIsFiltersOpen(false);
      }
    };
    if (isFiltersOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isFiltersOpen]);

  const getCurrentFilters = useCallback((): Partial<PeerTubeFiltersType> => {
    return filtersRef.current?.getFilters() ?? DEFAULT_FILTERS;
  }, []);

  const runSearch = useCallback(async (query: string) => {
    setLoading(true);
    setError("");
    try {
      const currentFilters = getCurrentFilters();
      const filterParams = filtersToQueryParams(currentFilters);
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
  }, [getCurrentFilters, t]);

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

  const handleSearchClick = () => {
    runSearch(searchTerm.trim());
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">
          {t("title")} 🎬
        </h1>
        <p className="text-sm text-gray-500 mt-1">{t("subtitle")}</p>
      </div>

      {/* 搜索框 - Odoo style pill-shaped container */}
      <div className="mb-6 relative">
        <div className="flex items-center gap-2 max-w-2xl">
          {/* Search input area - pill left side */}
          <label className="relative flex h-10 flex-1 items-center gap-2 rounded-l-full border border-gray-300 bg-white px-4">
            <Search aria-hidden="true" className="size-4 shrink-0 text-gray-400" />
            <input
              ref={searchInputRef}
              type="search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={() => !isFiltersOpen && setIsFiltersOpen(true)}
              onClick={() => !isFiltersOpen && setIsFiltersOpen(true)}
              placeholder={t("searchPlaceholder")}
              className="min-w-0 flex-1 bg-transparent text-sm text-gray-900 outline-none placeholder:text-gray-400"
            />
          </label>
          {/* Search button - pill right side */}
          <button
            ref={searchBtnRef}
            type="button"
            onClick={handleSearchClick}
            disabled={loading}
            className="flex h-10 items-center gap-2 rounded-r-full border border-indigo-600 bg-indigo-600 px-5 text-white font-medium hover:bg-indigo-700 disabled:opacity-50 transition"
          >
            {loading ? t("searching") : t("search")}
          </button>
        </div>

        {/* Filters Dropdown - Odoo style */}
        {isFiltersOpen && (
          <div
            ref={dropdownRef}
            className="absolute top-full left-0 right-0 z-50 mt-1 bg-white border border-gray-200 rounded-lg p-3 max-h-96 overflow-y-auto"
          >
            <PeerTubeFilters
              ref={filtersRef}
              initialFilters={DEFAULT_FILTERS}
            />
          </div>
        )}
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

      {/* 主内容区：视频网格 */}
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
  );
}