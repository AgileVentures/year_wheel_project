import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { CAST_MESSAGE_TYPES } from '../constants/castMessages';

/**
 * useRealtimeCast - Supabase Realtime fallback for iOS casting
 * Creates a broadcast channel for real-time state synchronization
 * Used when Chrome Cast SDK is not available
 */
export function useRealtimeCast() {
  const [isConnected, setIsConnected] = useState(false);
  const [sessionToken, setSessionToken] = useState(null);
  const [error, setError] = useState(null);
  const channelRef = useRef(null);
  const messageQueueRef = useRef([]);

  /**
   * Start a new casting session with Supabase Realtime
   */
  const startSession = useCallback((token, initialState) => {
    if (!token) {
      setError('No session token provided');
      return;
    }

    try {
      // Create unique channel name
      const channelName = `cast:${token}`;
      
      // Remove existing channel if any
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }

      // Create new broadcast channel
      const channel = supabase.channel(channelName, {
        config: {
          broadcast: { self: true } // Receive own messages for debugging
        }
      });

      // Subscribe to channel
      channel
        .on('broadcast', { event: 'cast-message' }, ({ payload }) => {
          console.log('[useRealtimeCast] Received message:', payload);
        })
        .subscribe((status) => {
          console.log('[useRealtimeCast] Channel status:', status);
          
          if (status === 'SUBSCRIBED') {
            setIsConnected(true);
            setSessionToken(token);
            setError(null);
            
            // Send queued messages
            if (messageQueueRef.current.length > 0) {
              console.log('[useRealtimeCast] Sending queued messages:', messageQueueRef.current.length);
              messageQueueRef.current.forEach(msg => {
                channel.send({
                  type: 'broadcast',
                  event: 'cast-message',
                  payload: msg
                });
              });
              messageQueueRef.current = [];
            }

            // Send initial state
            if (initialState) {
              channel.send({
                type: 'broadcast',
                event: 'cast-message',
                payload: {
                  type: CAST_MESSAGE_TYPES.INIT,
                  data: initialState,
                  timestamp: Date.now()
                }
              });
            }
          } else if (status === 'CHANNEL_ERROR') {
            setError('Failed to connect to casting channel');
            setIsConnected(false);
          } else if (status === 'TIMED_OUT') {
            setError('Connection timed out');
            setIsConnected(false);
          } else if (status === 'CLOSED') {
            setIsConnected(false);
            setSessionToken(null);
          }
        });

      channelRef.current = channel;
    } catch (err) {
      console.error('[useRealtimeCast] Failed to start session:', err);
      setError(err.message || 'Failed to start casting session');
      setIsConnected(false);
    }
  }, []);

  /**
   * Send a message through the Realtime channel
   */
  const sendMessage = useCallback((messageType, payload) => {
    const message = {
      type: messageType,
      data: payload,
      timestamp: Date.now()
    };

    if (!channelRef.current || !isConnected) {
      // Queue message if not connected
      console.log('[useRealtimeCast] Queueing message (not connected):', messageType);
      messageQueueRef.current.push(message);
      return;
    }

    try {
      channelRef.current.send({
        type: 'broadcast',
        event: 'cast-message',
        payload: message
      });
    } catch (err) {
      console.error('[useRealtimeCast] Failed to send message:', err);
      setError(err.message || 'Failed to send message');
    }
  }, [isConnected]);

  /**
   * Stop the casting session
   */
  const stopSession = useCallback(() => {
    if (channelRef.current) {
      // Send disconnect message before closing
      try {
        channelRef.current.send({
          type: 'broadcast',
          event: 'cast-message',
          payload: {
            type: CAST_MESSAGE_TYPES.DISCONNECT,
            timestamp: Date.now()
          }
        });
      } catch (err) {
        console.error('[useRealtimeCast] Failed to send disconnect:', err);
      }

      // Unsubscribe and remove channel
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    setIsConnected(false);
    setSessionToken(null);
    setError(null);
    messageQueueRef.current = [];
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, []);

  return {
    isConnected,
    sessionToken,
    error,
    startSession,
    sendMessage,
    stopSession
  };
}

/**
 * useRealtimeCastReceiver - Hook for the receiver side
 * Listens to a specific session channel
 */
export function useRealtimeCastReceiver(sessionToken) {
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState(null);
  const [error, setError] = useState(null);
  const channelRef = useRef(null);
  const messageHandlerRef = useRef(null);

  /**
   * Set message handler callback
   */
  const onMessage = useCallback((handler) => {
    messageHandlerRef.current = handler;
  }, []);

  useEffect(() => {
    if (!sessionToken) return;

    const channelName = `cast:${sessionToken}`;
    console.log('[useRealtimeCastReceiver] Connecting to channel:', channelName);

    // Remove existing channel if any
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    // Create and subscribe to channel
    const channel = supabase.channel(channelName, {
      config: {
        broadcast: { self: false } // Don't receive own messages
      }
    });

    channel
      .on('broadcast', { event: 'cast-message' }, ({ payload }) => {
        console.log('[useRealtimeCastReceiver] Received:', payload);
        setLastMessage(payload);
        
        // Call handler if set
        if (messageHandlerRef.current && payload) {
          messageHandlerRef.current(payload);
        }
      })
      .subscribe((status) => {
        console.log('[useRealtimeCastReceiver] Status:', status);
        
        if (status === 'SUBSCRIBED') {
          setIsConnected(true);
          setError(null);
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          setError('Connection failed');
          setIsConnected(false);
        } else if (status === 'CLOSED') {
          setIsConnected(false);
        }
      });

    channelRef.current = channel;

    // Cleanup
    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [sessionToken]);

  return {
    isConnected,
    lastMessage,
    error,
    onMessage
  };
}
