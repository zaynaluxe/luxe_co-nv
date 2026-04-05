import type { VercelRequest, VercelResponse } from '@vercel/node';
import * as jwt from 'jsonwebtoken';
import { v2 as cloudinary } from 'cloudinary';

const JWT_SECRET = process.env.JWT_SECRET || 'default_secret';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || process.env.VITE_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const verifyToken = (token: string) => {
  try {
    return (jwt as any).default ? (jwt as any).default.verify(token, JWT_SECRET) : jwt.verify(token, JWT_SECRET);
  } catch (err) {
    return null;
  }
};

const authenticateToken = (req: VercelRequest) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return null;
  return verifyToken(token);
};

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
