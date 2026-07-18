export interface RateCheck {
  allowed: boolean;
  /** Milliseconds until a slot is expected to free up (0 when allowed). */
  retryAfterMs: number;
}

/**
 * In-memory sliding-window rate limiter.
 *
 * Tracks request timestamps within a rolling window and only allows a request
 * when fewer than `limit` requests occurred in the last `windowMs`.
 *
 * Note: this is per-process. For multi-instance deployments, back it with a
 * shared store (e.g. Redis / Upstash) using the same algorithm.
 */
export class SlidingWindowRateLimiter {
  private timestamps: number[] = [];

  constructor(
    private readonly limit: number,
    private readonly windowMs: number
  ) {}

  private prune(now: number) {
    const cutoff = now - this.windowMs;
    // Drop timestamps outside the window (array is chronological).
    let i = 0;
    while (i < this.timestamps.length && this.timestamps[i] <= cutoff) i++;
    if (i > 0) this.timestamps.splice(0, i);
  }

  check(): RateCheck {
    const now = Date.now();
    this.prune(now);
    if (this.timestamps.length < this.limit) {
      return { allowed: true, retryAfterMs: 0 };
    }
    const oldest = this.timestamps[0];
    return {
      allowed: false,
      retryAfterMs: Math.max(0, oldest + this.windowMs - now),
    };
  }

  /** Atomically checks and, if allowed, records the request. */
  tryAcquire(): RateCheck {
    const result = this.check();
    if (result.allowed) this.timestamps.push(Date.now());
    return result;
  }
}

/**
 * Exa's team-wide `/search` limit is 10 QPS. We cap at 9 to keep a small
 * safety margin against clock skew and concurrent instances.
 */
export const exaSearchLimiter = new SlidingWindowRateLimiter(9, 1000);
