import dotenv from 'dotenv';
import { validate as validateCron } from 'node-cron';
import { z } from 'zod';

dotenv.config();

export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  APP_ENV: z.enum(['local', 'staging', 'production']).default('local'),
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().min(1),
  SUPABASE_URL: z.string().url(),
  SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
  SUPABASE_SECRET_KEY: z.string().min(1),
  PORT: z.coerce.number().int().positive().default(3000),
  FPL_API_BASE_URL: z
    .string()
    .url()
    .default('https://fantasy.premierleague.com/api'),
  ENABLE_INGESTION_CRON: z
    .enum(['true', 'false'])
    .default('true')
    .transform((v) => v === 'true'),
  INGESTION_CRON_BOOTSTRAP: z.string().default('0 3 * * *'),
  INGESTION_CRON_STATS: z.string().default('*/30 * * * *'),
  ENABLE_SCORING_CRON: z
    .enum(['true', 'false'])
    .default('true')
    .transform((v) => v === 'true'),
  SCORING_CRON_SCHEDULE: z.string().default('*/15 * * * *'),
  ENABLE_BULLMQ: z
    .enum(['true', 'false'])
    .default('true')
    .transform((v) => v === 'true'),
  ENABLE_SOCKET_IO: z
    .enum(['true', 'false'])
    .default('true')
    .transform((v) => v === 'true'),
  LIVE_STATS_POLL_CRON: z.string().default('*/2 * * * *'),
  PRICE_CHANGE_CRON: z.string().default('0 2 * * *'),
  DEADLINE_REMINDER_CRON: z.string().default('*/15 * * * *'),
  DEADLINE_REMINDER_MINUTES: z
    .string()
    .default('60,1440')
    .transform((v) =>
      v
        .split(',')
        .map((n) => Number.parseInt(n.trim(), 10))
        .filter((n) => !Number.isNaN(n)),
    ),
  CORS_ORIGIN: z
    .string()
    .default(
      'http://localhost:5173,http://127.0.0.1:5173,http://localhost:5174,http://127.0.0.1:5174',
    )
    .transform((v) =>
      v.split(',').map((s) => s.trim()).filter(Boolean),
    ),
  CACHE_ENABLED: z
    .enum(['true', 'false'])
    .default('true')
    .transform((v) => v === 'true'),
  CACHE_TTL_PLAYERS_SECONDS: z.coerce.number().int().positive().default(600),
  CACHE_TTL_FIXTURES_SECONDS: z.coerce.number().int().positive().default(600),
  CACHE_TTL_STANDINGS_SECONDS: z.coerce.number().int().positive().default(300),
  CACHE_TTL_STANDINGS_LIVE_SECONDS: z.coerce.number().int().positive().default(30),
  CACHE_TTL_ANALYTICS_GROWTH_SECONDS: z.coerce.number().int().positive().default(120),
  ALERT_QUEUE_FAILED_THRESHOLD: z.coerce.number().int().positive().default(5),
  ALERT_ERROR_RATE_THRESHOLD: z.coerce.number().int().positive().default(10),
  ALERT_ERROR_RATE_WINDOW_MINUTES: z.coerce.number().int().positive().default(15),
  ALERT_COOLDOWN_SECONDS: z.coerce.number().int().positive().default(3600),
  // Staked leagues / finance
  FINANCE_CURRENCY: z.string().default('ETB'),
  MAX_STAKE_MINOR: z.coerce.number().int().positive().default(10_000_00),
  MAX_POT_MINOR: z.coerce.number().int().positive().default(500_000_00),
  PLATFORM_COMMISSION_BPS: z.coerce.number().int().min(0).max(10_000).default(1000),
  PAYMENT_PROVIDER: z.enum(['mock', 'chapa', 'santimpay', 'arifpay', 'telebirr']).default('mock'),
  PAYMENT_WEBHOOK_SECRET: z.string().default('dev-webhook-secret'),
  FINANCE_TERMS_VERSION: z.string().default('1.0'),
  RECONCILIATION_CRON: z.string().default('0 */6 * * *'),
  FRAUD_DETECTION_CRON: z.string().default('0 4 * * *'),
  SUPPORT_CONTACT_EMAIL: z.string().email().default('support@example.com'),
  FRONTEND_URL: z.string().url().optional(),
  PUBLIC_API_URL: z.string().url().optional(),
  TERMS_URL: z.string().url().optional(),
  TELEGRAM_AUTH_ENABLED: z.enum(['true', 'false']).default('false').transform((v) => v === 'true'),
  TELEGRAM_ALERTS_ENABLED: z.enum(['true', 'false']).default('false').transform((v) => v === 'true'),
  TELEGRAM_BOT_TOKEN: z.string().optional(),
  TELEGRAM_WEBHOOK_SECRET: z.string().optional(),
  TELEBIRR_ENABLED: z.enum(['true', 'false']).default('false').transform((v) => v === 'true'),
  TELEBIRR_BASE_URL: z.string().url().default('https://developerportal.ethiotelebirr.et:38443/apiaccess/payment/gateway'),
  TELEBIRR_FABRIC_APP_ID: z.string().optional(),
  TELEBIRR_APP_SECRET: z.string().optional(),
  TELEBIRR_MERCHANT_APP_ID: z.string().optional(),
  TELEBIRR_MERCHANT_CODE: z.string().optional(),
  TELEBIRR_PRIVATE_KEY: z.string().optional(),
  TELEBIRR_PUBLIC_KEY: z.string().optional(),
  ADVANCED_MATCH_DATA_ENABLED: z.enum(['true', 'false']).default('false').transform((v) => v === 'true'),
}).superRefine((value, ctx) => {
  const cronFields = [
    'INGESTION_CRON_BOOTSTRAP',
    'INGESTION_CRON_STATS',
    'SCORING_CRON_SCHEDULE',
    'LIVE_STATS_POLL_CRON',
    'PRICE_CHANGE_CRON',
    'DEADLINE_REMINDER_CRON',
    'RECONCILIATION_CRON',
    'FRAUD_DETECTION_CRON',
  ] as const;

  for (const field of cronFields) {
    if (!validateCron(value[field])) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: [field],
        message: 'Invalid cron expression',
      });
    }
  }

  const isHostedRuntime = value.NODE_ENV === 'production' || value.APP_ENV === 'production';
  const isRealProduction = value.APP_ENV === 'production';
  if (!isHostedRuntime) {
    return;
  }

  if (value.TELEGRAM_AUTH_ENABLED && !value.TELEGRAM_BOT_TOKEN) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['TELEGRAM_BOT_TOKEN'], message: 'Telegram bot token is required when Telegram auth is enabled' });
  }

  if (value.TELEGRAM_AUTH_ENABLED && !value.TELEGRAM_WEBHOOK_SECRET) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['TELEGRAM_WEBHOOK_SECRET'], message: 'Telegram webhook secret is required when Telegram auth is enabled' });
  }

  if (value.TELEGRAM_AUTH_ENABLED && !value.TERMS_URL) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['TERMS_URL'], message: 'Terms URL is required when Telegram auth is enabled' });
  }

  if (value.APP_ENV !== 'local' && value.TERMS_URL && !value.TERMS_URL.startsWith('https://')) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['TERMS_URL'], message: 'Hosted Terms URL must use HTTPS' });
  }

  if (value.TELEBIRR_ENABLED && (!value.TELEBIRR_FABRIC_APP_ID || !value.TELEBIRR_APP_SECRET || !value.TELEBIRR_MERCHANT_APP_ID || !value.TELEBIRR_MERCHANT_CODE || !value.TELEBIRR_PRIVATE_KEY || !value.TELEBIRR_PUBLIC_KEY)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['TELEBIRR_FABRIC_APP_ID'], message: 'All Telebirr merchant credentials and signing keys are required when Telebirr is enabled' });
  }

  if (!value.DATABASE_URL.startsWith('mongodb+srv://')) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['DATABASE_URL'], message: 'Production MongoDB must use an Atlas SRV URL' });
  }

  if (isRealProduction && value.PAYMENT_PROVIDER === 'mock') {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['PAYMENT_PROVIDER'],
      message: 'Mock payment provider is not allowed in production',
    });
  }

  if (
    value.PAYMENT_WEBHOOK_SECRET === 'dev-webhook-secret' ||
    value.PAYMENT_WEBHOOK_SECRET.length < 32
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['PAYMENT_WEBHOOK_SECRET'],
      message: 'Production webhook secret must be unique and at least 32 characters',
    });
  }

  if (value.SUPPORT_CONTACT_EMAIL === 'support@example.com') {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['SUPPORT_CONTACT_EMAIL'],
      message: 'Production support contact must be configured',
    });
  }

  if (!value.FRONTEND_URL) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['FRONTEND_URL'],
      message: 'Production FRONTEND_URL is required',
    });
  }

  if (value.TELEBIRR_ENABLED && !value.PUBLIC_API_URL) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['PUBLIC_API_URL'],
      message: 'Production public API URL is required for Telebirr callbacks',
    });
  }

  if (value.CORS_ORIGIN.some((origin) => origin.includes('localhost'))) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['CORS_ORIGIN'],
      message: 'Production CORS origins must not include localhost',
    });
  }

  if (value.REDIS_URL.includes('localhost') || value.REDIS_URL.includes('127.0.0.1')) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['REDIS_URL'],
      message: 'Production Redis URL must not use local development Redis',
    });
  }
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment variables:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

const baseEnv = parsed.data;

export const env = {
  ...baseEnv,
  FRONTEND_URL: baseEnv.FRONTEND_URL ?? baseEnv.CORS_ORIGIN[0] ?? 'http://localhost:5173',
  PUBLIC_API_URL: baseEnv.PUBLIC_API_URL ?? `http://localhost:${baseEnv.PORT}`,
};
