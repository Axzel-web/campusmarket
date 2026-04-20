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

interface SellerDashboardProps {
  user: { fullName: string; id: string };
  reviews: Review[];
  listings: Listing[];
  onReply: (reviewId: string, text: string) => void;
  onArchive: (reviewId: string) => void;
  onReport: (reviewId: string, reason: string) => void;
  onMarkAsSold: (listingId: string) => void;
  onDeleteListing: (listingId: string) => void;
  isSupabaseConnected?: boolean;
}

export const SellerDashboard: React.FC<SellerDashboardProps> = ({ 
  user, 
  reviews, 
  listings,
  onReply, 
  onArchive, 
  onReport,
  onMarkAsSold,
  onDeleteListing,
  isSupabaseConnected = false
}) => {
  const [activeTab, setActiveTab] = useState<'reviews' | 'products'>('products');
  const [searchTerm, setSearchTerm] = useState('');
  const [ratingFilter, setRatingFilter] = useState<number | 'all'>('all');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week' | 'month'>('all');
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
    const totalViews = myListings.reduce((sum, l) => sum + (l.views || 0), 0);
    const totalInquiries = myListings.reduce((sum, l) => sum + (l.inquiries || 0), 0);
    
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const newToday = approved.filter(r => {
      const date = r.approvedAt ? new Date(r.approvedAt.toMillis ? r.approvedAt.toMillis() : r.approvedAt) : new Date();
      return date >= startOfToday;
    }).length;

    return { totalReviews, avgRating, activeProducts, totalViews, totalInquiries, newToday };
  }, [reviews, myListings]);

  // Filtering logic
  const filteredReviews = useMemo(() => {
    return reviews.filter(r => {
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
    }).sort((a, b) => {
       const dateA = a.approvedAt ? (a.approvedAt.toMillis ? a.approvedAt.toMillis() : a.approvedAt) : 0;
       const dateB = b.approvedAt ? (b.approvedAt.toMillis ? b.approvedAt.toMillis() : b.approvedAt) : 0;
       return Number(dateB) - Number(dateA);
    });
  }, [reviews, searchTerm, ratingFilter, dateFilter]);

  const handleReplySubmit = (id: string) => {
    if (!replyText.trim()) return;
    onReply(id, replyText);
    setReplyingTo(null);
    setReplyText('');
  };

  return (
    <div className="flex-1 bg-bg-light min-h-[calc(100vh-64px)] pb-10">
      {/* Header */}
      <div className="bg-white border-b border-border-main sticky top-0 z-30 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl campus-gradient flex items-center justify-center text-white shadow-lg shadow-brand-primary/20">
            <User size={20} />
          </div>
          <div>
            <h1 className="text-lg font-bold text-text-main leading-tight">{user.fullName}</h1>
            <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Seller Dashboard</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setShowNotifications(!showNotifications)}
            className="p-2.5 rounded-xl bg-bg-light border border-border-main text-text-muted hover:text-brand-primary transition-all relative"
          >
            <Bell size={20} />
            {stats.newToday > 0 && (
              <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-brand-primary rounded-full border-2 border-white"></span>
            )}
          </button>
          
          <div className={cn(
            "hidden sm:flex items-center gap-2 px-3 py-2 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all",
            isSupabaseConnected 
              ? "bg-emerald-50 border-emerald-100 text-emerald-600" 
              : "bg-gray-50 border-gray-100 text-gray-400 opacity-60"
          )}>
            <div className={cn(
              "w-1.5 h-1.5 rounded-full animate-pulse",
              isSupabaseConnected ? "bg-emerald-500" : "bg-gray-400"
            )} />
            Supabase Sync {isSupabaseConnected ? 'Active' : 'Offline'}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 pt-8 space-y-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[
            { label: 'Active Products', value: stats.activeProducts, icon: ShoppingBag, color: 'text-brand-primary', bg: 'bg-accent-subtle' },
            { label: 'Average Rating', value: stats.avgRating.toFixed(1), icon: Star, color: 'text-amber-500', bg: 'bg-amber-50' },
            { label: 'Total Item Views', value: stats.totalViews, icon: Eye, color: 'text-blue-500', bg: 'bg-blue-50' },
            { label: 'Customer Inquiries', value: stats.totalInquiries, icon: MessageCircle, color: 'text-green-500', bg: 'bg-green-50' },
          ].map((stat, i) => (
            <motion.div 
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="bg-white rounded-3xl p-6 border border-border-main shadow-sm flex items-start justify-between"
            >
              <div>
                <p className="text-[10px] font-black text-text-muted uppercase tracking-widest mb-1">{stat.label}</p>
                <h3 className="text-2xl font-black text-text-main">{stat.value}</h3>
              </div>
              <div className={cn("p-2.5 rounded-xl", stat.bg)}>
                <stat.icon className={stat.color} size={20} fill={stat.icon === Star ? "currentColor" : "none"} />
              </div>
            </motion.div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex bg-white p-1 rounded-2xl border border-border-main shadow-sm w-fit">
          <button 
            onClick={() => setActiveTab('products')}
            className={cn(
              "px-6 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-2",
              activeTab === 'products' ? "bg-brand-primary text-white shadow-lg shadow-brand-primary/20" : "text-text-muted hover:text-text-main"
            )}
          >
            <Package size={16} /> My Products
          </button>
          <button 
            onClick={() => setActiveTab('reviews')}
            className={cn(
              "px-6 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-2",
              activeTab === 'reviews' ? "bg-brand-primary text-white shadow-lg shadow-brand-primary/20" : "text-text-muted hover:text-text-main"
            )}
          >
            <Star size={16} /> Manage Reviews
          </button>
        </div>

        {activeTab === 'products' ? (
          <div className="space-y-6">
             <div className="flex items-center justify-between">
              <h2 className="text-sm font-black text-text-muted uppercase tracking-widest px-2">Your Listings ({myListings.length})</h2>
              <Link to="/sell" className="flex items-center gap-2 px-4 py-2 bg-brand-primary text-white rounded-xl text-xs font-black shadow-lg shadow-brand-primary/20 hover:bg-brand-primary-hover transition-all">
                <Plus size={16} /> List New Item
              </Link>
            </div>

            {myListings.length === 0 ? (
              <div className="bg-white rounded-3xl p-16 text-center border border-border-main border-dashed">
                <Package className="mx-auto text-text-muted opacity-20 mb-4" size={64} />
                <h3 className="text-lg font-bold text-text-main mb-2">No active products</h3>
                <p className="text-text-muted text-sm max-w-xs mx-auto mb-8 font-medium">Start selling to the PLSP community! Post your first item to see metrics here.</p>
                <Link to="/sell" className="px-8 py-3 bg-brand-primary text-white rounded-xl font-bold">Post First Item</Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {myListings.map((listing) => (
                  <motion.div 
                    layout
                    key={listing.id}
                    className="bg-white rounded-3xl p-4 border border-border-main shadow-sm flex items-center gap-6"
                  >
                    <div className="w-24 h-24 rounded-2xl overflow-hidden border border-border-main flex-shrink-0 bg-bg-light relative">
                      {listing.images && listing.images.length > 0 ? (
                        <img src={listing.images[0]} alt={listing.title} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center p-2 text-center bg-bg-light">
                          <div className="w-6 h-6 border-2 border-brand-primary/20 border-t-brand-primary rounded-full animate-spin mb-1"></div>
                          <span className="text-[8px] font-black text-brand-primary uppercase tracking-tighter animate-pulse">Syncing...</span>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={cn(
                          "px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider",
                          listing.status === 'active' ? "bg-green-50 text-green-600" : "bg-blue-50 text-blue-600"
                        )}>
                          {listing.status}
                        </span>
                        <span className="text-[10px] font-bold text-text-muted">• {listing.category}</span>
                      </div>
                      <h4 className="font-black text-text-main text-base truncate">{listing.title}</h4>
                      <p className="text-brand-primary font-black text-sm">₱{listing.price.toLocaleString()}</p>
                    </div>

                    <div className="hidden md:flex items-center gap-8 px-8 border-x border-border-main/50">
                      <div className="text-center">
                        <p className="text-[10px] font-black text-text-muted uppercase tracking-widest">Views</p>
                        <p className="text-lg font-black text-text-main">{listing.views || 0}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-[10px] font-black text-text-muted uppercase tracking-widest">Inquiries</p>
                        <p className="text-lg font-black text-text-main">{listing.inquiries || 0}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pr-2">
                      {listing.status === 'active' && (
                        <button 
                          onClick={() => onMarkAsSold(listing.id)}
                          className="flex items-center gap-2 px-4 py-2.5 bg-green-50 text-green-600 rounded-xl text-xs font-black hover:bg-green-100 transition-all"
                        >
                          <CheckCircle2 size={16} /> Mark Sold
                        </button>
                      )}
                      <button 
                         onClick={() => onDeleteListing(listing.id)}
                         className="p-2.5 rounded-xl bg-red-50 text-red-500 hover:bg-red-100 transition-all"
                         title="Delete"
                      >
                        <Trash2 size={18} />
                      </button>
                      <button className="p-2.5 rounded-xl bg-bg-light border border-border-main text-text-muted hover:bg-white transition-all">
                        <MoreVertical size={18} />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-8">
            {/* Filters Section */}
            <div className="bg-white rounded-3xl p-6 border border-border-main shadow-sm space-y-4">
              <div className="flex flex-col md:flex-row md:items-center gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" size={18} />
                  <input 
                    type="text"
                    placeholder="Search customer or product name..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full h-12 pl-12 pr-4 bg-bg-light border border-border-main rounded-2xl text-sm font-medium focus:ring-2 focus:ring-brand-primary/10 focus:border-brand-primary transition-all outline-none"
                  />
                </div>
                <div className="flex items-center gap-3">
                  <div className="relative group">
                    <Filter className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" size={16} />
                    <select 
                      value={ratingFilter}
                      onChange={(e) => setRatingFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                      className="h-12 pl-10 pr-10 bg-bg-light border border-border-main rounded-2xl text-sm font-bold text-text-main appearance-none cursor-pointer focus:ring-2 focus:ring-brand-primary/10 focus:border-brand-primary outline-none"
                    >
                      <option value="all">Rating: All</option>
                      {[5, 4, 3, 2, 1].map(r => <option key={r} value={r}>{r} Stars</option>)}
                    </select>
                    <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" size={16} />
                  </div>
                  <div className="relative group">
                    <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" size={16} />
                    <select 
                      value={dateFilter}
                      onChange={(e) => setDateFilter(e.target.value as any)}
                      className="h-12 pl-10 pr-10 bg-bg-light border border-border-main rounded-2xl text-sm font-bold text-text-main appearance-none cursor-pointer focus:ring-2 focus:ring-brand-primary/10 focus:border-brand-primary outline-none"
                    >
                      <option value="all">Date: All Time</option>
                      <option value="today">Today</option>
                      <option value="week">This Week</option>
                      <option value="month">This Month</option>
                    </select>
                    <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" size={16} />
                  </div>
                </div>
              </div>
            </div>

            {/* Reviews List */}
            <div className="space-y-4">
              <div className="flex items-center justify-between px-2">
                <h2 className="text-sm font-bold text-text-muted uppercase tracking-widest">
                  Review Feed ({filteredReviews.length} results)
                </h2>
              </div>

              {filteredReviews.length === 0 ? (
                <div className="bg-white rounded-3xl p-12 text-center border border-border-main border-dashed">
                  <Star className="mx-auto text-text-muted opacity-20 mb-4" size={48} />
                  <p className="text-text-muted font-bold text-sm">No reviews found matching your criteria.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredReviews.map((review) => (
                    <motion.div 
                      layout
                      key={review.id}
                      className="bg-white rounded-3xl p-6 border border-border-main shadow-sm hover:border-brand-primary/30 transition-all flex gap-6"
                    >
                      {/* Rating Badge */}
                      <div className="hidden sm:flex flex-col items-center gap-1 min-w-[60px]">
                        <div className={cn(
                          "w-12 h-12 rounded-2xl flex items-center justify-center text-xl font-black",
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

                      <div className="flex-1 space-y-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <h4 className="font-black text-text-main text-base">{review.customerName}</h4>
                            <p className="text-[10px] font-bold text-text-muted mt-0.5 uppercase tracking-wide flex items-center gap-1.5">
                              Reviewed: <span className="text-brand-primary">{review.listingTitle || 'Marketplace Item'}</span> 
                              • {review.approvedAt ? new Date(review.approvedAt.toMillis ? review.approvedAt.toMillis() : review.approvedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : 'Recently Approved'}
                            </p>
                          </div>
                          
                          <div className="flex items-center gap-2">
                             <button 
                               onClick={() => onArchive(review.id)}
                               className="p-2.5 rounded-xl bg-bg-light border border-border-main text-text-muted hover:text-red-500 hover:border-red-500/30 transition-all"
                               title="Archive"
                             >
                               <Archive size={16} />
                             </button>
                             <button 
                               onClick={() => onReport(review.id, 'spam')}
                               className="p-2.5 rounded-xl bg-bg-light border border-border-main text-text-muted hover:text-amber-500 hover:border-amber-500/30 transition-all"
                               title="Report"
                             >
                               <Flag size={16} />
                             </button>
                             <button className="p-2.5 rounded-xl bg-bg-light border border-border-main text-text-muted hover:bg-white transition-all">
                               <MoreVertical size={16} />
                             </button>
                          </div>
                        </div>

                        <div className="bg-bg-light/50 border border-border-main/50 rounded-2xl p-4">
                          <p className="text-text-main text-sm font-medium leading-relaxed italic">
                            "{review.message}"
                          </p>
                        </div>

                        {review.sellerReply ? (
                          <div className="flex gap-3 items-start pl-6 border-l-2 border-brand-primary/20">
                             <div className="w-8 h-8 rounded-lg bg-accent-subtle flex items-center justify-center text-brand-primary font-black text-[10px]">YOU</div>
                             <div className="flex-1 bg-accent-subtle/30 rounded-2xl p-3 border border-brand-primary/10">
                               <p className="text-xs font-semibold text-text-main leading-relaxed">
                                {review.sellerReply}
                               </p>
                             </div>
                          </div>
                        ) : (
                          <div className="pt-2">
                            {replyingTo === review.id ? (
                              <div className="space-y-3">
                                <textarea 
                                  autoFocus
                                  placeholder="Write a public reply..."
                                  value={replyText}
                                  onChange={(e) => setReplyText(e.target.value)}
                                  className="w-full p-4 rounded-2xl bg-white border border-brand-primary/30 focus:ring-2 focus:ring-brand-primary/10 outline-none text-xs font-medium min-h-[100px]"
                                />
                                <div className="flex gap-2">
                                  <button 
                                    onClick={() => handleReplySubmit(review.id)}
                                    className="px-5 py-2.5 bg-brand-primary text-white rounded-xl text-xs font-bold shadow-lg shadow-brand-primary/20"
                                  >
                                    Send Public Reply
                                  </button>
                                  <button 
                                    onClick={() => setReplyingTo(null)}
                                    className="px-5 py-2.5 bg-bg-light border border-border-main text-text-muted rounded-xl text-xs font-bold"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <button 
                                onClick={() => setReplyingTo(review.id)}
                                className="flex items-center gap-2 text-xs font-black text-brand-primary hover:gap-3 transition-all uppercase tracking-widest"
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
