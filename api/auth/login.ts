import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase } from '../_lib/supabase';
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email, mot_de_passe } = req.body;

  try {
    const { data: user, error } = await supabase
      .from('clients')
      .select('*')
      .eq('email', email)
      .single();

    if (error || !user || !(await bcrypt.compare(mot_de_passe, user.mot_de_passe))) {
      return res.status(401).json({ error: "Email ou mot de passe incorrect." });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email }, 
      process.env.JWT_SECRET || "fallback_secret", 
      { expiresIn: "24h" }
    );

    res.status(200).json({ 
      token, 
      user: { id: user.id, nom: user.nom, prenom: user.prenom, email: user.email } 
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur lors de la connexion." });
  }
}
