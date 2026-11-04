const PAYPAL_API_BASE =
  process.env.PAYPAL_API_BASE || 'https://api-m.sandbox.paypal.com';

export class PayPalClient {
  private clientId: string;
  private clientSecret: string;

  constructor() {
    this.clientId = process.env.PAYPAL_CLIENT_ID || '';
    this.clientSecret = process.env.PAYPAL_CLIENT_SECRET || '';
  }

  async getAccessToken(): Promise<string> {
    if (!this.clientId || !this.clientSecret) {
      throw new Error('Missing PayPal credentials in environment variables.');
    }

    const basicAuth = Buffer.from(
      `${this.clientId}:${this.clientSecret}`
    ).toString('base64');

    const res = await fetch(`${PAYPAL_API_BASE}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${basicAuth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`PayPal Auth failed (${res.status}): ${err}`);
    }

    const data = await res.json();
    return data.access_token;
  }

  async createOrder(
    amount: number,
    currency: string = 'USD',
    description: string = 'PayAgent Purchase Requisition'
  ) {
    const accessToken = await this.getAccessToken();
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    const res = await fetch(`${PAYPAL_API_BASE}/v2/checkout/orders`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        intent: 'CAPTURE',
        purchase_units: [
          {
            description,
            amount: {
              currency_code: currency,
              value: Number(amount).toFixed(2),
            },
          },
        ],
        application_context: {
          return_url: `${appUrl}/api/paypal/capture`,
          cancel_url: `${appUrl}/dashboard`,
          brand_name: 'PayAgent Copilot',
          user_action: 'PAY_NOW',
        },
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`PayPal createOrder failed (${res.status}): ${err}`);
    }

    return await res.json();
  }
}

export async function createPayPalOrder(
  amount: number,
  currency: string = 'USD',
  description: string = 'PayAgent Purchase Requisition'
) {
  const client = new PayPalClient();
  return await client.createOrder(amount, currency, description);
}
