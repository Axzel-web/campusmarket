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
  avatarUrl?: string;
  role: UserRole;
  isVerified: boolean;
  onboarded?: boolean;
  interests?: string[];
  verificationStatus: 'none' | 'pending' | 'approved' | 'rejected';
  createdAt: any; // Timestamp or number
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
  sellerAvatar?: string;
  sellerRating?: number;
  status: 'active' | 'sold' | 'archived';
  tags: string[];
  condition: 'New' | 'Used';
  quantity: number;
  location: string;
  contactMethod: string;
  views: number;
  inquiries: number;
  isFeatured?: boolean;
  createdAt: any; // Timestamp or number
  updatedAt?: any;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  text: string;
  createdAt: any; // Timestamp or number
}

export interface Chat {
  id: string;
  participants: string[];
  lastMessage?: string;
  lastMessageAt?: any; // Timestamp or number
  listingId: string;
  listingTitle: string;
  sellerName?: string;
  archivedBy?: string[];
}

export interface Favorite {
  userId: string;
  listingId: string;
}

export interface Review {
  id: string;
  customerId: string;
  customerName: string;
  listingId: string;
  listingTitle?: string;
  sellerId: string;
  rating: number;
  message: string;
  status: 'pending' | 'approved' | 'rejected' | 'archived';
  sellerReply?: string;
  approvedAt?: any;
  createdAt: any;
}

export interface SellerApplication {
  userId: string;
  fullName: string;
  school: string;
  contactLink: string;
  photoURL: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: any;
}

export interface Transaction {
  id: string;
  listingId: string;
  listingTitle: string;
  listingImage?: string;
  buyerId: string;
  buyerName: string;
  sellerId: string;
  sellerName: string;
  amount: number;
  commissionAmount: number;
  sellerEarnings: number;
  status: 'pending' | 'completed' | 'cancelled';
  paymentMethod: 'cash_on_meetup' | 'bank_transfer' | 'other';
  createdAt: any;
}
