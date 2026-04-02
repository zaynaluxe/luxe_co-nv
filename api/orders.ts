import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase } from './_lib/supabase.ts';
import { authenticateToken } from './_lib/auth.ts';
import https from "https";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { method, url, query } = req;
  const cleanUrl = url?.split('?')[0] || '';
  const urlParts = cleanUrl.split('/') || [];
  
  // Try to get ID from query (Vercel rewrite) or URL path
  let id = query.id as string | undefined;
  if (!id) {
    id = urlParts[urlParts.length - 1] === 'orders' ? undefined : urlParts[urlParts.length - 1];
  }

  if (method === 'POST') {
    if (query.quick === 'true' || url?.includes('/quick')) {
      // POST /api/orders/quick
      const { produit_id, variante_id, quantite, nom, prenom, telephone, ville, adresse } = req.body;
      try {
        let prix_unitaire = 0;
        if (variante_id) {
          const { data: varRes } = await supabase.from('variantes_produits').select('prix_supplementaire, produits(prix_base)').eq('id', variante_id).single();
          if (varRes) {
            const produits = Array.isArray(varRes.produits) ? varRes.produits[0] : varRes.produits;
            prix_unitaire = parseFloat(produits.prix_base) + parseFloat(varRes.prix_supplementaire as any);
          }
        } else {
          const { data: prodRes } = await supabase.from('produits').select('prix_base').eq('id', produit_id).single();
          if (prodRes) prix_unitaire = parseFloat((prodRes as any).prix_base);
        }

        const total_ttc = prix_unitaire * quantite;
        const numero_commande = `QC-${Date.now().toString().slice(-6)}`;

        const { data: orderRes, error: orderError } = await supabase.from('commandes').insert([{
          numero_commande, total_ht: total_ttc, total_ttc, frais_livraison: 0,
          adresse_livraison: adresse, ville_livraison: ville, telephone_contact: telephone
        }]).select().single();

        if (orderError) throw orderError;

        await supabase.from('lignes_commande').insert([{
          commande_id: (orderRes as any).id, produit_id, variante_id: variante_id || null, quantite, prix_unitaire
        }]);

        // Telegram notification
        const telegramToken = process.env.TELEGRAM_BOT_TOKEN;
        const telegramChatId = process.env.TELEGRAM_CHAT_ID;
        if (telegramToken && telegramChatId) {
          const message = `🚀 *COMMANDE RAPIDE*\n\n*Numéro:* ${numero_commande}\n*Total:* ${total_ttc} MAD\n*Client:* ${prenom} ${nom}\n*Ville:* ${ville}\n*Tel:* ${telephone}`;
          const encodedMessage = encodeURIComponent(message);
          const url = `https://api.telegram.org/bot${telegramToken.trim()}/sendMessage?chat_id=${telegramChatId.trim()}&text=${encodedMessage}&parse_mode=Markdown`;
          https.get(url, () => {}).on('error', (err) => console.error("Erreur Telegram:", err));
        }

        return res.status(201).json({ message: "Commande créée avec succès", numero_commande });
      } catch (err) {
        console.error(err);
        return res.status(500).json({ error: "Erreur lors de la création de la commande." });
      }
    } else {
      // POST /api/orders
      const user = authenticateToken(req);
      if (!user) return res.status(401).json({ error: 'Accès non autorisé.' });

      const { items, zone_livraison_id, code_promo_id, adresse_livraison, ville_livraison, telephone_contact } = req.body;
      try {
        let total_ht = 0;
        for (const item of items) {
          let prix = 0;
          if (item.variante_id && item.variante_id !== 0) {
            const { data: varRes } = await supabase.from('variantes_produits').select('prix_supplementaire, produits(prix_base)').eq('id', item.variante_id).single();
            if (varRes) {
              const produits = Array.isArray(varRes.produits) ? varRes.produits[0] : varRes.produits;
              prix = parseFloat(produits.prix_base) + parseFloat(varRes.prix_supplementaire as any);
            }
          } else {
            const { data: prodRes } = await supabase.from('produits').select('prix_base').eq('id', item.produit_id).single();
            if (prodRes) prix = parseFloat((prodRes as any).prix_base);
          }
          total_ht += prix * item.quantite;
        }

        const total_ttc = total_ht;
        const numero_commande = `LC-${Date.now().toString().slice(-6)}`;

        const { data: orderRes, error: orderError } = await supabase.from('commandes').insert([{
          client_id: (user as any).id, zone_livraison_id, code_promo_id, numero_commande,
          total_ht, total_ttc, frais_livraison: 0, adresse_livraison, ville_livraison, telephone_contact
        }]).select().single();

        if (orderError) throw orderError;

        const orderId = (orderRes as any).id;
        for (const item of items) {
          let prix_unitaire = 0;
          let v_id = item.variante_id && item.variante_id !== 0 ? item.variante_id : null;
          if (v_id) {
            const { data: varRes } = await supabase.from('variantes_produits').select('prix_supplementaire, produits(prix_base)').eq('id', v_id).single();
            if (varRes) {
              const produits = Array.isArray(varRes.produits) ? varRes.produits[0] : varRes.produits;
              prix_unitaire = parseFloat(produits.prix_base) + parseFloat(varRes.prix_supplementaire as any);
            }
          } else {
            const { data: prodRes } = await supabase.from('produits').select('prix_base').eq('id', item.produit_id).single();
            if (prodRes) prix_unitaire = parseFloat((prodRes as any).prix_base);
          }
          await supabase.from('lignes_commande').insert([{
            commande_id: orderId, produit_id: item.produit_id, variante_id: v_id, quantite: item.quantite, prix_unitaire
          }]);
        }

        // Telegram notification
        const telegramToken = process.env.TELEGRAM_BOT_TOKEN;
        const telegramChatId = process.env.TELEGRAM_CHAT_ID;
        if (telegramToken && telegramChatId) {
          const message = `🛒 *NOUVELLE COMMANDE (PANIER)*\n\n*Numéro:* ${numero_commande}\n*Total:* ${total_ttc} MAD\n*Ville:* ${ville_livraison}\n*Tel:* ${telephone_contact}`;
          const encodedMessage = encodeURIComponent(message);
          const url = `https://api.telegram.org/bot${telegramToken.trim()}/sendMessage?chat_id=${telegramChatId.trim()}&text=${encodedMessage}&parse_mode=Markdown`;
          https.get(url, () => {}).on('error', (err) => console.error("Erreur Telegram:", err));
        }

        return res.status(201).json({ message: "Commande créée avec succès", numero_commande });
      } catch (err) {
        console.error(err);
        return res.status(500).json({ error: "Erreur lors de la création de la commande." });
      }
    }
  } else if (method === 'GET') {
    if (url?.includes('/my-orders')) {
      // GET /api/orders/my-orders
      const user = authenticateToken(req);
      if (!user) return res.status(401).json({ error: 'Accès non autorisé.' });

      try {
        const { data, error } = await supabase.from('commandes').select(`*, lignes_commande(*, produits(nom, image_principale_url))`).eq('client_id', (user as any).id).order('date_commande', { ascending: false });
        if (error) throw error;
        return res.status(200).json(data);
      } catch (err) {
        console.error(err);
        return res.status(500).json({ error: "Erreur lors de la récupération de vos commandes." });
      }
    } else {
      return res.status(405).json({ error: 'Method not allowed' });
    }
  } else {
    return res.status(405).json({ error: 'Method not allowed' });
  }
}
