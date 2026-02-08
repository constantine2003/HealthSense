/**
 * Timer Utilities
 * Functions for managing timeouts, delays, and polling
 */

/**
 * Create a measurement timeout
 * @param duration - Duration in milliseconds
 * @param onTimeout - Callback function when timeout occurs
 * @returns Cleanup function to cancel the timeout
 */
export function createMeasurementTimeout(
  duration: number,
  onTimeout: () => void
): () => void {
  const timeoutId = setTimeout(onTimeout, duration);
  return () => clearTimeout(timeoutId);
}

/**
 * Create a polling interval
 * @param callback - Function to call on each interval
 * @param interval - Interval duration in milliseconds
 * @returns Cleanup function to stop polling
 */
export function createPollingInterval(
  callback: () => void | Promise<void>,
  interval: number
): () => void {
  const intervalId = setInterval(callback, interval);
  return () => clearInterval(intervalId);
}

/**
 * Delay execution for a specified duration
 * @param ms - Duration in milliseconds
 * @returns Promise that resolves after the delay
 */
export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Create a debounced function
 * @param func - Function to debounce
 * @param wait - Wait time in milliseconds
 * @returns Debounced function
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  return function debounced(...args: Parameters<T>) {
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
    }

    timeoutId = setTimeout(() => {
      func(...args);
      timeoutId = null;
    }, wait);
  };
}

/**
 * Create a throttled function
 * @param func - Function to throttle
 * @param limit - Time limit in milliseconds
 * @returns Throttled function
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean = false;

  return function throttled(...args: Parameters<T>) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => {
        inThrottle = false;
      }, limit);
    }
  };
}

/**
 * Retry a function with exponential backoff
 * @param fn - Async function to retry
 * @param maxAttempts - Maximum number of attempts
 * @param baseDelay - Base delay in milliseconds
 * @returns Promise that resolves with the function result or rejects after max attempts
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxAttempts: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      if (attempt < maxAttempts) {
        const delayMs = baseDelay * Math.pow(2, attempt - 1);
        await delay(delayMs);
      }
    }
  }

  throw lastError || new Error('Max retry attempts reached');
}

/**
 * Execute a function with a timeout
 * @param fn - Async function to execute
 * @param timeoutMs - Timeout duration in milliseconds
 * @param timeoutError - Error message for timeout
 * @returns Promise that resolves with the function result or rejects on timeout
 */
export async function withTimeout<T>(
  fn: () => Promise<T>,
  timeoutMs: number,
  timeoutError: string = 'Operation timed out'
): Promise<T> {
  return Promise.race([
    fn(),
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(timeoutError)), timeoutMs)
    )
  ]);
}

/**
 * Check if a date is expired
 * @param date - Date to check
 * @param expiryMs - Expiry duration in milliseconds
 * @returns True if expired, false otherwise
 */
export function isExpired(date: Date, expiryMs: number): boolean {
  return Date.now() - date.getTime() > expiryMs;
}

/**
 * Get time remaining until expiry
 * @param date - Start date
 * @param expiryMs - Expiry duration in milliseconds
 * @returns Time remaining in milliseconds (0 if expired)
 */
export function getTimeRemaining(date: Date, expiryMs: number): number {
  const remaining = expiryMs - (Date.now() - date.getTime());
  return Math.max(0, remaining);
}

/**
 * Format time remaining as MM:SS
 * @param ms - Time in milliseconds
 * @returns Formatted string (e.g., "02:30")
 */
export function formatTimeRemaining(ms: number): string {
  const totalSeconds = Math.ceil(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}
