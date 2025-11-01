import { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import YearWheel from '../YearWheel';
import { CAST_NAMESPACE, CAST_MESSAGE_TYPES } from '../constants/castMessages';
import { useRealtimeCastReceiver } from '../hooks/useRealtimeCast';

/**
 * Cast Receiver Page
 * Full-screen page that receives Cast messages and displays YearWheel
 * Supports both Chrome Cast SDK (Android) and Supabase Realtime (iOS)
 * Accessed via:
 * - /cast-receiver (Cast SDK)
 * - /cast-receiver?session=xxx (Realtime)
 */
export default function CastReceiverPage() {
  const { t } = useTranslation(['common']);
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Handle pairing code flow
  const codeFromUrl = searchParams.get('code');
  const [enteredCode, setEnteredCode] = useState(codeFromUrl || '');
  const [isCodeSubmitted, setIsCodeSubmitted] = useState(!!codeFromUrl);
  const sessionToken = isCodeSubmitted ? enteredCode : null;
  
  console.log('[CastReceiverPage] State:', {
    codeFromUrl,
    enteredCode,
    isCodeSubmitted,
    sessionToken
  });
  
  const [wheelData, setWheelData] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState(null);
  const castContextRef = useRef(null);
  const playerManagerRef = useRef(null);
  
  // Realtime receiver (for iOS)
  const realtimeReceiver = useRealtimeCastReceiver(sessionToken);
  
  // For updating wheel state
  const [rotation, setRotation] = useState(0);
  const [zoomedMonth, setZoomedMonth] = useState(null);
  const [zoomedQuarter, setZoomedQuarter] = useState(null);

  // Initialize Cast Receiver (skip if using Realtime or waiting for code)
  useEffect(() => {
    // Skip Cast SDK if we have a session token (Realtime mode) or haven't submitted code yet
    if (sessionToken || !isCodeSubmitted) {
      if (sessionToken) {
        console.log('[Receiver] Using Realtime mode, skipping Cast SDK');
      }
      return;
    }
    
    if (!window.cast || !window.cast.framework) {
      // Don't show error if we're in code input mode
      console.log('[Receiver] Cast SDK not available, using Realtime only');
      return;
    }

    try {
      const context = window.cast.framework.CastReceiverContext.getInstance();
      castContextRef.current = context;

      // Get player manager for media control
      const playerManager = context.getPlayerManager();
      playerManagerRef.current = playerManager;

      // Register custom message namespace
      context.addCustomMessageListener(CAST_NAMESPACE, (event) => {
        handleCastMessage(event);
      });

      // Start receiver
      const options = new window.cast.framework.CastReceiverOptions();
      options.disableIdleTimeout = true; // Keep receiver alive
      options.statusText = 'YearWheel Receiver Ready';
      
      context.start(options);
      setIsConnected(true);

      console.log('[Receiver] Cast Receiver initialized');
    } catch (err) {
      console.error('[Receiver] Initialization error:', err);
      setConnectionError(err.message);
    }

    return () => {
      if (castContextRef.current) {
        try {
          castContextRef.current.stop();
        } catch (err) {
          console.error('[Receiver] Cleanup error:', err);
        }
      }
    };
  }, []);

  // Handle Realtime messages (iOS fallback)
  useEffect(() => {
    if (!sessionToken) return;
    
    console.log('[Receiver] Realtime setup with token:', sessionToken);
    console.log('[Receiver] Realtime connected:', realtimeReceiver.isConnected);
    
    // Update connection status based on Realtime
    setIsConnected(realtimeReceiver.isConnected);
    
    if (realtimeReceiver.error) {
      console.error('[Receiver] Realtime error:', realtimeReceiver.error);
      setConnectionError(realtimeReceiver.error);
    }

    // Set up message handler
    realtimeReceiver.onMessage((message) => {
      handleRealtimeMessage(message);
    });
  }, [sessionToken, realtimeReceiver]);

  // Handle incoming Realtime messages (same format as Cast messages)
  const handleRealtimeMessage = useCallback((message) => {
    if (!message || !message.type) return;
    
    console.log('[Receiver] Realtime message:', message.type);

    switch (message.type) {
      case CAST_MESSAGE_TYPES.INIT:
        setWheelData(message.data);
        setRotation(message.data.rotation || 0);
        setZoomedMonth(message.data.zoomedMonth || null);
        setZoomedQuarter(message.data.zoomedQuarter || null);
        break;

      case CAST_MESSAGE_TYPES.ROTATE:
        setRotation(message.data.rotation);
        break;

      case CAST_MESSAGE_TYPES.ZOOM:
        if (message.data.zoom === 'month') {
          setZoomedMonth(message.data.month);
          setZoomedQuarter(null);
        } else if (message.data.zoom === 'quarter') {
          setZoomedQuarter(message.data.quarter);
          setZoomedMonth(null);
        } else {
          setZoomedMonth(null);
          setZoomedQuarter(null);
        }
        break;

      case CAST_MESSAGE_TYPES.UPDATE:
        if (message.data.organizationData) {
          setWheelData(prev => ({
            ...prev,
            organizationData: message.data.organizationData
          }));
        }
        break;

      case CAST_MESSAGE_TYPES.SETTINGS:
        setWheelData(prev => ({
          ...prev,
          ...message.data
        }));
        break;

      case CAST_MESSAGE_TYPES.DISCONNECT:
        console.log('[Receiver] Disconnect requested');
        break;

      case CAST_MESSAGE_TYPES.PING:
        // Heartbeat - no action needed
        break;

      default:
        console.log('[Receiver] Unknown message type:', message.type);
    }
  }, []);

  // Handle incoming Cast messages
  const handleCastMessage = useCallback((event) => {
    try {
      const message = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
      console.log('[Receiver] Message received:', message.type);

      switch (message.type) {
        case CAST_MESSAGE_TYPES.INIT:
          // Initial wheel data
          setWheelData(message.payload);
          setRotation(message.payload.rotation || 0);
          setZoomedMonth(message.payload.zoomedMonth || null);
          setZoomedQuarter(message.payload.zoomedQuarter || null);
          sendAck(event.senderId);
          break;

        case CAST_MESSAGE_TYPES.ROTATE:
          // Update rotation
          setRotation(message.payload.rotation);
          break;

        case CAST_MESSAGE_TYPES.ZOOM:
          // Update zoom level
          if (message.payload.zoom === 'month') {
            setZoomedMonth(message.payload.month);
            setZoomedQuarter(null);
          } else if (message.payload.zoom === 'quarter') {
            setZoomedQuarter(message.payload.quarter);
            setZoomedMonth(null);
          } else {
            // Year view
            setZoomedMonth(null);
            setZoomedQuarter(null);
          }
          break;

        case CAST_MESSAGE_TYPES.UPDATE:
          // Update organization data
          setWheelData(prev => ({
            ...prev,
            organizationData: message.payload.organizationData
          }));
          break;

        case CAST_MESSAGE_TYPES.SETTINGS:
          // Update settings (colors, visibility, etc.)
          setWheelData(prev => ({
            ...prev,
            ...message.payload
          }));
          break;

        case CAST_MESSAGE_TYPES.DISCONNECT:
          // Sender disconnected
          console.log('[Receiver] Disconnected by sender');
          handleDisconnect();
          break;

        case CAST_MESSAGE_TYPES.PING:
          // Heartbeat - respond with pong
          sendAck(event.senderId);
          break;

        default:
          console.warn('[Receiver] Unknown message type:', message.type);
      }
    } catch (err) {
      console.error('[Receiver] Message handling error:', err);
    }
  }, []);

  // Send acknowledgment back to sender
  const sendAck = (senderId) => {
    if (!castContextRef.current) return;
    
    try {
      castContextRef.current.sendCustomMessage(
        CAST_NAMESPACE,
        senderId,
        { type: CAST_MESSAGE_TYPES.ACK, timestamp: Date.now() }
      );
    } catch (err) {
      console.error('[Receiver] Failed to send ACK:', err);
    }
  };

  // Handle manual disconnect from TV
  const handleDisconnect = () => {
    setWheelData(null);
    setIsConnected(false);
    setIsCodeSubmitted(false);
    setEnteredCode('');
    setSearchParams({});
    
    // Clean up Cast SDK if active
    if (castContextRef.current) {
      try {
        castContextRef.current.stop();
      } catch (err) {
        console.error('[Receiver] Error stopping Cast SDK:', err);
      }
    }
  };

  // Show code input screen FIRST if no code submitted yet
  if (!isCodeSubmitted) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 text-white">
        <div className="text-center max-w-lg px-8">
          <img src="/year_wheel_symbol.svg" alt="YearWheel" className="w-24 h-24 mx-auto mb-6 opacity-80" />
          <h1 className="text-4xl font-bold mb-4">{t('common:cast.enterPairingCode')}</h1>
          <p className="text-xl text-gray-300 mb-8">
            {t('common:cast.enterCodeFromPhone')}
          </p>
          
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (enteredCode.length === 6) {
                console.log('[CastReceiverPage] ✅ Code submitted:', enteredCode.toUpperCase());
                setIsCodeSubmitted(true);
                setSearchParams({ code: enteredCode.toUpperCase() });
              } else {
                console.log('[CastReceiverPage] ❌ Invalid code length:', enteredCode.length);
              }
            }}
            className="space-y-6"
          >
            <input
              type="text"
              value={enteredCode}
              onChange={(e) => setEnteredCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
              maxLength={6}
              placeholder="ABC123"
              className="w-full text-center text-6xl font-mono font-bold bg-white bg-opacity-10 border-2 border-white border-opacity-20 rounded-xl py-6 px-4 text-white placeholder-gray-500 focus:outline-none focus:border-blue-400 focus:bg-opacity-20 transition-all tracking-widest"
              autoFocus
            />
            
            <button
              type="submit"
              disabled={enteredCode.length !== 6}
              className="w-full py-4 px-8 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white text-xl font-semibold rounded-xl transition-all focus:outline-none focus:ring-4 focus:ring-blue-500"
            >
              {t('common:cast.connect')}
            </button>
          </form>
          
          <p className="text-sm text-gray-400 mt-8">
            {t('common:cast.codeHelpText')}
          </p>
        </div>
      </div>
    );
  }

  // Show loading/error state after code submitted
  if (connectionError) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-900 text-white">
        <div className="text-center">
          <svg className="w-24 h-24 mx-auto mb-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <p className="text-2xl font-semibold mb-2">{t('common:cast.connectionError')}</p>
          <p className="text-gray-400">{connectionError}</p>
        </div>
      </div>
    );
  }

  // Show loading state before connection
  if (!wheelData) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-900 text-white">
        <div className="text-center">
          <img src="/year_wheel_symbol.svg" alt="YearWheel" className="w-32 h-32 mx-auto mb-6 animate-pulse opacity-60" />
          <p className="text-2xl font-semibold mb-2">{t('common:cast.waitingForConnection')}</p>
          <p className="text-gray-400">
            {sessionToken 
              ? t('common:cast.connectingWithCode')
              : t('common:cast.startCastingFromMobile')}
          </p>
        </div>
      </div>
    );
  }

  // Disconnected state
  if (!isConnected) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-900 text-white">
        <div className="text-center">
          <img src="/year_wheel_symbol.svg" alt="YearWheel" className="w-24 h-24 mx-auto mb-6 opacity-40" />
          <p className="text-2xl font-semibold">{t('common:cast.disconnected')}</p>
          <p className="text-gray-400 mt-2">{t('common:cast.castingEnded')}</p>
        </div>
      </div>
    );
  }

  // Render YearWheel
  return (
    <div className="h-screen w-screen bg-gray-900 overflow-hidden relative">
      {/* Connection indicator */}
      <div className="absolute top-4 right-4 z-50 flex items-center space-x-2 bg-black bg-opacity-50 px-4 py-2 rounded-full">
        <span className="flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-3 w-3 rounded-full bg-green-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
        </span>
        <span className="text-white text-sm font-medium">{t('common:cast.connected')}</span>
      </div>

      {/* Disconnect button (TV remote friendly - large and accessible) */}
      <button
        onClick={handleDisconnect}
        className="absolute top-4 left-4 z-50 bg-red-600 hover:bg-red-700 text-white font-semibold px-6 py-3 rounded-lg shadow-lg transition-all focus:outline-none focus:ring-4 focus:ring-red-500"
        style={{ fontSize: '18px' }}
      >
        ✕ {t('common:cast.disconnect')}
      </button>

      {/* Title Overlay - Subtle, doesn't steal space */}
      {wheelData.title && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-40 bg-black bg-opacity-40 px-6 py-2 rounded-full backdrop-blur-sm">
          <h1 className="text-white text-xl font-semibold text-center">
            {wheelData.title}
          </h1>
        </div>
      )}

      {/* Logo - Bottom Left */}
      <div className="absolute bottom-4 left-4 z-40 opacity-60">
        <svg width="120" height="40" viewBox="0 0 120 40" fill="none" xmlns="http://www.w3.org/2000/svg">
          <text x="0" y="30" fill="white" fontSize="24" fontWeight="600" fontFamily="system-ui, -apple-system, sans-serif">
            YearWheel
          </text>
        </svg>
      </div>

      {/* YearWheel Canvas - Full width, no padding */}
      <div className="flex items-center justify-center h-full w-full">
        <YearWheel
          wheelId={wheelData.wheelId}
          wheelData={wheelData}
          title={wheelData.title}
          year={wheelData.year}
          colors={wheelData.colors}
          organizationData={wheelData.organizationData}
          showWeekRing={wheelData.showWeekRing}
          showMonthRing={wheelData.showMonthRing}
          showRingNames={wheelData.showRingNames}
          showLabels={wheelData.showLabels}
          weekRingDisplayMode={wheelData.weekRingDisplayMode}
          zoomedMonth={zoomedMonth}
          zoomedQuarter={zoomedQuarter}
          initialRotation={rotation}
          readonly={true}
          hideControls={true}
        />
      </div>
    </div>
  );
}
