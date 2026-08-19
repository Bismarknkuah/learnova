import rateLimit from 'express-rate-limit';

/** Generic limiter; tighten for auth + search routes specifically. */
export const apiLimiter = rateLimit({
  windowMs: 60_000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
});

export const authLimiter = rateLimit({
  windowMs: 60_000,
  max: 10,
  message: { success: false, error: { code: 'RATE_LIMIT', message: 'Too many attempts' } },
});
