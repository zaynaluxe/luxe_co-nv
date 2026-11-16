import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sendOrderToOrderFlow } from '../services/orderflowService.ts';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const {
      externalOrderId,
      customerName,
      customerPhone,
      totalAmount,
      items,
    } = req.body || {};

    if (!externalOrderId) {
      return res.status(400).json({ error: 'externalOrderId is required' });
    }

    const result = await sendOrderToOrderFlow({
      externalOrderId: String(externalOrderId),
      customerName: String(customerName || 'Client'),
      customerPhone: String(customerPhone || ''),
      totalAmount: Number(totalAmount) || 0,
      items: Array.isArray(items) ? items : [],
      currency: 'MAD',
    });

    return res.status(200).json(result);
  } catch (err: any) {
    console.error('[OrderFlow API] Error (non-blocking):', err?.message || err);
    return res.status(200).json({ ok: false, error: err?.message || 'Internal error' });
  }
}
