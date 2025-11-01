/**
 * Cast message protocol for YearWheel casting
 * Namespace for custom Cast messages
 */
export const CAST_NAMESPACE = 'urn:x-cast:com.yearwheel.cast';

/**
 * Message types for Cast communication
 */
export const CAST_MESSAGE_TYPES = {
  // Initial connection - send full wheel state
  INIT: 'wheel:init',
  
  // Rotation changes (throttled during drag, immediate on gesture end)
  ROTATE: 'wheel:rotate',
  
  // Zoom level changes (immediate)
  ZOOM: 'wheel:zoom',
  
  // Organization data changes (immediate)
  UPDATE: 'wheel:update',
  
  // Settings changes: colors, ring visibility, etc. (immediate)
  SETTINGS: 'wheel:settings',
  
  // Heartbeat to detect connection issues (every 5s)
  PING: 'wheel:ping',
  
  // Disconnect signal
  DISCONNECT: 'wheel:disconnect',
  
  // Acknowledgment from receiver
  ACK: 'wheel:ack',
};

/**
 * Create a cast message with standard structure
 * @param {string} type - Message type from CAST_MESSAGE_TYPES
 * @param {any} payload - Message payload
 * @returns {Object} Formatted cast message
 */
export function createCastMessage(type, payload) {
  return {
    type,
    payload,
    timestamp: Date.now(),
  };
}

/**
 * Throttle interval for rotation messages (milliseconds)
 */
export const ROTATION_THROTTLE_MS = 100;

/**
 * Heartbeat interval (milliseconds)
 */
export const HEARTBEAT_INTERVAL_MS = 5000;

/**
 * Connection timeout (milliseconds)
 * If no heartbeat received for this duration, assume disconnected
 */
export const CONNECTION_TIMEOUT_MS = 30000;
