/**
 * Application Constants
 * Central location for all constant values used throughout the kiosk application
 */

import type { MeasurementType } from './types/measurement.types';

// ============================================================================
// Timing Constants
// ============================================================================

export const MEASUREMENT_TIMEOUT = 30000; // 30 seconds
export const DEVICE_POLL_INTERVAL = 500; // 500ms
export const CONNECTION_CHECK_INTERVAL = 5000; // 5 seconds
export const AUTO_DISMISS_DURATION = 5000; // 5 seconds for error banners
export const SESSION_TIMEOUT = 1800000; // 30 minutes

// ============================================================================
// Measurement Units
// ============================================================================

export const MEASUREMENT_UNITS: Record<MeasurementType, string> = {
  height: 'cm',
  weight: 'kg',
  temperature: '°C',
  heartRate: 'bpm',
  spO2: '%',
  bloodPressure: 'mmHg'
} as const;

// ============================================================================
// Normal Ranges for Measurements
// ============================================================================

export const NORMAL_RANGES = {
  height: { min: 50, max: 250 }, // cm (covers pediatric to adult)
  weight: { min: 10, max: 300 }, // kg
  temperature: { min: 36.1, max: 37.2 }, // °C
  heartRate: { min: 60, max: 100 }, // bpm
  spO2: { min: 95, max: 100 }, // %
  bloodPressure: {
    systolic: { min: 90, max: 120 }, // mmHg
    diastolic: { min: 60, max: 80 } // mmHg
  }
} as const;

// ============================================================================
// Measurement Configurations
// ============================================================================

export const MEASUREMENT_CONFIGS = {
  height: {
    label: 'Height',
    icon: 'ruler',
    instruction: 'Stand straight against the height sensor',
    tips: [
      'Remove shoes before measurement',
      'Stand with heels together',
      'Look straight ahead'
    ],
    estimatedDuration: 5000 // 5 seconds
  },
  weight: {
    label: 'Weight',
    icon: 'scale',
    instruction: 'Step on the scale',
    tips: [
      'Remove shoes and heavy items',
      'Stand still in the center',
      'Distribute weight evenly'
    ],
    estimatedDuration: 5000 // 5 seconds
  },
  temperature: {
    label: 'Temperature',
    icon: 'thermometer',
    instruction: 'Place the thermometer under your tongue',
    tips: [
      'Keep your mouth closed',
      'Stay still for accurate results',
      'Measurement takes about 10 seconds'
    ],
    estimatedDuration: 10000 // 10 seconds
  },
  heartRate: {
    label: 'Heart Rate & SpO₂',
    icon: 'heart',
    instruction: 'Place your finger on the sensor',
    tips: [
      'Keep your hand still and relaxed',
      'Do not press too hard',
      'Measurement takes about 15 seconds'
    ],
    estimatedDuration: 15000 // 15 seconds
  },
  bloodPressure: {
    label: 'Blood Pressure',
    icon: 'blood-pressure',
    instruction: 'Place your arm in the cuff',
    tips: [
      'Sit comfortably with back supported',
      'Keep arm at heart level',
      'Relax and stay still',
      'Measurement takes about 30 seconds'
    ],
    estimatedDuration: 30000 // 30 seconds
  }
} as const;

// ============================================================================
// Step Labels
// ============================================================================

export const STEP_LABELS = [
  'Patient ID',
  'Height',
  'Weight',
  'Temperature',
  'Heart Rate',
  'Blood Pressure',
  'Results'
] as const;

// ============================================================================
// Retry Configuration
// ============================================================================

export const MAX_RETRY_ATTEMPTS = 3;
export const RETRY_DELAY_MS = 2000; // 2 seconds between retries

// ============================================================================
// PIN Configuration
// ============================================================================

export const KIOSK_PIN = '1234';
export const PIN_LENGTH = 4;

// ============================================================================
// Mock Mode (for development)
// ============================================================================

export const MOCK_MODE = import.meta.env.VITE_MOCK_MODE !== 'false'; // default to true
export const MOCK_DELAY_MIN = 2000; // 2 seconds
export const MOCK_DELAY_MAX = 5000; // 5 seconds
export const MOCK_ERROR_PROBABILITY = 0.05; // 5% chance of error

// ============================================================================
// API Configuration
// ============================================================================

export const ESP32_BASE_URL = import.meta.env.VITE_ESP32_BASE_URL || 'http://192.168.1.100';
export const CLOUD_BASE_URL = import.meta.env.VITE_CLOUD_BASE_URL || 'https://healthsense-api.vercel.app';
export const API_KEY = import.meta.env.VITE_API_KEY || '';

// ============================================================================
// Color Theme (extends Tailwind custom colors)
// ============================================================================

export const COLORS = {
  primary: '#3b82f6', // blue-500
  success: '#10b981', // green-500
  danger: '#ef4444', // red-500
  warning: '#f59e0b', // amber-500
  dark: '#0f172a', // slate-900
  light: '#f8fafc' // slate-50
} as const;
