import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { 
  Star, 
  Search, 
  Filter, 
  MessageCircle, 
  Flag, 
  Archive, 
  Bell, 
  MoreVertical,
  ChevronDown,
  Calendar,
  User,
  ArrowRight,
  ShoppingBag,
  TrendingUp,
  Eye,
  CheckCircle2,
  Trash2,
  Package,
  Plus
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Review, Listing } from '../types';
import { cn } from '../lib/utils';
import { SupabaseOrder } from '../services/orderService';
import { FileText, Phone, MapPin, Check, X as XIcon, Clock } from 'lucide-react';

interface SellerDashboardProps {
  user: { fullName: string; id: string };
  reviews: Review[];
  listings: Listing[];
  orders?: SupabaseOrder[];
  onReply: (reviewId: string, text: string) => void;
  onArchive: (reviewId: string) => void;
  onReport: (reviewId: string, reason: string) => void;
  onMarkAsSold: (listingId: string) => void;
  onDeleteListing: (listingId: string) => void;
  onUpdateOrderStatus?: (orderId: string, status: SupabaseOrder['order_status']) => void;
  isSupabaseConnected?: boolean;
}

export const SellerDashboard: React.FC<SellerDashboardProps> = ({ 
  user, 
  reviews, 
  listings,
  orders = [],
  onReply, 
  onArchive, 
  onReport,
  onMarkAsSold,
  onDeleteListing,
  onUpdateOrderStatus,
  isSupabaseConnected = false
}) => {
  const [activeTab, setActiveTab] = useState<'products' | 'orders' | 'reviews'>('products');
  const [searchTerm, setSearchTerm] = useState('');
  const [ratingFilter, setRatingFilter] = useState<number | 'all'>('all');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week' | 'month'>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'rating-high' | 'rating-low'>('newest');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [showNotifications, setShowNotifications] = useState(false);

  // Seller Listings (My Products)
  const myListings = useMemo(() => {
    return listings.filter(l => l.sellerId === user.id);
  }, [listings, user.id]);

  // Stats calculation
  const stats = useMemo(() => {
    const approved = reviews.filter(r => r.status === 'approved');
    const totalReviews = approved.length;
    const avgRating = totalReviews > 0 ? approved.reduce((sum, r) => sum + r.rating, 0) / totalReviews : 0;
    
    const activeProducts = myListings.filter(l => l.status === 'active').length;
    const soldListings = myListings.filter(l => l.status === 'sold');
    const itemsSold = soldListings.length;
    const totalRevenue = soldListings.reduce((sum, l) => sum + l.price, 0);
    const totalCommission = totalRevenue * 0.05;
    const netEarnings = totalRevenue - totalCommission;
    
    const totalViews = myListings.reduce((sum, l) => sum + (l.views || 0), 0);
    const totalInquiries = myListings.reduce((sum, l) => sum + (l.inquiries || 0), 0);
    
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const newToday = approved.filter(r => {
      const date = r.approvedAt ? new Date(r.approvedAt.toMillis ? r.approvedAt.toMillis() : r.approvedAt) : new Date();
      return date >= startOfToday;
    }).length;

    return { totalReviews, avgRating, activeProducts, itemsSold, totalRevenue, totalCommission, netEarnings, totalViews, totalInquiries, newToday };
  }, [reviews, myListings]);

  // Filtering logic
  const filteredReviews = useMemo(() => {
    let result = reviews.filter(r => {
      if (r.status !== 'approved') return false;
      
      const matchesSearch = r.customerName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            (r.listingTitle?.toLowerCase() || '').includes(searchTerm.toLowerCase());
      const matchesRating = ratingFilter === 'all' || r.rating === ratingFilter;
      
      let matchesDate = true;
      if (dateFilter !== 'all') {
        const reviewDate = r.approvedAt ? new Date(r.approvedAt.toMillis ? r.approvedAt.toMillis() : r.approvedAt) : new Date();
        const now = new Date();
        if (dateFilter === 'today') {
          matchesDate = reviewDate.toDateString() === now.toDateString();
        } else if (dateFilter === 'week') {
          const weekAgo = new Date();
          weekAgo.setDate(now.getDate() - 7);
          matchesDate = reviewDate >= weekAgo;
        } else if (dateFilter === 'month') {
          const monthAgo = new Date();
          monthAgo.setMonth(now.getMonth() - 1);
          matchesDate = reviewDate >= monthAgo;
        }
      }

      return matchesSearch && matchesRating && matchesDate;
    });

    // Sorting logic
    return result.sort((a, b) => {
      const dateA = a.approvedAt ? Number(a.approvedAt.toMillis ? a.approvedAt.toMillis() : a.approvedAt) : 0;
      const dateB = b.approvedAt ? Number(b.approvedAt.toMillis ? b.approvedAt.toMillis() : b.approvedAt) : 0;

      switch (sortBy) {
        case 'newest':
          return dateB - dateA;
        case 'oldest':
          return dateA - dateB;
        case 'rating-high':
          return b.rating - a.rating || dateB - dateA;
        case 'rating-low':
          return a.rating - b.rating || dateB - dateA;
        default:
          return dateB - dateA;
      }
    });
  }, [reviews, searchTerm, ratingFilter, dateFilter, sortBy]);

  const handleReplySubmit = (id: string) => {
    if (!replyText.trim()) return;
    onReply(id, replyText);
    setReplyingTo(null);
    setReplyText('');
  };

  return (
    <div className="flex-1 bg-bg-light min-h-[calc(100vh-64px)] pb-36 md:pb-16 overflow-y-auto">
      {/* Header */}
      <div className="bg-white border-b border-border-main sticky top-0 z-30 px-4 sm:px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl campus-gradient flex items-center justify-center text-white shadow-lg shadow-brand-primary/20">
            <User size={20} />
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-extrabold text-text-main leading-tight">{user.fullName}</h1>
            <p className="text-[10px] font-black text-[#166534] uppercase tracking-wider">Seller Dashboard</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setShowNotifications(!showNotifications)}
            className="p-2.5 rounded-xl bg-bg-light border border-border-main text-text-muted hover:text-brand-primary transition-all relative"
            title="Notifications"
          >
            <Bell size={20} />
            {stats.newToday > 0 && (
              <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-brand-primary rounded-full border-2 border-white"></span>
            )}
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-6 sm:pt-8 space-y-6 sm:space-y-8">
        {/* Advanced Dashboard Bento Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {/* Net Earnings Big Highlight Card */}
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="sm:col-span-2 bg-[#114022] text-white rounded-[32px] p-6 shadow-xl relative overflow-hidden flex flex-col justify-between min-h-[160px] border border-emerald-950"
          >
            {/* Ambient background decoration */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none"></div>
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-yellow-400/5 rounded-full blur-xl pointer-events-none"></div>
            
            <div className="flex justify-between items-start z-10">
              <div>
                <span className="text-[10px] font-black uppercase tracking-[0.15em] text-emerald-300">Take-Home Profits</span>
                <h4 className="text-2xl sm:text-3xl font-black text-white mt-1">₱{stats.netEarnings.toLocaleString()}</h4>
              </div>
              <div className="p-3 rounded-2xl bg-white/10 text-emerald-300 backdrop-blur-md">
                <CheckCircle2 size={24} />
              </div>
            </div>
            
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/10 pt-4 mt-4 z-10 text-[10.5px] font-bold text-emerald-200">
              <span className="flex items-center gap-1">
                Gross Sales: <span className="text-white font-extrabold">₱{stats.totalRevenue.toLocaleString()}</span>
              </span>
              <span className="hidden sm:inline w-1.5 h-1.5 bg-emerald-500/50 rounded-full"></span>
              <span className="flex items-center gap-1">
                Commission (5%): <span className="text-white font-extrabold">₱{stats.totalCommission.toLocaleString()}</span>
              </span>
            </div>
          </motion.div>

          {/* Items Sold */}
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-[28px] p-6 border border-border-main/70 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
          >
            <div className="flex items-start justify-between mb-4">
              <p className="text-[10px] font-black text-text-muted uppercase tracking-[0.12em]">Items Sold</p>
              <div className="p-2.5 rounded-xl bg-accent-subtle text-brand-primary">
                <Package size={20} />
              </div>
            </div>
            <div>
              <h3 className="text-2xl font-black text-text-main leading-none">{stats.itemsSold}</h3>
              <p className="text-[10px] text-text-muted font-black mt-1.5 uppercase tracking-wide">COMPLETED TRADES</p>
            </div>
          </motion.div>

          {/* Average Rating */}
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white rounded-[28px] p-6 border border-border-main/70 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
          >
            <div className="flex items-start justify-between mb-4">
              <p className="text-[10px] font-black text-text-muted uppercase tracking-[0.12em]">Average Rating</p>
              <div className="p-2.5 rounded-xl bg-amber-50 text-amber-500">
                <Star size={20} fill="currentColor" />
              </div>
            </div>
            <div>
              <div className="flex items-baseline gap-1.5 leading-none">
                <h3 className="text-2xl font-black text-text-main">{stats.avgRating.toFixed(1)}</h3>
                <span className="text-xs text-text-muted font-bold">/ 5.0</span>
              </div>
              <p className="text-[10px] text-amber-600 font-extrabold mt-1.5 uppercase tracking-wide flex items-center gap-1">
                {stats.totalReviews} APPROVED REVIEWS
              </p>
            </div>
          </motion.div>

          {/* Active Products */}
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-white rounded-[28px] p-5 border border-border-main/70 shadow-sm hover:shadow-md transition-all flex items-center justify-between"
          >
            <div className="space-y-1">
              <p className="text-[10px] font-black text-text-muted uppercase tracking-[0.1em]">Active Products</p>
              <h3 className="text-xl font-black text-text-main">{stats.activeProducts}</h3>
            </div>
            <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600">
              <ShoppingBag size={18} />
            </div>
          </motion.div>

          {/* Item views */}
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-white rounded-[28px] p-5 border border-border-main/70 shadow-sm hover:shadow-md transition-all flex items-center justify-between"
          >
            <div className="space-y-1">
              <p className="text-[10px] font-black text-text-muted uppercase tracking-[0.1em]">Total Listing Views</p>
              <h3 className="text-xl font-black text-text-main">{stats.totalViews}</h3>
            </div>
            <div className="p-2.5 rounded-xl bg-purple-50 text-purple-600">
              <Eye size={18} />
            </div>
          </motion.div>

          {/* Inquiries */}
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="bg-white rounded-[28px] p-5 border border-border-main/70 shadow-sm hover:shadow-md transition-all flex items-center justify-between sm:col-span-2"
          >
            <div className="space-y-1">
              <p className="text-[10px] font-black text-text-muted uppercase tracking-[0.1em]">Student Inquiries</p>
              <h3 className="text-xl font-black text-text-main">{stats.totalInquiries}</h3>
            </div>
            <div className="p-2 rounded-xl bg-emerald-50 text-[#166534] flex items-center gap-1.5 px-3">
              <span className="w-1.5 h-1.5 bg-[#166534] rounded-full animate-ping"></span>
              <MessageCircle size={18} className="text-[#166534]" />
            </div>
          </motion.div>
        </div>

        {/* Tabs Control Row */}
        <div className="flex bg-white p-1 rounded-2xl border border-border-main/80 shadow-sm w-full sm:w-fit overflow-x-auto no-scrollbar">
          <button 
            onClick={() => setActiveTab('products')}
            className={cn(
              "flex-1 sm:flex-initial px-4 sm:px-6 py-2.5 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 whitespace-nowrap",
              activeTab === 'products' ? "bg-brand-primary text-white shadow-lg shadow-brand-primary/20" : "text-text-muted hover:text-text-main"
            )}
          >
            <Package size={16} /> My Products
          </button>
          <button 
            onClick={() => setActiveTab('orders')}
            className={cn(
              "flex-1 sm:flex-initial px-4 sm:px-6 py-2.5 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 whitespace-nowrap relative",
              activeTab === 'orders' ? "bg-brand-primary text-white shadow-lg shadow-brand-primary/20" : "text-text-muted hover:text-text-main"
            )}
          >
            <ShoppingBag size={16} /> Product Orders
            {orders.length > 0 && orders.some(o => o.order_status === 'Pending') && (
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white animate-pulse" />
            )}
          </button>
          <button 
            onClick={() => setActiveTab('reviews')}
            className={cn(
              "flex-1 sm:flex-initial px-4 sm:px-6 py-2.5 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 whitespace-nowrap",
              activeTab === 'reviews' ? "bg-brand-primary text-white shadow-lg shadow-brand-primary/20" : "text-text-muted hover:text-text-main"
            )}
          >
            <Star size={16} /> Manage Reviews
          </button>
        </div>

        {activeTab === 'products' ? (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-black text-text-muted uppercase tracking-widest px-2">Your Listings ({myListings.length})</h2>
              <Link to="/sell" className="flex items-center gap-1.5 px-4 py-2.5 bg-brand-primary text-white rounded-xl text-xs font-black shadow-lg shadow-brand-primary/20 hover:bg-brand-primary-hover transition-all">
                <Plus size={16} /> List Item
              </Link>
            </div>

            {myListings.length === 0 ? (
              <div className="bg-white rounded-[32px] p-12 sm:p-16 text-center border-2 border-dashed border-[#166534]/15">
                <Package className="mx-auto text-brand-primary opacity-20 mb-4" size={64} />
                <h3 className="text-lg font-extrabold text-text-main mb-2">No active products</h3>
                <p className="text-text-muted text-sm max-w-xs mx-auto mb-8 font-medium">Start selling to the PLSP community! Post your first item to see metrics here.</p>
                <Link to="/sell" className="px-8 py-3.5 bg-brand-primary hover:bg-brand-primary-hover text-white rounded-xl font-black transition-all shadow-lg shadow-brand-primary/15 inline-block">Post First Item</Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {myListings.map((listing) => (
                  <motion.div 
                    layout
                    key={listing.id}
                    className="bg-white rounded-[28px] p-4 border border-border-main shadow-sm hover:shadow-md hover:border-[#166534]/20 transition-all flex flex-col sm:flex-row items-stretch sm:items-center gap-4 sm:gap-6"
                  >
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden border border-border-main flex-shrink-0 bg-bg-light relative">
                        {listing.images && listing.images.length > 0 ? (
                          <img src={listing.images[0]} alt={listing.title} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center p-2 text-center bg-bg-light">
                            <div className="w-6 h-6 border-2 border-brand-primary/20 border-t-brand-primary rounded-full animate-spin mb-1"></div>
                            <span className="text-[8px] font-black text-brand-primary uppercase tracking-tighter animate-pulse">Syncing...</span>
                          </div>
                        )}
                      </div>
                      
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={cn(
                            "px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider",
                            listing.status === 'active' ? "bg-brand-primary/10 text-brand-primary" : "bg-blue-50 text-blue-600"
                          )}>
                            {listing.status}
                          </span>
                          <span className="text-[10px] font-bold text-text-muted">{listing.category}</span>
                        </div>
                        <h4 className="font-extrabold text-text-main text-base truncate pr-2">{listing.title}</h4>
                        <p className="text-brand-primary font-black text-base">₱{listing.price.toLocaleString()}</p>

                        {/* Mobile stats badges: views and inquiries */}
                        <div className="flex items-center gap-3 sm:hidden text-[10px] font-bold text-text-muted mt-1 bg-bg-light/80 p-1.5 px-2 rounded-lg w-fit">
                          <span className="flex items-center gap-1"><Eye size={12} className="text-text-muted" /> {listing.views || 0} views</span>
                          <span className="text-gray-300">•</span>
                          <span className="flex items-center gap-1"><MessageCircle size={12} className="text-brand-primary" /> {listing.inquiries || 0} inquiries</span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Desktop Stats block */}
                    <div className="hidden sm:flex items-center gap-8 px-8 border-x border-border-main/50">
                      <div className="text-center min-w-[50px]">
                        <p className="text-[9px] font-black text-text-muted uppercase tracking-widest mb-0.5">Views</p>
                        <p className="text-base font-black text-text-main flex items-center justify-center gap-1">
                          <Eye size={12} className="text-[#3b82f6]" />
                          {listing.views || 0}
                        </p>
                      </div>
                      <div className="text-center min-w-[50px]">
                        <p className="text-[9px] font-black text-text-muted uppercase tracking-widest mb-0.5">Inquiries</p>
                        <p className="text-base font-black text-brand-primary flex items-center justify-center gap-1">
                          <MessageCircle size={12} />
                          {listing.inquiries || 0}
                        </p>
                      </div>
                    </div>

                    {/* Actions panel */}
                    <div className="flex items-center justify-end gap-2 pr-1 border-t border-dashed border-gray-100 pt-3 sm:pt-0 sm:border-0 shrink-0">
                      {listing.status === 'active' && (
                        <button 
                          onClick={() => onMarkAsSold(listing.id)}
                          className="flex items-center gap-1.5 px-3.5 py-2.5 bg-brand-primary shadow-sm hover:bg-[#14532d] text-white rounded-xl text-xs font-black transition-all cursor-pointer"
                        >
                          <CheckCircle2 size={14} /> Mark Sold
                        </button>
                      )}
                      <button 
                         onClick={() => onDeleteListing(listing.id)}
                         className="p-2.5 rounded-xl bg-red-50 text-red-500 hover:bg-red-100 transition-all flex items-center justify-center cursor-pointer"
                         title="Delete"
                      >
                        <Trash2 size={16} />
                      </button>
                      <button className="p-2.5 rounded-xl bg-bg-light border border-border-main text-text-muted hover:bg-white transition-all flex items-center justify-center">
                        <MoreVertical size={16} />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        ) : activeTab === 'orders' ? (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-black text-text-muted uppercase tracking-widest px-2">Incoming Reserves & Orders ({orders.filter(o => o.seller_id === user.id).length})</h2>
            </div>

            {orders.filter(o => o.seller_id === user.id).length === 0 ? (
              <div className="bg-white rounded-[32px] p-12 sm:p-16 text-center border-2 border-dashed border-[#166534]/15">
                <ShoppingBag className="mx-auto text-brand-primary opacity-20 mb-4" size={64} />
                <h3 className="text-lg font-extrabold text-text-main mb-2">No product orders yet</h3>
                <p className="text-text-muted text-sm max-w-xs mx-auto mb-8 font-medium">When other students purchase your listings with meetup preferences, they will show up here immediately in real-time.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-6">
                {orders.filter(o => o.seller_id === user.id).map((order) => (
                  <motion.div 
                    layout
                    key={order.order_id}
                    className="bg-white rounded-[28px] p-6 border border-border-main shadow-sm hover:shadow-md hover:border-brand-primary/20 transition-all space-y-4 text-left"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 pb-3">
                      <div>
                        <p className="text-[10px] font-mono font-bold text-text-muted">ORDER ID: {order.order_id.slice(0, 8)}...</p>
                        <p className="text-[10px] text-text-muted font-medium">Placed on: {new Date(order.created_at).toLocaleString()}</p>
                      </div>
                      <div className={cn(
                        "px-3.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border",
                        order.order_status === 'Completed' ? "bg-green-50 text-green-600 border-green-100" :
                        order.order_status === 'Cancelled' ? "bg-red-50 text-red-600 border-red-100" :
                        order.order_status === 'Confirmed' ? "bg-blue-50 text-blue-600 border-blue-100" :
                        "bg-amber-50 text-amber-600 border-amber-100 animate-pulse"
                      )}>
                        {order.order_status}
                      </div>
                    </div>

                    <div className="flex flex-col md:flex-row gap-6">
                      <div className="flex items-center gap-4 flex-1 min-w-0">
                        <div className="w-20 h-20 rounded-2xl overflow-hidden border border-border-main flex-shrink-0 bg-bg-light">
                          {order.product_image ? (
                            <img src={order.product_image} alt={order.product_name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-gray-100 text-gray-400">
                              <ShoppingBag size={24} />
                            </div>
                          )}
                        </div>
                        <div className="space-y-1">
                          <h4 className="font-extrabold text-text-main text-base truncate">{order.product_name}</h4>
                          <p className="text-text-muted text-xs font-bold">
                            Quantity: <span className="text-text-main font-black">{order.quantity} unit{order.quantity > 1 ? 's' : ''}</span>
                          </p>
                          <p className="text-brand-primary font-black text-sm">
                            ₱{order.unit_price.toLocaleString()} each • Total: ₱{order.total_price.toLocaleString()}
                          </p>
                        </div>
                      </div>

                      <div className="flex-1 bg-green-50/50 p-4 rounded-2xl border border-green-100/50 space-y-2">
                        <p className="text-[10px] font-black text-[#166534] uppercase tracking-wider flex items-center gap-1.5 border-b border-green-100 pb-1.5 mb-1.5">
                          <MapPin size={12} className="text-brand-primary" /> Meetup Location & Preferences
                        </p>
                        <p className="text-xs font-black text-text-main leading-snug">{order.meetup_location}</p>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] font-semibold text-text-muted">
                          <span className="flex items-center gap-1">
                            <Clock size={11} /> {order.meetup_date}
                          </span>
                          <span className="flex items-center gap-1">
                            • {order.meetup_time}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="p-4 bg-bg-light rounded-2xl border border-border-main/50 space-y-2">
                      <p className="text-[10px] font-black text-text-muted uppercase tracking-wider">Buyer Information</p>
                      <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs">
                        <p className="font-black text-text-main flex items-center gap-1.5">
                          Buyer: <span className="font-bold text-text-muted">{order.buyer_id === user.id ? 'You (Self-Purchase)' : (order.buyer_name || 'Student Buyer')}</span>
                        </p>
                        <a 
                          href={`tel:${order.contact_number}`} 
                          className="flex items-center gap-1 text-brand-primary font-black hover:underline"
                        >
                          <Phone size={12} /> {order.contact_number}
                        </a>
                      </div>
                      {order.buyer_message && (
                        <div className="mt-2 text-xs text-text-muted bg-white p-3 rounded-xl border border-border-main/30 leading-relaxed italic">
                          "{order.buyer_message}"
                        </div>
                      )}
                    </div>

                    {onUpdateOrderStatus && (order.order_status === 'Pending' || order.order_status === 'Confirmed') && (
                      <div className="flex flex-wrap gap-2 pt-2 border-t border-dashed border-gray-100">
                        {order.order_status === 'Pending' && (
                          <>
                            <button
                              onClick={() => {
                                if (window.confirm("Approve this purchase reserve? This confirms the meetup arrangements.")) {
                                  onUpdateOrderStatus(order.order_id, 'Confirmed');
                                }
                              }}
                              className="flex-1 py-3 bg-brand-primary hover:bg-[#14532d] shadow-sm text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer"
                            >
                              <Check size={14} /> Accept and Confirm
                            </button>
                            <button
                              onClick={() => {
                                if (window.confirm("Are you sure you want to cancel this order?")) {
                                  onUpdateOrderStatus(order.order_id, 'Cancelled');
                                }
                              }}
                              className="px-4 py-3 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer"
                            >
                              <XIcon size={14} /> Decline
                            </button>
                          </>
                        )}
                        {order.order_status === 'Confirmed' && (
                          <>
                            <button
                              onClick={() => {
                                if (window.confirm("Have you successfully met and completed the transaction with " + (order.buyer_name || 'the buyer') + "?")) {
                                  onUpdateOrderStatus(order.order_id, 'Completed');
                                }
                              }}
                              className="flex-1 py-3 bg-brand-primary hover:bg-[#14532d] shadow-sm text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer"
                            >
                              <Check size={14} /> Completed (Cash Received)
                            </button>
                            <button
                              onClick={() => {
                                if (window.confirm("Are you sure you want to cancel this confirmed order?")) {
                                  onUpdateOrderStatus(order.order_id, 'Cancelled');
                                }
                              }}
                              className="px-4 py-3 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer"
                            >
                              <XIcon size={14} /> Cancel
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            {/* Filters Section */}
            <div className="bg-white rounded-[28px] p-4 sm:p-6 border border-border-main/70 shadow-sm space-y-4">
              <div className="flex flex-col lg:flex-row lg:items-center gap-3 sm:gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" size={16} />
                  <input 
                    type="text"
                    placeholder="Search reviewer or item title..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full h-11 pl-11 pr-4 bg-bg-light border border-border-main rounded-2xl text-xs sm:text-sm font-medium focus:ring-2 focus:ring-brand-primary/10 focus:border-brand-primary transition-all outline-none"
                  />
                </div>
                <div className="grid grid-cols-3 sm:flex items-center gap-2 sm:gap-3 w-full lg:w-auto">
                  <div className="relative col-span-1">
                    <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" size={13} />
                    <select 
                      value={ratingFilter}
                      onChange={(e) => setRatingFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                      className="w-full sm:w-auto h-11 pl-8 sm:pl-9 pr-7 sm:pr-8 bg-bg-light border border-border-main rounded-2xl text-[11px] sm:text-xs font-bold text-text-main appearance-none cursor-pointer focus:ring-2 focus:ring-brand-primary/10 focus:border-brand-primary outline-none"
                    >
                      <option value="all">All Stars</option>
                      {[5, 4, 3, 2, 1].map(r => <option key={r} value={r}>{r} ★</option>)}
                    </select>
                    <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" size={13} />
                  </div>
                  <div className="relative col-span-1">
                    <Calendar className="absolute left-2.5 sm:left-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" size={13} />
                    <select 
                      value={dateFilter}
                      onChange={(e) => setDateFilter(e.target.value as any)}
                      className="w-full sm:w-auto h-11 pl-8 sm:pl-9 pr-7 sm:pr-8 bg-bg-light border border-border-main rounded-2xl text-[11px] sm:text-xs font-bold text-text-main appearance-none cursor-pointer focus:ring-2 focus:ring-brand-primary/10 focus:border-brand-primary outline-none"
                    >
                      <option value="all">All Time</option>
                      <option value="today">Today</option>
                      <option value="week">7 Days</option>
                      <option value="month">30 Days</option>
                    </select>
                    <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" size={13} />
                  </div>
                  <div className="relative col-span-1">
                    <TrendingUp className="absolute left-2.5 sm:left-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" size={13} />
                    <select 
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as any)}
                      className="w-full sm:w-auto h-11 pl-8 sm:pl-9 pr-7 sm:pr-8 bg-bg-light border border-border-main rounded-2xl text-[11px] sm:text-xs font-bold text-text-main appearance-none cursor-pointer focus:ring-2 focus:ring-brand-primary/10 focus:border-brand-primary outline-none"
                    >
                      <option value="newest">Newest</option>
                      <option value="oldest">Oldest</option>
                      <option value="rating-high">High Rating</option>
                      <option value="rating-low">Low Rating</option>
                    </select>
                    <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" size={13} />
                  </div>
                </div>
              </div>
            </div>

            {/* Reviews List */}
            <div className="space-y-4">
              <div className="flex items-center justify-between px-2">
                <h2 className="text-xs font-black text-text-muted uppercase tracking-[0.12em]">
                  Review Feed ({filteredReviews.length} results)
                </h2>
              </div>

              {filteredReviews.length === 0 ? (
                <div className="bg-white rounded-[32px] p-12 text-center border border-border-main border-dashed">
                  <Star className="mx-auto text-text-muted opacity-20 mb-4" size={48} />
                  <p className="text-text-muted font-bold text-sm">No reviews found matching your criteria.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredReviews.map((review) => (
                    <motion.div 
                      layout
                      key={review.id}
                      className="bg-white rounded-[28px] p-5 sm:p-6 border border-border-main/70 shadow-sm hover:shadow-md hover:border-brand-primary/25 transition-all flex flex-col sm:flex-row gap-4 sm:gap-6"
                    >
                      {/* Rating Badge - Desktop Only */}
                      <div className="hidden sm:flex flex-col items-center gap-1 min-w-[64px]">
                        <div className={cn(
                          "w-12 h-12 rounded-2xl flex items-center justify-center text-lg font-black",
                          review.rating >= 4 ? "bg-green-50 text-green-600" : "bg-amber-50 text-amber-600"
                        )}>
                          {review.rating}
                        </div>
                        <div className="flex gap-0.5">
                          {Array.from({ length: review.rating }).map((_, i) => (
                            <Star key={i} size={8} fill="currentColor" className={review.rating >= 4 ? "text-green-600" : "text-amber-600"} />
                          ))}
                        </div>
                      </div>

                      <div className="flex-1 space-y-3 min-w-0">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <h4 className="font-extrabold text-text-main text-base leading-tight truncate">{review.customerName}</h4>
                              
                              {/* Mobile Only Rating Indicator */}
                              <div className="flex sm:hidden items-center gap-1 bg-amber-50 px-2 py-0.5 rounded-full select-none">
                                <Star size={10} fill="currentColor" className="text-amber-500" />
                                <span className="text-[10px] font-black text-amber-600 leading-none">{review.rating}</span>
                              </div>
                            </div>
                            <p className="text-[10.5px] font-bold text-text-muted mt-1 uppercase tracking-wider flex flex-wrap items-center gap-1.5">
                              Reviewed: <span className="text-brand-primary font-black">{review.listingTitle || 'Marketplace Item'}</span> 
                              <span className="text-gray-300">•</span> 
                              <span>{review.approvedAt ? new Date(review.approvedAt.toMillis ? review.approvedAt.toMillis() : review.approvedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : 'Recently Approved'}</span>
                            </p>
                          </div>
                          
                          <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
                             <button 
                               onClick={() => onArchive(review.id)}
                               className="p-2 rounded-xl bg-bg-light border border-border-main text-text-muted hover:text-red-500 hover:border-red-500/30 transition-all flex items-center justify-center cursor-pointer"
                               title="Archive"
                             >
                               <Archive size={14} />
                             </button>
                             <button 
                               onClick={() => onReport(review.id, 'spam')}
                               className="p-2 rounded-xl bg-bg-light border border-border-main text-text-muted hover:text-amber-500 hover:border-amber-500/30 transition-all flex items-center justify-center cursor-pointer"
                               title="Report"
                             >
                               <Flag size={14} />
                             </button>
                             <button className="p-2 rounded-xl bg-bg-light border border-border-main text-text-muted hover:bg-white transition-all flex items-center justify-center">
                               <MoreVertical size={14} />
                             </button>
                          </div>
                        </div>

                        <div className="bg-gray-50 border border-gray-100 rounded-2xl p-4">
                          <p className="text-text-main text-sm font-medium leading-relaxed italic">
                            "{review.message}"
                          </p>
                        </div>

                        {review.sellerReply ? (
                          <div className="flex gap-3 items-start pl-4 sm:pl-6 border-l-2 border-brand-primary/25 mt-2">
                             <div className="w-8 h-8 rounded-lg bg-accent-subtle flex items-center justify-center text-brand-primary font-black text-[9px] shrink-0">YOU</div>
                             <div className="flex-1 bg-accent-subtle/30 rounded-2xl p-3 border border-brand-primary/10">
                               <p className="text-xs font-semibold text-text-main leading-relaxed">
                                {review.sellerReply}
                               </p>
                             </div>
                          </div>
                        ) : (
                          <div className="pt-1">
                            {replyingTo === review.id ? (
                              <div className="space-y-3 mt-2 animate-fadeIn">
                                <textarea 
                                  autoFocus
                                  placeholder="Write a public reply..."
                                  value={replyText}
                                  onChange={(e) => setReplyText(e.target.value)}
                                  className="w-full p-4 rounded-xl bg-white border border-brand-primary/30 focus:ring-2 focus:ring-brand-primary/10 outline-none text-xs font-medium min-h-[90px]"
                                />
                                <div className="flex items-center gap-2">
                                  <button 
                                    onClick={() => handleReplySubmit(review.id)}
                                    className="px-4 py-2.5 bg-brand-primary text-white rounded-xl text-xs font-extrabold uppercase tracking-wider hover:bg-brand-primary-hover shadow-lg shadow-brand-primary/15 transition-all cursor-pointer"
                                  >
                                    Send Reply
                                  </button>
                                  <button 
                                    onClick={() => setReplyingTo(null)}
                                    className="px-4 py-2.5 bg-bg-light border border-border-main text-text-muted rounded-xl text-xs font-bold hover:bg-white transition-all cursor-pointer"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <button 
                                onClick={() => setReplyingTo(review.id)}
                                className="flex items-center gap-1.5 text-xs font-extrabold text-brand-[#166534] hover:gap-2.5 transition-all uppercase tracking-wider cursor-pointer"
                              >
                                <MessageCircle size={14} /> Reply to {review.customerName.split(' ')[0]} <ArrowRight size={14} />
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
