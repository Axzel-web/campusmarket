export type UserRole = 'buyer' | 'seller' | 'admin';

export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  courseAndYear: string;
  studentId?: string;
  studentIdImage?: string;
  universityEmail?: string;
  bio?: string;
  contactDetails?: string;
  role: UserRole;
  isVerified: boolean;
  verificationStatus: 'none' | 'pending' | 'approved' | 'rejected';
  createdAt: number;
}

export interface Listing {
  id: string;
  title: string;
  price: number;
  description: string;
  images: string[];
  category: string;
  sellerId: string;
  sellerName: string;
  sellerRating?: number;
  status: 'active' | 'sold' | 'deleted';
  tags: string[];
  createdAt: number;
}

export interface ChatMessage {
  id: string;
  chatId: string;
  senderId: string;
  text: string;
  createdAt: number;
}

export interface Chat {
  id: string;
  participants: string[];
  lastMessage?: string;
  lastMessageAt?: number;
  listingId: string;
  listingTitle: string;
}

export interface Favorite {
  userId: string;
  listingId: string;
}
