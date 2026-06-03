import { supabase } from '../lib/supabase';

export interface SupabaseOrder {
  order_id: string;
  id?: string; // fallback primary key mapping
  buyer_id: string;
  seller_id: string;
  product_id: string;
  product_name: string;
  product_image: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  contact_number: string;
  meetup_location: string;
  meetup_date: string;
  meetup_time: string;
  buyer_message: string;
  payment_method: string; // "Meetup"
  order_status: 'Pending' | 'Confirmed' | 'Completed' | 'Cancelled';
  created_at: string;
  // Extras to avoid extra queries
  buyer_name?: string;
  buyer_email?: string;
  seller_name?: string;
  seller_email?: string;
}

/**
 * SERVICE: Handles all orders operations matching the user's requirements.
 */

// Generate a clean secure alphanumeric order ID
export const generateOrderId = (): string => {
  return 'ORD-' + Math.random().toString(36).substring(2, 10).toUpperCase();
};

/**
 * Creates a brand new record in the orders table in Supabase.
 */
export const createSupabaseOrder = async (orderData: Omit<SupabaseOrder, 'order_id' | 'created_at' | 'payment_method' | 'order_status'> & { buyer_name?: string; seller_name?: string }) => {
  if (!supabase) {
    throw new Error('Supabase is not connected');
  }

  const orderId = generateOrderId();
  const newOrder: SupabaseOrder = {
    ...orderData,
    order_id: orderId,
    id: orderId, // Some default primary key schemas use id
    payment_method: 'Meetup',
    order_status: 'Pending',
    created_at: new Date().toISOString()
  };

  const { data, error } = await supabase
    .from('orders')
    .insert([newOrder])
    .select()
    .single();

  if (error) {
    console.error('Error creating order in Supabase:', error);
    throw error;
  }

  return data || newOrder;
};

/**
 * Fetches orders where the current user is the buyer.
 */
export const fetchBuyerOrders = async (buyerId: string): Promise<SupabaseOrder[]> => {
  if (!supabase) throw new Error('Supabase is not connected');

  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .eq('buyer_id', buyerId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching buyer orders from Supabase:', error);
    throw error;
  }

  return data as SupabaseOrder[];
};

/**
 * Fetches orders where the current user is the seller.
 */
export const fetchSellerOrders = async (sellerId: string): Promise<SupabaseOrder[]> => {
  if (!supabase) throw new Error('Supabase is not connected');

  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .eq('seller_id', sellerId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching seller orders from Supabase:', error);
    throw error;
  }

  return data as SupabaseOrder[];
};

/**
 * Updates the order status inside Supabase orders table.
 */
export const updateSupabaseOrderStatus = async (orderId: string, status: SupabaseOrder['order_status']): Promise<SupabaseOrder> => {
  if (!supabase) throw new Error('Supabase is not connected');

  const { data, error } = await supabase
    .from('orders')
    .update({ order_status: status })
    .or(`order_id.eq.${orderId},id.eq.${orderId}`)
    .select()
    .single();

  if (error) {
    console.error('Error updating status in Supabase:', error);
    throw error;
  }

  return data as SupabaseOrder;
};

/**
 * Subscribes to the orders table for real-time updates for a specific user.
 */
export const subscribeToUserOrders = (userId: string, callback: (payload: any) => void) => {
  if (!supabase) return null;

  return supabase
    .channel(`orders-${userId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'orders'
      },
      (payload) => {
        // Since we want to ensure RLS-like client behavior, only trigger if user is buyer or seller
        const orderData = payload.new as any;
        if (orderData && (orderData.buyer_id === userId || orderData.seller_id === userId)) {
          console.log('Real-time order update:', payload);
          callback(payload);
        }
      }
    )
    .subscribe();
};
