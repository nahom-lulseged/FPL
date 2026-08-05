import { Request, Response, NextFunction } from 'express';
import { Role } from '@prisma/client';
import { prisma } from '../config/db';
import { authGuard } from './authGuard';

export function adminGuard(req: Request, res: Response, next: NextFunction): void {
  authGuard(req, res, () => {
    void (async () => {
      try {
        const user = await prisma.user.findUnique({
          where: { id: req.user!.userId },
          select: { role: true },
        });

        if (!user || user.role !== Role.ADMIN) {
          res.status(403).json({ error: 'Forbidden' });
          return;
        }

        next();
      } catch (err) {
        next(err);
      }
    })();
  });
}
