import type { VercelRequest, VercelResponse } from '@vercel/node';
import { authenticateToken, cloudinary } from './_lib/auth';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const user = authenticateToken(req);
  if (!user || (user as any).role !== 'admin') {
    return res.status(401).json({ error: 'Accès non autorisé.' });
  }

  const { image_base64, folder = "luxe_and_co/general" } = req.body;
  if (!image_base64) return res.status(400).json({ error: 'Image manquante.' });

  try {
    const uploadRes = await cloudinary.uploader.upload(image_base64, { folder });
    return res.status(200).json({ url: uploadRes.secure_url });
  } catch (err) {
    console.error('Upload error:', err);
    return res.status(500).json({ error: 'Erreur lors de l\'upload de l\'image.' });
  }
}
