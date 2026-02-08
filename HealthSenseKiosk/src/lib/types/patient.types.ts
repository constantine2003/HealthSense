/**
 * Patient Type Definitions
 * Defines patient data structures and identification methods
 */

export type IdentificationMethod = 'qr' | 'manual';

export interface PatientData {
  id: string | null;
  name: string | null;
  dateOfBirth: string | null;
  gender: 'male' | 'female' | 'other' | null;
  identificationMethod: IdentificationMethod | null;
  sessionStartTime: Date | null;
  sessionId: string | null;
}

export interface PatientSession {
  sessionId: string;
  patientId: string;
  startTime: Date;
  endTime: Date | null;
  status: 'active' | 'completed' | 'cancelled';
}
