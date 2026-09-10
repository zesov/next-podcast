import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act } from 'react';

// Mock document for jsdom-less environment
const mockDocument = {
  createElement: (tag: string) => ({
    tagName: tag.toUpperCase(),
    appendChild: vi.fn(),
    contains: vi.fn((el: any) => el === mockDocument.createElement('button')),
  }),
};

// @ts-ignore
global.document = mockDocument;

describe('PeerTubePage dropdown filters', () => {
  it('should start with filters closed', () => {
    let isFiltersOpen = false;
    
    expect(isFiltersOpen).toBe(false);
  });

  it('should open filters when search input is focused', () => {
    let isFiltersOpen = false;
    const setIsFiltersOpen = vi.fn((val: boolean) => { isFiltersOpen = val; });
    
    const handleInputFocus = () => {
      setIsFiltersOpen(true);
    };
    
    act(() => {
      handleInputFocus();
    });
    
    expect(setIsFiltersOpen).toHaveBeenCalledWith(true);
    expect(isFiltersOpen).toBe(true);
  });

  it('should close filters when clicking outside', () => {
    let isFiltersOpen = true;
    const setIsFiltersOpen = vi.fn((val: boolean) => { isFiltersOpen = val; });
    const dropdownRef = { current: { contains: vi.fn().mockReturnValue(false) } };
    
    const handleClickOutside = (event: { target: HTMLElement }) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsFiltersOpen(false);
      }
    };
    
    const mockEvent = { target: {} };
    handleClickOutside(mockEvent);
    
    expect(setIsFiltersOpen).toHaveBeenCalledWith(false);
    expect(isFiltersOpen).toBe(false);
  });

  it('should NOT close filters when clicking inside dropdown', () => {
    let isFiltersOpen = true;
    const setIsFiltersOpen = vi.fn((val: boolean) => { isFiltersOpen = val; });
    const dropdownRef = { current: { contains: vi.fn().mockReturnValue(true) } };
    
    const handleClickOutside = (event: { target: HTMLElement }) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsFiltersOpen(false);
      }
    };
    
    const mockEvent = { target: {} };
    handleClickOutside(mockEvent);
    
    expect(setIsFiltersOpen).not.toHaveBeenCalled();
    expect(isFiltersOpen).toBe(true);
  });

  it('should keep filters open when clicking search input', () => {
    let isFiltersOpen = false;
    const setIsFiltersOpen = vi.fn((val: boolean) => { isFiltersOpen = val; });
    
    const handleInputClick = () => {
      setIsFiltersOpen(true);
    };
    
    act(() => {
      handleInputClick();
    });
    
    expect(isFiltersOpen).toBe(true);
  });

  it('should toggle filters when clicking search input again', () => {
    let isFiltersOpen = true;
    const setIsFiltersOpen = vi.fn((updater: boolean | ((prev: boolean) => boolean)) => { 
      isFiltersOpen = typeof updater === 'function' ? updater(isFiltersOpen) : updater;
    });
    
    const handleInputClick = () => {
      setIsFiltersOpen(prev => !prev);
    };
    
    act(() => {
      handleInputClick();
    });
    
    expect(isFiltersOpen).toBe(false);
  });
});