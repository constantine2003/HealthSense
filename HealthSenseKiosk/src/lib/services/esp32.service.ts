/**
 * ESP32 Device Service
 * Handles communication with the NodeMCU ESP32S device via HTTP and WebSocket
 */

import type {
  DeviceInfo,
  PingResponse,
  StartMeasurementRequest,
  StartMeasurementResponse,
  MeasurementStatusResponse,
  StopMeasurementRequest,
  StopMeasurementResponse,
  WebSocketMessage,
  MeasurementUpdateMessage,
  MeasurementCompleteMessage,
  MeasurementErrorMessage,
  DeviceStatusMessage
} from '../types/api.types';
import type { MeasurementType } from '../types/measurement.types';
import { ESP32_BASE_URL, DEVICE_POLL_INTERVAL, CONNECTION_CHECK_INTERVAL } from '../utils/constants';

// ============================================================================
// Connection State
// ============================================================================

export interface DeviceConnectionState {
  connected: boolean;
  deviceInfo: DeviceInfo | null;
  lastPing: Date | null;
  error: string | null;
}

let connectionState: DeviceConnectionState = {
  connected: false,
  deviceInfo: null,
  lastPing: null,
  error: null
};

let websocket: WebSocket | null = null;
let reconnectTimer: number | null = null;
let pingInterval: number | null = null;

// ============================================================================
// HTTP Helper
// ============================================================================

async function httpRequest<T>(
  endpoint: string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
  body?: any
): Promise<T> {
  const url = `${ESP32_BASE_URL}${endpoint}`;

  try {
    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(5000) // 5 second timeout
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`ESP32 HTTP Error [${endpoint}]:`, error);
    throw error;
  }
}

// ============================================================================
// Device Connection
// ============================================================================

/**
 * Ping the ESP32 device to check if it's alive
 */
export async function pingDevice(): Promise<boolean> {
  try {
    const response = await httpRequest<PingResponse>('/api/ping', 'GET');

    if (response.success) {
      connectionState.connected = true;
      connectionState.lastPing = response.timestamp;
      connectionState.error = null;
      return true;
    }

    return false;
  } catch (error) {
    connectionState.connected = false;
    connectionState.error = error instanceof Error ? error.message : 'Connection failed';
    return false;
  }
}

/**
 * Get device information and sensor status
 */
export async function getDeviceInfo(): Promise<DeviceInfo | null> {
  try {
    const deviceInfo = await httpRequest<DeviceInfo>('/api/device/info', 'GET');
    connectionState.deviceInfo = deviceInfo;
    return deviceInfo;
  } catch (error) {
    console.error('Failed to get device info:', error);
    return null;
  }
}

/**
 * Connect to the ESP32 device
 * - Ping the device
 * - Get device info
 * - Start heartbeat
 */
export async function connectToDevice(): Promise<boolean> {
  console.log('Connecting to ESP32 device...');

  const isAlive = await pingDevice();
  if (!isAlive) {
    console.error('Device is not responding');
    return false;
  }

  const info = await getDeviceInfo();
  if (!info) {
    console.error('Could not retrieve device info');
    return false;
  }

  console.log('Device connected:', info);

  // Start heartbeat
  startHeartbeat();

  return true;
}

/**
 * Disconnect from the ESP32 device
 */
export function disconnectFromDevice(): void {
  stopHeartbeat();
  closeWebSocket();

  connectionState.connected = false;
  connectionState.deviceInfo = null;
  connectionState.error = null;
}

/**
 * Get current connection state
 */
export function getConnectionState(): DeviceConnectionState {
  return { ...connectionState };
}

// ============================================================================
// Heartbeat (Keep-Alive)
// ============================================================================

function startHeartbeat(): void {
  if (pingInterval) return; // Already running

  pingInterval = window.setInterval(async () => {
    const isAlive = await pingDevice();
    if (!isAlive) {
      console.warn('Device heartbeat failed - attempting reconnect...');
      // You could trigger a reconnection attempt here
    }
  }, CONNECTION_CHECK_INTERVAL);
}

function stopHeartbeat(): void {
  if (pingInterval) {
    clearInterval(pingInterval);
    pingInterval = null;
  }
}

// ============================================================================
// Measurement Control
// ============================================================================

/**
 * Start a measurement on the ESP32
 */
export async function startMeasurement(
  type: MeasurementType,
  patientId?: string
): Promise<StartMeasurementResponse> {
  const request: StartMeasurementRequest = {
    type,
    patientId
  };

  return await httpRequest<StartMeasurementResponse>(
    '/api/measurement/start',
    'POST',
    request
  );
}

/**
 * Get the status of an ongoing measurement
 */
