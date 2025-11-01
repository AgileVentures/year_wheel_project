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
  const [searchParams] = useSearchParams();
  const sessionToken = searchParams.get('session'); // For Realtime fallback
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

  // Initialize Cast Receiver (skip if using Realtime)
  useEffect(() => {
    if (sessionToken) {
      console.log('[Receiver] Using Realtime mode, skipping Cast SDK');
      return;
    }
    
    if (!window.cast || !window.cast.framework) {
      setConnectionError('Cast Receiver SDK not loaded');
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
    
    // Update connection status based on Realtime
    setIsConnected(realtimeReceiver.isConnected);
    
    if (realtimeReceiver.error) {
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
    
    // Show disconnected screen
    setTimeout(() => {
      if (castContextRef.current) {
        castContextRef.current.stop();
      }
    }, 2000);
  };

  // Loading state
  if (!isConnected || connectionError) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-900 text-white">
        <div className="text-center">
          {connectionError ? (
            <>
              <div className="text-red-500 text-6xl mb-4">⚠️</div>
              <p className="text-2xl font-semibold mb-2">{t('common:cast.connectionError')}</p>
              <p className="text-gray-400">{connectionError}</p>
            </>
          ) : (
            <>
              <div className="animate-spin rounded-full h-20 w-20 border-t-4 border-b-4 border-blue-500 mx-auto mb-6"></div>
              <p className="text-2xl font-semibold">{t('common:cast.startingReceiver')}</p>
            </>
          )}
        </div>
      </div>
    );
  }

  // Waiting for wheel data
  if (!wheelData) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-900 text-white">
        <div className="text-center">
          <div className="animate-pulse text-6xl mb-6">📱 ➜ 📺</div>
          <p className="text-2xl font-semibold mb-2">{t('common:cast.waitingForConnection')}</p>
          <p className="text-gray-400">
            {sessionToken 
              ? t('common:cast.scanQRFromIOS')
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
          <div className="text-6xl mb-6">👋</div>
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

      {/* YearWheel Canvas */}
      <div className="flex items-center justify-center h-full p-8">
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
          readonly={true}
          // Note: rotation would need to be passed down to YearWheelClass
          // via a new prop or ref method
        />
      </div>
    </div>
  );
}
