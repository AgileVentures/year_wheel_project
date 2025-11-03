import { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import YearWheel from '../YearWheel';
import { CAST_NAMESPACE, CAST_MESSAGE_TYPES } from '../constants/castMessages';
import { useRealtimeCastReceiver } from '../hooks/useRealtimeCast';
import { useRealtimeWheel } from '../hooks/useRealtimeWheel';
import { fetchPage } from '../services/wheelService';
import { useCanonicalUrl } from '../hooks/useCanonicalUrl';

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
  
  // This page should not be indexed by search engines
  useCanonicalUrl('https://yearwheel.se/cast-receiver', { noindex: true });
  
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
  const [displayZoom, setDisplayZoom] = useState(100); // Display zoom for TV (50-200%)
  const [showControls, setShowControls] = useState(false); // Toggle control panel
  const [displayedItem, setDisplayedItem] = useState(null); // Item to display on TV overlay
  
  // Debug state - visible on screen
  const [debugInfo, setDebugInfo] = useState({
    channelStatus: 'Not started',
    messagesReceived: 0,
    lastMessageType: 'None',
    lastMessageTime: null,
    channelName: null,
    realtimeConnected: false
  });

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
    
    const channelName = `cast:${sessionToken}`;
    console.log('[Receiver] Realtime setup with token:', sessionToken);
    console.log('[Receiver] Realtime connected:', realtimeReceiver.isConnected);
    
    // Update debug info
    setDebugInfo(prev => ({
      ...prev,
      channelName: channelName,
      channelStatus: realtimeReceiver.isConnected ? 'SUBSCRIBED' : 'CONNECTING',
      realtimeConnected: realtimeReceiver.isConnected
    }));
    
    // Update connection status based on Realtime
    setIsConnected(realtimeReceiver.isConnected);
    
    if (realtimeReceiver.error) {
      console.error('[Receiver] Realtime error:', realtimeReceiver.error);
      setConnectionError(realtimeReceiver.error);
      setDebugInfo(prev => ({
        ...prev,
        channelStatus: `ERROR: ${realtimeReceiver.error}`
      }));
    }

    // Set up message handler
    realtimeReceiver.onMessage((message) => {
      console.log('[Receiver] 🔍 RAW MESSAGE:', JSON.stringify(message, null, 2));
      setDebugInfo(prev => ({
        ...prev,
        messagesReceived: prev.messagesReceived + 1,
        lastMessageType: message?.type || 'Unknown',
        lastMessageTime: new Date().toLocaleTimeString()
      }));
      handleRealtimeMessage(message);
    });
  }, [sessionToken, realtimeReceiver]);

  // Handle incoming Realtime messages (same format as Cast messages)
  const handleRealtimeMessage = useCallback((message) => {
    if (!message || !message.type) return;
    
    console.log('[Receiver] Realtime message:', message.type);

    switch (message.type) {
      case CAST_MESSAGE_TYPES.INIT:
        console.log('[Receiver] 🎉 INIT received! Setting wheel data...');
        setWheelData(message.data);
        setRotation(message.data.rotation || 0);
        setZoomedMonth(message.data.zoomedMonth || null);
        setZoomedQuarter(message.data.zoomedQuarter || null);
        setIsConnected(true); // Mark as fully connected when we receive data
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

      case CAST_MESSAGE_TYPES.DISPLAY_ZOOM:
        if (message.data && message.data.zoom) {
          setDisplayZoom(message.data.zoom);
        }
        break;

      case CAST_MESSAGE_TYPES.SHOW_ITEM:
        if (message.data && message.data.item) {
          console.log('[Receiver] Showing item on TV:', message.data.item);
          setDisplayedItem(message.data.item);
        }
        break;

      case CAST_MESSAGE_TYPES.HIDE_ITEM:
        console.log('[Receiver] Hiding item from TV');
        setDisplayedItem(null);
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

        case CAST_MESSAGE_TYPES.SHOW_ITEM:
          // Show item details on TV
          if (message.payload && message.payload.item) {
            console.log('[Receiver] Showing item on TV:', message.payload.item);
            setDisplayedItem(message.payload.item);
          }
          break;

        case CAST_MESSAGE_TYPES.HIDE_ITEM:
          // Hide item details from TV
          console.log('[Receiver] Hiding item from TV');
          setDisplayedItem(null);
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

  // Handle realtime database changes
  const handleDatabaseChange = useCallback(async (eventType, tableName, payload) => {
    console.log('[Receiver] Database change:', eventType, tableName);
    
    // Reload wheel data from database
    if (wheelData?.wheelId && wheelData?.pageId) {
      try {
        const page = await fetchPage(wheelData.pageId);
        if (page) {
          setWheelData(prev => ({
            ...prev,
            organizationData: page.organization_data
          }));
        }
      } catch (error) {
        console.error('[Receiver] Error reloading page data:', error);
      }
    }
  }, [wheelData?.wheelId, wheelData?.pageId]);

  // Subscribe to realtime database updates
  useRealtimeWheel(wheelData?.wheelId, wheelData?.pageId, handleDatabaseChange);

  // Show code input screen FIRST if no code submitted yet
  if (!isCodeSubmitted) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-[#1B2A63] via-[#2D4EC8] to-[#1B2A63] text-white">
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
              className="w-full text-center text-6xl font-mono font-bold bg-white bg-opacity-10 border-2 border-[#36C2C6] border-opacity-50 rounded-sm py-6 px-4 text-white placeholder-gray-400 focus:outline-none focus:border-[#00A4A6] focus:bg-opacity-20 transition-all tracking-widest"
              autoFocus
            />
            
            <button
              type="submit"
              disabled={enteredCode.length !== 6}
              className="w-full py-4 px-8 bg-[#00A4A6] hover:bg-[#2E9E97] disabled:bg-gray-600 disabled:cursor-not-allowed text-white text-xl font-semibold rounded-sm transition-all focus:outline-none focus:ring-4 focus:ring-[#36C2C6]"
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
      <div className="flex items-center justify-center h-screen bg-[#1B2A63] text-white">
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
      <div className="flex items-center justify-center h-screen bg-[#1B2A63] text-white">
        <div className="text-center max-w-lg px-8">
          <img src="/year_wheel_symbol.svg" alt="YearWheel" className="w-32 h-32 mx-auto mb-6 animate-pulse opacity-60" />
          <p className="text-2xl font-semibold mb-2">{t('common:cast.waitingForConnection')}</p>
          <p className="text-gray-400 mb-4">
            {sessionToken 
              ? t('common:cast.connectingWithCode')
              : t('common:cast.startCastingFromMobile')}
          </p>
          
          {/* Cancel button - go back to code input */}
          <button
            onClick={() => {
              setIsCodeSubmitted(false);
              setEnteredCode('');
              setSearchParams({});
            }}
            className="mt-6 px-8 py-3 bg-gray-600 hover:bg-gray-700 text-white text-lg font-semibold rounded-sm transition-all focus:outline-none focus:ring-4 focus:ring-gray-500"
          >
            {t('common:actions.cancel')}
          </button>
        </div>
      </div>
    );
  }

  // Disconnected state
  if (!isConnected) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#1B2A63] text-white">
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
    <div className="h-screen w-screen bg-white overflow-hidden relative">
      {/* Connection indicator */}
      <div className="absolute top-4 right-4 z-50">
        <div className="flex items-center space-x-2 bg-black bg-opacity-50 px-4 py-2 rounded-full">
          <span className="flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-3 w-3 rounded-full bg-[#9FCB3E] opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-[#9FCB3E]"></span>
          </span>
          <span className="text-white text-sm font-medium">{t('common:cast.connected')}</span>
        </div>
      </div>

      {/* Disconnect button (TV remote friendly - large and accessible) */}
      <button
        onClick={handleDisconnect}
        className="absolute top-4 left-4 z-50 bg-red-600 hover:bg-red-700 text-white font-semibold px-6 py-3 rounded-sm shadow-lg transition-all focus:outline-none focus:ring-4 focus:ring-red-500"
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
      <div className="absolute bottom-4 left-4 z-40 opacity-80">
        <img 
          src="/year_wheel_logo.svg" 
          alt="YearWheel" 
          className="h-10 w-auto drop-shadow-lg"
        />
      </div>

      {/* YearWheel Canvas - Full width, no padding */}
      <div className="flex items-center justify-center h-full w-full overflow-hidden">
        <div 
          style={{ 
            transform: `scale(${displayZoom / 100})`,
            transformOrigin: 'center center',
            transition: 'transform 0.3s ease-out'
          }}
        >
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
            renderSize={3000}
          />
        </div>
      </div>

      {/* Control Panel Toggle - Bottom Right */}
      <button
        onClick={() => setShowControls(!showControls)}
        className="absolute bottom-4 right-4 z-50 bg-gray-800 hover:bg-gray-700 text-white font-semibold px-4 py-3 rounded-full shadow-lg transition-all focus:outline-none focus:ring-4 focus:ring-gray-600"
        title={showControls ? t('common:cast.hideControls') : t('common:cast.showControls')}
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
        </svg>
      </button>

      {/* Control Panel Overlay */}
      {showControls && (
        <div className="absolute bottom-20 right-4 z-50 bg-black bg-opacity-90 backdrop-blur-md px-6 py-5 rounded-sm shadow-2xl border border-gray-700">
          <h3 className="text-white text-lg font-semibold mb-4">{t('common:cast.displaySettings')}</h3>
          
          {/* Zoom Control */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-white text-sm font-medium">{t('common:cast.displayZoom')}</label>
              <span className="text-white text-sm font-mono bg-gray-700 px-3 py-1 rounded">{displayZoom}%</span>
            </div>
            
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setDisplayZoom(Math.max(50, displayZoom - 10))}
                className="w-10 h-10 flex items-center justify-center bg-gray-700 hover:bg-gray-600 text-white rounded-sm text-xl font-bold transition-colors"
                disabled={displayZoom <= 50}
              >
                −
              </button>
              
              <input
                type="range"
                min="50"
                max="200"
                value={displayZoom}
                onChange={(e) => setDisplayZoom(parseInt(e.target.value))}
                className="flex-1 h-2 bg-gray-700 rounded-sm appearance-none cursor-pointer accent-[#00A4A6]"
                style={{ minWidth: '200px' }}
              />
              
              <button
                onClick={() => setDisplayZoom(Math.min(200, displayZoom + 10))}
                className="w-10 h-10 flex items-center justify-center bg-gray-700 hover:bg-gray-600 text-white rounded-sm text-xl font-bold transition-colors"
                disabled={displayZoom >= 200}
              >
                +
              </button>
            </div>
            
            {/* Preset Zoom Buttons */}
            <div className="flex gap-2 mt-4">
              {[50, 75, 100, 125, 150, 175, 200].map((preset) => (
                <button
                  key={preset}
                  onClick={() => setDisplayZoom(preset)}
                  className={`px-3 py-2 rounded-sm text-sm font-medium transition-colors ${
                    displayZoom === preset
                      ? 'bg-[#00A4A6] text-white'
                      : 'bg-gray-700 text-white hover:bg-gray-600'
                  }`}
                >
                  {preset}%
                </button>
              ))}
            </div>
            
            <button
              onClick={() => setDisplayZoom(100)}
              className="w-full mt-3 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white text-sm font-medium rounded-sm transition-colors"
            >
              {t('common:actions.reset')}
            </button>
          </div>
        </div>
      )}

      {/* Item Detail Overlay - Bottom Left */}
      {displayedItem && (
        <div className="absolute bottom-8 left-8 z-50 bg-white rounded-sm shadow-2xl border-2 border-gray-300 overflow-hidden transition-all duration-300 ease-out">
          <div className="p-6 space-y-4" style={{ maxWidth: '400px' }}>
            {/* Item Color Bar */}
            {wheelData?.organizationData?.activityGroups?.find(g => g.id === displayedItem.activityId) && (
              <div 
                className="h-2 rounded-sm -mt-6 -mx-6 mb-4"
                style={{ 
                  backgroundColor: wheelData.organizationData.activityGroups.find(g => g.id === displayedItem.activityId).color 
                }}
              />
            )}

            {/* Item Name */}
            <h3 className="text-2xl font-bold text-gray-900 leading-tight">
              {displayedItem.name}
            </h3>

            {/* Item Details */}
            <div className="space-y-2 text-base">
              {/* Ring */}
              {wheelData?.organizationData?.rings?.find(r => r.id === displayedItem.ringId) && (
                <div className="flex items-start gap-2">
                  <span className="font-semibold text-gray-600 min-w-[100px]">{t('common:cast.ring')}:</span>
                  <span className="text-gray-900">
                    {wheelData.organizationData.rings.find(r => r.id === displayedItem.ringId).name}
                  </span>
                </div>
              )}

              {/* Activity Group */}
              {wheelData?.organizationData?.activityGroups?.find(g => g.id === displayedItem.activityId) && (
                <div className="flex items-start gap-2">
                  <span className="font-semibold text-gray-600 min-w-[100px]">{t('common:cast.category')}:</span>
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-4 h-4 rounded-sm flex-shrink-0"
                      style={{ 
                        backgroundColor: wheelData.organizationData.activityGroups.find(g => g.id === displayedItem.activityId).color 
                      }}
                    />
                    <span className="text-gray-900">
                      {wheelData.organizationData.activityGroups.find(g => g.id === displayedItem.activityId).name}
                    </span>
                  </div>
                </div>
              )}

              {/* Label (optional) */}
              {displayedItem.labelId && wheelData?.organizationData?.labels?.find(l => l.id === displayedItem.labelId) && (
                <div className="flex items-start gap-2">
                  <span className="font-semibold text-gray-600 min-w-[100px]">{t('common:cast.label')}:</span>
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-4 h-4 rounded-sm flex-shrink-0"
                      style={{ 
                        backgroundColor: wheelData.organizationData.labels.find(l => l.id === displayedItem.labelId).color 
                      }}
                    />
                    <span className="text-gray-900">
                      {wheelData.organizationData.labels.find(l => l.id === displayedItem.labelId).name}
                    </span>
                  </div>
                </div>
              )}

              {/* Dates */}
              {displayedItem.startDate && (
                <div className="flex items-start gap-2">
                  <span className="font-semibold text-gray-600 min-w-[100px]">{t('common:cast.start')}:</span>
                  <span className="text-gray-900">
                    {new Date(displayedItem.startDate).toLocaleDateString(undefined, { 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    })}
                  </span>
                </div>
              )}
              
              {displayedItem.endDate && (
                <div className="flex items-start gap-2">
                  <span className="font-semibold text-gray-600 min-w-[100px]">{t('common:cast.end')}:</span>
                  <span className="text-gray-900">
                    {new Date(displayedItem.endDate).toLocaleDateString(undefined, { 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    })}
                  </span>
                </div>
              )}

              {/* Description */}
              {displayedItem.description && (
                <div className="pt-2 border-t border-gray-200">
                  <p className="text-gray-700 leading-relaxed">
                    {displayedItem.description}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