export async function getMeasurementStatus(
  type: MeasurementType
): Promise<MeasurementStatusResponse> {
  return await httpRequest<MeasurementStatusResponse>(
    `/api/measurement/status?type=${type}`,
    'GET'
  );
}

/**
 * Stop an ongoing measurement
 */
export async function stopMeasurement(
  type: MeasurementType,
  measurementId: string
): Promise<StopMeasurementResponse> {
  const request: StopMeasurementRequest = {
    type,
    measurementId
  };

  return await httpRequest<StopMeasurementResponse>(
    '/api/measurement/stop',
    'POST',
    request
  );
}

// ============================================================================
// WebSocket (Real-time Updates)
// ============================================================================

type WebSocketCallback = (message: WebSocketMessage) => void;
let wsCallbacks: WebSocketCallback[] = [];

/**
 * Connect to WebSocket for real-time measurement updates
 */
export function connectWebSocket(callbacks?: {
  onUpdate?: (msg: MeasurementUpdateMessage) => void;
  onComplete?: (msg: MeasurementCompleteMessage) => void;
  onError?: (msg: MeasurementErrorMessage) => void;
  onDeviceStatus?: (msg: DeviceStatusMessage) => void;
}): void {
  if (websocket?.readyState === WebSocket.OPEN) {
    console.log('WebSocket already connected');
    return;
  }

  const wsUrl = ESP32_BASE_URL.replace('http', 'ws') + '/ws';
  console.log('Connecting to WebSocket:', wsUrl);

  websocket = new WebSocket(wsUrl);

  websocket.onopen = () => {
    console.log('WebSocket connected');
    connectionState.error = null;

    // Clear any reconnect timer
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
  };

  websocket.onmessage = (event) => {
    try {
      const message: WebSocketMessage = JSON.parse(event.data);

      // Route to type-specific callbacks
      if (callbacks) {
        switch (message.type) {
          case 'measurement_update':
            callbacks.onUpdate?.(message as MeasurementUpdateMessage);
            break;
          case 'measurement_complete':
            callbacks.onComplete?.(message as MeasurementCompleteMessage);
            break;
          case 'measurement_error':
            callbacks.onError?.(message as MeasurementErrorMessage);
            break;
          case 'device_status':
            callbacks.onDeviceStatus?.(message as DeviceStatusMessage);
            break;
        }
      }

      // Also call generic callbacks
      wsCallbacks.forEach(cb => cb(message));
    } catch (error) {
      console.error('Failed to parse WebSocket message:', error);
    }
  };

  websocket.onerror = (error) => {
    console.error('WebSocket error:', error);
    connectionState.error = 'WebSocket connection error';
  };

  websocket.onclose = () => {
    console.log('WebSocket closed');
    websocket = null;

    // Attempt to reconnect after a delay
    if (!reconnectTimer) {
      reconnectTimer = window.setTimeout(() => {
        console.log('Attempting to reconnect WebSocket...');
        connectWebSocket(callbacks);
      }, 5000);
    }
  };
}

/**
 * Close WebSocket connection
 */
export function closeWebSocket(): void {
  if (websocket) {
    websocket.close();
    websocket = null;
  }

  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
}

/**
 * Subscribe to WebSocket messages
 */
export function subscribeToWebSocket(callback: WebSocketCallback): () => void {
  wsCallbacks.push(callback);

  // Return unsubscribe function
  return () => {
    wsCallbacks = wsCallbacks.filter(cb => cb !== callback);
  };
}

/**
 * Send a message through WebSocket
 */
export function sendWebSocketMessage(message: any): void {
  if (websocket?.readyState === WebSocket.OPEN) {
    websocket.send(JSON.stringify(message));
  } else {
    console.warn('WebSocket not connected');
  }
}

// ============================================================================
// Polling Helper (Alternative to WebSocket)
// ============================================================================

/**
 * Poll for measurement status at regular intervals
 * Returns an unsubscribe function to stop polling
 */
export function pollMeasurementStatus(
  type: MeasurementType,
  onUpdate: (status: MeasurementStatusResponse) => void,
  interval: number = DEVICE_POLL_INTERVAL
): () => void {
  let isPolling = true;
  let timeoutId: number;

  async function poll() {
    if (!isPolling) return;

    try {
      const status = await getMeasurementStatus(type);
      onUpdate(status);

      // Stop polling if measurement is complete or errored
      if (status.status === 'completed' || status.status === 'error') {
        isPolling = false;
        return;
      }
    } catch (error) {
      console.error('Polling error:', error);
    }

    // Schedule next poll
    if (isPolling) {
      timeoutId = window.setTimeout(poll, interval);
    }
  }

  // Start polling
  poll();

  // Return unsubscribe function
  return () => {
    isPolling = false;
    if (timeoutId) clearTimeout(timeoutId);
  };
}
