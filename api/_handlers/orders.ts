import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase } from './_lib/supabase';
import { authenticateToken } from './_lib/auth';
import https from "https";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const user = authenticateToken(req);
  if (!user) return res.status(401).json({ error: 'Accès non autorisé.' });

  const { items, zone_livraison_id, code_promo_id, adresse_livraison, ville_livraison, telephone_contact } = req.body;

  try {
    // Calcul des totaux
    let total_ht = 0;
    for (const item of items) {
      let prix = 0;
      if (item.variante_id && item.variante_id !== 0) {
        const { data: varRes, error: varError } = await supabase
          .from('variantes_produits')
          .select(`
            prix_supplementaire, 
            produits (prix_base)
          `)
          .eq('id', item.variante_id)
          .single();
        
        if (varRes) {
          const produits = Array.isArray(varRes.produits) ? varRes.produits[0] : varRes.produits;
          prix = parseFloat(produits.prix_base) + parseFloat(varRes.prix_supplementaire as any);
        }
      } else {
        const { data: prodRes } = await supabase
          .from('produits')
          .select('prix_base')
          .eq('id', item.produit_id)
          .single();
        
        if (prodRes) {
          prix = parseFloat((prodRes as any).prix_base);
        }
      }
      total_ht += prix * item.quantite;
    }

    const frais_livraison = 0;
    const total_ttc = total_ht;
    const numero_commande = `LC-${Date.now().toString().slice(-6)}`;

    // Insert order
    const userAny = user as any;
    const { data: orderRes, error: orderError } = await supabase
      .from('commandes')
      .insert([{
        client_id: userAny.id, 
        zone_livraison_id, 
        code_promo_id, 
        numero_commande, 
        total_ht, 
        total_ttc, 
        frais_livraison, 
        adresse_livraison, 
        ville_livraison, 
        telephone_contact
      }])
      .select()
      .single();

    if (orderError) throw orderError;

    const orderId = (orderRes as any).id;
    for (const item of items) {
      let prix_unitaire = 0;
      let v_id = item.variante_id && item.variante_id !== 0 ? item.variante_id : null;

      if (v_id) {
        const { data: varRes } = await supabase
          .from('variantes_produits')
          .select(`
            prix_supplementaire, 
            produits (prix_base)
          `)
          .eq('id', v_id)
          .single();
        
        if (varRes) {
          const produits = Array.isArray(varRes.produits) ? varRes.produits[0] : varRes.produits;
          prix_unitaire = parseFloat(produits.prix_base) + parseFloat(varRes.prix_supplementaire as any);
        }
      } else {
        const { data: prodRes } = await supabase
          .from('produits')
          .select('prix_base')
          .eq('id', item.produit_id)
          .single();
        
        if (prodRes) {
          prix_unitaire = parseFloat((prodRes as any).prix_base);
        }
      }

      await supabase
        .from('lignes_commande')
        .insert([{
          commande_id: orderId, 
          produit_id: item.produit_id, 
          variante_id: v_id, 
          quantite: item.quantite, 
          prix_unitaire
        }]);
    }

    // Notifications Telegram
    const telegramToken = process.env.TELEGRAM_BOT_TOKEN;
    const telegramChatId = process.env.TELEGRAM_CHAT_ID;
    
    if (telegramToken && telegramChatId) {
      const message = `🛒 *NOUVELLE COMMANDE (PANIER)*\n\n*Numéro:* ${numero_commande}\n*Total:* ${total_ttc} MAD\n*Ville:* ${ville_livraison}\n*Tel:* ${telephone_contact}\n\nConsultez l'admin pour les détails.`;
      const encodedMessage = encodeURIComponent(message);
      const url = `https://api.telegram.org/bot${telegramToken.trim()}/sendMessage?chat_id=${telegramChatId.trim()}&text=${encodedMessage}&parse_mode=Markdown`;
      
      https.get(url, () => {}).on('error', (err) => console.error("Erreur Telegram:", err));
    }

    res.status(201).json({ message: "Commande créée avec succès", numero_commande });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur lors de la création de la commande." });
  }
}
