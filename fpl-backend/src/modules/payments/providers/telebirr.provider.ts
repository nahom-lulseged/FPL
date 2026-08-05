import { createSign, createVerify, randomBytes } from 'node:crypto';
import { env } from '../../../config/env';
import { AppError } from '../../../middleware/errorHandler';
import type {
  InitiateDepositInput,
  PaymentProvider,
  WebhookPayload,
} from './providerInterface';

type TelebirrRecord = Record<string, unknown>;

function requireConfiguration() {
  if (
    !env.TELEBIRR_ENABLED ||
    !env.TELEBIRR_FABRIC_APP_ID ||
    !env.TELEBIRR_APP_SECRET ||
    !env.TELEBIRR_MERCHANT_APP_ID ||
    !env.TELEBIRR_MERCHANT_CODE ||
    !env.TELEBIRR_PRIVATE_KEY
  ) {
    throw new AppError(503, 'Telebirr checkout is not configured');
  }
}

function normalizeKey(key: string) {
  return key.replace(/\\n/g, '\n');
}

function canonicalize(payload: TelebirrRecord) {
  return Object.entries(payload)
    .filter(([key, value]) => key !== 'sign' && key !== 'sign_type' && value !== undefined && value !== null)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}=${typeof value === 'object' ? JSON.stringify(value) : String(value)}`)
    .join('&');
}

function sign(payload: TelebirrRecord) {
  const signer = createSign('RSA-SHA256');
  signer.update(canonicalize(payload));
  signer.end();
  return signer.sign(normalizeKey(env.TELEBIRR_PRIVATE_KEY!), 'base64');
}

async function postJson<T>(path: string, body: TelebirrRecord, token?: string): Promise<T> {
  const response = await fetch(`${env.TELEBIRR_BASE_URL}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-APP-Key': env.TELEBIRR_FABRIC_APP_ID!,
      ...(token ? { Authorization: token } : {}),
    },
    body: JSON.stringify(body),
  });

  const result = (await response.json().catch(() => ({}))) as T & { message?: string };
  if (!response.ok) {
    throw new AppError(502, result.message ?? 'Telebirr service rejected the request');
  }
  return result;
}

function checkoutBaseUrl() {
  const base = new URL(env.TELEBIRR_BASE_URL);
  return `${base.protocol}//${base.host}/payment/web/paygate`;
}

function parseObject(value: unknown): TelebirrRecord {
  if (typeof value === 'string') {
    try {
      return JSON.parse(value) as TelebirrRecord;
    } catch {
      return {};
    }
  }
  return value && typeof value === 'object' ? (value as TelebirrRecord) : {};
}

export const telebirrProvider: PaymentProvider = {
  name: 'telebirr',

  async initiateDeposit(input: InitiateDepositInput) {
    requireConfiguration();

    const tokenResponse = await postJson<{ token?: string }>('/payment/v1/token', {
      appSecret: env.TELEBIRR_APP_SECRET,
    });
    if (!tokenResponse.token) {
      throw new AppError(502, 'Telebirr did not return an access token');
    }

    const timestamp = String(Math.floor(Date.now() / 1000));
    const nonce = randomBytes(16).toString('hex');
    const merchantOrderId = `FPL${input.depositId.replace(/[^a-zA-Z0-9]/g, '')}`.slice(0, 64);
    const bizContent = {
      notify_url: `${env.PUBLIC_API_URL.replace(/\/$/, '')}/api/payments/webhooks/telebirr`,
      redirect_url: `${env.FRONTEND_URL.replace(/\/$/, '')}/wallet?payment=return`,
      appid: env.TELEBIRR_MERCHANT_APP_ID,
      merch_code: env.TELEBIRR_MERCHANT_CODE,
      merch_order_id: merchantOrderId,
      trade_type: 'Checkout',
      title: 'Fantasy Premier League wallet deposit',
      total_amount: (input.amountMinor / 100).toFixed(2),
      trans_currency: 'ETB',
      timeout_express: '120m',
      business_type: 'BuyGoods',
      payee_identifier: env.TELEBIRR_MERCHANT_CODE,
      payee_identifier_type: '04',
      payee_type: '5000',
    };
    const request: TelebirrRecord = {
      timestamp,
      nonce_str: nonce,
      method: 'payment.preorder',
      version: '1.0',
      biz_content: bizContent,
    };
    request.sign = sign(request);
    request.sign_type = 'SHA256WithRSA';

    const order = await postJson<{ biz_content?: { prepay_id?: string }; prepay_id?: string }>(
      '/payment/v1/merchant/preOrder',
      request,
      tokenResponse.token,
    );
    const prepayId = order.biz_content?.prepay_id ?? order.prepay_id;
    if (!prepayId) {
      throw new AppError(502, 'Telebirr did not return a checkout reference');
    }

    const checkout: TelebirrRecord = {
      appid: env.TELEBIRR_MERCHANT_APP_ID,
      merch_code: env.TELEBIRR_MERCHANT_CODE,
      nonce_str: nonce,
      prepay_id: prepayId,
      timestamp,
      trade_type: 'Checkout',
      version: '1.0',
    };
    checkout.sign = sign(checkout);
    checkout.sign_type = 'SHA256WithRSA';
    const params = new URLSearchParams(
      Object.fromEntries(Object.entries(checkout).map(([key, value]) => [key, String(value)])),
    );

    return {
      redirectUrl: `${checkoutBaseUrl()}?${params.toString()}`,
      providerRef: merchantOrderId,
    };
  },

  async initiatePayout() {
    throw new AppError(
      503,
      'Automated Telebirr payouts are disabled; withdrawals require administrator fulfillment',
    );
  },

  verifyWebhook(payload: WebhookPayload) {
    if (!env.TELEBIRR_PUBLIC_KEY || !payload.signature) return false;
    try {
      const body = JSON.parse(payload.rawBody) as TelebirrRecord;
      const verifier = createVerify('RSA-SHA256');
      verifier.update(canonicalize(body));
      verifier.end();
      return verifier.verify(normalizeKey(env.TELEBIRR_PUBLIC_KEY), payload.signature, 'base64');
    } catch {
      return false;
    }
  },

  parseWebhook(rawBody: string) {
    const body = JSON.parse(rawBody) as TelebirrRecord;
    const business = parseObject(body.biz_content);
    const providerRef = String(
      business.merch_order_id ?? body.merch_order_id ?? business.payment_order_id ?? '',
    );
    const amount = Number(business.total_amount ?? body.total_amount ?? 0);
    const state = String(
      business.trade_status ?? business.order_status ?? body.trade_status ?? body.order_status ?? '',
    ).toUpperCase();
    if (!providerRef || !Number.isFinite(amount)) {
      throw new AppError(400, 'Invalid Telebirr notification payload');
    }
    return {
      providerRef,
      amountMinor: Math.round(amount * 100),
      status: ['SUCCESS', 'COMPLETED', 'PAY_SUCCESS', 'TRADE_SUCCESS'].includes(state)
        ? ('COMPLETED' as const)
        : ('FAILED' as const),
    };
  },
};
