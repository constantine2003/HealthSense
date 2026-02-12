/**
 * Device Store
 * Svelte store for managing ESP32 device connection state
 */

import { writable, derived, type Readable } from 'svelte/store';
import type { DeviceInfo } from '../types/api.types';
import {
  connectToDevice,
  disconnectFromDevice,
  getConnectionState,
  pingDevice,
  getDeviceInfo,
  type DeviceConnectionState
} from '../services/esp32.service';

// ============================================================================
// Device Connection Store
// ============================================================================

interface DeviceStore extends DeviceConnectionState {
  isConnecting: boolean;
}

function createDeviceStore() {
  const { subscribe, set, update } = writable<DeviceStore>({
    connected: false,
    deviceInfo: null,
    lastPing: null,
    error: null,
    isConnecting: false
  });

  return {
    subscribe,

    /**
     * Connect to the ESP32 device
     */
    async connect(): Promise<boolean> {
      update(state => ({ ...state, isConnecting: true, error: null }));

      try {
        const success = await connectToDevice();

        if (success) {
          const state = getConnectionState();
          update(prev => ({
            ...prev,
            connected: state.connected,
            deviceInfo: state.deviceInfo,
            lastPing: state.lastPing,
            error: state.error,
            isConnecting: false
          }));
        } else {
          update(state => ({
            ...state,
            connected: false,
            isConnecting: false,
            error: 'Connection failed'
          }));
        }

        return success;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        update(state => ({
          ...state,
          connected: false,
          isConnecting: false,
          error: errorMessage
        }));
        return false;
      }
    },

    /**
     * Disconnect from the ESP32 device
     */
    disconnect(): void {
      disconnectFromDevice();
      set({
        connected: false,
        deviceInfo: null,
        lastPing: null,
        error: null,
        isConnecting: false
      });
    },

    /**
     * Refresh connection state
     */
    async refresh(): Promise<void> {
      const state = getConnectionState();
      update(prev => ({
        ...prev,
        connected: state.connected,
        deviceInfo: state.deviceInfo,
        lastPing: state.lastPing,
        error: state.error
      }));
    },

    /**
     * Ping the device to check connection
     */
    async ping(): Promise<boolean> {
      const result = await pingDevice();
      await this.refresh();
      return result;
    },

    /**
     * Retry connection
     */
    async retry(): Promise<boolean> {
      return await this.connect();
    }
  };
}

export const deviceStore = createDeviceStore();

// ============================================================================
// Derived Stores
// ============================================================================

/**
 * Connection status indicator
 */
export const connectionStatus: Readable<'connected' | 'connecting' | 'disconnected' | 'error'> = derived(
  deviceStore,
  $device => {
    if ($device.isConnecting) return 'connecting';
    if ($device.error) return 'error';
    if ($device.connected) return 'connected';
    return 'disconnected';
  }
);

/**
 * Check if device has specific sensor
 */
export function hasSensor(sensorName: keyof DeviceInfo['sensors']): Readable<boolean> {
  return derived(
    deviceStore,
    $device => $device.deviceInfo?.sensors[sensorName] ?? false
  );
}

/**
 * Get available sensors
 */
export const availableSensors: Readable<string[]> = derived(
  deviceStore,
  $device => {
    if (!$device.deviceInfo) return [];

    return Object.entries($device.deviceInfo.sensors)
      .filter(([_, available]) => available)
      .map(([name]) => name);
  }
);

/**
 * Connection health indicator
 */
export const connectionHealth: Readable<'good' | 'warning' | 'critical'> = derived(
  deviceStore,
  $device => {
    if (!$device.connected) return 'critical';
    if ($device.error) return 'warning';
    if (!$device.lastPing) return 'warning';

    const timeSinceLastPing = Date.now() - $device.lastPing.getTime();
    if (timeSinceLastPing > 10000) return 'warning'; // > 10 seconds

    return 'good';
  }
);
