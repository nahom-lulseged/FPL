process.env.NODE_ENV = 'test';

import { existsSync, readFileSync } from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: path.join(__dirname, '..', '.env.deploy.local'), override: false });
dotenv.config({ override: false });

const testEnvFile = path.join(__dirname, '.test-env.json');

if (existsSync(testEnvFile)) {
  const testEnv = JSON.parse(readFileSync(testEnvFile, 'utf-8')) as {
    databaseUrl: string;
    redisUrl: string;
  };

  process.env.DATABASE_URL = testEnv.databaseUrl;
  process.env.REDIS_URL = testEnv.redisUrl;
}

process.env.SUPABASE_URL = process.env.SUPABASE_URL ?? 'https://bdxgtxevzffcvlcdfcmg.supabase.co';
process.env.SUPABASE_PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY ?? 'test-publishable-key';
process.env.SUPABASE_SECRET_KEY = process.env.SUPABASE_SECRET_KEY ?? 'test-secret-key';
process.env.ENABLE_INGESTION_CRON = 'false';
process.env.ENABLE_SCORING_CRON = 'false';
process.env.ENABLE_BULLMQ = 'false';
process.env.ENABLE_SOCKET_IO = 'false';
