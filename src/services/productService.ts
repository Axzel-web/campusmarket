import { supabase } from '../lib/supabase';

export interface Product {
  id: string;
  seller_id: string;
  title: string;
  description: string;
  price: number;
  image_url: string;
  category: string;
  status: 'active' | 'sold' | 'archived';
  created_at: string;
  updated_at?: string;
}

/**
 * SERVICE: Seller Product Management (Supabase-specific)
 * This service handles all Supabase-first product operations as requested.
 */

// 1. Insert query for posting a product
export const postProduct = async (product: Omit<Product, 'id' | 'created_at' | 'updated_at' | 'status'>) => {
  if (!supabase) throw new Error('Supabase not connected');
  
  const { data, error } = await supabase
    .from('listings')
    .insert([{
      ...product,
      status: 'active'
    }])
    .select()
    .single();

  if (error) throw error;
  return data;
};

// 2. Query to fetch only the logged-in seller’s products
export const fetchSellerProducts = async (sellerId: string) => {
  if (!supabase) throw new Error('Supabase not connected');

  const { data, error } = await supabase
    .from('listings')
    .select('*')
    .eq('seller_id', sellerId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data as Product[];
};

// 3. Query to show only available products for the dashboard feed
export const fetchAvailableProducts = async () => {
  if (!supabase) throw new Error('Supabase not connected');

  const { data, error } = await supabase
    .from('listings')
    .select('*')
    .eq('status', 'active')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data as Product[];
};

// 4. Update query to mark a product as sold
export const markProductAsSold = async (productId: string) => {
  if (!supabase) throw new Error('Supabase not connected');

  const { data, error } = await supabase
    .from('listings')
    .update({ 
      status: 'sold',
      updated_at: new Date().toISOString()
    })
    .eq('id', productId)
    .select()
    .single();

  if (error) throw error;
  return data;
};

// 5. Update product details (General edit)
export const updateProduct = async (productId: string, updates: Partial<Product>) => {
  if (!supabase) throw new Error('Supabase not connected');

  const { data, error } = await supabase
    .from('listings')
    .update({
      ...updates,
      updated_at: new Date().toISOString()
    })
    .eq('id', productId)
    .select()
    .single();

  if (error) throw error;
  return data;
};

// 6. Delete query
export const deleteProduct = async (productId: string) => {
  if (!supabase) throw new Error('Supabase not connected');

  const { error } = await supabase
    .from('listings')
    .delete()
    .eq('id', productId);

  if (error) throw error;
};

// 7. Realtime subscription for live updates
export const subscribeToProducts = (callback: (payload: any) => void) => {
  if (!supabase) return null;

  const subscription = supabase
    .channel('products-channel')
    .on(
      'postgres_changes', 
      { event: '*', schema: 'public', table: 'listings' }, 
      (payload) => {
        console.log('Realtime update received:', payload);
        callback(payload);
      }
    )
    .subscribe();

  return subscription;
};

// 8. Storage: Upload Product Image to Supabase
export const uploadProductImage = async (file: File | Blob, userId: string): Promise<string> => {
  if (!supabase) throw new Error('Supabase not connected. Please ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set in your environment variables.');

  const fileExt = 'jpg'; // We usually compress to jpg
  const fileName = `${userId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
  const filePath = `${fileName}`;

  // Upload the file to the 'listings' bucket
  const { error: uploadError } = await supabase.storage
    .from('listings')
    .upload(filePath, file, {
      contentType: 'image/jpeg',
      upsert: true
    });

  if (uploadError) {
    if (uploadError.message.toLowerCase().includes('bucket not found')) {
      throw new Error('Supabase Storage: Please create a bucket named "listings" in your Supabase project (Storage -> New Bucket) to enable image uploads.');
    }
    console.error('Supabase Storage Upload Error:', uploadError);
    throw uploadError;
  }

  // Get the public URL
  const { data: { publicUrl } } = supabase.storage
    .from('listings')
    .getPublicUrl(filePath);

  return publicUrl;
};
