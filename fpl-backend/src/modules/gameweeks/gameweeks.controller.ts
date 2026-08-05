import { Request, Response, NextFunction } from 'express';
import * as gameweeksService from './gameweeks.service';

export async function listGameweeks(
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const gameweeks = await gameweeksService.listGameweeks();
    res.status(200).json({ data: gameweeks });
  } catch (err) {
    next(err);
  }
}

export async function getCurrentGameweek(
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const gameweek = await gameweeksService.getCurrentGameweek();
    if (!gameweek) {
      res.status(404).json({ error: 'No current gameweek found' });
      return;
    }
    res.status(200).json(gameweek);
  } catch (err) {
    next(err);
  }
}

export async function getTransferWindow(
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const transferWindow = await gameweeksService.getTransferWindow();
    res.status(200).json(transferWindow);
  } catch (err) {
    next(err);
  }
}
