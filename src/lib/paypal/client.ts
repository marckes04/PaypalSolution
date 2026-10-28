interface CreateOrderParams {
  referenceId: string;
  amount: number;
  currency?: string;
  description: string;
}

interface PayPalLink {
  href: string;
  rel: string;
  method: string;
}

interface PayPalOrderResponse {
  id: string;
  status: string;
  links: PayPalLink[];
}

export class PayPalClient {
  private clientId: string;
  private clientSecret: string;
  public baseUrl: string;

  constructor() {
    this.clientId = process.env.PAYPAL_CLIENT_ID || '';
    this.clientSecret = process.env.PAYPAL_CLIENT_SECRET || '';
    this.baseUrl = process.env.PAYPAL_API_BASE_URL || 'https://api-m.sandbox.paypal.com';
  }

  async getAccessToken(): Promise<string> {
    const auth = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');

    const res = await fetch(`${this.baseUrl}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${auth}`,
      },
      body: 'grant_type=client_credentials',
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Failed to authenticate with PayPal: ${err}`);
    }

    const data = await res.json();
    return data.access_token;
  }

  async createOrder(params: CreateOrderParams): Promise<PayPalOrderResponse> {
    const token = await this.getAccessToken();

    const payload = {
      intent: 'CAPTURE',
      purchase_units: [
        {
          reference_id: params.referenceId,
          description: params.description,
          amount: {
            currency_code: params.currency || 'USD',
            value: params.amount.toFixed(2),
          },
        },
      ],
      application_context: {
        brand_name: 'PayAgent Corporate Copilot',
        user_action: 'PAY_NOW',
        return_url: 'http://localhost:3000/approval-success',
        cancel_url: 'http://localhost:3000/',
      },
    };

    const res = await fetch(`${this.baseUrl}/v2/checkout/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Failed to create PayPal order: ${err}`);
    }

    return await res.json();
  }

  async captureOrder(orderId: string): Promise<any> {
    const token = await this.getAccessToken();

    const res = await fetch(`${this.baseUrl}/v2/checkout/orders/${orderId}/capture`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Failed to capture PayPal order: ${err}`);
    }

    return await res.json();
  }
}

export const payPalClient = new PayPalClient();