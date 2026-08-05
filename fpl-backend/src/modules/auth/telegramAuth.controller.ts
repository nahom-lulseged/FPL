import type { NextFunction, Request, Response } from 'express';
import { z } from 'zod';
import * as telegramAuth from './telegramAuth.service';

const COOKIE_BASE = { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax' as const, path: '/' };
const startSchema = z.object({ initData: z.string().min(1).max(16_384) });

function setCookies(res: Response, tokens: { accessToken: string; refreshToken: string }) {
  res.cookie('access_token', tokens.accessToken, { ...COOKIE_BASE, maxAge: 15 * 60 * 1000 });
  res.cookie('refresh_token', tokens.refreshToken, { ...COOKIE_BASE, maxAge: 7 * 24 * 60 * 60 * 1000 });
}

export async function start(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await telegramAuth.startTelegramAuthentication(startSchema.parse(req.body).initData);
    if (result.status === 'authenticated') setCookies(res, result);
    res.status(200).json(result);
  } catch (error) { next(error); }
}
