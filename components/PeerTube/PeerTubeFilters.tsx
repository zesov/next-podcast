"use client";
import { useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import type { PeerTubeFilters } from "@/app/types";

interface Props {
  initialFilters?: Partial<PeerTubeFilters>;
  onApply: (filters: Partial<PeerTubeFilters>) => void;
}

const SORT_OPTIONS = [
  { value: "-match", labelKey: "bestMatch" },
  { value: "-publishedAt", labelKey: "mostRecent" },
  { value: "publishedAt", labelKey: "leastRecent" },
];

const RESULT_TYPE_OPTIONS = [
  { value: "videos", labelKey: "onlyVideos" },
  { value: "channels", labelKey: "onlyChannels" },
  { value: "playlists", labelKey: "onlyPlaylists" },
];

const PUBLISHED_DATE_OPTIONS = [
  { value: "any_published_date", labelKey: "anyDate" },
  { value: "today", labelKey: "today" },
  { value: "last_7days", labelKey: "last7days" },
  { value: "last_30days", labelKey: "last30days" },
  { value: "last_365days", labelKey: "last365days" },
];

const DURATION_OPTIONS = [
  { value: "any_duration", labelKey: "anyDuration" },
  { value: "short", labelKey: "short" },
  { value: "medium", labelKey: "medium" },
  { value: "long", labelKey: "long" },
];

// Categories from SepiaSearch bundle (id: label)
const CATEGORIES = [
  { id: "1", key: "1" },
  { id: "2", key: "2" },
  { id: "3", key: "3" },
  { id: "4", key: "4" },
  { id: "5", key: "5" },
  { id: "6", key: "6" },
  { id: "7", key: "7" },
  { id: "8", key: "8" },
  { id: "9", key: "9" },
  { id: "10", key: "10" },
  { id: "11", key: "11" },
  { id: "12", key: "12" },
  { id: "13", key: "13" },
  { id: "14", key: "14" },
  { id: "15", key: "15" },
  { id: "16", key: "16" },
  { id: "17", key: "17" },
  { id: "18", key: "18" },
] as const;

// Licences from SepiaSearch bundle
const LICENCES = [
  { id: "1", key: "1" },
  { id: "2", key: "2" },
  { id: "3", key: "3" },
  { id: "4", key: "4" },
  { id: "5", key: "5" },
  { id: "6", key: "6" },
  { id: "7", key: "7" },
];

// Languages from SepiaSearch bundle (major ones)
const LANGUAGES = [
  { id: "en", key: "en" },
  { id: "fr", key: "fr" },
  { id: "ar", key: "ar" },
  { id: "ca", key: "ca" },
  { id: "cs", key: "cs" },
  { id: "de", key: "de" },
  { id: "el", key: "el" },
  { id: "eo", key: "eo" },
  { id: "es", key: "es" },
  { id: "eu", key: "eu" },
  { id: "fa", key: "fa" },
  { id: "fi", key: "fi" },
  { id: "gd", key: "gd" },
  { id: "gl", key: "gl" },
  { id: "hr", key: "hr" },
  { id: "hu", key: "hu" },
  { id: "is", key: "is" },
  { id: "it", key: "it" },
  { id: "ja", key: "ja" },
  { id: "kab", key: "kab" },
  { id: "nl", key: "nl" },
  { id: "no", key: "no" },
  { id: "oc", key: "oc" },
  { id: "pt", key: "pt" },
  { id: "ru", key: "ru" },
  { id: "sv", key: "sv" },
  { id: "tr", key: "tr" },
  { id: "uk", key: "uk" },
  { id: "zh", key: "zh" },
];

function Select({ label, value, options, onChange, t, className = "" }: {
  label: string;
  value: string;
  options: { value: string; labelKey: string }[];
  onChange: (v: string) => void;
  t: ReturnType<typeof useTranslations>;
  className?: string;
}) {
  return (
    <div className={`mb-4 ${className}`}>
      <label className="block text-sm font-medium text-gray-700 mb-1">{t(label)}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 text-gray-900"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {t(opt.labelKey)}
          </option>
        ))}
      </select>
    </div>
  );
}

