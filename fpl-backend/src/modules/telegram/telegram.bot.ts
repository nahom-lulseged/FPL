import { Bot, InlineKeyboard, Keyboard, type Context } from 'grammy';
import { env } from '../../config/env';
import {
  chooseExistingTelegramAccount,
  chooseNewTelegramAccount,
  getTelegramStartState,
  handleTelegramContactShare,
  type ContactOnboardingResult,
  type TelegramUser,
} from '../auth/telegramAuth.service';

const NEW_ACCOUNT_CALLBACK = 'telegram_onboarding:new';
const EXISTING_ACCOUNT_CALLBACK = 'telegram_onboarding:existing';

function toTelegramUser(ctx: Context): TelegramUser | null {
  const from = ctx.from;
  if (!from) return null;
  return {
    id: from.id,
    first_name: from.first_name,
    last_name: from.last_name,
    username: from.username,
    language_code: from.language_code,
  };
}

function miniAppKeyboard(): InlineKeyboard {
  return new InlineKeyboard().webApp('Open Fantasy Ethiopia', env.FRONTEND_URL);
}

function accountChoiceKeyboard(): InlineKeyboard {
  return new InlineKeyboard()
    .text('New user', NEW_ACCOUNT_CALLBACK)
    .text('I already have an account', EXISTING_ACCOUNT_CALLBACK);
}

function contactKeyboard(): Keyboard {
  return new Keyboard().requestContact('Share my phone number').resized().oneTime();
}

async function replyForOnboardingResult(ctx: Context, result: ContactOnboardingResult): Promise<void> {
  if (result.status === 'ready') {
    await ctx.reply('You are all set. Open the Mini App to continue.', {
      reply_markup: miniAppKeyboard(),
    });
    return;
  }

  if (result.status === 'choose_account_type') {
    await ctx.reply('Is this your first Fantasy Ethiopia account?', {
      reply_markup: accountChoiceKeyboard(),
    });
    return;
  }

  await ctx.reply('Thanks. Support needs to review this account link before the Mini App can sign you in. We will keep your existing team safe.');
}

export function createTelegramBot(): Bot {
  if (!env.TELEGRAM_AUTH_ENABLED || !env.TELEGRAM_BOT_TOKEN) {
    throw new Error('Telegram authentication is not configured');
  }

  const bot = new Bot(env.TELEGRAM_BOT_TOKEN);

  bot.command('start', async (ctx) => {
    const user = toTelegramUser(ctx);
    if (!user) return;
    const state = await getTelegramStartState(user);
    if (state.status !== 'contact_required') {
      await replyForOnboardingResult(ctx, state);
      return;
    }
    await ctx.reply(
      `Welcome to Fantasy Ethiopia. To create or recover your account, share the phone number attached to your Telegram account. By sharing it you accept: ${env.TERMS_URL}`,
      { reply_markup: contactKeyboard() },
    );
  });

  bot.on('message:contact', async (ctx) => {
    const user = toTelegramUser(ctx);
    const contact = ctx.message.contact;
    if (!user) return;
    if (contact.user_id === undefined) {
      await ctx.reply('Please share your own Telegram contact using the button.');
      return;
    }
    const result = await handleTelegramContactShare(user, contact.user_id, contact.phone_number);
    await replyForOnboardingResult(ctx, result);
  });

  bot.callbackQuery(NEW_ACCOUNT_CALLBACK, async (ctx) => {
    const user = toTelegramUser(ctx);
    if (!user) return;
    await ctx.answerCallbackQuery();
    const result = await chooseNewTelegramAccount(user);
    await replyForOnboardingResult(ctx, result);
  });

  bot.callbackQuery(EXISTING_ACCOUNT_CALLBACK, async (ctx) => {
    const user = toTelegramUser(ctx);
    if (!user) return;
    await ctx.answerCallbackQuery();
    const result = await chooseExistingTelegramAccount(user);
    await replyForOnboardingResult(ctx, result);
  });

  bot.catch(async (err) => {
    await err.ctx.reply('Something went wrong. Please try again, or contact support if it keeps happening.').catch(() => undefined);
  });

  return bot;
}
