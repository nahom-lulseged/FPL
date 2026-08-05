import type { NextFunction, Request, Response } from 'express';
import * as fplCatalogService from './fplCatalog.service';
import type { FplFixturesQuery, FplPlayersQuery } from './fplCatalog.validation';

export async function overview(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    res.status(200).json(await fplCatalogService.getOverview());
  } catch (error) {
    next(error);
  }
}

export async function teams(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    res.status(200).json(await fplCatalogService.listTeams());
  } catch (error) {
    next(error);
  }
}

export async function gameweeks(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    res.status(200).json(await fplCatalogService.listGameweeks());
  } catch (error) {
    next(error);
  }
}

export async function players(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    res.status(200).json(
      await fplCatalogService.listPlayers(res.locals.validatedQuery as FplPlayersQuery),
    );
  } catch (error) {
    next(error);
  }
}

export async function fixtures(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    res.status(200).json(
      await fplCatalogService.listFixtures(res.locals.validatedQuery as FplFixturesQuery),
    );
  } catch (error) {
    next(error);
  }
}

export async function playerSummary(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    res.status(200).json(
      await fplCatalogService.getPlayerSummary(res.locals.validatedParams.id as number),
    );
  } catch (error) {
    next(error);
  }
}

export async function bootstrap(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    res.status(200).json(await fplCatalogService.getBootstrapDataset());
  } catch (error) {
    next(error);
  }
}
