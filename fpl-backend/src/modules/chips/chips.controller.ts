import { Request, Response, NextFunction } from 'express';
import { AppError } from '../../middleware/errorHandler';
import * as chipsService from './chips.service';
import type { PlayWildcardInput } from './chips.validation';

function teamIdParam(req: Request): string {
  return String(req.params.id);
}

async function handlePlay(
  req: Request,
  res: Response,
  next: NextFunction,
  chipType: 'wildcard' | 'free-hit' | 'bench-boost' | 'triple-captain',
): Promise<void> {
  try {
    const result = await chipsService.playChip(
      req.user!.userId,
      teamIdParam(req),
      chipType,
      req.body as PlayWildcardInput | undefined,
    );
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
}

export async function playWildcard(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  await handlePlay(req, res, next, 'wildcard');
}

export async function playFreeHit(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  await handlePlay(req, res, next, 'free-hit');
}

export async function playBenchBoost(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  await handlePlay(req, res, next, 'bench-boost');
}

export async function playTripleCaptain(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  await handlePlay(req, res, next, 'triple-captain');
}

export async function getChipStatus(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const result = await chipsService.getChipStatus(teamIdParam(req));
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

export async function cancelChip(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const chipType = String(req.params.chipType);
    if (chipType !== 'bench-boost' && chipType !== 'triple-captain') {
      throw new AppError(400, 'Only Bench Boost and Triple Captain can be cancelled');
    }
    const result = await chipsService.cancelChip(
      req.user!.userId,
      teamIdParam(req),
      chipType,
    );
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}
