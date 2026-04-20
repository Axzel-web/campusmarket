import { supabase } from '../lib/supabase';

/**
 * SERVICE: User Management (Supabase-specific storage)
 */

export const uploadAvatar = async (file: File | Blob, userId: string): Promise<string> => {
  if (!supabase) throw new Error('Supabase not connected');

  const fileExt = 'jpg';
  const fileName = `avatars/${userId}-${Date.now()}.${fileExt}`;
  
  // We use the unified 'listings' bucket for all media to reduce setup complexity
  const { error: uploadError } = await supabase.storage
    .from('listings')
    .upload(fileName, file, {
      contentType: 'image/jpeg',
      upsert: true
    });

  if (uploadError) {
    if (uploadError.message.toLowerCase().includes('bucket not found')) {
      throw new Error('Supabase Storage: Please create a bucket named "listings" in your Supabase project (Storage -> New Bucket) to enable image uploads.');
    }
    throw uploadError;
  }

  // Get the public URL
  const { data: { publicUrl } } = supabase.storage
    .from('listings')
    .getPublicUrl(fileName);

  return publicUrl;
};
