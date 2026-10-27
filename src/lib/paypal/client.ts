interface PayPalAccessTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

interface CreateOrderParams {
  referenceId: string;
  amount: number;
  currency?: string;
  description?: string;
}

interface PayPalOrderResponse {
  id: string;
  status: string;
  links: Array<{
    href: string;
    rel: string;
    method: string;
  }>;
}

class PayPalClient {
  private baseUrl: string;
  private clientId: string;
  private clientSecret: string;
  private cachedToken: string | null = null;
  private tokenExpiry: number = 0;

  constructor() {
    this.baseUrl = process.env.PAYPAL_API_BASE || 'https://api-m.sandbox.paypal.com';
    this.clientId = process.env.PAYPAL_CLIENT_ID || '';
    this.clientSecret = process.env.PAYPAL_CLIENT_SECRET || '';
  }

  private async getAccessToken(): Promise<string> {
    const now = Date.now();
    if (this.cachedToken && this.tokenExpiry > now + 60000) {
      return this.cachedToken;
    }

    if (!this.clientId || !this.clientSecret) {
      throw new Error('PayPal Client ID or Secret is missing in environment variables.');
    }

    const auth = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');

    const res = await fetch(`${this.baseUrl}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Failed to retrieve PayPal access token: ${err}`);
    }

    const data: PayPalAccessTokenResponse = await res.json();
    this.cachedToken = data.access_token;
    this.tokenExpiry = now + data.expires_in * 1000;

    return this.cachedToken;
  }

  async createOrder({ referenceId, amount, currency = 'USD', description }: CreateOrderParams): Promise<PayPalOrderResponse> {
    const token = await this.getAccessToken();

    const payload = {
      intent: 'CAPTURE',
      purchase_units: [
        {
          reference_id: referenceId,
          description: description || 'Autonomous Corporate Procurement Order',
          amount: {
            currency_code: currency,
            value: amount.toFixed(2),
          },
        },
      ],
      application_context: {
        return_url: 'http://localhost:3000/api/paypal/capture',
        cancel_url: 'http://localhost:3000/api/paypal/cancel',
        user_action: 'PAY_NOW',
      },
    };

    const res = await fetch(`${this.baseUrl}/v2/checkout/orders`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`PayPal Order Creation failed: ${err}`);
    }

    return await res.json();
  }

  async getOrderDetails(orderId: string): Promise<Record<string, unknown>> {
    const token = await this.getAccessToken();

    const res = await fetch(`${this.baseUrl}/v2/checkout/orders/${orderId}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Failed to fetch PayPal Order ${orderId}: ${err}`);
    }

    return await res.json();
  }
}

export const payPalClient = new PayPalClient();