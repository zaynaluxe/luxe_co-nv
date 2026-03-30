import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase } from '../_lib/supabase';
import bcrypt from "bcryptjs";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { nom, prenom, email, mot_de_passe, telephone } = req.body;

  try {
    if (!nom || !prenom || !email || !mot_de_passe) {
      return res.status(400).json({ error: "Veuillez remplir tous les champs obligatoires." });
    }

    const hashedPassword = await bcrypt.hash(mot_de_passe, 10);
    const { data, error } = await supabase
      .from('clients')
      .insert([{ nom, prenom, email, mot_de_passe: hashedPassword, telephone }])
      .select('id, email')
      .single();

    if (error) {
      if (error.code === '23505') return res.status(400).json({ error: "Cet email est déjà utilisé." });
      throw error;
    }

    res.status(201).json({ message: "Inscription réussie", user: data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur lors de l'inscription." });
  }
}
