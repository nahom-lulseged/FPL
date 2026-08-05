import { logger } from './lib/logger';
import { registerWorkers, scheduleRepeatableJobs, shutdownQueues } from './jobs/queue';
async function main() {
  registerWorkers(); await scheduleRepeatableJobs(); logger.info('BullMQ worker started');
  const shutdown = async () => { await shutdownQueues(); process.exit(0); };
  process.on('SIGTERM', () => void shutdown()); process.on('SIGINT', () => void shutdown());
}
void main().catch((error) => { logger.error({ error }, 'Worker failed'); process.exit(1); });
