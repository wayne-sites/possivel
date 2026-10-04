import { getMercadoPagoEventId, validateMercadoPagoWebhookSignature } from './webhook-signature.ts';
import { PRO_MONTHLY_PRICE_BRL } from './plans.ts';

export type CheckoutInput = { userId: string; email?: string; plan: 'pro' };
export type CheckoutResult = { checkoutUrl: string; providerSubscriptionId: string };
export type SubscriptionData = {
  id: string;
  status: string;
  external_reference?: string;
  next_payment_date?: string;
  date_created?: string;
};
export type WebhookEvent = { id: string; type: string; providerSubscriptionId?: string; status?: string; payload: unknown };

export interface PaymentProvider {
  createCheckoutSession(input: CheckoutInput): Promise<CheckoutResult>;
  cancelSubscription(subscriptionId: string): Promise<void>;
  getSubscription(subscriptionId: string): Promise<SubscriptionData>;
  validateWebhook(request: Request): Promise<WebhookEvent>;
}

function env(name: string) {
  return (globalThis as unknown as { Deno?: { env: { get: (key: string) => string | undefined } } }).Deno?.env.get(name);
}

export class MercadoPagoProvider implements PaymentProvider {
  private base = 'https://api.mercadopago.com';

  private token() {
    const token = env('MERCADO_PAGO_ACCESS_TOKEN');
    if (!token) throw new Error('MERCADO_PAGO_ACCESS_TOKEN não configurado');
    return token;
  }

  async createCheckoutSession(input: CheckoutInput) {
    const appUrl = env('APP_URL') ?? 'https://possivel2026.github.io/possivel/';
    const res = await fetch(`${this.base}/preapproval`, {
      method: 'POST',
      headers: { authorization: `Bearer ${this.token()}`, 'content-type': 'application/json' },
      body: JSON.stringify({
        reason: 'Possível Pro',
        external_reference: input.userId,
        payer_email: input.email,
        auto_recurring: {
          frequency: 1,
          frequency_type: 'months',
          transaction_amount: PRO_MONTHLY_PRICE_BRL,
          currency_id: 'BRL',
        },
        back_url: appUrl,
        status: 'pending',
      }),
    });

    if (!res.ok) {
      console.error('mercadopago preapproval:', res.status, await res.text());
      throw new Error('O Mercado Pago não conseguiu iniciar a assinatura.');
    }

    const data = await res.json();
    const checkoutUrl = data.init_point ?? data.sandbox_init_point;
    const providerSubscriptionId = data.id;
    if (!checkoutUrl || !providerSubscriptionId) throw new Error('O provedor não retornou os dados da assinatura.');
    return { checkoutUrl: String(checkoutUrl), providerSubscriptionId: String(providerSubscriptionId) };
  }

  async cancelSubscription(id: string) {
    const res = await fetch(`${this.base}/preapproval/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: { authorization: `Bearer ${this.token()}`, 'content-type': 'application/json' },
      body: JSON.stringify({ status: 'cancelled' }),
    });

    if (!res.ok) {
      console.error('mercadopago cancel:', res.status, await res.text());
      throw new Error('Não foi possível cancelar a assinatura no provedor.');
    }
  }

  async getSubscription(id: string) {
    const res = await fetch(`${this.base}/preapproval/${encodeURIComponent(id)}`, {
      headers: { authorization: `Bearer ${this.token()}` },
    });
    if (!res.ok) {
      console.error('mercadopago subscription:', res.status, await res.text());
      throw new Error('Não foi possível consultar a assinatura no provedor.');
    }
    const data = await res.json();
    return {
      id: String(data.id),
      status: String(data.status),
      external_reference: data.external_reference ? String(data.external_reference) : undefined,
      next_payment_date: data.next_payment_date ? String(data.next_payment_date) : undefined,
      date_created: data.date_created ? String(data.date_created) : undefined,
    };
  }

  async validateWebhook(request: Request) {
    const eventId = getMercadoPagoEventId(request.url);

    await validateMercadoPagoWebhookSignature({
      signature: request.headers.get('x-signature'),
      requestId: request.headers.get('x-request-id'),
      eventId,
      secret: env('MERCADO_PAGO_WEBHOOK_SECRET'),
    });

    const payload = await request.json();
    const id = String((payload as { id?: unknown }).id ?? eventId);
    const type = String((payload as { type?: unknown; action?: unknown }).type ?? (payload as { action?: unknown }).action ?? 'unknown');
    const providerSubscriptionId = (payload as { data?: { id?: unknown }; id?: unknown }).data?.id ?? (payload as { id?: unknown }).id;
    let status: string | undefined;

    if (providerSubscriptionId) {
      const sub = await this.getSubscription(String(providerSubscriptionId));
      status = sub.status;
    }

    return { id, type, providerSubscriptionId: String(providerSubscriptionId ?? ''), status, payload };
  }
}
