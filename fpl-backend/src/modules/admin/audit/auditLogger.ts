import { Request, Response, NextFunction } from 'express';
import { AppError } from '../../../middleware/errorHandler';

interface CaptureAuditBeforeOptions<T> {
  paramKey?: string;
  loadBefore: (id: string) => Promise<T | null>;
}

export function captureAuditBefore<T>(options: CaptureAuditBeforeOptions<T>) {
  const paramKey = options.paramKey ?? 'id';

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const params = res.locals.validatedParams as Record<string, string> | undefined;
      const rawId = params?.[paramKey] ?? req.params[paramKey];
      const id = Array.isArray(rawId) ? rawId[0] : rawId;

      if (!id || typeof id !== 'string') {
        next(new AppError(400, 'Missing resource id for audit capture'));
        return;
      }

      const before = await options.loadBefore(id);

      if (before === null) {
        res.status(404).json({ error: 'Resource not found' });
        return;
      }

      req.auditBefore = before;
      next();
    } catch (err) {
      next(err);
    }
  };
}