function RadioGroup({ label, value, options, onChange, t, className = "" }: {
  label: string;
  value: string | null | boolean;
  options: { value: string; labelKey: string }[];
  onChange: (v: string) => void;
  t: ReturnType<typeof useTranslations>;
  className?: string;
}) {
  return (
    <div className={`mb-4 ${className}`}>
      <label className="block text-sm font-medium text-gray-700 mb-2">{t(label)}</label>
      <div className="flex flex-wrap gap-4">
        {options.map((opt) => (
          <label key={opt.value} className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name={label}
              value={opt.value}
              checked={value === opt.value}
              onChange={() => onChange(opt.value)}
              className="h-4 w-4 text-indigo-600 border-gray-300 focus:ring-indigo-500"
            />
            <span className="text-sm text-gray-700">{t(opt.labelKey)}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

function MultiTagInput({ label, value, onChange, placeholder, t, className = "" }: {
  label: string;
  value: string[];
  onChange: (v: string[]) => void;
  placeholder: string;
  t: ReturnType<typeof useTranslations>;
  className?: string;
}) {
  const [inputValue, setInputValue] = useState("");
  const handleAdd = () => {
    const tag = inputValue.trim();
    if (tag && !value.includes(tag)) {
      onChange([...value, tag]);
      setInputValue("");
    }
  };
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAdd();
    }
  };
  return (
    <div className={`mb-4 ${className}`}>
      <label className="block text-sm font-medium text-gray-700 mb-2">{t(label)}</label>
      <div className="flex flex-wrap gap-2 mb-2">
        {value.map((tag) => (
          <span key={tag} className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 rounded text-sm text-gray-700">
            {tag}
            <button
              type="button"
              onClick={() => onChange(value.filter((t) => t !== tag))}
              className="ml-1 text-gray-500 hover:text-gray-700"
            >
              ✕
            </button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 text-gray-900"
        />
        <button
          type="button"
          onClick={handleAdd}
          className="px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm"
        >
          {t("addTag")}
        </button>
      </div>
    </div>
  );
}

function TextInput({ label, value, onChange, placeholder, t, className = "" }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  t: ReturnType<typeof useTranslations>;
  className?: string;
}) {
  return (
    <div className={`mb-4 ${className}`}>
      <label className="block text-sm font-medium text-gray-700 mb-1">{t(label)}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 text-gray-900"
      />
    </div>
  );
}

export default function PeerTubeFilters({ initialFilters = {}, onApply }: Props) {
  const t = useTranslations("peertube.filters");

  // Initialize filter state from initialFilters or defaults
  const [filters, setFilters] = useState<Partial<PeerTubeFilters>>({
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
    ...initialFilters,
  });

  const handleChange = useCallback(<K extends keyof PeerTubeFilters>(key: K, value: unknown) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handleApply = useCallback(() => {
    onApply(filters);
  }, [filters, onApply]);

  const handleReset = useCallback(() => {
    const defaults: Partial<PeerTubeFilters> = {
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
    setFilters(defaults);
    onApply(defaults);
  }, [onApply]);

  return (
    <aside className="w-full lg:w-72 flex-shrink-0 p-4 bg-gray-50 rounded-xl border border-gray-200">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">{t("title")}</h2>
        <button
          type="button"
          onClick={handleReset}
          className="text-xs text-indigo-600 hover:text-indigo-800"
        >
          {t("reset")}
        </button>
      </div>

      <div className="space-y-4">
        {/* Sort by */}
        <Select
          label="sortBy"
          value={filters.sort || "-match"}
          options={SORT_OPTIONS}
          onChange={(v) => handleChange("sort", v)}
          t={t}
        />

        {/* Display sensitive content */}
        <RadioGroup
          label="sensitiveContent"
          value={filters.nsfw === true ? "true" : filters.nsfw === false ? "false" : "all"}
          options={[
            { value: "all", labelKey: "anyDate" },
            { value: "true", labelKey: "yes" },
            { value: "false", labelKey: "no" },
          ]}
          onChange={(v) => handleChange("nsfw", v === "all" ? null : v === "true")}
          t={t}
        />

        {/* Result type */}
        <Select
          label="resultType"
          value={filters.resultType || "videos"}
          options={RESULT_TYPE_OPTIONS}
          onChange={(v) => handleChange("resultType", v)}
          t={t}
        />

        {/* Display only (Live/VOD) */}
        <RadioGroup
          label="displayOnly"
          value={filters.isLive === true ? "live" : filters.isLive === false ? "vod" : "all"}
          options={[
            { value: "all", labelKey: "anyDate" },
            { value: "live", labelKey: "liveVideos" },
            { value: "vod", labelKey: "vodVideos" },
          ]}
          onChange={(v) => handleChange("isLive", v === "all" ? null : v === "live")}
          t={t}
        />

        {/* Published date */}
        <Select
          label="publishedDate"
          value={filters.publishedDateRange || "any_published_date"}
          options={PUBLISHED_DATE_OPTIONS}
          onChange={(v) => handleChange("publishedDateRange", v)}
          t={t}
        />

        {/* Duration */}
        <Select
          label="duration"
          value={filters.durationRange || "any_duration"}
          options={DURATION_OPTIONS}
          onChange={(v) => handleChange("durationRange", v)}
          t={t}
        />

        {/* Category */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">{t("category")}</label>
          <div className="relative">
            <select
              value={filters.categoryOneOf || "any"}
              onChange={(e) => handleChange("categoryOneOf", e.target.value === "any" ? "" : e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 appearance-none"
            >
              <option value="any">{t("allCategories")}</option>
{CATEGORIES.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {t(`categories.${cat.key}`)}
                </option>
              ))}
            </select>
            <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        </div>

        {/* Licence */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">{t("licence")}</label>
          <div className="relative">
            <select
              value={filters.licenceOneOf || "any"}
              onChange={(e) => handleChange("licenceOneOf", e.target.value === "any" ? "" : e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 appearance-none"
            >
              <option value="any">{t("allLicences")}</option>
{LICENCES.map((lic) => (
                <option key={lic.id} value={lic.id}>
                  {t(`licences.${lic.key}`)}
                </option>
              ))}
            </select>
            <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        </div>

        {/* Language */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">{t("language")}</label>
          <div className="relative">
            <select
              value={filters.languageOneOf || "any"}
              onChange={(e) => handleChange("languageOneOf", e.target.value === "any" ? "" : e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 appearance-none"
            >
              <option value="any">{t("allLanguages")}</option>
{LANGUAGES.map((lang) => (
                <option key={lang.id} value={lang.id}>
                  {t(`languages.${lang.key}`)}
                </option>
              ))}
            </select>
            <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        </div>

        {/* Tags - All of these */}
        <MultiTagInput
          label="tagsAllOf"
          value={filters.tagsAllOf || []}
          onChange={(v) => handleChange("tagsAllOf", v)}
          placeholder={t("tagPlaceholder")}
          t={t}
        />

        {/* Tags - One of these */}
        <MultiTagInput
          label="tagsOneOf"
          value={filters.tagsOneOf || []}
          onChange={(v) => handleChange("tagsOneOf", v)}
          placeholder={t("tagPlaceholder")}
          t={t}
        />

        {/* Instance */}
        <TextInput
          label="instance"
          value={filters.host || ""}
          onChange={(v) => handleChange("host", v)}
          placeholder={t("instancePlaceholder")}
          t={t}
        />

        {/* Apply button */}
        <button
          type="button"
          onClick={handleApply}
          className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium transition"
        >
          {t("apply")}
        </button>
      </div>
    </aside>
  );
}