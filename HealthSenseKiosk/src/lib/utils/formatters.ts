/**
 * Formatting Utilities
 * Functions for formatting measurement values and other data for display
 */

import type { BloodPressureValue } from '../types/measurement.types';

/**
 * Format temperature value with unit
 * @param value - Temperature in Celsius
 * @returns Formatted string (e.g., "36.8°C")
 */
export function formatTemperature(value: number | null): string {
  if (value === null) return '--';
  return `${value.toFixed(1)}°C`;
}

/**
 * Format height value with unit
 * @param value - Height in centimeters
 * @returns Formatted string (e.g., "175 cm")
 */
export function formatHeight(value: number | null): string {
  if (value === null) return '--';
  return `${Math.round(value)} cm`;
}

/**
 * Format weight value with unit
 * @param value - Weight in kilograms
 * @returns Formatted string (e.g., "70.5 kg")
 */
export function formatWeight(value: number | null): string {
  if (value === null) return '--';
  return `${value.toFixed(1)} kg`;
}

/**
 * Format heart rate value with unit
 * @param value - Heart rate in beats per minute
 * @returns Formatted string (e.g., "72 bpm")
 */
export function formatHeartRate(value: number | null): string {
  if (value === null) return '--';
  return `${Math.round(value)} bpm`;
}

/**
 * Format SpO2 value with unit
 * @param value - SpO2 percentage
 * @returns Formatted string (e.g., "98%")
 */
export function formatSpO2(value: number | null): string {
  if (value === null) return '--';
  return `${Math.round(value)}%`;
}

/**
 * Format blood pressure value with unit
 * @param value - Blood pressure object with systolic and diastolic values
 * @returns Formatted string (e.g., "120/80 mmHg")
 */
export function formatBloodPressure(value: BloodPressureValue | null): string {
  if (value === null) return '--';
  return `${Math.round(value.systolic)}/${Math.round(value.diastolic)} mmHg`;
}

/**
 * Format timestamp to human-readable time
 * @param date - Date object
 * @returns Formatted time string (e.g., "02:45:30 PM")
 */
export function formatTimestamp(date: Date | null): string {
  if (date === null) return '--';
  return new Intl.DateTimeFormat('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  }).format(date);
}

/**
 * Format date to human-readable format
 * @param date - Date object
 * @returns Formatted date string (e.g., "January 15, 2026")
 */
export function formatDate(date: Date | null): string {
  if (date === null) return '--';
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }).format(date);
}

/**
 * Format date of birth
 * @param dateString - Date string (ISO format)
 * @returns Formatted date string (e.g., "01/15/1990")
 */
export function formatDateOfBirth(dateString: string | null): string {
  if (dateString === null) return '--';
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(date);
}

/**
 * Calculate and format BMI (Body Mass Index)
 * @param weight - Weight in kilograms
 * @param height - Height in centimeters
 * @returns Formatted BMI string (e.g., "23.5")
 */
export function formatBMI(weight: number | null, height: number | null): string {
  if (weight === null || height === null) return '--';
  const heightInMeters = height / 100;
  const bmi = weight / (heightInMeters * heightInMeters);
  return bmi.toFixed(1);
}

/**
 * Get BMI category based on value
 * @param bmi - BMI value
 * @returns Category string
 */
export function getBMICategory(bmi: number): string {
  if (bmi < 18.5) return 'Underweight';
  if (bmi < 25) return 'Normal';
  if (bmi < 30) return 'Overweight';
  return 'Obese';
}

/**
 * Format duration in milliseconds to human-readable string
 * @param ms - Duration in milliseconds
 * @returns Formatted string (e.g., "2m 30s")
 */
export function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  if (minutes > 0) {
    return `${minutes}m ${remainingSeconds}s`;
  }
  return `${seconds}s`;
}

/**
 * Format patient ID with proper spacing/format
 * @param id - Patient ID string
 * @returns Formatted ID (e.g., "HS-1234-5678")
 */
export function formatPatientId(id: string | null): string {
  if (id === null) return '--';
  // Add formatting if needed (e.g., insert dashes)
  if (id.length === 12) {
    return `${id.slice(0, 4)}-${id.slice(4, 8)}-${id.slice(8, 12)}`.toUpperCase();
  }
  return id.toUpperCase();
}

/**
 * Format session ID (shorter version for display)
 * @param sessionId - Full session ID
 * @returns Short version (e.g., "...ABC123")
 */
export function formatSessionId(sessionId: string | null): string {
  if (sessionId === null) return '--';
  if (sessionId.length > 8) {
    return `...${sessionId.slice(-6)}`.toUpperCase();
  }
  return sessionId.toUpperCase();
}
