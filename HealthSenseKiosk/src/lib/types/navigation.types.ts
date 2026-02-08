/**
 * Navigation Type Definitions
 * Defines screen states and navigation flow for the kiosk application
 */

export type ScreenState =
  | 'welcome'
  | 'login'
  | 'patient-id'
  | 'height'
  | 'weight'
  | 'temperature'
  | 'heart-rate'
  | 'blood-pressure'
  | 'results';

export type MeasurementScreen = Extract<
  ScreenState,
  'height' | 'weight' | 'temperature' | 'heart-rate' | 'blood-pressure'
>;

export interface NavigationState {
  currentScreen: ScreenState;
  previousScreen: ScreenState | null;
  measurementStep: number; // 0-7 (0=patient-id, 1-6=measurements, 7=results)
  canGoBack: boolean;
  history: ScreenState[];
}

export const FLOW_SEQUENCE: ScreenState[] = [
  'welcome',
  'login',
  'patient-id',
  'height',
  'weight',
  'temperature',
  'heart-rate',
  'blood-pressure',
  'results'
];
