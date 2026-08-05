import { Request, Response, NextFunction } from 'express';
import * as fixturesService from './fixtures.service';
import type { ListFixturesQuery } from './fixtures.validation';

export async function listFixtures(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const result = await fixturesService.listFixtures(
      res.locals.validatedQuery as ListFixturesQuery,
    );
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

export async function getFixture(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    res.status(200).json(await fixturesService.getMatchCenterFixture(String(req.params.id)));
  } catch (err) {
    next(err);
  }
}
