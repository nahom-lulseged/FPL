import { Request, Response, NextFunction } from 'express';
import * as leaguesService from './leagues.service';
import type {
  CreateLeagueInput,
  JoinLeagueInput,
  ListLeaguesQuery,
  StandingsQuery,
} from './leagues.validation';

function leagueIdParam(req: Request): string {
  return String(req.params.id);
}

export async function createLeague(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const result = await leaguesService.createLeague(
      req.user!.userId,
      req.body as CreateLeagueInput,
    );
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
}

export async function joinLeague(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const result = await leaguesService.joinLeague(
      req.user!.userId,
      req.body as JoinLeagueInput,
    );
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
}

export async function listMyLeagues(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const result = await leaguesService.listMyLeagues(
      req.user!.userId,
      res.locals.validatedQuery as ListLeaguesQuery,
    );
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

export async function getLeague(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const result = await leaguesService.getLeague(req.user!.userId, leagueIdParam(req));
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

export async function getStandings(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const result = await leaguesService.getStandings(
      req.user!.userId,
      leagueIdParam(req),
      res.locals.validatedQuery as StandingsQuery,
    );
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}
