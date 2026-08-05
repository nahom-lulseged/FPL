import { Request, Response, NextFunction } from 'express';
import * as realTeamsService from './realTeams.service';

export async function listRealTeams(
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const result = await realTeamsService.listRealTeams();
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}
