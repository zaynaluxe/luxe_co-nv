import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  LayoutDashboard, ShoppingBag, Users, Tag, LogOut, 
  Plus, Search, Bell, Menu, X, Trash2, Edit, ChevronRight,
  TrendingUp, Package, Clock, CheckCircle, ArrowUp, ArrowDown,
  Activity, Save
} from 'lucide-react';
import { formatPrice, API_URL, apiFetch } from '../utils';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';
import bcrypt from 'bcryptjs';
import { SignJWT } from 'jose';

// --- Types ---
interface AdminStats {
  dailyRevenue: number;
  monthlyRevenue: number;
  pendingOrders: number;
  completedOrders: number;
  topProducts: { name: string; sales: number; revenue: number }[];
  repartition: { statut: string; count: number }[];
}

interface AdminOrder {
  id: string | number;
  numero_commande: string;
  nom_client: string;
  telephone_contact: string;
  adresse_livraison: string;
  ville_livraison: string;
  total_ttc: number;
  statut: 'en_attente' | 'confirmee' | 'expediee' | 'livree' | 'annulee';
  date_commande: string;
}

interface OrderDetail extends AdminOrder {
  items: {
    produit_nom: string;
    couleur: string;
    quantite: number;
    prix_unitaire: number;
  }[];
}

interface AdminPixel {
  id: number;
  type: 'facebook' | 'tiktok';
  pixel_id: string;
  est_actif: boolean;
  date_creation: string;
}

interface AdminPromo {
  id: number;
  code: string;
  type_remise: 'pourcentage' | 'fixe';
  valeur_remise: number;
  date_expiration: string;
  usage_max: number;
  usage_actuel: number;
  est_actif: boolean;
}

interface AdminProduct {
  id: number | string;
  nom: string;
  slug: string;
  description: string;
  prix_base: string | number;
  categorie_id: number;
  categorie_nom?: string;
  image_principale_url: string;
  images_urls: string[];
  sections: any[];
  est_actif: boolean;
  est_en_vedette: boolean;
  texte_alignement: 'left' | 'center' | 'right';
  variantes: any[];
}

// --- Admin Components ---

