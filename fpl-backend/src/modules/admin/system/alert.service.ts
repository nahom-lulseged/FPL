import { AlertType } from '@prisma/client';
import { env } from '../../../config/env';
import { redis } from '../../../config/redis';
import { prisma } from '../../../config/db';
import { countRecentErrors, logger } from '../../../lib/logger';
import { getQueueDepths } from '../../../jobs/queue';

export interface AlertPayload {
  title: string;
  message: string;
  meta?: Record<string, unknown>;
}

const ALL_ALERT_TYPES: AlertType[] = [
  AlertType.INGESTION_FAILURE,
  AlertType.QUEUE_BACKUP,
  AlertType.HIGH_ERROR_RATE,
  AlertType.LEDGER_MISMATCH,
];

function formatWebhookMessage(type: AlertType, payload: AlertPayload): string {
  const lines = [
    `**[FPL Admin Alert] ${payload.title}**`,
    `Type: ${type}`,
    payload.message,
  ];

  if (payload.meta && Object.keys(payload.meta).length > 0) {
    lines.push('', 'Details:', '```json', JSON.stringify(payload.meta, null, 2), '```');
  }

  return lines.join('\n');
}

async function isInCooldown(type: AlertType): Promise<boolean> {
  const key = `alert:sent:${type}`;
  const exists = await redis.exists(key);
  return exists === 1;
}

async function setCooldown(type: AlertType): Promise<void> {
  const key = `alert:sent:${type}`;
  await redis.set(key, '1', 'EX', env.ALERT_COOLDOWN_SECONDS);
}

export async function sendAlert(type: AlertType, payload: AlertPayload): Promise<boolean> {
  const config = await prisma.alertConfig.findUnique({ where: { alertType: type } });

  if (!config?.enabled || !config.webhookUrl) {
    return false;
  }

  if (await isInCooldown(type)) {
    logger.info({ alertType: type }, 'Alert skipped due to cooldown');
    return false;
  }

  const body = JSON.stringify({
    content: formatWebhookMessage(type, payload),
  });

  try {
    const response = await fetch(config.webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
    });

    if (!response.ok) {
      logger.warn(
        { alertType: type, status: response.status },
        'Alert webhook returned non-OK status',
      );
      return false;
    }

    await setCooldown(type);
    logger.info({ alertType: type }, 'Alert sent successfully');
    return true;
  } catch (err) {
    logger.error({ err, alertType: type }, 'Failed to send alert webhook');
    return false;
  }
}

export async function notifyIngestionFailure(message: string): Promise<void> {
  await sendAlert(AlertType.INGESTION_FAILURE, {
    title: 'Ingestion Failure',
    message,
  });
}

export async function notifyLedgerMismatch(
  mismatches: Array<{ walletId: string; cachedBalanceMinor: number; computedBalanceMinor: number }>,
): Promise<void> {
  await sendAlert(AlertType.LEDGER_MISMATCH, {
    title: 'Ledger Reconciliation Mismatch',
    message: `${mismatches.length} wallet(s) have balance mismatches — P0 incident`,
    meta: { mismatches },
  });
}

export async function checkQueueBackupAlerts(): Promise<void> {
  const depths = await getQueueDepths();
  const threshold = env.ALERT_QUEUE_FAILED_THRESHOLD;

  for (const queue of depths) {
    if (queue.failed >= threshold) {
      await sendAlert(AlertType.QUEUE_BACKUP, {
        title: 'Queue Backup Detected',
        message: `Queue "${queue.name}" has ${queue.failed} failed jobs (threshold: ${threshold})`,
        meta: { ...queue },
      });
    }
  }
}

export async function checkHighErrorRate(): Promise<void> {
  const windowMinutes = env.ALERT_ERROR_RATE_WINDOW_MINUTES;
  const threshold = env.ALERT_ERROR_RATE_THRESHOLD;
  const errorCount = countRecentErrors(windowMinutes);

  if (errorCount >= threshold) {
    await sendAlert(AlertType.HIGH_ERROR_RATE, {
      title: 'High Error Rate',
      message: `${errorCount} errors in the last ${windowMinutes} minutes (threshold: ${threshold})`,
      meta: { errorCount, windowMinutes, threshold },
    });
  }
}

export async function getAlertConfigs() {
  const existing = await prisma.alertConfig.findMany();
  const byType = new Map(existing.map((c) => [c.alertType, c]));

  return ALL_ALERT_TYPES.map((alertType) => {
    const config = byType.get(alertType);
    return {
      alertType,
      webhookUrl: config?.webhookUrl ?? '',
      enabled: config?.enabled ?? false,
    };
  });
}

export async function updateAlertConfigs(
  configs: Array<{ alertType: AlertType; webhookUrl: string; enabled: boolean }>,
) {
  for (const config of configs) {
    await prisma.alertConfig.upsert({
      where: { alertType: config.alertType },
      create: {
        alertType: config.alertType,
        webhookUrl: config.webhookUrl,
        enabled: config.enabled,
      },
      update: {
        webhookUrl: config.webhookUrl,
        enabled: config.enabled,
      },
    });
  }

  return getAlertConfigs();
}

export async function __clearAlertCooldownForTests(type: AlertType): Promise<void> {
  await redis.del(`alert:sent:${type}`);
}
