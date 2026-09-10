import { describe, it, expect } from 'vitest';
import { PeerTubeFilters } from '@/app/types';

function filtersToQueryParams(filters: Partial<PeerTubeFilters>): URLSearchParams {
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

describe('filtersToQueryParams', () => {
  it('should include sort parameter', () => {
    const filters: Partial<PeerTubeFilters> = { sort: '-publishedAt' };
    const qs = filtersToQueryParams(filters);
    expect(qs.get('sort')).toBe('-publishedAt');
  });

  it('should include nsfw parameter when true', () => {
    const filters: Partial<PeerTubeFilters> = { nsfw: true };
    const qs = filtersToQueryParams(filters);
    expect(qs.get('nsfw')).toBe('true');
  });

  it('should include nsfw parameter when false', () => {
    const filters: Partial<PeerTubeFilters> = { nsfw: false };
    const qs = filtersToQueryParams(filters);
    expect(qs.get('nsfw')).toBe('false');
  });

  it('should NOT include nsfw parameter when null', () => {
    const filters: Partial<PeerTubeFilters> = { nsfw: null };
    const qs = filtersToQueryParams(filters);
    expect(qs.has('nsfw')).toBe(false);
  });

  it('should include isLive parameter when true', () => {
    const filters: Partial<PeerTubeFilters> = { isLive: true };
    const qs = filtersToQueryParams(filters);
    expect(qs.get('isLive')).toBe('true');
  });

  it('should include publishedDateRange when not any_published_date', () => {
    const filters: Partial<PeerTubeFilters> = { publishedDateRange: 'today' };
    const qs = filtersToQueryParams(filters);
    expect(qs.has('startDate')).toBe(true);
  });

  it('should NOT include publishedDateRange when any_published_date', () => {
    const filters: Partial<PeerTubeFilters> = { publishedDateRange: 'any_published_date' };
    const qs = filtersToQueryParams(filters);
    expect(qs.has('startDate')).toBe(false);
  });

  it('should include durationRange short', () => {
    const filters: Partial<PeerTubeFilters> = { durationRange: 'short' };
    const qs = filtersToQueryParams(filters);
    expect(qs.get('durationMax')).toBe('240');
  });

  it('should include durationRange medium', () => {
    const filters: Partial<PeerTubeFilters> = { durationRange: 'medium' };
    const qs = filtersToQueryParams(filters);
    expect(qs.get('durationMin')).toBe('240');
    expect(qs.get('durationMax')).toBe('600');
  });

  it('should include durationRange long', () => {
    const filters: Partial<PeerTubeFilters> = { durationRange: 'long' };
    const qs = filtersToQueryParams(filters);
    expect(qs.get('durationMin')).toBe('600');
  });

  it('should NOT include durationRange when any_duration', () => {
    const filters: Partial<PeerTubeFilters> = { durationRange: 'any_duration' };
    const qs = filtersToQueryParams(filters);
    expect(qs.has('durationMin')).toBe(false);
    expect(qs.has('durationMax')).toBe(false);
  });

  it('should include categoryOneOf', () => {
    const filters: Partial<PeerTubeFilters> = { categoryOneOf: '1' };
    const qs = filtersToQueryParams(filters);
    expect(qs.get('categoryOneOf')).toBe('1');
  });

  it('should include licenceOneOf', () => {
    const filters: Partial<PeerTubeFilters> = { licenceOneOf: '2' };
    const qs = filtersToQueryParams(filters);
    expect(qs.get('licenceOneOf')).toBe('2');
  });

  it('should include languageOneOf', () => {
    const filters: Partial<PeerTubeFilters> = { languageOneOf: 'en' };
    const qs = filtersToQueryParams(filters);
    expect(qs.get('languageOneOf')).toBe('en');
  });

  it('should include tagsAllOf joined by comma', () => {
    const filters: Partial<PeerTubeFilters> = { tagsAllOf: ['tag1', 'tag2'] };
    const qs = filtersToQueryParams(filters);
    expect(qs.get('tagsAllOf')).toBe('tag1,tag2');
  });

  it('should include tagsOneOf joined by comma', () => {
    const filters: Partial<PeerTubeFilters> = { tagsOneOf: ['tag1', 'tag2'] };
    const qs = filtersToQueryParams(filters);
    expect(qs.get('tagsOneOf')).toBe('tag1,tag2');
  });

  it('should include host', () => {
    const filters: Partial<PeerTubeFilters> = { host: 'indymotion.fr' };
    const qs = filtersToQueryParams(filters);
    expect(qs.get('host')).toBe('indymotion.fr');
  });

  it('should handle multiple filters together', () => {
    const filters: Partial<PeerTubeFilters> = {
      sort: '-publishedAt',
      nsfw: false,
      isLive: true,
      publishedDateRange: 'last_7days',
      durationRange: 'medium',
      categoryOneOf: '1',
      licenceOneOf: '2',
      languageOneOf: 'en',
      tagsAllOf: ['tag1'],
      tagsOneOf: ['tag2'],
      host: 'indymotion.fr',
    };
    const qs = filtersToQueryParams(filters);
    expect(qs.get('sort')).toBe('-publishedAt');
    expect(qs.get('nsfw')).toBe('false');
    expect(qs.get('isLive')).toBe('true');
    expect(qs.has('startDate')).toBe(true);
    expect(qs.get('durationMin')).toBe('240');
    expect(qs.get('durationMax')).toBe('600');
    expect(qs.get('categoryOneOf')).toBe('1');
    expect(qs.get('licenceOneOf')).toBe('2');
    expect(qs.get('languageOneOf')).toBe('en');
    expect(qs.get('tagsAllOf')).toBe('tag1');
    expect(qs.get('tagsOneOf')).toBe('tag2');
    expect(qs.get('host')).toBe('indymotion.fr');
  });
});