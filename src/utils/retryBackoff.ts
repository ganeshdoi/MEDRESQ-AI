export interface ExponentialBackoffOptions {
  maxRetries?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  jitterRatio?: number;
  shouldRetry?: (error: unknown, attempt: number) => boolean;
  onRetry?: (info: {
    attempt: number;
    maxRetries: number;
    delayMs: number;
    error: unknown;
  }) => void | Promise<void>;
}

export class TransientSyncError extends Error {
  statusCode?: number;
  isTransient: boolean;

  constructor(message: string, statusCode?: number, isTransient = true) {
    super(message);
    this.name = 'TransientSyncError';
    this.statusCode = statusCode;
    this.isTransient = isTransient;
  }
}

/**
 * Calculates exponential backoff delay in milliseconds:
 * min(maxDelayMs, baseDelayMs * 2^(attempt - 1)) with optional symmetric jitter.
 * Attempt is 1-indexed (1 = first retry after initial failure).
 */
export function calculateExponentialBackoffDelay(
  attempt: number,
  baseDelayMs = 500,
  maxDelayMs = 8000,
  jitterRatio = 0.15,
  randomFn: () => number = Math.random
): number {
  const safeAttempt = Math.max(1, Math.floor(attempt));
  const exponential = baseDelayMs * Math.pow(2, safeAttempt - 1);
  const capped = Math.min(maxDelayMs, exponential);

  if (jitterRatio <= 0) {
    return Math.round(capped);
  }

  // Jitter in range [1 - jitterRatio, 1 + jitterRatio]
  const jitterMultiplier = 1 + (randomFn() * 2 - 1) * jitterRatio;
  return Math.max(50, Math.round(Math.min(maxDelayMs, capped * jitterMultiplier)));
}

/**
 * Determines whether an error from fetch() or Firestore is transient and eligible for retry.
 */
export function isTransientNetworkError(error: unknown): boolean {
  if (!error) return false;

  if (error instanceof TransientSyncError) {
    return error.isTransient;
  }

  if (error instanceof TypeError) {
    // Browser fetch() network errors (DNS, offline, connection reset, CORS/socket drop)
    return true;
  }

  const errObj = error as {
    code?: string;
    status?: number;
    statusCode?: number;
    message?: string;
    name?: string;
  };

  const status = errObj.status ?? errObj.statusCode;
  if (typeof status === 'number') {
    // 408 Request Timeout, 429 Too Many Requests, and 5xx Server/Gateway errors are transient
    if (status === 408 || status === 429 || (status >= 500 && status <= 599)) {
      return true;
    }
    if (status >= 400 && status < 500) {
      return false;
    }
  }

  const code = String(errObj.code || '').toLowerCase();
  if (
    code.includes('unavailable') ||
    code.includes('deadline-exceeded') ||
    code.includes('resource-exhausted') ||
    code.includes('aborted') ||
    code.includes('internal') ||
    code.includes('network-request-failed') ||
    code.includes('econnreset') ||
    code.includes('etimedout')
  ) {
    return true;
  }

  const msg = String(errObj.message || '').toLowerCase();
  if (
    msg.includes('failed to fetch') ||
    msg.includes('networkerror') ||
    msg.includes('network request failed') ||
    msg.includes('timeout') ||
    msg.includes('temporarily unavailable') ||
    msg.includes('502') ||
    msg.includes('503') ||
    msg.includes('504') ||
    msg.includes('429')
  ) {
    return true;
  }

  return false;
}

/**
 * Executes an async operation with exponential backoff retries on transient failures.
 */
export async function executeWithExponentialBackoff<T>(
  operation: (attempt: number) => Promise<T>,
  options: ExponentialBackoffOptions = {}
): Promise<{ result: T; attemptsUsed: number }> {
  const {
    maxRetries = 3,
    baseDelayMs = 500,
    maxDelayMs = 8000,
    jitterRatio = 0.15,
    shouldRetry = isTransientNetworkError,
    onRetry,
  } = options;

  let attempt = 0;

  while (true) {
    try {
      const result = await operation(attempt);
      return { result, attemptsUsed: attempt + 1 };
    } catch (error) {
      if (attempt >= maxRetries || !shouldRetry(error, attempt + 1)) {
        throw error;
      }

      const nextRetryNumber = attempt + 1;
      const delayMs = calculateExponentialBackoffDelay(
        nextRetryNumber,
        baseDelayMs,
        maxDelayMs,
        jitterRatio
      );

      if (onRetry) {
        await onRetry({
          attempt: nextRetryNumber,
          maxRetries,
          delayMs,
          error,
        });
      }

      await new Promise((resolve) => setTimeout(resolve, delayMs));
      attempt++;
    }
  }
}
