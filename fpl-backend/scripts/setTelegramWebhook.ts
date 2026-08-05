import dotenv from 'dotenv';

dotenv.config();

async function main() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const publicApiUrl = process.env.PUBLIC_API_URL;
  const secretToken = process.env.TELEGRAM_WEBHOOK_SECRET;

  if (!token) throw new Error('TELEGRAM_BOT_TOKEN is required');
  if (!publicApiUrl) throw new Error('PUBLIC_API_URL is required');
  if (!secretToken) throw new Error('TELEGRAM_WEBHOOK_SECRET is required');

  const webhookUrl = `${publicApiUrl.replace(/\/$/, '')}/api/telegram/webhook`;
  const response = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      url: webhookUrl,
      secret_token: secretToken,
      allowed_updates: ['message', 'callback_query'],
    }),
  });

  const body = await response.json() as { ok?: boolean; description?: string };
  if (!response.ok || !body.ok) {
    throw new Error(body.description ?? `Telegram setWebhook failed with HTTP ${response.status}`);
  }

  console.log(`Telegram webhook configured for ${webhookUrl}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
