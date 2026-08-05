import { Request, Response, NextFunction } from 'express';
import * as teamsService from './teams.service';
import type { CreateTeamInput, GetMyTeamQuery, GetTeamQuery, SetCaptainInput, SetLineupInput, TeamHistoryQuery } from './teams.validation';

function teamIdParam(req: Request): string {
  return String(req.params.id);
}

export async function createTeam(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const result = await teamsService.createTeam(
      req.user!.userId,
      req.body as CreateTeamInput,
    );
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
}

export async function getTeam(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const result = await teamsService.getTeam(
      teamIdParam(req),
      res.locals.validatedQuery as GetTeamQuery,
    );
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

export async function setCaptain(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const result = await teamsService.setCaptain(
      req.user!.userId,
      teamIdParam(req),
      req.body as SetCaptainInput,
    );
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

export async function setLineup(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const result = await teamsService.setLineup(
      req.user!.userId,
      teamIdParam(req),
      req.body as SetLineupInput,
    );
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

export async function getTeamGameweek(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const gw = Number(req.params.gw);
    const result = await teamsService.getTeamGameweekBreakdown(teamIdParam(req), gw);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

export async function getTeamHistory(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const result = await teamsService.getTeamHistory(
      teamIdParam(req),
      res.locals.validatedQuery as TeamHistoryQuery,
    );
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

export async function getMyTeam(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const result = await teamsService.getMyTeam(
      req.user!.userId,
      res.locals.validatedQuery as GetMyTeamQuery,
    );
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}
