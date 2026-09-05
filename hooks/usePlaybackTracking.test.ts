import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { usePlaybackTracking } from './usePlaybackTracking';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('usePlaybackTracking', () => {
  const defaultOptions = {
    contentType: 'podcast' as const,
    contentId: '78',
    contentTitle: 'Test Episode',
    enabled: true,
    heartbeatInterval: 30000,
  };

  beforeEach(() => {
    vi.useFakeTimers();
    mockFetch.mockClear();
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ sessionId: 'test-session-123' }),
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns initial state with null sessionId and false isTracking', () => {
    const { result } = renderHook(() => usePlaybackTracking(defaultOptions));

    expect(result.current.sessionId).toBeNull();
    expect(result.current.isTracking).toBe(false);
  });

  it('starts tracking and returns sessionId on success', async () => {
    const { result } = renderHook(() => usePlaybackTracking(defaultOptions));

    let sessionId: string | null = null;
    await act(async () => {
      sessionId = await result.current.startTracking({ title: 'Test Episode' });
    });

    expect(sessionId).toBe('test-session-123');
  });

  it('sends start event with correct payload', async () => {
    const { result } = renderHook(() => usePlaybackTracking(defaultOptions));

    await act(async () => {
      await result.current.startTracking({ title: 'Custom Title' });
    });

    expect(mockFetch).toHaveBeenCalledWith('/api/track/playback', expect.objectContaining({
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: expect.stringContaining('"event":"start"'),
    }));

    const callBody = JSON.parse((mockFetch.mock.calls[0][1] as { body: string }).body);
    expect(callBody).toMatchObject({
      event: 'start',
      contentType: 'podcast',
      contentId: '78',
      contentTitle: 'Custom Title',
    });
  });

  it('does not start tracking if already tracking', async () => {
    const { result } = renderHook(() => usePlaybackTracking(defaultOptions));

    await act(async () => {
      await result.current.startTracking();
    });

    mockFetch.mockClear();

    await act(async () => {
      const secondId = await result.current.startTracking();
      expect(secondId).toBeNull();
    });

    // Should not call fetch again
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('sends heartbeat with currentTime', async () => {
    const { result } = renderHook(() => usePlaybackTracking(defaultOptions));

    await act(async () => {
      await result.current.startTracking();
    });

    mockFetch.mockClear();

    await act(async () => {
      await result.current.heartbeat(45.5);
    });

    expect(mockFetch).toHaveBeenCalledWith('/api/track/playback', expect.objectContaining({
      method: 'POST',
      body: expect.stringContaining('"event":"heartbeat"'),
    }));

    const callBody = JSON.parse((mockFetch.mock.calls[0][1] as { body: string }).body);
    expect(callBody).toMatchObject({
      event: 'heartbeat',
      contentType: 'podcast',
      contentId: '78',
      sessionId: 'test-session-123',
      currentTime: 45.5,
    });
  });

  it('does not send heartbeat if not tracking', async () => {
    const { result } = renderHook(() => usePlaybackTracking(defaultOptions));

    await act(async () => {
      await result.current.heartbeat(30);
    });

    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('stops tracking and sends end event with duration', async () => {
    const { result } = renderHook(() => usePlaybackTracking(defaultOptions));

    await act(async () => {
      await result.current.startTracking();
    });

    mockFetch.mockClear();

    await act(async () => {
      await result.current.stopTracking(120);
    });

    expect(result.current.isTracking).toBe(false);
    expect(result.current.sessionId).toBeNull();

    expect(mockFetch).toHaveBeenCalledWith('/api/track/playback', expect.objectContaining({
      method: 'POST',
      body: expect.stringContaining('"event":"end"'),
    }));

    const callBody = JSON.parse((mockFetch.mock.calls[0][1] as { body: string }).body);
    expect(callBody).toMatchObject({
      event: 'end',
      contentType: 'podcast',
      contentId: '78',
      sessionId: 'test-session-123',
      duration: 120,
    });
  });

  it('calculates duration from startedAt if not provided', async () => {
    const { result } = renderHook(() => usePlaybackTracking(defaultOptions));

    await act(async () => {
      await result.current.startTracking();
    });

    // Advance time by 5 seconds
    act(() => {
      vi.advanceTimersByTime(5000);
    });

    mockFetch.mockClear();

    await act(async () => {
      await result.current.stopTracking();
    });

    const callBody = JSON.parse((mockFetch.mock.calls[0][1] as { body: string }).body);
    expect(callBody.duration).toBeGreaterThanOrEqual(5);
  });

  it('does not stop tracking if not tracking', async () => {
    const { result } = renderHook(() => usePlaybackTracking(defaultOptions));

    await act(async () => {
      await result.current.stopTracking();
    });

    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('respects enabled: false option', async () => {
    const { result } = renderHook(() => usePlaybackTracking({ ...defaultOptions, enabled: false }));

    await act(async () => {
      const id = await result.current.startTracking();
      expect(id).toBeNull();
    });

    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('cleans up on unmount', async () => {
    const { result, unmount } = renderHook(() => usePlaybackTracking(defaultOptions));

    await act(async () => {
      await result.current.startTracking();
    });

    mockFetch.mockClear();

    unmount();

    // Should send end event on cleanup
    expect(mockFetch).toHaveBeenCalledWith('/api/track/playback', expect.objectContaining({
      body: expect.stringContaining('"event":"end"'),
    }));
  });

  it('handles API errors gracefully', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    const { result } = renderHook(() => usePlaybackTracking(defaultOptions));

    await act(async () => {
      const id = await result.current.startTracking();
      expect(id).toBeNull();
    });

    expect(result.current.isTracking).toBe(false);
  });

  it('uses provided sessionId for heartbeat/end after start', async () => {
    const { result } = renderHook(() => usePlaybackTracking(defaultOptions));

    await act(async () => {
      await result.current.startTracking();
    });

    mockFetch.mockClear();

    // Heartbeat should use the sessionId from start response
    await act(async () => {
      await result.current.heartbeat(10);
    });

    const heartbeatBody = JSON.parse((mockFetch.mock.calls[0][1] as { body: string }).body);
    expect(heartbeatBody.sessionId).toBe('test-session-123');

    mockFetch.mockClear();

    await act(async () => {
      await result.current.stopTracking();
    });

    const endBody = JSON.parse((mockFetch.mock.calls[0][1] as { body: string }).body);
    expect(endBody.sessionId).toBe('test-session-123');
  });

  it('supports different content types', async () => {
    const { result } = renderHook(() => usePlaybackTracking({
      ...defaultOptions,
      contentType: 'peertube',
      contentId: 'peertube-123',
    }));

    await act(async () => {
      await result.current.startTracking();
    });

    const callBody = JSON.parse((mockFetch.mock.calls[0][1] as { body: string }).body);
    expect(callBody.contentType).toBe('peertube');
    expect(callBody.contentId).toBe('peertube-123');
  });

  it('handles non-OK response from API', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
    });

    const { result } = renderHook(() => usePlaybackTracking(defaultOptions));

    await act(async () => {
      const id = await result.current.startTracking();
      expect(id).toBeNull();
    });
  });
});