export const AdminLogin: React.FC<{ onLogin: () => void }> = ({ onLogin }) => {
  const [email, setEmail] = useState('admin@luxeandco.com');
  const [password, setPassword] = useState('admin123');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const [setupLoading, setSetupLoading] = useState(false);

  const handleSetup = async () => {
    if (!email || !password) {
      toast.error('Veuillez remplir l\'email et le mot de passe pour la configuration');
      return;
    }
    setSetupLoading(true);
    try {
      const response = await apiFetch(API_URL + '/api/admin/setup', { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, mot_de_passe: password, nom: 'Admin', prenom: 'Luxe' })
      });
      
      const data = await response.json();
      if (response.ok) {
        toast.success('Administrateur configuré avec succès');
      } else {
        toast.error(data.error || 'Erreur lors de la configuration');
      }
    } catch (err) {
      console.error('Setup error:', err);
      toast.error('Erreur serveur lors de la configuration');
    } finally {
      setSetupLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      // 1. Fetch user from Supabase directly
      const { data: user, error: supabaseError } = await supabase
        .from('clients')
        .select('*')
        .eq('email', email)
        .single();

      if (supabaseError || !user) {
        throw new Error('Email ou mot de passe incorrect.');
      }

      // 2. Compare password with bcryptjs
      const isMatch = await bcrypt.compare(password, user.mot_de_passe);
      if (!isMatch) {
        throw new Error('Email ou mot de passe incorrect.');
      }

      // 3. Check if user is admin
      if (user.role !== 'admin') {
        throw new Error('Accès non autorisé.');
      }

      // 4. Generate JWT with jose (compatible browser)
      const secret = new TextEncoder().encode(import.meta.env.VITE_JWT_SECRET || 'default_secret');
      const token = await new SignJWT({ 
        id: user.id, 
        email: user.email, 
        role: user.role || 'client' 
      })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('7d')
        .sign(secret);

      // 5. Store in localStorage
      localStorage.setItem('admin_token', token);
      localStorage.setItem('admin_user', JSON.stringify({
        id: user.id,
        email: user.email,
        nom: user.nom,
        prenom: user.prenom,
        role: user.role || 'client'
      }));

      onLogin();
      toast.success('Connexion réussie');
    } catch (err: any) {
      console.error('Login error:', err);
      setError(err.message || 'Erreur de connexion au serveur.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-[#1a1a1a] border border-[#C9A227]/20 p-8 rounded-lg"
      >
        <div className="text-center mb-8">
          <h1 className="text-3xl font-serif text-[#C9A227] tracking-widest uppercase">LUXE & CO</h1>
          <p className="text-gray-400 mt-2 text-sm uppercase tracking-wider">Administration</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && <p className="text-red-500 text-xs text-center">{error}</p>}
          <div>
            <label className="block text-xs uppercase tracking-widest text-gray-400 mb-2">Email</label>
            <input 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-black border border-gray-800 p-3 text-white focus:border-[#C9A227] outline-none transition-colors"
              required
            />
          </div>
          <div>
            <label className="block text-xs uppercase tracking-widest text-gray-400 mb-2">Mot de passe</label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-black border border-gray-800 p-3 text-white focus:border-[#C9A227] outline-none transition-colors"
              required
            />
          </div>
          <button 
            disabled={loading}
            className="w-full bg-[#C9A227] text-black font-bold py-3 uppercase tracking-widest hover:bg-[#b08e22] transition-colors disabled:opacity-50"
          >
            {loading ? 'Connexion...' : 'Se Connecter'}
          </button>
        </form>

        <div className="mt-8 pt-8 border-t border-white/5 text-center">
          <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-4">Première connexion ?</p>
          <button 
            onClick={handleSetup}
            disabled={setupLoading}
            className="text-[10px] uppercase tracking-widest text-[#C9A227] hover:underline disabled:opacity-50"
          >
            {setupLoading ? 'Initialisation...' : 'Initialiser le compte administrateur'}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export const AdminLayout: React.FC<{ children: React.ReactNode; currentView: string; setView: (v: string) => void }> = ({ children, currentView, setView }) => {
  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    window.location.reload();
  };

  const menuItems = [
    { id: 'admin_dashboard', label: 'Tableau de bord', icon: LayoutDashboard },
    { id: 'admin_products', label: 'Produits', icon: ShoppingBag },
    { id: 'admin_orders', label: 'Commandes', icon: Package },
    { id: 'admin_promos', label: 'Promotions', icon: Tag },
    { id: 'admin_pixels', label: 'Pixels & Tracking', icon: Activity },
  ];

  return (
    <div className="min-h-screen bg-[#050505] text-white flex">
      {/* Sidebar */}
      <aside className="w-64 bg-[#1a1a1a] border-r border-[#C9A227]/10 flex flex-col fixed h-full">
        <div className="p-6 border-bottom border-[#C9A227]/10">
          <h1 className="text-xl font-serif text-[#C9A227] tracking-widest uppercase">LUXE & CO</h1>
          <p className="text-[10px] text-gray-500 uppercase tracking-widest mt-1">Admin Panel</p>
        </div>
        <nav className="flex-1 p-4 space-y-2">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setView(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded transition-colors ${
                currentView === item.id ? 'bg-[#C9A227] text-black' : 'text-gray-400 hover:bg-white/5'
              }`}
            >
              <item.icon size={18} />
              <span className="text-sm font-medium">{item.label}</span>
            </button>
          ))}
        </nav>
        <div className="p-4 border-t border-[#C9A227]/10">
          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 text-red-400 hover:bg-red-400/10 rounded transition-colors"
          >
            <LogOut size={18} />
            <span className="text-sm font-medium">Déconnexion</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 ml-64">
        <header className="h-16 bg-[#1a1a1a] border-b border-[#C9A227]/10 flex items-center justify-between px-8 sticky top-0 z-10">
          <div className="flex items-center gap-4 bg-black/40 px-4 py-2 rounded border border-white/5 w-96">
            <Search size={16} className="text-gray-500" />
            <input type="text" placeholder="Rechercher..." className="bg-transparent border-none outline-none text-sm w-full" />
          </div>
          <div className="flex items-center gap-6">
            <button className="relative text-gray-400 hover:text-[#C9A227]">
              <Bell size={20} />
              <span className="absolute -top-1 -right-1 w-2 h-2 bg-[#C9A227] rounded-full"></span>
            </button>
            <div className="flex items-center gap-3 border-l border-white/10 pl-6">
              <div className="text-right">
                <p className="text-xs font-bold">Admin Luxe</p>
                <p className="text-[10px] text-gray-500">Super Admin</p>
              </div>
              <div className="w-8 h-8 bg-[#C9A227] rounded-full flex items-center justify-center text-black font-bold text-xs">
                AL
              </div>
            </div>
          </div>
        </header>
        <div className="p-8">
          {children}
        </div>
      </main>
    </div>
  );
};

export const AdminDashboard: React.FC = () => {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = async () => {
    try {
      setError(null);
      setLoading(true);
      const response = await apiFetch(`${API_URL}/api/admin/stats`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('admin_token')}`
        }
      });
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to fetch stats');
      }
      const data = await response.json();
      setStats(data);
    } catch (err) {
      console.error('Error fetching admin stats:', err);
      setError(err instanceof Error ? err.message : 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-[#C9A227] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-500/10 border border-red-500/20 p-6 rounded-lg text-center">
        <p className="text-red-400 mb-2 font-bold">{error}</p>
        <p className="text-red-400/60 text-sm mb-4 italic">
          {error.includes('relation') ? "La table n'existe pas dans la base de données. Veuillez exécuter le schéma SQL." : ""}
        </p>
        <button 
          onClick={() => fetchStats()}
          className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
        >
          Réessayer
        </button>
      </div>
    );
  }

  if (!stats) return (
    <div className="text-center p-8 text-gray-500">
      Aucune donnée disponible.
    </div>
  );

  const statusLabels: Record<string, string> = {
    en_attente: 'En attente',
    confirmee: 'Confirmée',
    expediee: 'Expédiée',
    livree: 'Livrée',
    annulee: 'Annulée'
  };

  const statusColors: Record<string, string> = {
    en_attente: 'bg-yellow-500',
    confirmee: 'bg-blue-500',
    expediee: 'bg-purple-500',
    livree: 'bg-green-500',
    annulee: 'bg-red-500'
  };

  const totalOrders = stats.repartition.reduce((acc, curr) => acc + curr.count, 0);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-serif text-[#C9A227]">Tableau de Bord</h2>
        <p className="text-gray-500 text-sm">{new Date().toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'CA du Jour', value: formatPrice(stats.dailyRevenue), icon: TrendingUp, color: 'text-green-400' },
          { label: 'CA du Mois', value: formatPrice(stats.monthlyRevenue), icon: TrendingUp, color: 'text-[#C9A227]' },
          { label: 'Commandes en attente', value: stats.pendingOrders, icon: Clock, color: 'text-yellow-400' },
          { label: 'Livraisons réussies', value: stats.completedOrders, icon: CheckCircle, color: 'text-blue-400' },
        ].map((card, i) => (
          <motion.div 
            key={i}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.1 }}
            className="bg-[#1a1a1a] p-6 rounded-lg border border-white/5"
          >
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs uppercase tracking-widest text-gray-500">{card.label}</p>
              <card.icon size={20} className={card.color} />
            </div>
            <p className="text-2xl font-bold whitespace-nowrap overflow-hidden text-ellipsis">{card.value}</p>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-[#1a1a1a] p-6 rounded-lg border border-white/5">
          <h3 className="text-lg font-serif text-[#C9A227] mb-6">Top 5 Produits les plus vendus</h3>
          <div className="space-y-4">
            {stats.topProducts.length === 0 ? (
              <p className="text-gray-500 text-sm italic py-4">Aucune vente enregistrée.</p>
            ) : (
              stats.topProducts.map((product, i) => (
                <div key={i} className="flex items-center justify-between p-4 bg-black/20 rounded border border-white/5">
                  <div className="flex items-center gap-4">
                    <span className="text-xs text-gray-500 font-mono">0{i+1}</span>
                    <p className="text-sm font-medium">{product.name}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-[#C9A227]">{formatPrice(product.revenue)}</p>
                    <p className="text-[10px] text-gray-500 uppercase">{product.sales} ventes</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
        <div className="bg-[#1a1a1a] p-6 rounded-lg border border-white/5">
          <h3 className="text-lg font-serif text-[#C9A227] mb-6">Répartition Commandes</h3>
          <div className="space-y-6">
            {stats.repartition.length === 0 ? (
              <p className="text-gray-500 text-sm italic py-4">Aucune commande.</p>
            ) : (
              stats.repartition.map((item, i) => (
                <div key={i} className="space-y-2">
                  <div className="flex justify-between text-xs uppercase tracking-widest">
                    <span className="text-gray-400">{statusLabels[item.statut] || item.statut}</span>
                    <span className="font-bold">{item.count}</span>
                  </div>
                  <div className="h-1 bg-black rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${totalOrders > 0 ? (item.count / totalOrders) * 100 : 0}%` }}
                      className={`h-full ${statusColors[item.statut] || 'bg-gray-500'}`}
                    ></motion.div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export const AdminProducts: React.FC = () => {
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [categories, setCategories] = useState<{id: number, nom: string}[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<AdminProduct | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [productToDelete, setProductToDelete] = useState<AdminProduct | null>(null);
  const [uploading, setUploading] = useState(false);
  
  const [formData, setFormData] = useState({
    nom: '',
    slug: '',
    description: '',
    prix_base: 0,
    categorie_id: 0,
    images_urls: [] as string[],
    sections: [] as any[],
    est_actif: true,
    est_en_vedette: false,
    texte_alignement: 'left' as 'left' | 'center' | 'right',
    variantes: [] as any[]
  });

  const fetchProducts = async () => {
    try {
      setError(null);
      const response = await apiFetch(`${API_URL}/api/admin/products`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('admin_token')}`
        }
      });
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to fetch products');
      }
      const data = await response.json();
      setProducts(data);
    } catch (err: any) {
      console.error('Error fetching products:', err);
      setError(err.message || 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await apiFetch(`${API_URL}/api/categories`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('admin_token')}`
        }
      });
      if (!response.ok) throw new Error('Failed to fetch categories');
      const data = await response.json();
      setCategories(data);
      if (data.length > 0 && formData.categorie_id === 0) {
        setFormData(prev => ({ ...prev, categorie_id: data[0].id }));
      }
    } catch (err) {
      console.error('Error fetching categories:', err);
    }
  };

  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-[#C9A227] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-500/10 border border-red-500/20 p-6 rounded-lg text-center">
        <p className="text-red-400 mb-2 font-bold">{error}</p>
        <p className="text-red-400/60 text-sm mb-4 italic">
          {error.includes('relation') ? "La table n'existe pas dans la base de données. Veuillez exécuter le schéma SQL." : ""}
        </p>
        <button 
          onClick={() => fetchProducts()}
          className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
        >
          Réessayer
        </button>
      </div>
    );
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    
    const remainingSlots = 20 - formData.images_urls.length;
    const filesToUpload = Array.from(files).slice(0, remainingSlots);
    
    if (filesToUpload.length === 0) return;

    setUploading(true);
    const newUrls = [...formData.images_urls];

    for (const file of filesToUpload) {
      try {
        const reader = new FileReader();
        const base64Promise = new Promise<string>((resolve) => {
          reader.onload = () => resolve(reader.result as string);
          reader.readAsDataURL(file as File);
        });
        
        const base64 = await base64Promise;
        
        const response = await apiFetch(API_URL + '/api/upload', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('admin_token')}`
          },
          body: JSON.stringify({ image_base64: base64 })
        });

        if (response.ok) {
          const { url } = await response.json();
          newUrls.push(url);
        }
      } catch (err) {
        console.error('Error uploading image:', err);
      }
    }

    setFormData(prev => ({ ...prev, images_urls: newUrls }));
    setUploading(false);
  };

  const removeImage = (index: number) => {
    setFormData(prev => ({
      ...prev,
      images_urls: prev.images_urls.filter((_, i) => i !== index)
    }));
  };

  const addSection = (type: string) => {
    const newSection = {
      type,
      content: type === 'IMAGE_TEXT' ? { image: '', text: '', layout: 'left', alignement: 'left' } :
               type === 'TEXT_ONLY' ? { text: '', alignement: 'left' } :
               type === 'BANNER' ? { text: '', alignement: 'center' } : {}
    };
    setFormData(prev => ({ ...prev, sections: [...prev.sections, newSection] }));
  };

  const moveSection = (index: number, direction: 'up' | 'down') => {
    const newSections = [...formData.sections];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newSections.length) return;
    
    [newSections[index], newSections[targetIndex]] = [newSections[targetIndex], newSections[index]];
    setFormData(prev => ({ ...prev, sections: newSections }));
  };

  const removeSection = (index: number) => {
    setFormData(prev => ({
      ...prev,
      sections: prev.sections.filter((_, i) => i !== index)
    }));
  };

  const updateSectionContent = (index: number, field: string, value: any) => {
    const newSections = [...formData.sections];
    newSections[index].content = { ...newSections[index].content, [field]: value };
    setFormData(prev => ({ ...prev, sections: newSections }));
  };

  const handleSectionImageUpload = async (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve) => {
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(file as File);
      });
      
      const base64 = await base64Promise;
      
      const response = await apiFetch(API_URL + '/api/upload', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('admin_token')}`
        },
        body: JSON.stringify({ image_base64: base64 })
      });

      if (response.ok) {
        const { url } = await response.json();
        setFormData(prev => ({
          ...prev,
          sections: prev.sections.map((section, i) => 
            i === index ? { ...section, content: { ...section.content, image: url } } : section
          )
        }));
      }
    } catch (err) {
      console.error('Error uploading section image:', err);
    } finally {
      setUploading(false);
    }
  };

  const addVariant = () => {
    setFormData(prev => ({
      ...prev,
      variantes: [...prev.variantes, { valeur: '', prix_supp: 0, stock: 0, image: '' }]
    }));
  };

  const removeVariant = (index: number) => {
    setFormData(prev => ({
      ...prev,
      variantes: prev.variantes.filter((_, i) => i !== index)
    }));
  };

  const updateVariant = (index: number, field: string, value: any) => {
    const newVariants = [...formData.variantes];
    newVariants[index] = { ...newVariants[index], [field]: value };
    setFormData(prev => ({ ...prev, variantes: newVariants }));
  };

  const handleVariantImageUpload = async (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve) => {
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(file as File);
      });
      
      const base64 = await base64Promise;
      
      const response = await apiFetch(API_URL + '/api/upload', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('admin_token')}`
        },
        body: JSON.stringify({ image_base64: base64 })
      });

      if (response.ok) {
        const { url } = await response.json();
        setFormData(prev => ({
          ...prev,
          variantes: prev.variantes.map((variant, i) => 
            i === index ? { ...variant, image: url } : variant
          )
        }));
      }
    } catch (err) {
      console.error('Error uploading variant image:', err);
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.prix_base <= 0) {
      toast.error('Le prix doit être supérieur à 0');
      return;
    }

    setUploading(true);
    try {
      const method = editingProduct ? 'PUT' : 'POST';
      const url = editingProduct ? `${API_URL}/api/products/${editingProduct.id}` : `${API_URL}/api/products`;
      
      const response = await apiFetch(url, {
        method,
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('admin_token')}`
        },
        body: JSON.stringify({
          ...formData,
          variantes: formData.variantes,
          slug: formData.slug || formData.nom.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, '')
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erreur lors de l\'enregistrement');
      }

      const savedProduct = await response.json();
      const productId = editingProduct ? editingProduct.id : savedProduct.id;

      // Sauvegarde des variantes
      console.log('Sauvegarde des variantes pour le produit:', productId);
      
      // 1. Supprimer les anciennes variantes
      await supabase.from('variantes_produits').delete().eq('produit_id', productId);
      
      // 2. Insérer les nouvelles variantes
      for (const variante of formData.variantes) {
        await supabase.from('variantes_produits').insert({
          produit_id: productId,
          nom_variante: 'Variante',
          valeur_variante: variante.valeur,
          prix_supplementaire: variante.prix_supp || 0,
          stock: variante.stock || 0,
          image_variante_url: variante.image || null
        });
      }
      console.log('Variantes sauvegardées avec succès');

      toast.success(editingProduct ? 'Produit mis à jour' : 'Produit créé');
      setShowModal(false);
      setEditingProduct(null);
      setFormData({
        nom: '',
        slug: '',
        description: '',
        prix_base: 0,
        categorie_id: categories[0]?.id || 0,
        images_urls: [],
        sections: [],
        est_actif: true,
        est_en_vedette: false,
        texte_alignement: 'left',
        variantes: []
      });
      fetchProducts();
    } catch (err: any) {
      console.error('Error saving product:', err);
      toast.error(err.message || 'Erreur lors de l\'enregistrement du produit');
    } finally {
      setUploading(false);
    }
  };

  const openEdit = async (product: AdminProduct) => {
    setEditingProduct(product);
    
    // Charger les variantes depuis Supabase
    let productVariants = product.variantes || [];
    try {
      const { data: variantsData, error: variantsError } = await supabase
        .from('variantes_produits')
        .select('*')
        .eq('produit_id', product.id);
      
      if (!variantsError && variantsData) {
        productVariants = variantsData.map(v => ({
          valeur: v.valeur_variante,
          prix_supp: v.prix_supplementaire,
          stock: v.stock,
          image: v.image_variante_url
        }));
      }
    } catch (err) {
      console.error('Error fetching variants:', err);
    }

    setFormData({
      nom: product.nom,
      slug: product.slug,
      description: product.description,
      prix_base: Number(product.prix_base),
      categorie_id: product.categorie_id,
      images_urls: product.images_urls || [product.image_principale_url].filter(Boolean),
      sections: product.sections || [],
      est_actif: product.est_actif,
      est_en_vedette: product.est_en_vedette,
      texte_alignement: product.texte_alignement || 'left',
      variantes: productVariants
    });
    setShowModal(true);
  };

  const handleDelete = (product: AdminProduct) => {
    console.log('suppression demandée pour id:', product.id);
    setProductToDelete(product);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    if (!productToDelete) return;
    
    try {
      const response = await apiFetch(`${API_URL}/api/products/${productToDelete.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('admin_token')}`
        }
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to delete product');
      }

      toast.success('Produit supprimé');
      setShowDeleteConfirm(false);
      setProductToDelete(null);
      fetchProducts();
    } catch (err: any) {
      console.error('Error deleting product:', err);
      toast.error(err.message || 'Une erreur est survenue lors de la suppression.');
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-serif text-[#C9A227]">Gestion des Produits</h2>
        <button 
          onClick={() => {
            setEditingProduct(null);
            setFormData({
              nom: '',
              slug: '',
              description: '',
              prix_base: 0,
              categorie_id: categories[0]?.id || 0,
              images_urls: [],
              sections: [],
              est_actif: true,
              est_en_vedette: false,
              texte_alignement: 'left',
              variantes: []
            });
            setShowModal(true);
          }}
          className="bg-[#C9A227] text-black px-6 py-2 rounded font-bold text-sm flex items-center gap-2 hover:bg-[#b08e22] transition-colors"
        >
          <Plus size={18} />
          Ajouter un produit
        </button>
      </div>

      <div className="bg-[#1a1a1a] rounded-lg border border-white/5 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-black/40 border-b border-white/5">
              <th className="p-4 text-xs uppercase tracking-widest text-gray-500">Photo</th>
              <th className="p-4 text-xs uppercase tracking-widest text-gray-500">Nom</th>
              <th className="p-4 text-xs uppercase tracking-widest text-gray-500">Prix</th>
              <th className="p-4 text-xs uppercase tracking-widest text-gray-500">Catégorie</th>
              <th className="p-4 text-xs uppercase tracking-widest text-gray-500">Statut</th>
              <th className="p-4 text-xs uppercase tracking-widest text-gray-500 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="p-8 text-center text-gray-500">Chargement...</td></tr>
            ) : products.map((p) => (
              <tr key={p.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                <td className="p-4">
                  <img src={p.image_principale_url || null} alt={p.nom} className="w-12 h-12 object-cover rounded border border-white/10" />
                </td>
                <td className="p-4">
                  <p className="text-sm font-medium">{p.nom}</p>
                  <p className="text-[10px] text-gray-500 uppercase">{p.slug}</p>
                </td>
                <td className="p-4 text-sm font-mono">{formatPrice(p.prix_base)}</td>
                <td className="p-4 text-xs uppercase tracking-widest text-gray-400">{p.categorie_nom}</td>
                <td className="p-4">
                  <span className={`text-[10px] uppercase px-2 py-1 rounded ${p.est_actif ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                    {p.est_actif ? 'Actif' : 'Inactif'}
                  </span>
                </td>
                <td className="p-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button onClick={() => openEdit(p)} className="p-2 text-gray-400 hover:text-[#C9A227] transition-colors"><Edit size={16} /></button>
                    <button 
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleDelete(p);
                      }} 
                      className="p-2 text-gray-400 hover:text-red-400 transition-colors"
                      title="Supprimer le produit"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <AnimatePresence>
        {showDeleteConfirm && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowDeleteConfirm(false)}
              className="absolute inset-0 bg-black/90 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-[#1a1a1a] border border-red-500/20 p-8 rounded-lg shadow-2xl text-center"
            >
              <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <Trash2 size={32} className="text-red-500" />
              </div>
              <h3 className="text-xl font-serif text-white mb-2">Confirmer la suppression</h3>
              <p className="text-gray-400 mb-8">
                Êtes-vous sûr de vouloir supprimer <span className="text-white font-medium">{productToDelete?.nom}</span> ? Cette action est irréversible.
              </p>
              <div className="flex gap-4">
                <button 
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 px-6 py-3 rounded border border-white/10 text-white font-medium hover:bg-white/5 transition-colors"
                >
                  Annuler
                </button>
                <button 
                  onClick={confirmDelete}
                  className="flex-1 px-6 py-3 rounded bg-red-600 text-white font-bold hover:bg-red-700 transition-colors shadow-lg shadow-red-600/20"
                >
                  Confirmer la suppression
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowModal(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-4xl bg-[#1a1a1a] border border-[#C9A227]/20 p-8 rounded-lg shadow-2xl max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-xl font-serif text-[#C9A227]">{editingProduct ? 'Modifier le produit' : 'Ajouter un nouveau bijou'}</h3>
                <button onClick={() => setShowModal(false)} className="text-gray-500 hover:text-white"><X size={24} /></button>
              </div>
              <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-8">
                <div className="space-y-6">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-xs uppercase tracking-widest text-gray-400">Nom du produit</label>
                      <div className="flex bg-black border border-gray-800 rounded overflow-hidden">
                        {[
                          { id: 'left', icon: '◀', label: 'Gauche' },
                          { id: 'center', icon: '≡', label: 'Centre' },
                          { id: 'right', icon: '▶', label: 'Droite' }
                        ].map(align => (
                          <button
                            key={align.id}
                            type="button"
                            onClick={() => setFormData({ ...formData, texte_alignement: align.id as any })}
                            className={`px-3 py-1 text-[10px] uppercase font-bold transition-colors ${
                              formData.texte_alignement === align.id 
                                ? 'bg-[#C9A227] text-black' 
                                : 'text-gray-500 hover:text-white'
                            }`}
                            title={align.label}
                          >
                            {align.icon}
                          </button>
                        ))}
                      </div>
                    </div>
                    <input 
                      type="text" 
                      value={formData.nom}
                      onChange={e => setFormData({...formData, nom: e.target.value})}
                      className="w-full bg-black border border-gray-800 p-3 text-white focus:border-[#C9A227] outline-none" 
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs uppercase tracking-widest text-gray-400 mb-2">Slug (URL)</label>
                    <input 
                      type="text" 
                      value={formData.slug}
                      onChange={e => setFormData({...formData, slug: e.target.value.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, '')})}
                      placeholder="ex: bague-en-or"
                      className="w-full bg-black border border-gray-800 p-3 text-white focus:border-[#C9A227] outline-none" 
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs uppercase tracking-widest text-gray-400 mb-2">Prix (MAD)</label>
                      <input 
                        type="number" 
                        min="1"
                        value={isNaN(formData.prix_base) ? '' : formData.prix_base}
                        onChange={e => setFormData({...formData, prix_base: e.target.value === '' ? 0 : Number(e.target.value)})}
                        className="w-full bg-black border border-gray-800 p-3 text-white focus:border-[#C9A227] outline-none" 
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs uppercase tracking-widest text-gray-400 mb-2">Catégorie</label>
                      <select 
                        value={formData.categorie_id || ''}
                        onChange={e => {
                          e.stopPropagation();
                          console.log('Catégorie sélectionnée:', e.target.value);
                          setFormData(prev => ({ ...prev, categorie_id: e.target.value }));
                        }}
                        className="w-full bg-black border border-gray-800 p-3 text-white focus:border-[#C9A227] outline-none"
                        required
                      >
                        <option value="" disabled>Sélectionner une catégorie</option>
                        {categories.map(c => (
                          <option key={c.id} value={c.id}>{c.nom}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-xs uppercase tracking-widest text-gray-400">Description</label>
                      <div className="flex bg-black border border-gray-800 rounded overflow-hidden">
                        {[
                          { id: 'left', icon: '◀', label: 'Gauche' },
                          { id: 'center', icon: '≡', label: 'Centre' },
                          { id: 'right', icon: '▶', label: 'Droite' }
                        ].map(align => (
                          <button
                            key={align.id}
                            type="button"
                            onClick={() => setFormData({ ...formData, texte_alignement: align.id as any })}
                            className={`px-3 py-1 text-[10px] uppercase font-bold transition-colors ${
                              formData.texte_alignement === align.id 
                                ? 'bg-[#C9A227] text-black' 
                                : 'text-gray-500 hover:text-white'
                            }`}
                            title={align.label}
                          >
                            {align.icon}
                          </button>
                        ))}
                      </div>
                    </div>
                    <textarea 
                      rows={4} 
                      value={formData.description}
                      onChange={e => setFormData({...formData, description: e.target.value})}
                      className="w-full bg-black border border-gray-800 p-3 text-white focus:border-[#C9A227] outline-none resize-none"
                    ></textarea>
                  </div>

                  <div>
                    <label className="block text-xs uppercase tracking-widest text-gray-400 mb-4">
                      Photos du produit (Max 20)
                    </label>
                    
                    <div className="grid gap-4 mb-6" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))' }}>
                      {formData.images_urls.map((url, index) => (
                        <div key={index} className="relative aspect-square group border border-white/10 rounded overflow-hidden">
                          <img src={url || null} alt={`Product ${index}`} className="w-full h-full object-cover" />
                          <button 
                            type="button"
                            onClick={() => removeImage(index)}
                            className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-1.5 hover:bg-red-700 transition-colors shadow-lg"
                            title="Supprimer la photo"
                          >
                            <X size={14} />
                          </button>
                          {index === 0 && (
                            <div className="absolute bottom-0 left-0 right-0 bg-[#C9A227] text-black text-[9px] font-bold uppercase py-1 text-center">
                              Image Principale
                            </div>
                          )}
                        </div>
                      ))}
                      
                      {formData.images_urls.length < 20 && (
                        <div 
                          className="aspect-square border-2 border-dashed border-gray-800 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-[#C9A227] hover:bg-[#C9A227]/5 transition-all group relative"
                          onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('border-[#C9A227]', 'bg-[#C9A227]/5'); }}
                          onDragLeave={(e) => { e.preventDefault(); e.currentTarget.classList.remove('border-[#C9A227]', 'bg-[#C9A227]/5'); }}
                          onDrop={(e) => {
                            e.preventDefault();
                            e.currentTarget.classList.remove('border-[#C9A227]', 'bg-[#C9A227]/5');
                            const files = e.dataTransfer.files;
                            if (files.length > 0) {
                              const event = { target: { files } } as unknown as React.ChangeEvent<HTMLInputElement>;
                              handleFileChange(event);
                            }
                          }}
                        >
                          <input 
                            type="file" 
                            multiple 
                            accept="image/jpeg,image/png,image/webp" 
                            onChange={handleFileChange} 
                            className="absolute inset-0 opacity-0 cursor-pointer" 
                            disabled={uploading}
                          />
                          <div className="flex flex-col items-center text-center p-4">
                            <Plus size={24} className="text-gray-500 group-hover:text-[#C9A227] mb-2" />
                            <span className="text-[10px] uppercase font-bold text-gray-500 group-hover:text-[#C9A227]">Ajouter des photos</span>
                            <span className="text-[8px] text-gray-600 mt-1">JPG, PNG, WebP</span>
                          </div>
                        </div>
                      )}
                    </div>
                    {uploading && (
                      <div className="flex items-center gap-3 text-[#C9A227] mb-4">
                        <div className="w-4 h-4 border-2 border-[#C9A227] border-t-transparent rounded-full animate-spin"></div>
                        <p className="text-xs font-bold uppercase tracking-widest">Upload en cours...</p>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={formData.est_actif}
                        onChange={e => setFormData({...formData, est_actif: e.target.checked})}
                        className="w-4 h-4 accent-[#C9A227]"
                      />
                      <span className="text-xs uppercase tracking-widest text-gray-400">Actif</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={formData.est_en_vedette}
                        onChange={e => setFormData({...formData, est_en_vedette: e.target.checked})}
                        className="w-4 h-4 accent-[#C9A227]"
                      />
                      <span className="text-xs uppercase tracking-widest text-gray-400">En vedette</span>
                    </label>
                  </div>

                  <div className="space-y-4 pt-4 border-t border-white/5">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs uppercase tracking-widest text-gray-400">Variantes (Couleurs/Tailles)</label>
                      <button 
                        type="button"
                        onClick={addVariant}
                        className="text-[10px] uppercase font-bold text-[#C9A227] hover:text-white transition-colors"
                      >
                        + Ajouter une variante
                      </button>
                    </div>
                    
                    <div className="space-y-4">
                      {formData.variantes.length === 0 ? (
                        <p className="text-[10px] text-gray-500 italic">Aucune variante définie.</p>
                      ) : (
                        formData.variantes.map((v, idx) => (
                          <div key={idx} className="bg-black/40 border border-white/5 p-3 rounded space-y-3">
                            <div className="flex items-center justify-between">
                              <span className="text-[9px] font-bold uppercase text-gray-500">Variante #{idx + 1}</span>
                              <button type="button" onClick={() => removeVariant(idx)} className="text-red-500/50 hover:text-red-500"><Trash2 size={12} /></button>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="block text-[8px] uppercase text-gray-500 mb-1">Valeur (ex: Or, 30ml)</label>
                                <input 
                                  type="text"
                                  value={v.valeur || ''}
                                  onChange={e => updateVariant(idx, 'valeur', e.target.value)}
                                  className="w-full bg-black border border-gray-800 p-2 text-[10px] text-white focus:border-[#C9A227] outline-none"
                                />
                              </div>
                              <div>
                                <label className="block text-[8px] uppercase text-gray-500 mb-1">Prix Supp. (MAD)</label>
                                <input 
                                  type="number"
                                  value={v.prix_supp || 0}
                                  onChange={e => updateVariant(idx, 'prix_supp', Number(e.target.value))}
                                  className="w-full bg-black border border-gray-800 p-2 text-[10px] text-white focus:border-[#C9A227] outline-none"
                                />
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="block text-[8px] uppercase text-gray-500 mb-1">Stock</label>
                                <input 
                                  type="number"
                                  value={v.stock || 0}
                                  onChange={e => updateVariant(idx, 'stock', Number(e.target.value))}
                                  className="w-full bg-black border border-gray-800 p-2 text-[10px] text-white focus:border-[#C9A227] outline-none"
                                />
                              </div>
                              <div>
                                <label className="block text-[8px] uppercase text-gray-500 mb-1">Image Variante</label>
                                <div className="relative h-10 bg-black rounded border border-white/5 flex items-center px-2 overflow-hidden">
                                  {v.image ? (
                                    <img src={v.image || null} alt="" className="w-6 h-6 object-cover rounded mr-2" />
                                  ) : (
                                    <div className="w-6 h-6 bg-white/5 rounded mr-2 flex items-center justify-center"><Plus size={10} /></div>
                                  )}
                                  <span className="text-[8px] text-gray-500 truncate flex-1">{v.image_variante_url ? 'Image chargée' : 'Choisir une image'}</span>
                                  <input 
                                    type="file"
                                    onChange={e => handleVariantImageUpload(idx, e)}
                                    className="absolute inset-0 opacity-0 cursor-pointer"
                                  />
                                </div>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs uppercase tracking-widest text-gray-400">Sections Dynamiques</label>
                    <div className="flex gap-1">
                      {['IMAGE_TEXT', 'TEXT_ONLY', 'REVIEWS', 'BANNER'].map(type => (
                        <button
                          key={type}
                          type="button"
                          onClick={() => addSection(type)}
                          className="bg-white/5 hover:bg-[#C9A227] hover:text-black text-[8px] uppercase font-bold px-2 py-1 rounded transition-colors"
                        >
                          + {type.replace('_', ' ')}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                    {formData.sections.length === 0 ? (
                      <div className="border border-dashed border-gray-800 p-8 text-center rounded">
                        <p className="text-xs text-gray-500 uppercase tracking-widest">Aucune section ajoutée</p>
                      </div>
                    ) : (
                      formData.sections.map((section, index) => (
                        <div key={index} className="bg-black/40 border border-white/5 p-4 rounded-lg space-y-4">
                          <div className="flex items-center justify-between border-b border-white/5 pb-2">
                            <span className="text-[10px] font-bold uppercase tracking-widest text-[#C9A227]">{section.type.replace('_', ' ')}</span>
                            <div className="flex items-center gap-2">
                              <button type="button" onClick={() => moveSection(index, 'up')} className="text-gray-500 hover:text-white"><ArrowUp size={14} /></button>
                              <button type="button" onClick={() => moveSection(index, 'down')} className="text-gray-500 hover:text-white"><ArrowDown size={14} /></button>
                              <button type="button" onClick={() => removeSection(index)} className="text-red-500/50 hover:text-red-500"><Trash2 size={14} /></button>
                            </div>
                          </div>

                          {section.type === 'IMAGE_TEXT' && (
                            <div className="space-y-4">
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <label className="block text-[8px] uppercase text-gray-500 mb-1">Image</label>
                                  <div className="relative aspect-video bg-black rounded overflow-hidden border border-white/5">
                                    {section.content.image ? (
                                      <img src={section.content.image || null} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                      <div className="w-full h-full flex items-center justify-center">
                                        <Plus size={20} className="text-gray-800" />
                                      </div>
                                    )}
                                    <input 
                                      type="file" 
                                      onChange={(e) => handleSectionImageUpload(index, e)}
                                      className="absolute inset-0 opacity-0 cursor-pointer"
                                    />
                                  </div>
                                </div>
                                <div>
                                  <label className="block text-[8px] uppercase text-gray-500 mb-1">Position Image</label>
                                  <select 
                                    value={section.content.layout || 'left'}
                                    onChange={e => updateSectionContent(index, 'layout', e.target.value)}
                                    className="w-full bg-black border border-gray-800 p-2 text-xs text-white focus:border-[#C9A227] outline-none"
                                  >
                                    <option value="left">Gauche</option>
                                    <option value="right">Droite</option>
                                  </select>
                                </div>
                              </div>
                              <div>
                                <label className="block text-[8px] uppercase text-gray-500 mb-1">Texte</label>
                                <textarea 
                                  value={section.content.text}
                                  onChange={e => updateSectionContent(index, 'text', e.target.value)}
                                  className="w-full bg-black border border-gray-800 p-2 text-xs text-white focus:border-[#C9A227] outline-none h-24 resize-none"
                                  placeholder="Contenu de la section..."
                                />
                                <div className="flex justify-end mt-1">
                                  <div className="flex bg-black border border-white/5 rounded overflow-hidden">
                                    {[
                                      { id: 'left', icon: '◀' },
                                      { id: 'center', icon: '≡' },
                                      { id: 'right', icon: '▶' }
                                    ].map(align => (
                                      <button
                                        key={align.id}
                                        type="button"
                                        onClick={() => updateSectionContent(index, 'alignement', align.id)}
                                        className={`px-2 py-0.5 text-[8px] transition-colors ${
                                          section.content.alignement === align.id 
                                            ? 'bg-[#C9A227] text-black' 
                                            : 'text-gray-500 hover:text-white'
                                        }`}
                                      >
                                        {align.icon}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}

                          {section.type === 'TEXT_ONLY' && (
                            <div>
                              <label className="block text-[8px] uppercase text-gray-500 mb-1">Texte Riche (Markdown supporté)</label>
                              <textarea 
                                value={section.content.text}
                                onChange={e => updateSectionContent(index, 'text', e.target.value)}
                                className="w-full bg-black border border-gray-800 p-2 text-xs text-white focus:border-[#C9A227] outline-none h-32 resize-none"
                                placeholder="**Gras**, *Italique*, - Liste..."
                              />
                              <div className="flex justify-end mt-1">
                                <div className="flex bg-black border border-white/5 rounded overflow-hidden">
                                  {[
                                    { id: 'left', icon: '◀' },
                                    { id: 'center', icon: '≡' },
                                    { id: 'right', icon: '▶' }
                                  ].map(align => (
                                    <button
                                      key={align.id}
                                      type="button"
                                      onClick={() => updateSectionContent(index, 'alignement', align.id)}
                                      className={`px-2 py-0.5 text-[8px] transition-colors ${
                                        section.content.alignement === align.id 
                                          ? 'bg-[#C9A227] text-black' 
                                          : 'text-gray-500 hover:text-white'
                                      }`}
                                    >
                                      {align.icon}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            </div>
                          )}

                          {section.type === 'BANNER' && (
                            <div>
                              <label className="block text-[8px] uppercase text-gray-500 mb-1">Texte Bannière</label>
                              <input 
                                type="text" 
                                value={section.content.text}
                                onChange={e => updateSectionContent(index, 'text', e.target.value)}
                                className="w-full bg-black border border-gray-800 p-2 text-xs text-white focus:border-[#C9A227] outline-none"
                                placeholder="Texte centré sur fond or..."
                              />
                              <div className="flex justify-end mt-1">
                                <div className="flex bg-black border border-white/5 rounded overflow-hidden">
                                  {[
                                    { id: 'left', icon: '◀' },
                                    { id: 'center', icon: '≡' },
                                    { id: 'right', icon: '▶' }
                                  ].map(align => (
                                    <button
                                      key={align.id}
                                      type="button"
                                      onClick={() => updateSectionContent(index, 'alignement', align.id)}
                                      className={`px-2 py-0.5 text-[8px] transition-colors ${
                                        section.content.alignement === align.id 
                                          ? 'bg-[#C9A227] text-black' 
                                          : 'text-gray-500 hover:text-white'
                                      }`}
                                    >
                                      {align.icon}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            </div>
                          )}

                          {section.type === 'REVIEWS' && (
                            <p className="text-[10px] text-gray-500 italic">Cette section affichera automatiquement les avis approuvés.</p>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="col-span-2 pt-4">
                  <button type="submit" className="w-full bg-[#C9A227] text-black font-bold py-3 uppercase tracking-widest hover:bg-[#b08e22] transition-colors">
                    {editingProduct ? 'Mettre à jour le produit' : 'Enregistrer le produit'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export const AdminPromos: React.FC = () => {
  const [promos, setPromos] = useState<AdminPromo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingPromo, setEditingPromo] = useState<AdminPromo | null>(null);
  const [formData, setFormData] = useState({
    code: '',
    type_remise: 'pourcentage',
    valeur_remise: 0,
    date_expiration: '',
    usage_max: 100
  });

  const fetchPromos = async () => {
    try {
      setError(null);
      setLoading(true);
      const response = await apiFetch(`${API_URL}/api/promotions`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('admin_token')}`
        }
      });
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to fetch promos');
      }
      const data = await response.json();
      setPromos(data);
    } catch (err) {
      console.error('Error fetching promos:', err);
      setError(err instanceof Error ? err.message : 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPromos();
  }, []);

  const handleToggle = async (id: number) => {
    try {
      const promo = promos.find(p => p.id === id);
      if (!promo) return;

      const response = await apiFetch(`${API_URL}/api/promotions/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('admin_token')}`
        },
        body: JSON.stringify({ est_actif: !promo.est_actif })
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to toggle promo');
      }
      
      toast.success('Statut mis à jour');
      fetchPromos();
    } catch (err: any) {
      console.error('Error toggling promo:', err);
      toast.error(err.message || 'Erreur lors de la mise à jour');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce code promo ?')) return;
    try {
      const response = await apiFetch(`${API_URL}/api/promotions/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('admin_token')}`
        }
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to delete promo');
      }
      
      toast.success('Code promo supprimé');
      fetchPromos();
    } catch (err: any) {
      console.error('Error deleting promo:', err);
      toast.error(err.message || 'Erreur lors de la suppression');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const response = await apiFetch(`${API_URL}/api/promotions${editingPromo ? `/${editingPromo.id}` : ''}`, {
        method: editingPromo ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('admin_token')}`
        },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to save promo');
      }

      toast.success(editingPromo ? 'Code promo mis à jour' : 'Code promo créé');
      setShowModal(false);
      setEditingPromo(null);
      setFormData({ code: '', type_remise: 'pourcentage', valeur_remise: 0, date_expiration: '', usage_max: 100 });
      fetchPromos();
    } catch (err: any) {
      console.error('Error saving promo:', err);
      toast.error(err.message || 'Erreur lors de l\'enregistrement');
    }
  };

  const openEdit = (promo: AdminPromo) => {
    setEditingPromo(promo);
    setFormData({
      code: promo.code,
      type_remise: promo.type_remise,
      valeur_remise: promo.valeur_remise,
      date_expiration: promo.date_expiration.split('T')[0],
      usage_max: promo.usage_max
    });
    setShowModal(true);
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-serif text-[#C9A227]">Gestion des Promotions</h2>
        <button 
          onClick={() => { setEditingPromo(null); setShowModal(true); }}
          className="bg-[#C9A227] text-black px-6 py-2 rounded font-bold text-sm flex items-center gap-2 hover:bg-[#b08e22] transition-colors"
        >
          <Plus size={18} />
          Créer un code promo
        </button>
      </div>

      <div className="bg-[#1a1a1a] rounded-lg border border-white/5 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-black/40 border-b border-white/5">
              <th className="p-4 text-xs uppercase tracking-widest text-gray-500">Code</th>
              <th className="p-4 text-xs uppercase tracking-widest text-gray-500">Type</th>
              <th className="p-4 text-xs uppercase tracking-widest text-gray-500">Valeur</th>
              <th className="p-4 text-xs uppercase tracking-widest text-gray-500">Expiration</th>
              <th className="p-4 text-xs uppercase tracking-widest text-gray-500">Utilisations</th>
              <th className="p-4 text-xs uppercase tracking-widest text-gray-500">Statut</th>
              <th className="p-4 text-xs uppercase tracking-widest text-gray-500 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="p-8 text-center text-gray-500">Chargement...</td></tr>
            ) : error ? (
              <tr>
                <td colSpan={7} className="p-8 text-center">
                  <p className="text-red-400 mb-2">{error}</p>
                  <button 
                    onClick={() => fetchPromos()}
                    className="text-xs text-[#C9A227] hover:underline"
                  >
                    Réessayer
                  </button>
                </td>
              </tr>
            ) : promos.map((p) => (
              <tr key={p.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                <td className="p-4 text-sm font-mono text-[#C9A227]">{p.code}</td>
                <td className="p-4 text-xs uppercase tracking-widest text-gray-400">
                  {p.type_remise === 'pourcentage' ? 'Pourcentage (%)' : 'Montant Fixe (MAD)'}
                </td>
                <td className="p-4 text-sm font-bold">
                  {p.valeur_remise}{p.type_remise === 'pourcentage' ? '%' : ` ${formatPrice(p.valeur_remise)}`}
                </td>
                <td className="p-4 text-xs text-gray-500 uppercase">{new Date(p.date_expiration).toLocaleDateString()}</td>
                <td className="p-4">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono">{p.usage_actuel}/{p.usage_max}</span>
                    <div className="w-16 h-1 bg-black rounded-full overflow-hidden">
                      <div className="h-full bg-[#C9A227]" style={{ width: `${(p.usage_actuel / p.usage_max) * 100}%` }}></div>
                    </div>
                  </div>
                </td>
                <td className="p-4">
                  <button 
                    onClick={() => handleToggle(p.id)}
                    className={`w-10 h-5 rounded-full relative transition-colors ${p.est_actif ? 'bg-[#C9A227]' : 'bg-gray-800'}`}
                  >
                    <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${p.est_actif ? 'right-1' : 'left-1'}`}></div>
                  </button>
                </td>
                <td className="p-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button onClick={() => openEdit(p)} className="p-2 text-gray-400 hover:text-[#C9A227] transition-colors"><Edit size={16} /></button>
                    <button onClick={() => handleDelete(p.id)} className="p-2 text-gray-400 hover:text-red-400 transition-colors"><Trash2 size={16} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowModal(false)} className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="relative w-full max-w-xl bg-[#1a1a1a] border border-[#C9A227]/20 p-8 rounded-lg shadow-2xl">
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-xl font-serif text-[#C9A227]">{editingPromo ? 'Modifier le Code Promo' : 'Nouveau Code Promo'}</h3>
                <button onClick={() => setShowModal(false)} className="text-gray-500 hover:text-white"><X size={24} /></button>
              </div>
              <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-6">
                <div className="col-span-2">
                  <label className="block text-xs uppercase tracking-widest text-gray-400 mb-2">Code</label>
                  <input 
                    type="text" 
                    value={formData.code}
                    onChange={e => setFormData({...formData, code: e.target.value.toUpperCase()})}
                    placeholder="EX: ETE2026" 
                    className="w-full bg-black border border-gray-800 p-3 text-white focus:border-[#C9A227] outline-none uppercase" 
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-widest text-gray-400 mb-2">Type de remise</label>
                  <select 
                    value={formData.type_remise || 'pourcentage'}
                    onChange={e => setFormData({...formData, type_remise: e.target.value as any})}
                    className="w-full bg-black border border-gray-800 p-3 text-white focus:border-[#C9A227] outline-none"
                  >
                    <option value="pourcentage">Pourcentage (%)</option>
                    <option value="fixe">Montant Fixe (MAD)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-widest text-gray-400 mb-2">Valeur</label>
                  <input 
                    type="number" 
                    value={isNaN(formData.valeur_remise) ? '' : formData.valeur_remise}
                    onChange={e => setFormData({...formData, valeur_remise: e.target.value === '' ? 0 : Number(e.target.value)})}
                    className="w-full bg-black border border-gray-800 p-3 text-white focus:border-[#C9A227] outline-none" 
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-widest text-gray-400 mb-2">Date d'expiration</label>
                  <input 
                    type="date" 
                    value={formData.date_expiration}
                    onChange={e => setFormData({...formData, date_expiration: e.target.value})}
                    className="w-full bg-black border border-gray-800 p-3 text-white focus:border-[#C9A227] outline-none" 
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-widest text-gray-400 mb-2">Nb utilisations max</label>
                  <input 
                    type="number" 
                    value={isNaN(formData.usage_max) ? '' : formData.usage_max}
                    onChange={e => setFormData({...formData, usage_max: e.target.value === '' ? 0 : Number(e.target.value)})}
                    className="w-full bg-black border border-gray-800 p-3 text-white focus:border-[#C9A227] outline-none" 
                    required
                  />
                </div>
                <div className="col-span-2">
                  <button type="submit" className="w-full bg-[#C9A227] text-black font-bold py-3 uppercase tracking-widest hover:bg-[#b08e22] transition-colors">
                    {editingPromo ? 'Mettre à jour' : 'Créer la promotion'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export const AdminOrders: React.FC = () => {
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<OrderDetail | null>(null);
  const [showDetail, setShowDetail] = useState(false);

  const fetchOrders = async () => {
    try {
      setError(null);
      setLoading(true);
      const response = await apiFetch(`${API_URL}/api/admin/orders`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('admin_token')}`
        }
      });
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        const message = errData.error || 'Failed to fetch orders';
        const details = errData.details ? ` (${errData.details})` : '';
        throw new Error(message + details);
      }
      const data = await response.json();
      setOrders(data);
    } catch (err) {
      console.error('Error fetching orders:', err);
      setError(err instanceof Error ? err.message : 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrderDetail = async (id: number) => {
    try {
      const response = await apiFetch(`${API_URL}/api/admin/orders/${id}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('admin_token')}`
        }
      });
      if (!response.ok) throw new Error('Failed to fetch order detail');
      const data = await response.json();
      setSelectedOrder(data);
      setShowDetail(true);
    } catch (err) {
      console.error('Error fetching order detail:', err);
      toast.error('Erreur lors de la récupération des détails');
    }
  };

  const updateStatus = async (id: string | number, status: string) => {
    try {
      const { error } = await supabase.from('commandes').update({ statut: status }).eq('id', id);
      
      if (error) {
        console.log('Erreur statut:', error.message);
        throw error;
      }
      
      toast.success('Statut mis à jour', {
        style: { background: '#1a1a1a', color: '#4ade80', border: '1px solid #4ade80/20' }
      });
      fetchOrders();
      if (selectedOrder && selectedOrder.id === id) {
        setSelectedOrder({ ...selectedOrder, statut: status as any });
      }
    } catch (err) {
      console.error('Error updating status:', err);
      toast.error('Erreur lors de la mise à jour');
    }
  };

  const statusColors = {
    en_attente: 'bg-yellow-500/20 text-yellow-400',
    confirmee: 'bg-blue-500/20 text-blue-400',
    expediee: 'bg-purple-500/20 text-purple-400',
    livree: 'bg-green-500/20 text-green-400',
    annulee: 'bg-red-500/20 text-red-400',
  };

  const statusLabels = {
    en_attente: 'En attente',
    confirmee: 'Confirmée',
    expediee: 'Expédiée',
    livree: 'Livrée',
    annulee: 'Annulée'
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-serif text-[#C9A227]">Gestion des Commandes</h2>
      </div>

      <div className="bg-[#1a1a1a] rounded-lg border border-white/5 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-black/40 border-b border-white/5">
              <th className="p-4 text-xs uppercase tracking-widest text-gray-500">N° Commande</th>
              <th className="p-4 text-xs uppercase tracking-widest text-gray-500">Client</th>
              <th className="p-4 text-xs uppercase tracking-widest text-gray-500">Total</th>
              <th className="p-4 text-xs uppercase tracking-widest text-gray-500">Date</th>
              <th className="p-4 text-xs uppercase tracking-widest text-gray-500">Statut</th>
              <th className="p-4 text-xs uppercase tracking-widest text-gray-500 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="p-8 text-center text-gray-500">Chargement...</td></tr>
            ) : error ? (
              <tr>
                <td colSpan={6} className="p-8 text-center">
                  <p className="text-red-400 mb-2">{error}</p>
                  <button 
                    onClick={() => fetchOrders()}
                    className="text-xs text-[#C9A227] hover:underline"
                  >
                    Réessayer
                  </button>
                </td>
              </tr>
            ) : orders.map((o) => (
              <tr key={o.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                <td className="p-4 text-sm font-mono text-[#C9A227]">{o.numero_commande}</td>
                <td className="p-4">
                  <p className="text-sm font-medium">
                    {o.telephone_contact}
                  </p>
                  <p className="text-[10px] text-gray-400 font-mono">
                    {o.nom_client}
                  </p>
                </td>
                <td className="p-4 text-sm font-mono">{formatPrice(o.total_ttc)}</td>
                <td className="p-4 text-xs text-gray-500 uppercase">{new Date(o.date_commande).toLocaleDateString()}</td>
                <td className="p-4">
                  <select 
                    value={o.statut || ''}
                    onChange={(e) => updateStatus(o.id, e.target.value)}
                    className={`text-[10px] uppercase px-2 py-1 rounded bg-black border-none outline-none ${statusColors[o.statut]}`}
                  >
                    <option value="en_attente">En attente</option>
                    <option value="confirmee">Confirmée</option>
                    <option value="expediee">Expédiée</option>
                    <option value="livree">Livrée</option>
                    <option value="annulee">Annulée</option>
                  </select>
                </td>
                <td className="p-4 text-right">
                  <button 
                    onClick={() => fetchOrderDetail(o.id)}
                    className="text-xs uppercase tracking-widest text-gray-500 hover:text-white transition-colors flex items-center gap-1 justify-end ml-auto"
                  >
                    Détails <ChevronRight size={14} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Order Detail Side Panel */}
      <AnimatePresence>
        {showDetail && selectedOrder && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowDetail(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
            />
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              className="fixed top-0 right-0 h-full w-full max-w-md bg-[#1a1a1a] border-l border-[#C9A227]/20 z-50 p-8 overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-xl font-serif text-[#C9A227]">Commande {selectedOrder.numero_commande}</h3>
                <button onClick={() => setShowDetail(false)} className="text-gray-500 hover:text-white"><X size={24} /></button>
              </div>

              <div className="space-y-8">
                <section>
                  <h4 className="text-[10px] uppercase tracking-[0.2em] text-gray-500 mb-4">Client & Livraison</h4>
                  <div className="bg-black/40 p-4 rounded border border-white/5 space-y-2">
                    <p className="text-xs text-gray-400"><span className="text-gray-500 uppercase tracking-widest text-[9px]">Nom :</span> {selectedOrder.nom_client}</p>
                    <p className="text-xs text-gray-400"><span className="text-gray-500 uppercase tracking-widest text-[9px]">Téléphone :</span> {selectedOrder.telephone_contact}</p>
                    <p className="text-xs text-gray-400"><span className="text-gray-500 uppercase tracking-widest text-[9px]">Ville :</span> {selectedOrder.ville_livraison}</p>
                    <p className="text-xs text-gray-400"><span className="text-gray-500 uppercase tracking-widest text-[9px]">Adresse :</span> {selectedOrder.adresse_livraison}</p>
                    <p className="text-[10px] text-gray-500 uppercase pt-2 border-t border-white/5">
                      Commandé le {new Date(selectedOrder.date_commande).toLocaleString()}
                    </p>
                  </div>
                </section>

                <section>
                  <h4 className="text-[10px] uppercase tracking-[0.2em] text-gray-500 mb-4">Articles</h4>
                  <div className="space-y-3">
                    {selectedOrder.items.map((item, i) => (
                      <div key={i} className="flex justify-between items-center py-2 border-b border-white/5">
                        <div>
                          <p className="text-sm font-medium">{item.produit_nom}</p>
                          <p className="text-[10px] text-gray-500 uppercase">
                            {item.couleur} x {item.quantite} ({formatPrice(item.prix_unitaire)})
                          </p>
                        </div>
                        <p className="text-sm font-mono">{formatPrice(item.prix_unitaire * item.quantite)}</p>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="bg-black/40 p-6 rounded border border-[#C9A227]/30 space-y-4 shadow-[0_0_20px_rgba(201,162,39,0.1)]">
                  <div className="flex justify-between items-center text-lg font-bold text-[#C9A227]">
                    <span className="uppercase tracking-widest">TOTAL À PAYER</span>
                    <span className="text-2xl font-mono">{formatPrice(selectedOrder.total_ttc)}</span>
                  </div>
                </section>

                <section>
                  <h4 className="text-[10px] uppercase tracking-[0.2em] text-gray-500 mb-4">Statut de la commande</h4>
                  <select 
                    value={selectedOrder.statut || ''}
                    onChange={(e) => updateStatus(selectedOrder.id, e.target.value)}
                    className={`w-full p-3 rounded bg-black border border-white/10 text-sm uppercase tracking-widest ${statusColors[selectedOrder.statut]}`}
                  >
                    <option value="en_attente">En attente</option>
                    <option value="confirmee">Confirmée</option>
                    <option value="expediee">Expédiée</option>
                    <option value="livree">Livrée</option>
                    <option value="annulee">Annulée</option>
                  </select>
                </section>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export const AdminPixels: React.FC = () => {
  const [pixels, setPixels] = useState<AdminPixel[]>([]);
  const [fbPixel, setFbPixel] = useState('');
  const [ttPixel, setTtPixel] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    fetchPixels();
  }, []);

  const fetchPixels = async () => {
    try {
      setError(null);
      setLoading(true);
      const response = await apiFetch(`${API_URL}/api/pixels`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('admin_token')}`
        }
      });
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        const message = errData.error || 'Failed to fetch pixels';
        const details = errData.details ? ` (${errData.details})` : '';
        throw new Error(message + details);
      }
      const data = await response.json();
      
      if (data) {
        setPixels(data);
        const fb = data.find((p: any) => p.type === 'facebook');
        const tt = data.find((p: any) => p.type === 'tiktok');
        if (fb) setFbPixel(fb.pixel_id);
        if (tt) setTtPixel(tt.pixel_id);
      }
    } catch (err: any) {
      console.error('Error fetching pixels:', err);
      setError(err.message || 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (type: 'facebook' | 'tiktok', pixelId: string) => {
    if (type === 'facebook' && pixelId && !/^\d{15,16}$/.test(pixelId)) {
      toast.error('Le Pixel ID Facebook doit contenir 15 ou 16 chiffres.');
      return;
    }

    setSaving(type);
    try {
      const existing = pixels.find(p => p.type === type);
      
      const response = await apiFetch(`${API_URL}/api/pixels${existing ? `/${existing.id}` : ''}`, {
        method: existing ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('admin_token')}`
        },
        body: JSON.stringify({
          type,
          pixel_id: pixelId,
          est_actif: true
        })
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to save pixel');
      }
      
      toast.success('Pixel enregistré avec succès');
      fetchPixels();
    } catch (err: any) {
      console.error('Error saving pixel:', err);
      toast.error(err.message || 'Erreur lors de l\'enregistrement');
    } finally {
      setSaving(null);
    }
  };

  const handleDelete = async (type: 'facebook' | 'tiktok') => {
    const pixel = pixels.find(p => p.type === type);
    if (!pixel) return;

    if (!confirm('Êtes-vous sûr de vouloir supprimer ce pixel ?')) return;

    try {
      const response = await apiFetch(`${API_URL}/api/pixels/${pixel.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('admin_token')}`
        }
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to delete pixel');
      }
      
      toast.success('Pixel supprimé');
      if (type === 'facebook') setFbPixel('');
      if (type === 'tiktok') setTtPixel('');
      fetchPixels();
    } catch (err: any) {
      console.error('Error deleting pixel:', err);
      toast.error(err.message || 'Erreur lors de la suppression');
    }
  };

  if (loading) return <div className="p-8 text-center text-gray-500">Chargement...</div>;

  if (error) {
    return (
      <div className="bg-red-500/10 border border-red-500/20 p-6 rounded-lg text-center">
        <p className="text-red-400 mb-4">{error}</p>
        <button 
          onClick={() => fetchPixels()}
          className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
        >
          Réessayer
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-serif text-[#C9A227]">Pixels & Tracking</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Facebook Pixel */}
        <div className="bg-[#1a1a1a] p-8 rounded-lg border border-white/5 space-y-6">
          <div className="flex items-center gap-4 mb-2">
            <div className="w-10 h-10 bg-blue-600/20 rounded-full flex items-center justify-center text-blue-500">
              FB
            </div>
            <div>
              <h3 className="text-lg font-medium">Facebook Pixel</h3>
              <p className="text-[10px] text-gray-500 uppercase tracking-widest">Meta Ads Tracking</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-[10px] uppercase tracking-widest text-gray-500 mb-2">Pixel ID</label>
              <input 
                type="text" 
                value={fbPixel}
                onChange={(e) => setFbPixel(e.target.value)}
                placeholder="Ex: 1234567890123456"
                className="w-full bg-black border border-white/10 p-3 rounded text-sm focus:border-[#C9A227] outline-none transition-colors"
              />
            </div>
            <div className="flex gap-4 pt-4">
              <button 
                onClick={() => handleSave('facebook', fbPixel)}
                disabled={saving === 'facebook'}
                className="flex-1 bg-[#C9A227] text-black py-3 rounded text-xs uppercase tracking-widest font-bold hover:bg-[#B89120] transition-colors flex items-center justify-center gap-2"
              >
                <Save size={14} />
                {saving === 'facebook' ? 'Enregistrement...' : 'Sauvegarder'}
              </button>
              <button 
                onClick={() => handleDelete('facebook')}
                className="px-4 py-3 border border-red-500/20 text-red-500 rounded hover:bg-red-500/10 transition-colors"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        </div>

        {/* TikTok Pixel */}
        <div className="bg-[#1a1a1a] p-8 rounded-lg border border-white/5 space-y-6">
          <div className="flex items-center gap-4 mb-2">
            <div className="w-10 h-10 bg-black rounded-full flex items-center justify-center text-white border border-white/10">
              TK
            </div>
            <div>
              <h3 className="text-lg font-medium">TikTok Pixel</h3>
              <p className="text-[10px] text-gray-500 uppercase tracking-widest">TikTok Ads Tracking</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-[10px] uppercase tracking-widest text-gray-500 mb-2">Pixel ID</label>
              <input 
                type="text" 
                value={ttPixel}
                onChange={(e) => setTtPixel(e.target.value)}
                placeholder="Ex: C1234567890ABCDE"
                className="w-full bg-black border border-white/10 p-3 rounded text-sm focus:border-[#C9A227] outline-none transition-colors"
              />
            </div>
            <div className="flex gap-4 pt-4">
              <button 
                onClick={() => handleSave('tiktok', ttPixel)}
                disabled={saving === 'tiktok'}
                className="flex-1 bg-[#C9A227] text-black py-3 rounded text-xs uppercase tracking-widest font-bold hover:bg-[#B89120] transition-colors flex items-center justify-center gap-2"
              >
                <Save size={14} />
                {saving === 'tiktok' ? 'Enregistrement...' : 'Sauvegarder'}
              </button>
              <button 
                onClick={() => handleDelete('tiktok')}
                className="px-4 py-3 border border-red-500/20 text-red-500 rounded hover:bg-red-500/10 transition-colors"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const AdminPage: React.FC = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentView, setCurrentView] = useState('admin_dashboard');

  useEffect(() => {
    const token = localStorage.getItem('admin_token');
    if (token) setIsLoggedIn(true);
  }, []);

  if (!isLoggedIn) return <AdminLogin onLogin={() => setIsLoggedIn(true)} />;

  const renderView = () => {
    switch (currentView) {
      case 'admin_dashboard': return <AdminDashboard />;
      case 'admin_products': return <AdminProducts />;
      case 'admin_orders': return <AdminOrders />;
      case 'admin_promos': return <AdminPromos />;
      case 'admin_pixels': return <AdminPixels />;
      default: return <AdminDashboard />;
    }
  };

  return (
    <AdminLayout currentView={currentView} setView={setCurrentView}>
      {renderView()}
    </AdminLayout>
  );
};

export default AdminPage;
