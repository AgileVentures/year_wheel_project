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

      // Create new broadcast channel with optimized config
      const channel = supabase.channel(channelName, {
        config: {
          broadcast: { 
            self: false, // Don't receive own messages
            ack: false   // Don't wait for acknowledgment (faster)
          }
        }
      });

      console.log('[useRealtimeCast] Connecting to channel:', channelName);

      // Subscribe to channel
      channel
        .on('broadcast', { event: 'cast-message' }, ({ payload }) => {
          console.log('[useRealtimeCast] Received message:', payload);
          
          // Handle READY signal from receiver
          if (payload && payload.type === CAST_MESSAGE_TYPES.ACK) {
            console.log('[useRealtimeCast] 📥 Receiver is READY! Sending INIT now...');
            setIsConnected(true); // Now we know receiver is actually connected
            
            // Send INIT immediately when receiver signals ready
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
              
              // Send queued messages after INIT
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
            }
          }
        })
        .subscribe((status) => {
          console.log('[useRealtimeCast] Channel status:', status);
          
          if (status === 'SUBSCRIBED') {
            console.log('[useRealtimeCast] Channel subscribed! Waiting for receiver to connect...');
            // Don't set isConnected here - wait for READY message from receiver
            setSessionToken(token);
            setError(null);
            
            // Also send INIT after delay as fallback (in case receiver doesn't send READY)
            if (initialState) {
              setTimeout(() => {
                console.log('[useRealtimeCast] ⏰ Fallback: Sending INIT (3s timeout)');
                channel.send({
                  type: 'broadcast',
                  event: 'cast-message',
                  payload: {
                    type: CAST_MESSAGE_TYPES.INIT,
                    data: initialState,
                    timestamp: Date.now()
                  }
                });
                
                // Send queued messages after INIT
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
              }, 3000); // 3 second fallback delay
            }
          } else if (status === 'CHANNEL_ERROR') {
            console.error('[useRealtimeCast] Channel error');
            setError('Failed to connect to casting channel');
            setIsConnected(false);
          } else if (status === 'TIMED_OUT') {
            console.error('[useRealtimeCast] Timeout');
            setError('Connection timed out');
            setIsConnected(false);
          } else if (status === 'CLOSED') {
            console.log('[useRealtimeCast] Channel closed');
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

    // Create and subscribe to channel with optimized config
    const channel = supabase.channel(channelName, {
      config: {
        broadcast: { 
          self: false, // Don't receive own messages
          ack: false   // Don't wait for acknowledgment (faster)
        }
      }
    });

    console.log('[useRealtimeCastReceiver] Subscribing...');

    channel
      .on('broadcast', { event: 'cast-message' }, ({ payload }) => {
        console.log('[useRealtimeCastReceiver] 📥 Received:', payload?.type);
        setLastMessage(payload);
        
        // Call handler if set
        if (messageHandlerRef.current && payload) {
          messageHandlerRef.current(payload);
        }
      })
      .subscribe((status) => {
        console.log('[useRealtimeCastReceiver] Status:', status);
        
        if (status === 'SUBSCRIBED') {
          console.log('[useRealtimeCastReceiver] Listening for messages');
          setIsConnected(true);
          setError(null);
          
          // Send READY signal to sender to trigger INIT
          setTimeout(() => {
            console.log('[useRealtimeCastReceiver] 📤 Sending READY signal...');
            channel.send({
              type: 'broadcast',
              event: 'cast-message',
              payload: {
                type: CAST_MESSAGE_TYPES.ACK,
                timestamp: Date.now()
              }
            }).catch(err => {
              console.error('[useRealtimeCastReceiver] Failed to send READY:', err);
            });
          }, 100); // Small delay to ensure channel is fully ready
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.error('[useRealtimeCastReceiver] Connection failed');
          setError('Connection failed');
          setIsConnected(false);
        } else if (status === 'CLOSED') {
          console.log('[useRealtimeCastReceiver] Channel closed');
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
