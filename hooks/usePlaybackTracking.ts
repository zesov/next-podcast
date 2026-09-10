'use client';

/**
 * Client-side playback tracking hook
 * Handles start, heartbeat (every 30s), and end events
 */

import { useRef, useCallback, useEffect } from 'react';

interface UsePlaybackTrackingOptions {
  contentType: 'peertube' | 'podcast' | 'live';
  contentId: string;
  contentTitle?: string;
  enabled?: boolean;
  heartbeatInterval?: number; // ms, default 30000
}

interface UsePlaybackTrackingReturn {
  startTracking: (metadata?: { title?: string }) => Promise<string | null>;
  stopTracking: (duration?: number) => Promise<void>;
  heartbeat: (currentTime: number) => Promise<void>;
  sessionId: string | null;
  isTracking: boolean;
}

export function usePlaybackTracking({
  contentType,
  contentId,
  contentTitle,
  enabled = true,
  heartbeatInterval = 30000,
}: UsePlaybackTrackingOptions): UsePlaybackTrackingReturn {
  const sessionIdRef = useRef<string | null>(null);
  const heartbeatTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isTrackingRef = useRef(false);
  const startedAtRef = useRef<number>(0);

  // Send tracking event to API
  const sendEvent = useCallback(async (
    event: 'start' | 'heartbeat' | 'end',
    extra?: { currentTime?: number; duration?: number; contentTitle?: string }
  ) => {
    if (!enabled) return;
    
    try {
      await fetch('/api/track/playback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event,
          contentType,
          contentId,
          contentTitle,
          sessionId: sessionIdRef.current,
          ...extra,
        }),
        // Don't block navigation
        keepalive: event === 'end',
      });
    } catch (error) {
      // Silently fail - tracking should never break playback
      console.debug('Playback tracking failed:', error);
    }
  }, [enabled, contentType, contentId, contentTitle]);

  // Start tracking
  const startTracking = useCallback(async (metadata?: { title?: string }) => {
    if (!enabled || isTrackingRef.current) return null;
    
    isTrackingRef.current = true;
    startedAtRef.current = Date.now();
    
    const title = metadata?.title || contentTitle;
    await sendEvent('start', { contentTitle: title });
    
    // Start heartbeat
    heartbeatTimerRef.current = setInterval(() => {
      if (isTrackingRef.current && sessionIdRef.current) {
        // We'll send currentTime from the component
      }
    }, heartbeatInterval);
    
    return sessionIdRef.current;
  }, [enabled, contentTitle, sendEvent, heartbeatInterval]);

  // Heartbeat - call with current playback position
  const heartbeat = useCallback(async (currentTime: number) => {
    if (!enabled || !isTrackingRef.current || !sessionIdRef.current) return;
    
    await sendEvent('heartbeat', { currentTime });
  }, [enabled, sendEvent]);

  // Stop tracking
  const stopTracking = useCallback(async (duration?: number) => {
    if (!enabled || !isTrackingRef.current) return;
    
    isTrackingRef.current = false;
    
    if (heartbeatTimerRef.current) {
      clearInterval(heartbeatTimerRef.current);
      heartbeatTimerRef.current = null;
    }
    
    // Calculate duration if not provided
    const playbackDuration = duration || Math.round((Date.now() - startedAtRef.current) / 1000);
    
    await sendEvent('end', { duration: playbackDuration });
    
    sessionIdRef.current = null;
    startedAtRef.current = 0;
  }, [enabled, sendEvent]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (isTrackingRef.current) {
        stopTracking();
      }
    };
  }, [stopTracking]);

  // Expose sessionId setter for API response
  const setSessionId = useCallback((id: string) => {
    sessionIdRef.current = id;
  }, []);

  // Return the hook interface
  // We need to wrap startTracking to capture sessionId from response
  const wrappedStartTracking = useCallback(async (metadata?: { title?: string }) => {
    if (!enabled || isTrackingRef.current) return null;
    
    isTrackingRef.current = true;
    startedAtRef.current = Date.now();
    
    const title = metadata?.title || contentTitle;
    
    try {
      const response = await fetch('/api/track/playback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: 'start',
          contentType,
          contentId,
          contentTitle: title,
        }),
      });
      
      const data = await response.json();
      if (data.sessionId) {
        sessionIdRef.current = data.sessionId;
      }
      
      // Start heartbeat
      heartbeatTimerRef.current = setInterval(() => {
        // Heartbeat will be triggered by component
      }, heartbeatInterval);
      
      return data.sessionId || null;
    } catch (error) {
      console.debug('Playback tracking start failed:', error);
      return null;
    }
  }, [enabled, contentType, contentId, contentTitle, heartbeatInterval]);

  const wrappedHeartbeat = useCallback(async (currentTime: number) => {
    if (!enabled || !isTrackingRef.current || !sessionIdRef.current) return;
    
    try {
      await fetch('/api/track/playback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: 'heartbeat',
          contentType,
          contentId,
          sessionId: sessionIdRef.current,
          currentTime,
        }),
      });
    } catch (error) {
      console.debug('Playback tracking heartbeat failed:', error);
    }
  }, [enabled, contentType, contentId, heartbeatInterval]);

  const wrappedStopTracking = useCallback(async (duration?: number) => {
    if (!enabled || !isTrackingRef.current || !sessionIdRef.current) return;
    
    isTrackingRef.current = false;
    
    if (heartbeatTimerRef.current) {
      clearInterval(heartbeatTimerRef.current);
      heartbeatTimerRef.current = null;
    }
    
    const playbackDuration = duration || Math.round((Date.now() - startedAtRef.current) / 1000);
    
    try {
      await fetch('/api/track/playback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: 'end',
          contentType,
          contentId,
          sessionId: sessionIdRef.current,
          duration: playbackDuration,
        }),
        keepalive: true,
      });
    } catch (error) {
      console.debug('Playback tracking end failed:', error);
    }
    
    sessionIdRef.current = null;
    startedAtRef.current = 0;
  }, [enabled, contentType, contentId]);

  return {
    startTracking: wrappedStartTracking,
    stopTracking: wrappedStopTracking,
    heartbeat: wrappedHeartbeat,
    sessionId: sessionIdRef.current,
    isTracking: isTrackingRef.current,
  };
}