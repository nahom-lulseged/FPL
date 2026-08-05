import { envSchema } from '../../src/config/env';

const hostedBase = {
  NODE_ENV: 'production',
  APP_ENV: 'staging',
  DATABASE_URL: 'mongodb+srv://user:password@example.mongodb.net/fpl_staging',
  REDIS_URL: 'rediss://default:password@redis.example.com:6379',
  SUPABASE_URL: 'https://example.supabase.co',
  SUPABASE_PUBLISHABLE_KEY: 'test-publishable-key',
  SUPABASE_SECRET_KEY: 'test-secret-key',
  CORS_ORIGIN: 'https://staging.example.com',
  FRONTEND_URL: 'https://staging.example.com',
  PUBLIC_API_URL: 'https://api-staging.example.com',
  PAYMENT_PROVIDER: 'mock',
  PAYMENT_WEBHOOK_SECRET: 'staging-webhook-secret-at-least-32-characters',
  SUPPORT_CONTACT_EMAIL: 'support@example.org',
  TELEGRAM_AUTH_ENABLED: 'false',
  TELEBIRR_ENABLED: 'false',
} as const;

function issuePaths(result: ReturnType<typeof envSchema.safeParse>) {
  if (result.success) return [];
  return result.error.issues.map((issue) => issue.path.join('.'));
}

describe('environment validation', () => {
  it('allows the mock payment provider in a hosted staging runtime', () => {
    expect(envSchema.safeParse(hostedBase).success).toBe(true);
  });

  it('allows mock payments in local development', () => {
    expect(envSchema.safeParse({
      ...hostedBase,
      NODE_ENV: 'development',
      APP_ENV: 'local',
      DATABASE_URL: 'mongodb://localhost:27017/fpl',
      REDIS_URL: 'redis://localhost:6379',
      CORS_ORIGIN: 'http://localhost:5173',
      PAYMENT_WEBHOOK_SECRET: 'dev-webhook-secret',
      SUPPORT_CONTACT_EMAIL: 'support@example.com',
    }).success).toBe(true);
  });

  it('rejects the mock payment provider in real production', () => {
    const result = envSchema.safeParse({ ...hostedBase, APP_ENV: 'production' });
    expect(result.success).toBe(false);
    expect(issuePaths(result)).toContain('PAYMENT_PROVIDER');
  });

  it('rejects production Telebirr when merchant credentials are missing', () => {
    const result = envSchema.safeParse({
      ...hostedBase,
      APP_ENV: 'production',
      PAYMENT_PROVIDER: 'telebirr',
      TELEBIRR_ENABLED: 'true',
    });
    expect(result.success).toBe(false);
    expect(issuePaths(result)).toContain('TELEBIRR_FABRIC_APP_ID');
  });

  it('accepts production Telebirr when every merchant credential is present', () => {
    const result = envSchema.safeParse({
      ...hostedBase,
      APP_ENV: 'production',
      PAYMENT_PROVIDER: 'telebirr',
      TELEBIRR_ENABLED: 'true',
      TELEBIRR_FABRIC_APP_ID: 'fabric-app-id',
      TELEBIRR_APP_SECRET: 'merchant-app-secret',
      TELEBIRR_MERCHANT_APP_ID: 'merchant-app-id',
      TELEBIRR_MERCHANT_CODE: 'merchant-code',
      TELEBIRR_PRIVATE_KEY: 'private-key',
      TELEBIRR_PUBLIC_KEY: 'public-key',
    });
    expect(result.success).toBe(true);
  });
});
