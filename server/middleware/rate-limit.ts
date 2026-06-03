import type { Request, RequestHandler } from 'express';

type RateLimitBucket = {
  count: number;
  resetAt: number;
};

type RateLimiterOptions = {
  windowMs: number;
  max: number;
  message: string;
  keyGenerator?: (req: Request) => string;
};

export function createRateLimiter({
  windowMs,
  max,
  message,
  keyGenerator = (req) => req.ip || req.socket.remoteAddress || 'unknown',
}: RateLimiterOptions): RequestHandler {
  const buckets = new Map<string, RateLimitBucket>();

  return (req, res, next) => {
    const now = Date.now();
    const key = keyGenerator(req);
    const existingBucket = buckets.get(key);
    const bucket =
      !existingBucket || existingBucket.resetAt <= now
        ? { count: 0, resetAt: now + windowMs }
        : existingBucket;

    if (!existingBucket || existingBucket.resetAt <= now) {
      buckets.set(key, bucket);
    }

    const retryAfterSeconds = Math.ceil((bucket.resetAt - now) / 1000);

    res.setHeader('X-RateLimit-Limit', String(max));
    res.setHeader('X-RateLimit-Remaining', String(Math.max(max - bucket.count, 0)));
    res.setHeader('X-RateLimit-Reset', String(Math.ceil(bucket.resetAt / 1000)));

    if (bucket.count >= max) {
      res.setHeader('Retry-After', String(retryAfterSeconds));
      return res.status(429).json({
        message,
        retryAfterSeconds,
      });
    }

    bucket.count += 1;
    res.setHeader('X-RateLimit-Remaining', String(Math.max(max - bucket.count, 0)));

    if (buckets.size > 10000) {
      for (const [bucketKey, value] of Array.from(buckets.entries())) {
        if (value.resetAt <= now) {
          buckets.delete(bucketKey);
        }
      }
    }

    next();
  };
}
