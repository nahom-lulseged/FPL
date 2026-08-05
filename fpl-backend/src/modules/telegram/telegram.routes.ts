import { Router } from 'express';
import { env } from '../../config/env';
import { AppError } from '../../middleware/errorHandler';
import { createTelegramBot } from './telegram.bot';

const router = Router();
const bot = env.TELEGRAM_AUTH_ENABLED ? createTelegramBot() : null;

router.post('/webhook', async (req, res, next) => {
  try {
    if (!env.TELEGRAM_WEBHOOK_SECRET || req.header('x-telegram-bot-api-secret-token') !== env.TELEGRAM_WEBHOOK_SECRET) {
      throw new AppError(401, 'Invalid Telegram webhook secret');
    }
    if (!bot) throw new AppError(503, 'Telegram authentication is not enabled');
    await bot.handleUpdate(req.body);
    res.status(200).json({ ok: true });
  } catch (error) {
    next(error);
  }
});

export default router;
