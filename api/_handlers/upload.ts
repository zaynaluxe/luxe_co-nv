import type { VercelRequest, VercelResponse } from '@vercel/node';
import { authenticateToken, cloudinary } from './_lib/auth';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const user = authenticateToken(req);
  if (!user) return res.status(401).json({ error: 'Accès non autorisé.' });

  const { image_base64 } = req.body;
  try {
    if (!image_base64) return res.status(400).json({ error: "Image manquante." });
    const uploadRes = await cloudinary.uploader.upload(image_base64, { folder: "luxe_and_co/products" });
    res.status(200).json({ url: uploadRes.secure_url });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur lors de l'upload de l'image." });
  }
}
