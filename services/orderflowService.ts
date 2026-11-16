export interface OrderFlowItem {
  name: string;
  qty: number;
  price: number;
}

export interface OrderFlowPayload {
  externalOrderId: string;
  customerName: string;
  customerPhone: string;
  totalAmount: number;
  items: OrderFlowItem[];
  currency: 'MAD';
}

const ORDERFLOW_WEBHOOK_URL = 'https://orderflow-ai-two.vercel.app/api/v1/orders/webhook';
const ORDERFLOW_API_KEY =
  process.env.ORDERFLOW_API_KEY ||
  'of_live_43eeb6b339a48d69e1a81c179ccfe5fe32a00bbbaf1a3591';

/**
 * Normalizes a Moroccan (or international) phone number to +2126... format
 */
export function formatPhoneE164(phone?: string): string {
  if (!phone) return '';
  const trimmed = phone.trim();
  const hasPlus = trimmed.startsWith('+');
  let digits = trimmed.replace(/[^0-9]/g, '');
  if (!digits) return '';

  // Handle +21206... or 0021206...
  if (digits.startsWith('002120')) {
    digits = '212' + digits.slice(6);
  } else if (digits.startsWith('00212')) {
    digits = '212' + digits.slice(5);
  } else if (digits.startsWith('00')) {
    return '+' + digits.slice(2);
  } else if (digits.startsWith('2120') && digits.length >= 13) {
    digits = '212' + digits.slice(4);
  } else if (hasPlus && !digits.startsWith('212')) {
    return '+' + digits;
  }

  if (digits.startsWith('212')) {
    return '+' + digits;
  }

  if (digits.startsWith('0') && digits.length === 10) {
    return '+212' + digits.slice(1);
  }

  if (digits.length === 9 && /^[567]/.test(digits)) {
    return '+212' + digits;
  }

  if (digits.startsWith('0')) {
    return '+212' + digits.slice(1);
  }

  return '+212' + digits;
}

/**
 * Sends an order to OrderFlow confirmation webhook.
 * Never throws on network or HTTP errors so the customer's order is never blocked.
 */
export async function sendOrderToOrderFlow(
  payload: OrderFlowPayload
): Promise<{ ok: boolean; status?: number; data?: unknown; error?: string }> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    const response = await fetch(ORDERFLOW_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ORDERFLOW_API_KEY,
      },
      body: JSON.stringify({
        externalOrderId: payload.externalOrderId,
        customerName: payload.customerName,
        customerPhone: formatPhoneE164(payload.customerPhone),
        totalAmount: Number(payload.totalAmount) || 0,
        items: payload.items.map((item) => ({
          name: item.name,
          qty: Number(item.qty) || 1,
          price: Number(item.price) || 0,
        })),
        currency: 'MAD',
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    let data: unknown = null;
    try {
      data = await response.json();
    } catch {
      data = null;
    }

    if (!response.ok) {
      console.warn('[OrderFlow] Webhook returned non-OK status:', response.status, data);
      return { ok: false, status: response.status, data };
    }

    return { ok: true, status: response.status, data };
  } catch (err: any) {
    console.error('[OrderFlow] Webhook network error (non-blocking):', err?.message || err);
    return { ok: false, error: err?.message || 'Network error' };
  }
}
