export class PayPalClient {
  private clientId: string;
  private clientSecret: string;
  private baseUrl: string;

  constructor() {
    this.clientId = process.env.PAYPAL_CLIENT_ID || '';
    this.clientSecret = process.env.PAYPAL_CLIENT_SECRET || '';
    this.baseUrl = process.env.PAYPAL_API_BASE || 'https://api-m.sandbox.paypal.com';
  }

  private async getAccessToken(): Promise<string> {
    const auth = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');
    const response = await fetch(`${this.baseUrl}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
      cache: 'no-store',
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`PayPal Auth Failed: ${err}`);
    }

    const data = await response.json();
    return data.access_token;
  }

  async createOrder(
    amount: number,
    currency = 'USD',
    description = 'Requisition Order',
    internalOrderId = ''
  ) {
    const token = await this.getAccessToken();
    const appBaseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    // Se concatena el orderId interno directamente en los parámetros de retorno
    const returnUrl = internalOrderId
      ? `${appBaseUrl}/api/paypal/capture?orderId=${internalOrderId}`
      : `${appBaseUrl}/api/paypal/capture`;

    const payload = {
      intent: 'CAPTURE',
      purchase_units: [
        {
          description: description.slice(0, 127),
          amount: {
            currency_code: currency,
            value: amount.toFixed(2),
          },
        },
      ],
      application_context: {
        brand_name: 'PayAgent Procurement',
        landing_page: 'LOGIN',
        user_action: 'PAY_NOW',
        return_url: returnUrl,
        cancel_url: `${appBaseUrl}/?canceled=true`,
      },
    };

    const response = await fetch(`${this.baseUrl}/v2/checkout/orders`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`PayPal Order Creation Failed: ${err}`);
    }

    return await response.json();
  }

  async captureOrder(orderId: string) {
    const token = await this.getAccessToken();
    const response = await fetch(`${this.baseUrl}/v2/checkout/orders/${orderId}/capture`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const err = await response.text();
      console.warn(`[PayPal Capture Warn]: ${err}`);
    }

    return response.ok ? await response.json() : null;
  }
}