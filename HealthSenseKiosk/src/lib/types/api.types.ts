/**
 * API Type Definitions
 * Defines request/response structures for Cloud and Device APIs
 */

import type { PatientData } from './patient.types';
import type { MeasurementsData, MeasurementType, MeasurementStatus } from './measurement.types';

// ============================================================================
// Cloud API Types (Vercel Backend)
// ============================================================================

export interface FetchPatientRequest {
  patientId: string;
}

export interface FetchPatientResponse {
  success: boolean;
  patient: PatientData | null;
  error?: string;
}

export interface CreateSessionRequest {
  patientId: string;
  startTime: Date;
}

export interface CreateSessionResponse {
  success: boolean;
  sessionId: string;
  error?: string;
}

export interface SubmitVitalsRequest {
  sessionId: string;
  patientId: string;
  measurements: MeasurementsData;
  timestamp: Date;
}

export interface SubmitVitalsResponse {
  success: boolean;
  reportUrl?: string;
  reportId?: string;
  error?: string;
}

export interface EndSessionRequest {
  sessionId: string;
  endTime: Date;
}

export interface EndSessionResponse {
  success: boolean;
  error?: string;
}

// ============================================================================
// Device API Types (ESP32 Local Backend)
// ============================================================================

export interface DeviceInfo {
  firmwareVersion: string;
  deviceId: string;
  lastCalibration: Date | null;
  sensors: {
    temperature: boolean;
    heartRate: boolean;
    spO2: boolean;
    bloodPressure: boolean;
    height: boolean;
    weight: boolean;
  };
}

export interface PingResponse {
  success: boolean;
  timestamp: Date;
  message?: string;
}

export interface StartMeasurementRequest {
  type: MeasurementType;
  patientId?: string;
}

export interface StartMeasurementResponse {
  success: boolean;
  measurementId: string;
  estimatedDuration: number; // in milliseconds
  error?: string;
}

export interface MeasurementStatusResponse {
  status: MeasurementStatus;
  progress: number; // 0-100
  currentValue?: number | { systolic: number; diastolic: number };
  error?: string;
}

export interface StopMeasurementRequest {
  type: MeasurementType;
  measurementId: string;
}

export interface StopMeasurementResponse {
  success: boolean;
  error?: string;
}

// ============================================================================
// WebSocket Message Types (for real-time updates)
// ============================================================================

export interface WebSocketMessage {
  type: 'measurement_update' | 'measurement_complete' | 'measurement_error' | 'device_status';
  payload: any;
  timestamp: Date;
}

export interface MeasurementUpdateMessage extends WebSocketMessage {
  type: 'measurement_update';
  payload: {
    measurementType: MeasurementType;
    currentValue: number | { systolic: number; diastolic: number };
    progress: number;
  };
}

export interface MeasurementCompleteMessage extends WebSocketMessage {
  type: 'measurement_complete';
  payload: {
    measurementType: MeasurementType;
    finalValue: number | { systolic: number; diastolic: number };
  };
}

export interface MeasurementErrorMessage extends WebSocketMessage {
  type: 'measurement_error';
  payload: {
    measurementType: MeasurementType;
    error: string;
  };
}

export interface DeviceStatusMessage extends WebSocketMessage {
  type: 'device_status';
  payload: {
    connected: boolean;
    error?: string;
  };
}
