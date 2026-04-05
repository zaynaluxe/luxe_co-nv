import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase } from './_lib/supabase.ts';
import { authenticateToken, generateToken } from './_lib/auth.ts';
import bcrypt from "bcryptjs";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Ensure we always return JSON
  res.setHeader('Content-Type', 'application/json');

  const { method, url, query } = req;
  const cleanUrl = url?.split('?')[0] || '';
  const urlParts = cleanUrl.split('/') || [];
  
  // Try to get ID from query (Vercel rewrite) or URL path
  let id = query.id as string | undefined;
  if (!id || id === '') {
    id = urlParts[urlParts.length - 1] === 'auth' ? undefined : urlParts[urlParts.length - 1];
  }
  if (id === '') id = undefined;

  try {
    if (method === 'POST') {
      if (query.login === 'true' || url?.includes('/login')) {
        // POST /api/auth/login
        const { email, mot_de_passe } = req.body;
        if (!email || !mot_de_passe) {
          return res.status(400).json({ error: 'Email et mot de passe requis.' });
        }

        const { data: user, error } = await supabase.from('clients').select('*').eq('email', email).maybeSingle();
        if (error) {
          console.error('Supabase error during login:', error);
          return res.status(500).json({ error: 'Erreur de base de données.' });
        }
        if (!user) return res.status(401).json({ error: 'Email ou mot de passe incorrect.' });

        // Handle bcryptjs import variations in serverless environments
        const compare = (bcrypt as any).compare || (bcrypt as any).default?.compare;
        const isMatch = await (compare ? compare(mot_de_passe, user.mot_de_passe) : bcrypt.compare(mot_de_passe, user.mot_de_passe));
        
        if (!isMatch) return res.status(401).json({ error: 'Email ou mot de passe incorrect.' });

        const token = generateToken({ id: user.id, email: user.email, role: user.role || 'client' });
        
        return res.status(200).json({ 
          token, 
          user: { id: user.id, email: user.email, nom: user.nom, prenom: user.prenom, role: user.role || 'client' } 
        });
      } else if (url?.includes('/register')) {
        // POST /api/auth/register
        const { email, mot_de_passe, nom, prenom, telephone, ville, adresse } = req.body;
        if (!email || !mot_de_passe) {
          return res.status(400).json({ error: 'Email et mot de passe requis.' });
        }

        const { data: existingUser } = await supabase.from('clients').select('id').eq('email', email).maybeSingle();
        if (existingUser) return res.status(400).json({ error: 'Cet email est déjà utilisé.' });

        const hash = (bcrypt as any).hash || (bcrypt as any).default?.hash;
        const hashedPassword = await (hash ? hash(mot_de_passe, 10) : bcrypt.hash(mot_de_passe, 10));
        
        const { data: user, error } = await supabase.from('clients').insert([{
          email, mot_de_passe: hashedPassword, nom, prenom, telephone, ville_defaut: ville, adresse_defaut: adresse
        }]).select().single();

        if (error) throw error;

        const token = generateToken({ id: user.id, email: user.email, role: 'client' });
        
        return res.status(201).json({ 
          token, 
          user: { id: user.id, email: user.email, nom: user.nom, prenom: user.prenom, role: 'client' } 
        });
      }
    } else if (method === 'GET') {
      if (url?.includes('/me')) {
        // GET /api/auth/me
        const user = authenticateToken(req);
        if (!user) return res.status(401).json({ error: 'Accès non autorisé.' });

        const { data: userData, error } = await supabase.from('clients').select('id, email, nom, prenom, telephone, ville_defaut, adresse_defaut').eq('id', (user as any).id).single();
        if (error || !userData) return res.status(404).json({ error: 'Utilisateur non trouvé.' });
        return res.status(200).json({ ...userData, role: (user as any).role || 'client' });
      }
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err: any) {
    console.error('Auth API Error:', err);
    return res.status(500).json({ 
      error: 'Erreur interne du serveur.',
      details: err.message || 'Unknown error'
    });
  }
}
