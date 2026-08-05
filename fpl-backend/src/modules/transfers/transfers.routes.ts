import { Router } from 'express';
import { validateQuery, validateRequest } from '../../middleware/validateRequest';
import * as transfersController from './transfers.controller';
import {
  listTransfersQuerySchema,
  processTransfersSchema,
} from './transfers.validation';

const router = Router({ mergeParams: true });

router.post('/', validateRequest(processTransfersSchema), transfersController.processTransfers);

router.get(
  '/',
  validateQuery(listTransfersQuerySchema),
  transfersController.getTransferHistory,
);

export default router;
