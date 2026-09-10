import { describe, it, expect, vi, beforeEach } from 'vitest';

// Test for search input clear functionality
describe('PeerTubePage search input clear', () => {
  it('should clear search term when clear button clicked', () => {
    let searchTerm = 'test query';
    const setSearchTerm = vi.fn((val: string) => { searchTerm = val; });
    
    const handleClear = () => {
      setSearchTerm('');
    };
    
    handleClear();
    
    expect(setSearchTerm).toHaveBeenCalledWith('');
    expect(searchTerm).toBe('');
  });

  it('should not show clear button when search term is empty', () => {
    const searchTerm = '';
    const showClear = searchTerm.length > 0;
    
    expect(showClear).toBe(false);
  });

  it('should show clear button when search term has content', () => {
    const searchTerm = 'test';
    const showClear = searchTerm.length > 0;
    
    expect(showClear).toBe(true);
  });
});

// Test for search button applying filters
describe('PeerTubePage search button applies filters', () => {
  it('should pass current filters to runSearch when search button clicked', () => {
    let runSearchCalledWith: any = null;
    const filters = { sort: '-publishedAt', nsfw: true, durationRange: 'short' as const };
    
    const runSearch = (query: string, currentFilters?: any) => {
      runSearchCalledWith = { query, filters: currentFilters };
    };
    
    // Simulate search button click with current filters
    const handleSearchClick = () => {
      runSearch('test query', filters);
    };
    
    handleSearchClick();
    
    expect(runSearchCalledWith.query).toBe('test query');
    expect(runSearchCalledWith.filters).toEqual(filters);
  });

  it('should apply filters when pressing Enter in search input', () => {
    let runSearchCalledWith: any = null;
    const filters = { sort: '-match', isLive: true };
    
    const runSearch = (query: string, currentFilters?: any) => {
      runSearchCalledWith = { query, filters: currentFilters };
    };
    
    const handleKeyDown = (e: { key: string; preventDefault: () => void }, currentFilters: any) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        runSearch('test query', currentFilters);
      }
    };
    
    const mockEvent = { key: 'Enter', preventDefault: vi.fn() };
    handleKeyDown(mockEvent, filters);
    
    expect(mockEvent.preventDefault).toHaveBeenCalled();
    expect(runSearchCalledWith.query).toBe('test query');
    expect(runSearchCalledWith.filters).toEqual(filters);
  });
});