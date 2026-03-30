import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase } from '../_lib/supabase';
import bcrypt from "bcryptjs";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Only allow POST for security
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const adminEmail = 'admin@luxeandco.com';
  const adminPassword = 'admin123';

  try {
    // 1. Check if admin already exists
    const { data: existingUser } = await supabase
      .from('clients')
      .select('id')
      .eq('email', adminEmail)
      .single();

    if (existingUser) {
      return res.status(200).json({ message: "L'administrateur existe déjà." });
    }

    // 2. Create admin user
    const hashedPassword = await bcrypt.hash(adminPassword, 10);
    const { data, error } = await supabase
      .from('clients')
      .insert([
        { 
          nom: 'Admin', 
          prenom: 'System', 
          email: adminEmail, 
          mot_de_passe: hashedPassword, 
          telephone: '0000000000',
          role: 'admin' // We assume this column exists or will be ignored if not
        }
      ])
      .select()
      .single();

    if (error) {
      // If 'role' column doesn't exist, try without it
      if (error.message.includes('column "role" of relation "clients" does not exist')) {
        const { data: data2, error: error2 } = await supabase
          .from('clients')
          .insert([
            { 
              nom: 'Admin', 
              prenom: 'System', 
              email: adminEmail, 
              mot_de_passe: hashedPassword, 
              telephone: '0000000000'
            }
          ])
          .select()
          .single();
        
        if (error2) throw error2;
        return res.status(201).json({ 
          message: "Administrateur créé (sans colonne role).", 
          user: data2 
        });
      }
      throw error;
    }

    res.status(201).json({ message: "Administrateur créé avec succès.", user: data });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: "Erreur lors de la configuration de l'admin.", details: err.message });
  }
}
