import { AlertType } from '@prisma/client';
import { prisma } from '../../src/config/db';
import { redis } from '../../src/config/redis';
import {
  __clearAlertCooldownForTests,
  sendAlert,
} from '../../src/modules/admin/system/alert.service';

describe('alert.service', () => {
  beforeEach(async () => {
    await prisma.alertConfig.deleteMany();
    await redis.del(`alert:sent:${AlertType.INGESTION_FAILURE}`);
    jest.restoreAllMocks();
  });

  afterAll(async () => {
    await prisma.alertConfig.deleteMany();
    await prisma.$disconnect();
    await redis.quit();
  });

  it('skips alert when config is disabled', async () => {
    const fetchMock = jest.spyOn(global, 'fetch');

    await prisma.alertConfig.create({
      data: {
        alertType: AlertType.INGESTION_FAILURE,
        webhookUrl: 'https://discord.com/api/webhooks/test',
        enabled: false,
      },
    });

    const sent = await sendAlert(AlertType.INGESTION_FAILURE, {
      title: 'Test',
      message: 'noop',
    });

    expect(sent).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('respects cooldown between duplicate alerts', async () => {
    const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
    } as Response);

    await prisma.alertConfig.create({
      data: {
        alertType: AlertType.INGESTION_FAILURE,
        webhookUrl: 'https://discord.com/api/webhooks/test',
        enabled: true,
      },
    });

    const first = await sendAlert(AlertType.INGESTION_FAILURE, {
      title: 'First',
      message: 'first alert',
    });
    const second = await sendAlert(AlertType.INGESTION_FAILURE, {
      title: 'Second',
      message: 'second alert',
    });

    expect(first).toBe(true);
    expect(second).toBe(false);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('sends again after cooldown cleared', async () => {
    const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
    } as Response);

    await prisma.alertConfig.create({
      data: {
        alertType: AlertType.INGESTION_FAILURE,
        webhookUrl: 'https://discord.com/api/webhooks/test',
        enabled: true,
      },
    });

    await sendAlert(AlertType.INGESTION_FAILURE, {
      title: 'First',
      message: 'first',
    });

    await __clearAlertCooldownForTests(AlertType.INGESTION_FAILURE);

    const sent = await sendAlert(AlertType.INGESTION_FAILURE, {
      title: 'Second',
      message: 'second',
    });

    expect(sent).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
