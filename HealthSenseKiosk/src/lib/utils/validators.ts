/**
 * Validation Utilities
 * Functions for validating user input and measurement data
 */

import type { MeasurementType, BloodPressureValue } from '../types/measurement.types';
import { NORMAL_RANGES } from './constants';

/**
 * Validate patient ID format
 * @param id - Patient ID string
 * @returns Validation result
 */
export function validatePatientId(id: string): { valid: boolean; message?: string } {
  if (!id || id.trim() === '') {
    return { valid: false, message: 'Patient ID is required' };
  }

  // Allow alphanumeric characters, 8-12 characters long
  const pattern = /^[A-Z0-9]{8,12}$/i;
  if (!pattern.test(id)) {
    return {
      valid: false,
      message: 'Patient ID must be 8-12 alphanumeric characters'
    };
  }

  return { valid: true };
}

/**
 * Validate PIN entry
 * @param pin - PIN string
 * @param expectedLength - Expected PIN length
 * @returns Validation result
 */
export function validatePin(pin: string, expectedLength: number = 4): { valid: boolean; message?: string } {
  if (pin.length !== expectedLength) {
    return {
      valid: false,
      message: `PIN must be exactly ${expectedLength} digits`
    };
  }

  if (!/^\d+$/.test(pin)) {
    return {
      valid: false,
      message: 'PIN must contain only numbers'
    };
  }

  return { valid: true };
}

/**
 * Validate measurement value against normal ranges
 * @param type - Measurement type
 * @param value - Measurement value
 * @returns Validation result with message
 */
export function validateMeasurement(
  type: Exclude<MeasurementType, 'spO2' | 'bloodPressure'>,
  value: number
): { valid: boolean; message?: string; severity?: 'warning' | 'danger' } {
  const range = NORMAL_RANGES[type];

  if (typeof range === 'object' && 'min' in range && 'max' in range) {
    if (value < range.min || value > range.max) {
      const severity = (value < range.min * 0.8 || value > range.max * 1.2) ? 'danger' : 'warning';
      return {
        valid: true, // Still a valid measurement, just out of normal range
        message: `Value is ${value < range.min ? 'below' : 'above'} normal range (${range.min}-${range.max})`,
        severity
      };
    }
  }

  return { valid: true };
}

/**
 * Validate SpO2 value
 * @param value - SpO2 percentage
 * @returns Validation result
 */
export function validateSpO2(value: number): { valid: boolean; message?: string; severity?: 'warning' | 'danger' } {
  const range = NORMAL_RANGES.spO2;

  if (value < 70) {
    return {
      valid: false,
      message: 'SpO2 value too low - please retry measurement',
      severity: 'danger'
    };
  }

  if (value > 100) {
    return {
      valid: false,
      message: 'SpO2 value invalid - cannot exceed 100%',
      severity: 'danger'
    };
  }

  if (value < range.min) {
    return {
      valid: true,
      message: `SpO2 is below normal range (${range.min}-${range.max}%)`,
      severity: value < 90 ? 'danger' : 'warning'
    };
  }

  return { valid: true };
}

/**
 * Validate blood pressure values
 * @param value - Blood pressure object
 * @returns Validation result
 */
export function validateBloodPressure(
  value: BloodPressureValue
): { valid: boolean; message?: string; severity?: 'warning' | 'danger' } {
  const { systolic, diastolic } = value;
  const range = NORMAL_RANGES.bloodPressure;

  // Check for invalid values
  if (systolic < 40 || systolic > 250) {
    return {
      valid: false,
      message: 'Systolic pressure out of measurable range - please retry',
      severity: 'danger'
    };
  }

  if (diastolic < 30 || diastolic > 150) {
    return {
      valid: false,
      message: 'Diastolic pressure out of measurable range - please retry',
      severity: 'danger'
    };
  }

  // Check if diastolic is higher than systolic (impossible)
  if (diastolic >= systolic) {
    return {
      valid: false,
      message: 'Invalid blood pressure reading - please retry',
      severity: 'danger'
    };
  }

  // Check for hypertension (high blood pressure)
  if (systolic >= 180 || diastolic >= 120) {
    return {
      valid: true,
      message: 'Blood pressure is critically high (Hypertensive Crisis)',
      severity: 'danger'
    };
  }

  if (systolic >= 140 || diastolic >= 90) {
    return {
      valid: true,
      message: 'Blood pressure is elevated (Stage 2 Hypertension)',
      severity: 'warning'
    };
  }

  if (systolic >= 130 || diastolic >= 80) {
    return {
      valid: true,
      message: 'Blood pressure is slightly elevated (Stage 1 Hypertension)',
      severity: 'warning'
    };
  }

  // Check for hypotension (low blood pressure)
  if (systolic < 90 || diastolic < 60) {
    return {
      valid: true,
      message: 'Blood pressure is below normal range',
      severity: 'warning'
    };
  }

  return { valid: true };
}

/**
 * Validate email format
 * @param email - Email string
 * @returns Validation result
 */
export function validateEmail(email: string): { valid: boolean; message?: string } {
  if (!email || email.trim() === '') {
    return { valid: false, message: 'Email is required' };
  }

  const pattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!pattern.test(email)) {
    return { valid: false, message: 'Invalid email format' };
  }

  return { valid: true };
}

/**
 * Validate date of birth
 * @param dateString - Date string
 * @returns Validation result
 */
export function validateDateOfBirth(dateString: string): { valid: boolean; message?: string } {
  if (!dateString) {
    return { valid: false, message: 'Date of birth is required' };
  }

  const date = new Date(dateString);
  if (isNaN(date.getTime())) {
    return { valid: false, message: 'Invalid date format' };
  }

  // Check if date is in the future
  if (date > new Date()) {
    return { valid: false, message: 'Date of birth cannot be in the future' };
  }

  // Check if age is reasonable (0-120 years)
  const age = (new Date().getTime() - date.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
  if (age > 120) {
    return { valid: false, message: 'Invalid date of birth' };
  }

  return { valid: true };
}
