/// <reference types="vite/client" />
import { MOCK_PRODUCTS, MOCK_CATEGORIES, MOCK_ORDERS, MOCK_PIXELS } from './mockData';

export const API_URL = '';

export const formatPrice = (price: number | string): string => {
  const numPrice = typeof price === 'string' ? parseFloat(price) : price;
  if (isNaN(numPrice)) return '0 MAD';
  return `${Math.round(numPrice).toLocaleString('fr-MA')} MAD`;
};

// Monkey-patch fetch in DEV mode to use mock data on failure
if (import.meta.env.DEV) {
  const originalFetch = window.fetch;
  window.fetch = async (...args) => {
    try {
      const response = await originalFetch(...args);
      // If it's an API call and it failed, trigger mock fallback
      if (!response.ok && args[0].toString().includes('/api/')) {
        throw new Error('API Error');
      }
      return response;
    } catch (err) {
      const url = args[0].toString();
      
      // Only mock /api routes
      if (url.includes('/api/')) {
        console.warn('Mocking API response for:', url);
        let data: any = [];
        
        if (url.includes('/api/products')) {
          // Handle single product slug if needed
          const slugMatch = url.match(/\/api\/products\/([^\/\?]+)/);
          if (slugMatch && !url.includes('similar')) {
            const slug = slugMatch[1];
            data = MOCK_PRODUCTS.find(p => p.slug === slug || p.id.toString() === slug) || MOCK_PRODUCTS[0];
          } else {
            data = MOCK_PRODUCTS;
          }
        } 
        else if (url.includes('/api/categories')) data = MOCK_CATEGORIES;
        else if (url.includes('/api/orders')) data = MOCK_ORDERS;
        else if (url.includes('/api/pixels')) data = MOCK_PIXELS;
        else if (url.includes('/api/auth/me')) data = { id: 1, email: 'admin@luxeandco.com', role: 'admin' };
        
        return new Response(JSON.stringify(data), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      throw err;
    }
  };
}
