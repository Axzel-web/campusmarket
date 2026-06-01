import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Calendar, MapPin, Phone, MessageSquare, ShoppingBag, Info, ShieldCheck, AlertCircle } from 'lucide-react';
import { Listing } from '../types';
import { useApp } from '../App';
import { cn } from '../lib/utils';

interface BuyNowModalProps {
  isOpen: boolean;
  onClose: () => void;
  listing: Listing;
}

export const BuyNowModal = ({ isOpen, onClose, listing }: BuyNowModalProps) => {
  const { createOrder } = useApp();
  
  // Form fields
  const [quantity, setQuantity] = useState(1);
  const [contactNumber, setContactNumber] = useState('');
  const [meetupLocation, setMeetupLocation] = useState(listing.location || '');
  const [meetupDate, setMeetupDate] = useState('');
  const [meetupTime, setMeetupTime] = useState('');
  const [buyerMessage, setBuyerMessage] = useState('');
  
  // UI States
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Reset form when listing changes or modal opens
  useEffect(() => {
    if (isOpen) {
      setQuantity(1);
      setContactNumber('');
      setMeetupLocation(listing.location || '');
      setMeetupDate('');
      setMeetupTime('');
      setBuyerMessage('');
      setErrors({});
    }
  }, [isOpen, listing]);

  if (!isOpen) return null;

  // Max quantity is the listing quantity
  const maxQty = listing.quantity || 1;

  const handleIncrement = () => {
    if (quantity < maxQty) {
      setQuantity(prev => prev + 1);
    }
  };

  const handleDecrement = () => {
    if (quantity > 1) {
      setQuantity(prev => prev - 1);
    }
  };

  const totalPrice = listing.price * quantity;

  // Form Validation
  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    // Contact number check (e.g. at least 10-11 digits)
    if (!contactNumber.trim()) {
      newErrors.contactNumber = 'Contact number is required';
    } else if (!/^\+?[0-9\s-]{7,15}$/.test(contactNumber.trim())) {
      newErrors.contactNumber = 'Please enter a valid phone number';
    }

    if (!meetupLocation.trim()) {
      newErrors.meetupLocation = 'Meetup location is required';
    }

    if (!meetupDate) {
      newErrors.meetupDate = 'Meetup date is required';
    } else {
      const selectedDate = new Date(meetupDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (selectedDate < today) {
        newErrors.meetupDate = 'Meetup date cannot be in the past';
      }
    }

    if (!meetupTime) {
      newErrors.meetupTime = 'Meetup time is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleConfirmOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setSubmitting(true);
    try {
      await createOrder({
        product_id: listing.id,
        product_name: listing.title,
        product_image: listing.images[0] || `https://picsum.photos/seed/${listing.id}/300/300`,
        quantity,
        unit_price: listing.price,
        total_price: totalPrice,
        contact_number: contactNumber.trim(),
        meetup_location: meetupLocation.trim(),
        meetup_date: meetupDate,
        meetup_time: meetupTime,
        buyer_message: buyerMessage.trim(),
        seller_id: listing.sellerId,
        seller_name: listing.sellerName,
      });
      onClose();
    } catch (err) {
      console.error('Order reservation error:', err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
        {/* Backdrop overlay */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        />

        {/* Modal / Drawer content */}
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 220 }}
          className={cn(
            "relative w-full max-w-lg bg-white overflow-hidden shadow-2xl flex flex-col pointer-events-auto",
            "rounded-t-[32px] sm:rounded-[32px] max-h-[92vh] sm:max-h-[85vh]", // Responsive heights & shapes
            "border border-border-main"
          )}
        >
          {/* Header */}
          <div className="px-6 py-5 border-b border-border-main flex items-center justify-between bg-bg-light">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-brand-primary/10 flex items-center justify-center text-brand-primary">
                <ShoppingBag size={18} />
              </div>
              <h2 className="text-lg font-black text-text-main uppercase tracking-wider font-sans">
                Reserve Item
              </h2>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white border border-border-main flex items-center justify-center text-text-muted hover:text-text-main hover:border-brand-primary transition-all active:scale-90"
            >
              <X size={16} />
            </button>
          </div>

          {/* Body Form (Scrollable) */}
          <form onSubmit={handleConfirmOrder} className="flex-1 overflow-y-auto no-scrollbar p-6 space-y-6">
            
            {/* Minimalist Product Preview */}
            <div className="flex gap-4 p-4 bg-bg-light rounded-2xl border border-border-main">
              <div className="w-20 h-20 rounded-xl overflow-hidden bg-white border border-border-main flex-shrink-0">
                <img
                  src={listing.images[0] || `https://picsum.photos/seed/${listing.id}/300/300`}
                  alt={listing.title}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="min-w-0 flex-1 flex flex-col justify-between">
                <div>
                  <h3 className="font-extrabold text-sm text-text-main truncate">{listing.title}</h3>
                  <p className="text-xs text-text-muted mt-0.5 font-medium">Seller: <span className="text-text-main font-bold">{listing.sellerName}</span></p>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-black text-brand-primary">₱{listing.price.toLocaleString()}</span>
                  <span className="text-[10px] uppercase bg-brand-primary/10 text-brand-primary font-black px-2 py-0.5 rounded-full tracking-wider">
                    Meetup
                  </span>
                </div>
              </div>
            </div>

            {/* Quantity Selector Section */}
            <div className="flex items-center justify-between p-4 bg-white rounded-2xl border border-border-main">
              <div>
                <span className="text-xs font-black uppercase text-text-muted tracking-wider">Quantity</span>
                <p className="text-[10px] text-text-muted mt-0.5">Available stock: {maxQty}</p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleDecrement}
                  disabled={quantity <= 1}
                  className="w-8 h-8 rounded-lg bg-bg-light border border-border-main flex items-center justify-center text-text-muted font-bold hover:bg-neutral-100 disabled:opacity-40 transition-colors"
                >
                  -
                </button>
                <span className="w-6 text-center font-black text-sm text-text-main">{quantity}</span>
                <button
                  type="button"
                  onClick={handleIncrement}
                  disabled={quantity >= maxQty}
                  className="w-8 h-8 rounded-lg bg-bg-light border border-border-main flex items-center justify-center text-text-muted font-bold hover:bg-neutral-100 disabled:opacity-40 transition-colors"
                >
                  +
                </button>
              </div>
            </div>

            {/* Meetup Details Fields */}
            <div className="space-y-4">
              <h4 className="text-xs font-black uppercase text-text-muted tracking-widest border-b border-border-main pb-2">
                Preferences
              </h4>

              {/* Contact number */}
              <div className="space-y-1">
                <label className="text-[11px] font-black uppercase tracking-wider text-text-muted flex items-center gap-1.5">
                  <Phone size={12} className="text-brand-primary" /> Contact Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. 09171234567"
                  value={contactNumber}
                  onChange={(e) => setContactNumber(e.target.value)}
                  className={cn(
                    "w-full px-4 py-3 bg-white border rounded-xl text-sm font-medium focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary transition-all",
                    errors.contactNumber ? "border-red-500 focus:border-red-500 bg-red-50/10" : "border-border-main"
                  )}
                />
                {errors.contactNumber && (
                  <p className="text-[10px] font-bold text-red-500 flex items-center gap-1">
                    <AlertCircle size={10} /> {errors.contactNumber}
                  </p>
                )}
              </div>

              {/* Meetup location */}
              <div className="space-y-1">
                <label className="text-[11px] font-black uppercase tracking-wider text-text-muted flex items-center gap-1.5">
                  <MapPin size={12} className="text-brand-primary" /> Meetup Location <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. College Library, Ground Floor Lobby"
                  value={meetupLocation}
                  onChange={(e) => setMeetupLocation(e.target.value)}
                  className={cn(
                    "w-full px-4 py-3 bg-white border rounded-xl text-sm font-medium focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary transition-all",
                    errors.meetupLocation ? "border-red-500 focus:border-red-500 bg-red-50/10" : "border-border-main"
                  )}
                />
                {errors.meetupLocation && (
                  <p className="text-[10px] font-bold text-red-500 flex items-center gap-1">
                    <AlertCircle size={10} /> {errors.meetupLocation}
                  </p>
                )}
              </div>

              {/* Meetup Date & Time row */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[11px] font-black uppercase tracking-wider text-text-muted flex items-center gap-1.5">
                    <Calendar size={12} className="text-brand-primary" /> Preferred Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={meetupDate}
                    onChange={(e) => setMeetupDate(e.target.value)}
                    className={cn(
                      "w-full px-4 py-3 bg-white border rounded-xl text-sm font-medium focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary transition-all",
                      errors.meetupDate ? "border-red-500 focus:border-red-500 bg-red-50/10" : "border-border-main"
                    )}
                  />
                  {errors.meetupDate && (
                    <p className="text-[10px] font-bold text-red-500 flex items-center gap-1">
                      <AlertCircle size={10} /> {errors.meetupDate}
                    </p>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-black uppercase tracking-wider text-text-muted flex items-center gap-1.5">
                    <Calendar size={12} className="text-brand-primary" /> Preferred Time <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="time"
                    value={meetupTime}
                    onChange={(e) => setMeetupTime(e.target.value)}
                    className={cn(
                      "w-full px-4 py-3 bg-white border rounded-xl text-sm font-medium focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary transition-all",
                      errors.meetupTime ? "border-red-500 focus:border-red-500 bg-red-50/10" : "border-border-main"
                    )}
                  />
                  {errors.meetupTime && (
                    <p className="text-[10px] font-bold text-red-500 flex items-center gap-1">
                      <AlertCircle size={10} /> {errors.meetupTime}
                    </p>
                  )}
                </div>
              </div>

              {/* Message to Seller */}
              <div className="space-y-1">
                <label className="text-[11px] font-black uppercase tracking-wider text-text-muted flex items-center gap-1.5">
                  <MessageSquare size={12} className="text-brand-primary" /> Message to Seller (Optional)
                </label>
                <textarea
                  placeholder="Ask about meeting place, item condition details, etc."
                  rows={2}
                  value={buyerMessage}
                  onChange={(e) => setBuyerMessage(e.target.value)}
                  className="w-full px-4 py-3 bg-white border border-border-main rounded-xl text-sm font-medium focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary transition-all resize-none"
                />
              </div>
            </div>

            {/* Payment method note - Meetup only */}
            <div className="p-4 bg-accent-subtle/40 border border-brand-primary/10 rounded-2xl flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-brand-primary/10 flex items-center justify-center text-brand-primary flex-shrink-0">
                <ShieldCheck size={16} />
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-[11px] font-black uppercase text-brand-primary tracking-wider">
                  Payment Method: Meetup Payment Only
                </span>
                <p className="text-[10px] text-text-muted mt-0.5 leading-relaxed">
                  For your safety, payments are done physical in-person during the handoff meetup on campus. No online advance payment required!
                </p>
              </div>
            </div>

            {/* Order Summary breakdown */}
            <div className="border-t border-dashed border-border-main pt-4 space-y-2">
              <span className="text-xs font-black uppercase text-text-muted tracking-widest">
                Order Summary
              </span>
              <div className="space-y-1.5 text-xs text-text-muted">
                <div className="flex justify-between">
                  <span>Unit Price:</span>
                  <span className="font-bold text-text-main">₱{listing.price.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Quantity:</span>
                  <span className="font-bold text-text-main">x{quantity}</span>
                </div>
                <div className="flex justify-between text-sm font-black text-brand-primary pt-1.5 border-t border-border-light">
                  <span>Total Due (Pay at Meetup):</span>
                  <span>₱{totalPrice.toLocaleString()}</span>
                </div>
              </div>
            </div>

          </form>

          {/* Footer controls */}
          <div className="p-6 border-t border-border-main bg-bg-light flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3.5 bg-white border border-border-main hover:bg-neutral-50 rounded-xl text-xs font-bold uppercase tracking-wider text-text-muted transition-all duration-200"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirmOrder}
              disabled={submitting}
              className="flex-1 py-3.5 bg-brand-primary hover:bg-brand-primary-hover text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-lg shadow-brand-primary/20 transition-all duration-200 cursor-pointer"
            >
              {submitting ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>Confirm Reservation</>
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
