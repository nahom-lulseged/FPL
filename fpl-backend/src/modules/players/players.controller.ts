import { Request, Response, NextFunction } from 'express';
import * as playersService from './players.service';
import type { ListPlayersQuery } from './players.validation';

export async function listPlayers(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const result = await playersService.listPlayers(
      res.locals.validatedQuery as ListPlayersQuery,
    );
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

export async function getPlayerById(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const result = await playersService.getPlayerById(req.params.id as string);
    if (!result) {
      res.status(404).json({ error: 'Player not found' });
      return;
    }
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}
