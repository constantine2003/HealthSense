/**
 * Measurement Type Definitions
 * Defines measurement data structures and states
 */

export type MeasurementType =
  | 'height'
  | 'weight'
  | 'temperature'
  | 'heartRate'
  | 'spO2'
  | 'bloodPressure';

export type MeasurementStatus = 'idle' | 'measuring' | 'completed' | 'error';

export interface MeasurementState<T> {
  status: MeasurementStatus;
  value: T | null;
  unit: string;
  timestamp: Date | null;
  error: string | null;
  retryCount: number;
}

export interface BloodPressureValue {
  systolic: number;
  diastolic: number;
}

export interface MeasurementsData {
  height: MeasurementState<number>;
  weight: MeasurementState<number>;
  temperature: MeasurementState<number>;
  heartRate: MeasurementState<number>;
  spO2: MeasurementState<number>;
  bloodPressure: MeasurementState<BloodPressureValue>;
}

export interface MeasurementConfig {
  type: MeasurementType;
  label: string;
  unit: string;
  icon: string;
  instruction: string;
  tips: string[];
  estimatedDuration: number; // in milliseconds
  normalRange: {
    min: number;
    max: number;
  } | {
    systolic: { min: number; max: number };
    diastolic: { min: number; max: number };
  };
}
