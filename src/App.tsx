import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';

import { supabase } from './lib/supabase';
import { CartProvider } from './context/CartContext';

// Components
import Navbar from './components/Navbar';
import CartSidebar from './components/CartSidebar';
import ChatWidget from './components/ChatWidget';

// Pages
import Home from './pages/Home';
import Catalog from './pages/Catalog';
import ProductDetail from './pages/ProductDetail';
import Checkout from './pages/Checkout';
import Account from './pages/Account';
import ThankYou from './pages/ThankYou';

// Admin Pages (Imported from Admin.tsx)
import { 
  AdminLogin, AdminLayout, AdminDashboard, 
  AdminProducts, AdminOrders, AdminPromos, AdminPixels
} from './pages/Admin';

import { Toaster } from 'sonner';

// --- Admin Route Wrapper ---
const AdminRoute: React.FC = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(!!localStorage.getItem('admin_token'));
  const [view, setView] = useState('admin_dashboard');

  if (!isLoggedIn) {
    return <AdminLogin onLogin={() => setIsLoggedIn(true)} />;
  }

  const renderView = () => {
    switch (view) {
      case 'admin_dashboard': return <AdminDashboard />;
      case 'admin_products': return <AdminProducts />;
      case 'admin_orders': return <AdminOrders />;
      case 'admin_promos': return <AdminPromos />;
      case 'admin_pixels': return <AdminPixels />;
      default: return <AdminDashboard />;
    }
  };

  return (
    <AdminLayout currentView={view} setView={setView}>
      {renderView()}
    </AdminLayout>
  );
};

