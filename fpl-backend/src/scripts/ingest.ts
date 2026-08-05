import dotenv from 'dotenv';
import { syncAll } from '../modules/ingestion/ingestion.service';
import { logger } from '../lib/logger';

dotenv.config();

syncAll()
  .then((result) => {
    logger.info(result, 'Ingestion completed');
    process.exit(0);
  })
  .catch((err) => {
    logger.error({ err }, 'Ingestion failed');
    process.exit(1);
  });
