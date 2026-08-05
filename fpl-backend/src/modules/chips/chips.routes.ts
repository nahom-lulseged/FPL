import { Router } from 'express';
import { validateRequest } from '../../middleware/validateRequest';
import * as chipsController from './chips.controller';
import { playWildcardSchema } from './chips.validation';

const router = Router({ mergeParams: true });

router.get('/', chipsController.getChipStatus);

router.post(
  '/wildcard',
  validateRequest(playWildcardSchema),
  chipsController.playWildcard,
);

router.post('/free-hit', chipsController.playFreeHit);
router.post('/bench-boost', chipsController.playBenchBoost);
router.post('/triple-captain', chipsController.playTripleCaptain);
router.delete('/:chipType', chipsController.cancelChip);

export default router;
