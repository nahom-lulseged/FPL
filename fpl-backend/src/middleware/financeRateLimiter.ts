import rateLimit from 'express-rate-limit';

export const financeRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'test' ? 10_000 : 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many finance requests, please try again later' },
});
