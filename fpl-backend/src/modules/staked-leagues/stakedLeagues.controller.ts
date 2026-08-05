import type { Request, Response, NextFunction } from 'express';
import * as stakedLeaguesService from './stakedLeagues.service';

export async function listPublicStakedLeagues(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const query = res.locals.validatedQuery as {
      page: number;
      limit: number;
      season?: string;
    };
    const result = await stakedLeaguesService.listPublicStakedLeagues(query);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

export async function joinPublicStakedLeague(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const { id } = res.locals.validatedParams as { id: string };
    const result = await stakedLeaguesService.joinPublicStakedLeague(req.user!.userId, id);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}