// --- App Content (to use location) ---
const AppContent: React.FC = () => {
  const [isCartOpen, setIsCartOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  // Secret admin shortcut
  useEffect(() => {
    let buffer = '';
    let lastTime = 0;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in an input or textarea
      const activeElement = document.activeElement;
      if (
        activeElement?.tagName === 'INPUT' || 
        activeElement?.tagName === 'TEXTAREA' || 
        (activeElement as HTMLElement)?.isContentEditable
      ) {
        buffer = '';
        return;
      }

      const now = Date.now();
      // Reset buffer if more than 2 seconds between keys
      if (now - lastTime > 2000) {
        buffer = '';
      }

      buffer += e.key.toLowerCase();
      lastTime = now;

      if (buffer.endsWith('admin')) {
        navigate('/admin');
        buffer = '';
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate]);

  // Scroll to top on route change
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  // Load Pixels
  useEffect(() => {
    const loadPixels = async () => {
      try {
        const { data: pixels, error } = await supabase.from('pixels').select('*');
        if (error) throw error;
        
        if (pixels) {
          pixels.forEach((pixel: any) => {
            if (pixel.type === 'facebook') {
              // Facebook Pixel
              const script = document.createElement('script');
              script.innerHTML = `
                !function(f,b,e,v,n,t,s)
                {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
                n.callMethod.apply(n,arguments):n.queue.push(arguments)};
                if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
                n.queue=[];t=b.createElement(e);t.async=!0;
                t.src=v;s=b.getElementsByTagName(e)[0];
                s.parentNode.insertBefore(t,s)}(window, document,'script',
                'https://connect.facebook.net/en_US/fbevents.js');
                fbq('init', '${pixel.pixel_id}');
                fbq('track', 'PageView');
              `;
              document.head.appendChild(script);

              const noscript = document.createElement('noscript');
              noscript.innerHTML = `<img height="1" width="1" style="display:none" src="https://www.facebook.com/tr?id=${pixel.pixel_id}&ev=PageView&noscript=1" />`;
              document.head.appendChild(noscript);
            } else if (pixel.type === 'tiktok') {
              // TikTok Pixel
              const script = document.createElement('script');
              script.innerHTML = `
                !function (w, d, t) {
                  w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","detach","on_ready","delete"],ttq.setAndLog=function(t,e){return function(){var n=Math.random().toString(36).substring(7);if(w.TiktokAnalyticsObject&&w[t]&&w[t].setAndLog){return w[t].setAndLog(t,e)}else{console.log("TikTok Pixel not loaded yet")}}};for(var i=0;i<ttq.methods.length;i++)ttq[ttq.methods[i]]=ttq.setAndLog(ttq.methods[i],ttq);ttq.instance=function(t){for(var e=ttq._i[t]||[],n=0;n<ttq.methods.length;n++)ttq.setAndLog(ttq.methods[n],e);return e};ttq.load=function(e,n){var t="https://analytics.tiktok.com/i18n/pixel/events.js";ttq._i=ttq._i||{},ttq._i[e]=[],ttq._i[e]._u=t,ttq._t=ttq._t||{},ttq._t[e]=+new Date,ttq._o=ttq._o||{},ttq._o[e]=n||{};var o=d.createElement("script");o.type="text/javascript",o.async=!0,o.src=t;var a=d.getElementsByTagName("script")[0];a.parentNode.insertBefore(o,a)};
                  ttq.load('${pixel.pixel_id}');
                  ttq.page();
                }(window, document, 'ttq');
              `;
              document.head.appendChild(script);
            }
          });
        }
      } catch (err) {
        console.error('Error loading pixels:', err);
      }
    };
    loadPixels();
  }, []);

  const isStoreRoute = !location.pathname.startsWith('/admin');

  return (
    <div className="min-h-screen bg-[#050505] font-sans selection:bg-[#C9A227] selection:text-black">
      <Toaster position="top-center" expand={false} richColors />
      
      {isStoreRoute && (
        <>
          <Navbar onOpenCart={() => setIsCartOpen(true)} />
          <CartSidebar isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />
        </>
      )}
      
      <Routes>
        {/* Storefront Routes */}
        <Route path="/" element={<Home />} />
        <Route path="/boutique" element={<Catalog />} />
        <Route path="/produit/:slug" element={<ProductDetail />} />
        <Route path="/commande" element={<Checkout />} />
        <Route path="/mon-compte" element={<Account />} />
        <Route path="/merci" element={<ThankYou />} />

        {/* Admin Routes */}
        <Route path="/admin/*" element={<AdminRoute />} />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      {/* Chat Widget */}
      {isStoreRoute && <ChatWidget />}

      {/* Footer */}
      {isStoreRoute && (
        <footer className="bg-[#1a1a1a] border-t border-[#C9A227]/10 py-20 px-4">
          <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-12">
            <div className="space-y-6">
              <h3 className="text-xl font-serif text-[#C9A227] tracking-widest uppercase">LUXE & CO</h3>
              <p className="text-xs text-gray-500 uppercase tracking-widest leading-relaxed">
                Bijoux et accessoires en acier inoxydable 316L. Élégance inaltérable pour la femme moderne.
              </p>
            </div>
            <div>
              <h4 className="text-xs uppercase tracking-[0.3em] font-bold mb-6">Service Client</h4>
              <ul className="space-y-4 text-[10px] uppercase tracking-widest text-gray-500">
                <li><Link to="#" className="hover:text-[#C9A227] transition-colors">Livraison & Retours</Link></li>
                <li><Link to="#" className="hover:text-[#C9A227] transition-colors">Guide des tailles</Link></li>
                <li><Link to="#" className="hover:text-[#C9A227] transition-colors">FAQ</Link></li>
                <li><Link to="#" className="hover:text-[#C9A227] transition-colors">Contact</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-xs uppercase tracking-[0.3em] font-bold mb-6">Légal</h4>
              <ul className="space-y-4 text-[10px] uppercase tracking-widest text-gray-500">
                <li><Link to="#" className="hover:text-[#C9A227] transition-colors">Mentions Légales</Link></li>
                <li><Link to="#" className="hover:text-[#C9A227] transition-colors">CGV</Link></li>
                <li><Link to="#" className="hover:text-[#C9A227] transition-colors">Confidentialité</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-xs uppercase tracking-[0.3em] font-bold mb-6">Suivez-nous</h4>
              <div className="flex gap-4">
                <a href="#" className="w-8 h-8 bg-black border border-white/10 flex items-center justify-center text-gray-500 hover:text-[#C9A227] hover:border-[#C9A227] transition-all">IG</a>
                <a href="#" className="w-8 h-8 bg-black border border-white/10 flex items-center justify-center text-gray-500 hover:text-[#C9A227] hover:border-[#C9A227] transition-all">FB</a>
                <a href="#" className="w-8 h-8 bg-black border border-white/10 flex items-center justify-center text-gray-500 hover:text-[#C9A227] hover:border-[#C9A227] transition-all">TK</a>
              </div>
            </div>
          </div>
          <div className="max-w-7xl mx-auto mt-20 pt-8 border-t border-white/5 text-center">
            <p className="text-[8px] text-gray-600 uppercase tracking-[0.5em]">© 2026 LUXE & CO. Tous droits réservés. Créé avec passion au Maroc.</p>
          </div>
        </footer>
      )}
    </div>
  );
};

const App: React.FC = () => {
  return (
    <Router>
      <CartProvider>
        <AppContent />
      </CartProvider>
    </Router>
  );
};

export default App;
