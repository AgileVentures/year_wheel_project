import { useState, useEffect, useCallback, useRef } from 'react';
import { CAST_NAMESPACE, CAST_MESSAGE_TYPES, createCastMessage } from '../constants/castMessages';

/**
 * Hook for managing Chrome Cast connections
 * @returns {Object} Cast manager state and methods
 */
export function useCastManager() {
  const [isCasting, setIsCasting] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [castSession, setCastSession] = useState(null);
  const [error, setError] = useState(null);
  
  const messageQueueRef = useRef([]);
  const castContextRef = useRef(null);

  // Initialize Cast SDK
  useEffect(() => {
    // Check if Cast SDK is loaded
    if (!window.chrome || !window.chrome.cast) {
      console.log('[Cast] Chrome Cast SDK not available');
      return;
    }

    // Wait for Cast API to be available
    window['__onGCastApiAvailable'] = (isAvailable) => {
      if (!isAvailable) {
        console.error('[Cast] Cast API not available');
        return;
      }

      try {
        const context = window.chrome.cast.framework.CastContext.getInstance();
        castContextRef.current = context;

        // Configure Cast options
        context.setOptions({
          receiverApplicationId: window.chrome.cast.media.DEFAULT_MEDIA_RECEIVER_APP_ID, 
          // TODO: Replace with your custom receiver app ID after registering with Google
          autoJoinPolicy: window.chrome.cast.AutoJoinPolicy.ORIGIN_SCOPED,
          language: 'sv-SE',
          resumeSavedSession: true,
        });

        // Listen for session state changes
        context.addEventListener(
          window.chrome.cast.framework.CastContextEventType.SESSION_STATE_CHANGED,
          (event) => {
            handleSessionStateChange(event.sessionState);
          }
        );

        console.log('[Cast] SDK initialized successfully');
      } catch (err) {
        console.error('[Cast] Initialization error:', err);
        setError(err.message);
      }
    };

    // Cleanup
    return () => {
      if (castSession) {
        stopCast();
      }
    };
  }, []);

  // Handle session state changes
  const handleSessionStateChange = useCallback((sessionState) => {
    console.log('[Cast] Session state changed:', sessionState);
    
    switch (sessionState) {
      case window.chrome.cast.framework.SessionState.SESSION_STARTED:
      case window.chrome.cast.framework.SessionState.SESSION_RESUMED:
        const session = castContextRef.current?.getCurrentSession();
        if (session) {
          setCastSession(session);
          setIsCasting(true);
          setIsInitializing(false);
          
          // Send any queued messages
          flushMessageQueue(session);
        }
        break;
        
      case window.chrome.cast.framework.SessionState.SESSION_ENDED:
        setCastSession(null);
        setIsCasting(false);
        setIsInitializing(false);
        messageQueueRef.current = [];
        break;
        
      default:
        break;
    }
  }, []);

  // Flush queued messages
  const flushMessageQueue = (session) => {
    if (messageQueueRef.current.length === 0) return;
    
    console.log(`[Cast] Flushing ${messageQueueRef.current.length} queued messages`);
    messageQueueRef.current.forEach((msg) => {
      sendMessageInternal(session, msg);
    });
    messageQueueRef.current = [];
  };

  // Internal message sender
  const sendMessageInternal = (session, message) => {
    try {
      session.sendMessage(CAST_NAMESPACE, message);
    } catch (err) {
      console.error('[Cast] Failed to send message:', err);
    }
  };

  /**
   * Start casting
   * @param {Object} initialState - Initial wheel state to send
   * @returns {Promise<boolean>} Success status
   */
  const startCast = useCallback(async (initialState) => {
    if (!castContextRef.current) {
      setError('Cast SDK not initialized');
      return false;
    }

    try {
      setIsInitializing(true);
      setError(null);

      // Request cast session
      await castContextRef.current.requestSession();
      
      // Session will be set via handleSessionStateChange
      // Queue initial state message
      const initMessage = createCastMessage(CAST_MESSAGE_TYPES.INIT, initialState);
      messageQueueRef.current.push(initMessage);

      return true;
    } catch (err) {
      console.error('[Cast] Failed to start cast:', err);
      setError(err.message);
      setIsInitializing(false);
      return false;
    }
  }, []);

  /**
   * Stop casting
   */
  const stopCast = useCallback(() => {
    if (!castSession) return;

    try {
      // Send disconnect message
      const disconnectMessage = createCastMessage(CAST_MESSAGE_TYPES.DISCONNECT, {});
      sendMessageInternal(castSession, disconnectMessage);

      // End session
      castSession.endSession(true);
      
      setCastSession(null);
      setIsCasting(false);
      messageQueueRef.current = [];
    } catch (err) {
      console.error('[Cast] Failed to stop cast:', err);
    }
  }, [castSession]);

  /**
   * Send a message to the cast receiver
   * @param {string} type - Message type
   * @param {any} payload - Message payload
   */
  const sendCastMessage = useCallback((type, payload) => {
    const message = createCastMessage(type, payload);

    if (!castSession || !isCasting) {
      // Queue message if not connected yet
      messageQueueRef.current.push(message);
      console.log('[Cast] Message queued (not connected):', type);
      return;
    }

    sendMessageInternal(castSession, message);
  }, [castSession, isCasting]);

  /**
   * Check if cast devices are available
   * @returns {boolean}
   */
  const hasAvailableDevices = useCallback(() => {
    if (!castContextRef.current) return false;
    
    try {
      const castState = castContextRef.current.getCastState();
      return castState !== window.chrome.cast.framework.CastState.NO_DEVICES_AVAILABLE;
    } catch (err) {
      return false;
    }
  }, []);

  return {
    isCasting,
    isInitializing,
    error,
    hasAvailableDevices,
    startCast,
    stopCast,
    sendCastMessage,
  };
}
