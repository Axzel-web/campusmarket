import { supabase } from '../lib/supabase';

/**
 * SERVICE: User Management (Supabase-specific storage)
 */

export const uploadUserMedia = async (file: File | Blob, userId: string, folder: 'avatars' | 'identities'): Promise<string> => {
  if (!supabase) throw new Error('Supabase not connected. Please ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set in your environment variables.');

  const fileExt = 'jpg';
  const fileName = `${folder}/${userId}-${Date.now()}.${fileExt}`;
  
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

// Backward compatibility or specific alias
export const uploadAvatar = (file: File | Blob, userId: string) => uploadUserMedia(file, userId, 'avatars');
export const uploadStudentId = (file: File | Blob, userId: string) => uploadUserMedia(file, userId, 'identities');

/**
 * Mirror profile data to Supabase
 */
export const syncUserProfileToSupabase = async (userId: string, data: any) => {
  if (!supabase) return;
  try {
    const { error } = await supabase
      .from('profiles')
      .upsert({
        id: userId,
        full_name: data.fullName,
        email: data.email,
        avatar_url: data.avatarUrl || null,
        course_and_year: data.courseAndYear || null,
        bio: data.bio || null,
        interests: data.interests || [],
        onboarded: data.onboarded ?? false,
        updated_at: new Date().toISOString()
      });
    if (error) console.warn("Supabase profile sync error:", error.message);
  } catch (err) {
    console.warn("Supabase profile sync catch:", err);
  }
};
