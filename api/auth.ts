import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase } from './_lib/supabase.ts';
import { authenticateToken } from './_lib/auth.ts';
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { method, url, query } = req;
  const cleanUrl = url?.split('?')[0] || '';
  const urlParts = cleanUrl.split('/') || [];
  
  // Try to get ID from query (Vercel rewrite) or URL path
  let id = query.id as string | undefined;
  if (!id) {
    id = urlParts[urlParts.length - 1] === 'auth' ? undefined : urlParts[urlParts.length - 1];
  }

  if (method === 'POST') {
    if (query.login === 'true' || url?.includes('/login')) {
      // POST /api/auth/login
      const { email, mot_de_passe } = req.body;
      try {
        const { data: user, error } = await supabase.from('clients').select('*').eq('email', email).maybeSingle();
        if (error || !user) return res.status(401).json({ error: 'Email ou mot de passe incorrect.' });

        const isMatch = await bcrypt.compare(mot_de_passe, user.mot_de_passe);
        if (!isMatch) return res.status(401).json({ error: 'Email ou mot de passe incorrect.' });

        const token = jwt.sign(
          { id: user.id, email: user.email, role: user.role || 'client' }, 
          process.env.JWT_SECRET || "default_secret", 
          { expiresIn: '7d' }
        );
        return res.status(200).json({ 
          token, 
          user: { id: user.id, email: user.email, nom: user.nom, prenom: user.prenom, role: user.role || 'client' } 
        });
      } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Erreur lors de la connexion.' });
      }
    } else if (url?.includes('/register')) {
      // POST /api/auth/register
      const { email, mot_de_passe, nom, prenom, telephone, ville, adresse } = req.body;
      try {
        const { data: existingUser } = await supabase.from('clients').select('id').eq('email', email).maybeSingle();
        if (existingUser) return res.status(400).json({ error: 'Cet email est déjà utilisé.' });

        const hashedPassword = await bcrypt.hash(mot_de_passe, 10);
        const { data: user, error } = await supabase.from('clients').insert([{
          email, mot_de_passe: hashedPassword, nom, prenom, telephone, ville_defaut: ville, adresse_defaut: adresse
        }]).select().single();

        if (error) throw error;

        const token = jwt.sign(
          { id: user.id, email: user.email, role: 'client' }, 
          process.env.JWT_SECRET || "default_secret", 
          { expiresIn: '7d' }
        );
        return res.status(201).json({ 
          token, 
          user: { id: user.id, email: user.email, nom: user.nom, prenom: user.prenom, role: 'client' } 
        });
      } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Erreur lors de l\'inscription.' });
      }
    }
  } else if (method === 'GET') {
    if (url?.includes('/me')) {
      // GET /api/auth/me
      const user = authenticateToken(req);
      if (!user) return res.status(401).json({ error: 'Accès non autorisé.' });

      try {
        const { data: userData, error } = await supabase.from('clients').select('id, email, nom, prenom, telephone, ville_defaut, adresse_defaut').eq('id', (user as any).id).single();
        if (error || !userData) return res.status(404).json({ error: 'Utilisateur non trouvé.' });
        return res.status(200).json({ ...userData, role: (user as any).role || 'client' });
      } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Erreur lors de la récupération de l\'utilisateur.' });
      }
    }
  } else {
    return res.status(405).json({ error: 'Method not allowed' });
  }
}
