import { Request, Response, NextFunction } from 'express';
import * as transfersService from './transfers.service';
import type { ListTransfersQuery, ProcessTransfersInput } from './transfers.validation';

function teamIdParam(req: Request): string {
  return String(req.params.id);
}

export async function processTransfers(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const result = await transfersService.processTransfers(
      req.user!.userId,
      teamIdParam(req),
      req.body as ProcessTransfersInput,
    );
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
}

export async function getTransferHistory(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const result = await transfersService.getTransferHistory(
      teamIdParam(req),
      res.locals.validatedQuery as ListTransfersQuery,
    );
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}
