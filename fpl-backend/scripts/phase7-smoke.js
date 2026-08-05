const base = 'http://localhost:3000';
const accessToken = process.env.ADMIN_ACCESS_TOKEN;

async function req(path, opts = {}) {
  const res = await fetch(base + path, opts);
  const text = await res.text();
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    body = text.slice(0, 300);
  }
  return { status: res.status, body, headers: res.headers, text };
}

async function main() {
  if (!accessToken) throw new Error('ADMIN_ACCESS_TOKEN is required');
  const auth = { Authorization: `Bearer ${accessToken}` };

  const health = await req('/api/admin/system/health', { headers: auth });
  console.log('Health status:', health.status);
  console.log('DB latency:', health.body.db?.latencyMs, 'ms');
  console.log('Redis latency:', health.body.redis?.latencyMs, 'ms');
  console.log('Queue count:', health.body.queues?.length);

  const session = await fetch(`${base}/api/admin/system/queues/session`, {
    method: 'POST',
    headers: auth,
  });
  const cookie = session.headers.get('set-cookie');
  console.log('Session:', session.status, cookie ? 'cookie set' : 'no cookie');

  const board = await req('/admin/queues', {
    headers: { Cookie: cookie?.split(';')[0] ?? '' },
  });
  console.log(
    'Bull board with cookie:',
    board.status,
    typeof board.body === 'string' ? 'HTML loaded' : board.body?.error,
  );

  const wh = await fetch('https://webhook.site/token', { method: 'POST' });
  const whData = await wh.json();
  const webhookUrl = `https://webhook.site/${whData.uuid}`;
  console.log('Webhook URL:', webhookUrl);

  await req('/api/admin/system/alerts', {
    method: 'PUT',
    headers: { ...auth, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      configs: [{ alertType: 'INGESTION_FAILURE', webhookUrl, enabled: true }],
    }),
  });

  const test = await req('/api/admin/system/alerts/test', { method: 'POST', headers: auth });
  console.log('Test alert response:', test.body);

  await new Promise((r) => setTimeout(r, 2000));
  const requests = await fetch(
    `https://webhook.site/token/${whData.uuid}/requests?sorting=newest`,
  );
  const reqData = await requests.json();
  console.log('Webhook received requests:', reqData.data?.length ?? 0);
  if (reqData.data?.[0]) {
    console.log('Latest payload preview:', (reqData.data[0].content || '').slice(0, 150));
  }
}

main()
  .catch(console.error)
  .finally(() => undefined);
