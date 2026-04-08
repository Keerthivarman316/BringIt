import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { Package, MapPin, Clock, Zap, Search, ChevronRight, Navigation, LayoutDashboard, Settings as SettingsIcon, Map, Activity, ShoppingBag, Phone, Trash2, X, AlertCircle, MessageCircle, CheckCircle, CreditCard } from 'lucide-react';
import LiveMap from './LiveMap';
import StudioModal from './StudioModal';

const RequesterDashboard = ({ user, setUser }) => {
  const [orders, setOrders] = useState([]);
  const [isFormVisible, setIsFormVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [billItems, setBillItems] = useState([]);
  const [currentItemName, setCurrentItemName] = useState('');
  const [currentItemQty, setCurrentItemQty] = useState(1);
  const [currentItemPrice, setCurrentItemPrice] = useState('');
  const [deliveryFee, setDeliveryFee] = useState(25);
  const [urgency, setUrgency] = useState('NORMAL');
  const [step, setStep] = useState(1);

  // Fallback state for single-item legacy/repost support
  const [itemName, setItemName] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [budget, setBudget] = useState(0);

  const [availableTrips, setAvailableTrips] = useState([]);
  const [storeName, setStoreName] = useState('');
  const [activeTrackingTripId, setActiveTrackingTripId] = useState(null);
  const [modal, setModal] = useState({ isOpen: false, title: '', message: '', type: 'info', onConfirm: null });
  const [showCarrierDetails, setShowCarrierDetails] = useState(false);

  const fetchTrips = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/trips/available', {
        headers: { Authorization: `Bearer ${sessionStorage.getItem('token')}` }
      });
      setAvailableTrips(response.data);
    } catch (err) {
      console.error('Fetch trips error:', err);
    }
  };

  const fetchOrders = useCallback(async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/orders/my-orders', {
        headers: { Authorization: `Bearer ${sessionStorage.getItem('token')}` }
      });
      setOrders(response.data);
    } catch (err) {
      console.error('Fetch error:', err);
    }
  }, []);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await axios.get('http://localhost:5000/api/auth/me', {
          headers: { Authorization: `Bearer ${sessionStorage.getItem('token')}` }
        });
        if (res.data.user && setUser) setUser(res.data.user);
      } catch (err) { console.error('Profile fetch error:', err); }
    };

    fetchProfile();
    fetchOrders();
    fetchTrips();
    const interval = setInterval(() => {
      fetchProfile();
      fetchOrders();
      fetchTrips();
    }, 10000);
    return () => clearInterval(interval);
  }, [fetchOrders]);

  // Auto-close tracking if delivery is finished
  useEffect(() => {
    if (activeTrackingTripId) {
      const activeOrders = orders.filter(o => o.match?.tripId === activeTrackingTripId);
      if (activeOrders.length > 0 && activeOrders.every(o => o.status === 'DELIVERED')) {
         setActiveTrackingTripId(null);
      }
    }
  }, [orders, activeTrackingTripId]);

  const addBillItem = () => {
    if (!currentItemName || !currentItemQty || !currentItemPrice) return;
    const newItem = {
      id: Date.now(),
      name: currentItemName,
      qty: currentItemQty,
      price: currentItemPrice
    };
    setBillItems([...billItems, newItem]);
    setCurrentItemName('');
    setCurrentItemQty(1);
    setCurrentItemPrice('');
  };

  const removeBillItem = (id) => {
    setBillItems(billItems.filter(item => item.id !== id));
  };
  const handlePlaceOrder = async (e) => {
    if (e) e.preventDefault();
    try {
      const totalQty = billItems.reduce((acc, item) => acc + Number(item.qty), 0);
      const totalBudget = billItems.reduce((acc, item) => acc + (Number(item.qty) * Number(item.price)), 0);
      
      // Cleaner title for multi-item orders
      const combinedName = billItems.length > 1 
        ? `${billItems[0].name} + ${billItems.length - 1} more` 
        : billItems[0].name;

      await axios.post('http://localhost:5000/api/orders', {
        itemName: combinedName,
        storeName,
        quantity: totalQty,
        deliveryFee: Number(deliveryFee),
        budget: Number(totalBudget),
        urgency,
        items: billItems // NEW: send original item list
      }, {
        headers: { Authorization: `Bearer ${sessionStorage.getItem('token')}` }
      });
      setIsFormVisible(false);
      setBillItems([]);
      setCurrentItemName('');
      setStoreName('');
      setDeliveryFee(25);
      setStep(1);
      fetchOrders();
    } catch (err) {
      alert('Failed to place order.');
    }
  };

  const handleCancelOrder = (orderId) => {
    setModal({
      isOpen: true,
      title: 'Cancel Order?',
      message: 'This will stop carriers from finding your order. You can still re-post it later.',
      type: 'confirm',
      confirmText: 'Yes, Cancel Order',
      onConfirm: async () => {
        try {
          await axios.patch(`http://localhost:5000/api/orders/${orderId}/cancel`, {}, {
            headers: { Authorization: `Bearer ${sessionStorage.getItem('token')}` }
          });
          fetchOrders();
          setModal({ isOpen: true, title: 'Order Cancelled', message: 'Your search was stopped successfully.', type: 'success' });
        } catch (err) {
          setModal({ isOpen: true, title: 'Action Failed', message: 'Failed to cancel order.', type: 'error' });
        }
      }
    });
  };

  const handleDeleteOrder = (orderId) => {
    setModal({
      isOpen: true,
      title: 'Delete Permanently?',
      message: 'This action is final and will remove the order from your history forever.',
      type: 'error',
      confirmText: 'Delete Forever',
      onConfirm: async () => {
        try {
          await axios.delete(`http://localhost:5000/api/orders/${orderId}`, {
            headers: { Authorization: `Bearer ${sessionStorage.getItem('token')}` }
          });
          fetchOrders();
          setModal({ isOpen: true, title: 'Order Deleted', message: 'The record has been permanently removed.', type: 'success' });
        } catch (err) {
          setModal({ isOpen: true, title: 'Action Failed', message: 'Failed to delete order.', type: 'error' });
        }
      }
    });
  };

  const handleCompleteOrder = (orderId) => {
    setModal({
      isOpen: true,
      title: 'Confirm Receipt?',
      message: 'By confirming, you agree that you have received your order. This will finalize the delivery for the carrier.',
      type: 'confirm',
      confirmText: 'Yes, I Received It',
      onConfirm: async () => {
        try {
          await axios.patch(`http://localhost:5000/api/orders/${orderId}/complete`, {}, {
            headers: { Authorization: `Bearer ${sessionStorage.getItem('token')}` }
          });
          fetchOrders();
          if (setUser) {
            const upRes = await axios.get('http://localhost:5000/api/auth/me', {
              headers: { Authorization: `Bearer ${sessionStorage.getItem('token')}` }
            });
            setUser(upRes.data.user || upRes.data);
          }
          setModal({ isOpen: true, title: 'Delivery Finalized', message: 'Thank you for using BringIt! The carrier has been notified.', type: 'success' });
        } catch (err) {
          setModal({ isOpen: true, title: 'Action Failed', message: 'Failed to complete order.', type: 'error' });
        }
      }
    });
  };

  const handleRepost = (order) => {
    // If it's an old single-item order, put it in billItems
    const pricePerUnit = Math.floor(order.budget / (order.quantity || 1));
    const newItem = {
      id: Date.now(),
      name: order.itemName.includes('x ') ? order.itemName.split('x ').slice(1).join('x ') : order.itemName,
      qty: order.quantity || 1,
      price: pricePerUnit
    };
    setBillItems([newItem]);
    setStoreName(order.storeName || '');
    setDeliveryFee(order.deliveryFee);
    setUrgency(order.urgencyLevel || 'NORMAL');
    setIsFormVisible(true);
    setStep(3); // Go straight to review step
  };

  // Filter available trips based on current order quantity and carrier online status
  const filteredTrips = availableTrips.filter(t => t.capacity >= quantity && t.carrier?.isOnline);

  return (
    <div className="flex flex-col gap-12 max-w-6xl mx-auto pb-24 items-stretch w-full px-4">
      
      {activeTrackingTripId && (
        <section className="glass rounded-[40px] p-1 border border-brand-cyan/20 overflow-hidden relative group">
           <div className="absolute top-6 left-6 right-6 z-20 flex items-start justify-between pointer-events-none">
             <div className="flex flex-col gap-3 pointer-events-auto">
               <div className="flex items-center gap-3 bg-bg-deep/80 backdrop-blur-xl px-4 py-2 rounded-2xl border border-white/5 shadow-2xl w-fit">
                  <div className="w-2 h-2 rounded-full bg-brand-cyan animate-pulse shadow-[0_0_8px_rgba(0,242,255,1)]" />
                  <span className="text-[10px] font-mono text-white font-bold tracking-widest uppercase">Live Tracking Active</span>
                  <button 
                    onClick={() => setActiveTrackingTripId(null)}
                    className="ml-4 text-[10px] font-mono text-brand-red font-bold hover:underline"
                  >
                    CLOSE MAP
                  </button>
               </div>
               
               {(()=>{
                 const activeOrder = orders.find(o => o.match?.tripId === activeTrackingTripId);
                 const carrier = activeOrder?.match?.trip?.carrier;
                 if (!carrier) return null;
                 return (
                    <div 
                      onClick={() => setShowCarrierDetails(!showCarrierDetails)}
                      className="bg-bg-deep/80 backdrop-blur-xl px-5 py-4 rounded-2xl border border-brand-cyan/20 flex flex-col gap-1 shadow-2xl w-fit cursor-pointer hover:bg-bg-card transition-all"
                    >
                      <div className="text-[9px] font-mono tracking-widest text-brand-cyan uppercase font-bold flex items-center gap-2"><Activity size={10} /> {showCarrierDetails ? 'TAP TO HIDE' : 'TAP FOR DETAILS'}</div>
                      <div className="text-sm font-bold text-white uppercase">{carrier.name || 'Anonymous'}</div>
                      <div className="text-[10px] font-mono text-brand-cyan uppercase">Trust Score: ★ {carrier.trustScore?.toFixed(1) || '1.0'}</div>
                      
                      <AnimatePresence>
                        {showCarrierDetails && (
                          <motion.div 
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden border-t border-white/5 mt-2 pt-2 space-y-2"
                          >
                             <div className="flex justify-between items-center bg-white/5 p-2 rounded-xl">
                                <span className="text-[8px] font-mono text-muted uppercase">Past Deliveries</span>
                                <span className="text-[10px] font-bold text-white tracking-widest">{carrier.deliveryCount || 0}</span>
                             </div>
                             <div className="flex justify-between items-center bg-white/5 p-2 rounded-xl">
                                <span className="text-[8px] font-mono text-muted uppercase">Verification</span>
                                <span className="text-[10px] font-bold text-brand-green tracking-widest uppercase">Verified Student</span>
                             </div>
                             <div className="flex justify-between items-center bg-brand-cyan/10 p-2 rounded-xl border border-brand-cyan/20">
                                <span className="text-[8px] font-mono text-brand-cyan uppercase">Carrier Phone</span>
                                <a href={`tel:${carrier.phone}`} className="text-[10px] font-black text-white hover:text-brand-cyan transition-colors flex items-center gap-2">
                                  <Phone size={10} /> {carrier.phone || '987-xxx-xxxx'}
                                </a>
                             </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                 );
               })()}
             </div>
           </div>
           <div className="h-[400px] w-full rounded-[38px] overflow-hidden bg-bg-deep">
              <LiveMap tripId={activeTrackingTripId} />
           </div>
        </section>
      )}
      
      {/* Search Hero */}
      <section className="relative h-[240px] rounded-[40px] overflow-hidden bg-bg-card border border-white/5 p-12 flex flex-col items-center justify-center">
        <div className="absolute inset-0 opacity-10 pointer-events-none">
           <svg width="100%" height="100%" viewBox="0 0 1000 300" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M0 50 Q 250 100 500 50 T 1000 50" stroke="white" strokeWidth="2" strokeDasharray="10 10" />
              <path d="M0 250 Q 250 200 500 250 T 1000 250" stroke="white" strokeWidth="2" strokeDasharray="10 10" />
           </svg>
        </div>
        
        <div className="relative z-10 w-full max-w-2xl text-center space-y-6">
           <div className="space-y-2">
              <h2 className="text-4xl font-display text-white tracking-widest uppercase">What do you need?</h2>
              <p className="text-muted text-sm font-mono tracking-wider">Search for items to order</p>
           </div>
           
           <div className="group relative">
              <div className="absolute inset-y-0 left-6 flex items-center">
                 <Search size={22} className="text-muted group-focus-within:text-brand-cyan transition-colors" />
              </div>
              <input 
                type="text" 
                placeholder="Medicine from Apollo pharmacy..."
                onFocus={() => setIsFormVisible(true)}
                className="w-full bg-white/5 border border-white/10 rounded-full py-6 pl-16 pr-8 text-xl font-body text-white placeholder-muted focus:bg-white/10 focus:border-brand-cyan/40 outline-none transition-all shadow-2xl shadow-black/40"
              />
           </div>
        </div>
      </section>

      {/* My Orders */}
      <section className="space-y-6">
         <div className="flex items-center justify-between">
            <h3 className="text-2xl font-display text-white uppercase tracking-tighter">My Orders</h3>
            <span className="text-[10px] font-mono tracking-[0.2em] text-muted">{orders.length} TOTAL</span>
         </div>
         
         <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 overflow-x-auto pb-4 custom-scrollbar">
            {orders.map(order => (
               <motion.div 
                key={order.id}
                layoutId={order.id}
                className={cn(
                  "flex-shrink-0 w-full glass min-h-[180px] h-auto rounded-[32px] p-6 flex flex-col justify-between group cursor-pointer hover:border-brand-cyan/40 transition-all",
                  (order.urgencyLevel === 'URGENT' || order.urgency === 'URGENT') ? "border-brand-red/50 shadow-lg shadow-brand-red/5" : "border-white/5"
                )}
               >
                  <div className="flex justify-between items-start">
                     <div className="space-y-1">
                        <div className="text-[10px] font-mono text-muted tracking-widest uppercase">{order.storeName}</div>
                        <h4 className="text-xl font-heading text-white">{order.itemName}</h4>
                        
                        {/* Display itemized bill if available */}
                        {order.items && order.items.length > 0 && (
                          <div className="mt-4 flex flex-wrap gap-3 pb-2">
                            {order.items.map((item, idx) => (
                              <div key={idx} className="bg-white/5 border border-brand-cyan/20 px-3 py-1.5 rounded-sm text-[10px] font-mono text-brand-cyan font-bold uppercase tracking-widest backdrop-blur-md shadow-sm shadow-brand-cyan/5">
                                {item.quantity}X {item.name}
                              </div>
                            ))}
                          </div>
                        )}
                     </div>
                     <div className={cn(
                       "px-3 py-1 rounded-full text-[9px] font-bold tracking-widest uppercase",
                       order.status === 'PENDING' ? "bg-brand-amber/10 text-brand-amber border border-brand-amber/20" :
                       order.status === 'MATCHED' ? "bg-brand-cyan/10 text-brand-cyan border border-brand-cyan/20" :
                       "bg-brand-green/10 text-brand-green border border-brand-green/20"
                     )}>
                        {order.status}
                     </div>
                  </div>
                  <div className="space-y-4 mt-auto">
                     <div className="flex flex-wrap justify-between items-end gap-y-4">
                        <div className="flex flex-wrap items-center gap-2">
                            {order.status === 'MATCHED' && (
                              <>
                                <button 
                                  onClick={(e) => { e.stopPropagation(); setActiveTrackingTripId(order.match?.tripId); }}
                                  className="bg-brand-cyan text-bg-deep px-4 py-2 rounded-xl text-[9px] font-black tracking-widest uppercase hover:brightness-110 transition-all"
                                >
                                  TRACK LIVE
                                </button>
                                <button 
                                  onClick={(e) => { e.stopPropagation(); handleCancelOrder(order.id); }}
                                  className="bg-bg-surface border border-white/10 text-brand-red px-4 py-2 rounded-xl text-[9px] font-black tracking-widest uppercase hover:bg-brand-red/10 transition-all ml-2"
                                >
                                  CANCEL
                                </button>
                                {order.match?.trip?.carrier?.phone && (
                                   <a 
                                     href={`tel:${order.match.trip.carrier.phone}`}
                                     onClick={(e) => e.stopPropagation()}
                                     className="bg-bg-surface border border-white/5 text-muted p-2 rounded-xl hover:text-brand-cyan hover:border-brand-cyan/20 transition-all ml-2"
                                     title="Call Partner"
                                   >
                                     <Phone size={14} />
                                   </a>
                                )}
                              </>
                           )}
                           
                           {(order.status === 'PENDING' || order.status === 'DELIVERED') && (
                              <div className="flex items-center gap-2">
                                {order.status === 'PENDING' && (
                                  <button 
                                    onClick={(e) => { e.stopPropagation(); handleCancelOrder(order.id); }}
                                    className="bg-bg-surface border border-white/10 text-brand-red px-4 py-2 rounded-xl text-[9px] font-black tracking-widest uppercase hover:bg-brand-red/10 transition-all"
                                  >
                                    CANCEL
                                  </button>
                                )}
                                <button 
                                  onClick={(e) => { e.stopPropagation(); handleDeleteOrder(order.id); }}
                                  className="bg-bg-surface/50 border border-white/5 text-muted p-2 rounded-xl hover:text-brand-red hover:border-brand-red/20 transition-all"
                                  title="Delete Permanently"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            )}
                            {['MATCHED', 'PICKED_UP', 'IN_TRANSIT'].includes(order.status) && (
                               <button 
                                 onClick={(e) => { e.stopPropagation(); handleCompleteOrder(order.id); }}
                                 className="bg-brand-green/20 border border-brand-green/30 text-brand-green px-4 py-2 rounded-xl text-[9px] font-black tracking-widest uppercase hover:bg-brand-green/30 transition-all flex items-center gap-2 shadow-[0_0_15px_rgba(16,185,129,0.1)]"
                               >
                                 <CheckCircle size={10} /> CONFIRM RECEIPT
                               </button>
                            )}
                            {order.status === 'CANCELLED' && (
                               <div className="flex items-center gap-2">
                                  <button 
                                    onClick={(e) => { e.stopPropagation(); handleRepost(order); }}
                                    className="bg-brand-amber text-bg-deep px-4 py-2 rounded-xl text-[9px] font-black tracking-widest uppercase hover:brightness-110 transition-all"
                                  >
                                    RE-POST
                                  </button>
                                  <button 
                                    onClick={(e) => { e.stopPropagation(); handleDeleteOrder(order.id); }}
                                    className="bg-bg-surface/50 border border-white/5 text-muted p-2 rounded-xl hover:text-brand-red hover:border-brand-red/20 transition-all"
                                    title="Delete Permanently"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                               </div>
                            )}

                        </div>
                        <div className="text-xl font-display text-white italic">₹{order.deliveryFee + order.budget}</div>
                     </div>
                     
                     <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                         <motion.div 
                           initial={{ width: 0 }}
                           animate={{ width: (order.status === 'PENDING') ? '10%' : (order.status === 'MATCHED' || order.status === 'PICKED_UP' || order.status === 'IN_TRANSIT') ? '60%' : '100%' }}
                           className={cn("h-full transition-all duration-1000 shadow-[0_0_8px_rgba(0,242,255,0.3)]", (order.status === 'PENDING') ? "bg-brand-amber" : (order.status === 'CANCELLED' || order.status === 'DISPUTED') ? "bg-brand-red" : "bg-brand-cyan")}
                         />
                     </div>
                  </div>
               </motion.div>
            ))}
            
            {orders.length === 0 && (
               <div className="lg:col-span-3 flex flex-col items-center justify-center py-12 border border-dashed border-white/5 rounded-[32px] bg-white/[0.02] text-muted gap-4">
                  <div className="w-16 h-16 rounded-full bg-bg-surface flex items-center justify-center">
                     <ShoppingBag size={24} />
                  </div>
                  <div className="text-center">
                     <p className="text-sm font-bold text-white">No orders yet</p>
                     <p className="text-[10px] font-mono tracking-widest mt-1 uppercase">Click the search bar above to place your first order</p>
                  </div>
               </div>
            )}
         </div>
      </section>
      
      {/* Available Carriers */}
      <section className="space-y-6">
         <div className="flex items-center justify-between">
            <h3 className="text-2xl font-display text-white uppercase tracking-tighter">Active Trips Near You</h3>
            <span className="text-[10px] font-mono tracking-[0.2em] text-brand-cyan font-bold uppercase">Showing capacity {'>='} {quantity}</span>
         </div>
         
         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {filteredTrips.map(trip => (
               <div key={trip.id} className="glass p-5 rounded-[24px] border border-white/5 space-y-4 hover:border-brand-cyan/30 transition-all group">
                  <div className="flex items-center gap-3">
                     <div className="w-10 h-10 rounded-xl bg-brand-cyan/10 flex items-center justify-center text-brand-cyan border border-brand-cyan/20">
                        <Navigation size={18} />
                     </div>
                     <div>
                        <div className="text-[10px] font-mono text-muted uppercase tracking-widest">Carrier</div>
                        <div className="text-xs font-bold text-white uppercase truncate max-w-[120px]">{trip.carrier?.name || 'Anonymous'}</div>
                     </div>
                  </div>
                  
                  <div className="space-y-1">
                     <div className="text-[9px] font-mono text-muted uppercase">Destination</div>
                     <div className="text-sm font-heading text-white italic truncate">{trip.destination}</div>
                  </div>

                  <div className="flex justify-between items-center bg-white/5 p-3 rounded-xl border border-white/5">
                     <div className="text-center">
                        <div className="text-[8px] font-mono text-muted uppercase">Capacity</div>
                        <div className="text-xs font-bold text-brand-cyan">{trip.capacity} items</div>
                     </div>
                     <div className="w-px h-6 bg-white/10" />
                     <div className="text-center">
                        <div className="text-[8px] font-mono text-muted uppercase">Starts At</div>
                        <div className="text-xs font-bold text-white">{new Date(trip.departureTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                     </div>
                  </div>
               </div>
            ))}

            {filteredTrips.length === 0 && (
               <div className="col-span-full py-8 text-center glass rounded-3xl border border-dashed border-white/10 text-muted text-[10px] font-mono uppercase tracking-[0.2em]">
                  No carriers available with capacity {quantity}
               </div>
            )}
         </div>
      </section>


      {/* Order Creation Form */}
      <AnimatePresence>
        {isFormVisible && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-bg-deep/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto"
          >
            <motion.div 
              initial={{ y: 100, scale: 0.9 }}
              animate={{ y: 0, scale: 1 }}
              exit={{ y: 100, scale: 0.9 }}
              className="w-full max-w-xl glass-morphism rounded-[40px] p-10 space-y-10 relative overflow-hidden"
            >
               <div className="flex justify-between items-center relative z-10">
                  <div className="space-y-1">
                    <h3 className="text-3xl font-display text-white uppercase tracking-tighter">Place Order</h3>
                    <p className="text-muted text-[10px] font-mono tracking-widest uppercase">STEP {step} OF 3</p>
                  </div>
                  <button onClick={() => setIsFormVisible(false)} className="text-muted hover:text-white font-mono text-[10px] tracking-widest uppercase border border-white/10 px-4 py-2 rounded-full hover:border-white/20 transition-all">CANCEL</button>
               </div>

               <div className="space-y-12 relative z-10">
                  <AnimatePresence mode="wait">
                    {step === 1 && (
                       <motion.div 
                         initial={{ x: 40, opacity: 0 }}
                         animate={{ x: 0, opacity: 1 }}
                         exit={{ x: -40, opacity: 0 }}
                         className="space-y-6"
                       >
                          {/* Store Name */}
                          <div className="group space-y-2">
                             <label className="text-[10px] font-mono text-muted tracking-widest uppercase ml-4">Pickup From</label>
                             <div className="relative">
                                <MapPin className="absolute left-6 top-1/2 -translate-y-1/2 text-muted group-focus-within:text-brand-cyan transition-colors" size={20} />
                                <input 
                                  type="text" 
                                  value={storeName}
                                  onChange={(e) => setStoreName(e.target.value)}
                                  placeholder="Campus Starbucks / Canteen"
                                  className="w-full bg-bg-surface/50 border border-white/5 rounded-3xl py-5 pl-16 pr-6 text-white outline-none focus:border-brand-cyan/50 hover:border-white/10 transition-all font-heading"
                                />
                             </div>
                          </div>

                          {/* Digital Bill */}
                          <div className="bg-bg-surface/30 border border-white/5 rounded-[32px] overflow-hidden">
                             <div className="p-6 border-b border-white/5 bg-white/[0.02]">
                                <h4 className="text-[10px] font-mono text-brand-cyan font-bold tracking-widest uppercase">Digital Bill</h4>
                             </div>
                             
                             <div className="max-h-[300px] overflow-y-auto p-4 space-y-2">
                                {billItems.map(item => (
                                  <div key={item.id} className="flex items-center gap-4 p-4 rounded-2xl bg-bg-card border border-white/5 group/item">
                                     <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-xs font-bold text-brand-cyan">{item.qty}x</div>
                                     <div className="flex-1 min-w-0">
                                        <div className="text-xs font-bold text-white uppercase truncate">{item.name}</div>
                                        <div className="text-[9px] font-mono text-muted uppercase">₹{item.price} per unit</div>
                                     </div>
                                     <div className="text-sm font-display text-white">₹{item.qty * item.price}</div>
                                     <button 
                                       onClick={() => removeBillItem(item.id)}
                                       className="w-8 h-8 rounded-lg flex items-center justify-center text-muted hover:text-brand-red hover:bg-brand-red/10 transition-all opacity-0 group-hover/item:opacity-100"
                                     >
                                        <Trash2 size={14} />
                                     </button>
                                  </div>
                                ))}
                                
                                {billItems.length === 0 && (
                                  <div className="py-12 text-center text-muted text-[10px] font-mono uppercase tracking-widest opacity-50">
                                     No items added to bill
                                  </div>
                                )}
                             </div>

                             {/* Add Item Row */}
                             <div className="p-6 bg-brand-cyan/[0.02] border-t border-white/5 space-y-4">
                                <div className="grid grid-cols-12 gap-3">
                                   <div className="col-span-6">
                                      <input 
                                        type="text" 
                                        placeholder="Item Name..."
                                        value={currentItemName}
                                        onChange={(e) => setCurrentItemName(e.target.value)}
                                        className="w-full bg-bg-surface/50 border border-white/5 rounded-2xl py-3 px-4 text-xs text-white outline-none focus:border-brand-cyan/30"
                                      />
                                   </div>
                                   <div className="col-span-2">
                                      <input 
                                        type="number" 
                                        placeholder="Qty"
                                        value={currentItemQty}
                                        onChange={(e) => setCurrentItemQty(e.target.value)}
                                        className="w-full bg-bg-surface/50 border border-white/5 rounded-2xl py-3 px-2 text-center text-xs text-brand-cyan outline-none focus:border-brand-cyan/30"
                                      />
                                   </div>
                                   <div className="col-span-4 flex gap-2">
                                      <input 
                                        type="number" 
                                        placeholder="₹ Price"
                                        value={currentItemPrice}
                                        onChange={(e) => setCurrentItemPrice(e.target.value)}
                                        className="w-full bg-bg-surface/50 border border-white/5 rounded-2xl py-3 px-3 text-xs text-white outline-none focus:border-brand-cyan/30"
                                      />
                                      <button 
                                        onClick={addBillItem}
                                        disabled={!currentItemName || !currentItemPrice}
                                        className="w-12 h-full bg-brand-cyan text-bg-deep rounded-2xl flex items-center justify-center hover:brightness-110 transition-all disabled:opacity-20"
                                      >
                                         <Zap size={16} fill="currentColor" />
                                      </button>
                                   </div>
                                </div>
                             </div>
                             
                             <div className="p-6 bg-bg-deep flex justify-between items-center border-t border-white/5">
                                <span className="text-[10px] font-mono text-muted uppercase tracking-widest">Bill Subtotal</span>
                                <span className="text-xl font-display text-white italic">₹{billItems.reduce((acc, item) => acc + (item.qty * item.price), 0)}</span>
                             </div>
                          </div>
                          
                          <button 
                           onClick={() => billItems.length > 0 && storeName && setStep(2)}
                           disabled={billItems.length === 0 || !storeName}
                           className="w-full bg-white text-bg-deep font-bold py-5 rounded-[32px] shadow-xl hover:bg-brand-cyan transition-all flex items-center justify-center gap-3 group disabled:opacity-20"
                          >
                             NEXT <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
                          </button>
                       </motion.div>
                    )}

                    {step === 2 && (
                      <motion.div 
                        initial={{ x: 40, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: -40, opacity: 0 }}
                        className="space-y-8"
                      >
                         <div className="space-y-4 group">
                            <label className="text-[10px] font-mono text-muted tracking-widest uppercase ml-4">Delivery Fee (₹)</label>
                            <input 
                              type="number" 
                              min="5" max="1000" step="5"
                              value={deliveryFee}
                              onChange={(e) => setDeliveryFee(Number(e.target.value))}
                              className="w-full bg-bg-surface/50 border border-white/5 rounded-3xl py-5 px-6 text-brand-cyan outline-none focus:border-brand-cyan/50 hover:border-white/10 transition-all font-display text-2xl"
                            />
                            <div className="bg-brand-cyan/10 border border-brand-cyan/20 rounded-2xl p-4 text-[10px] font-bold text-center text-brand-cyan tracking-widest uppercase">
                               Recommended: ₹25+ for faster delivery
                            </div>
                         </div>

                         <div className="flex gap-4">
                            <button onClick={() => setStep(1)} className="flex-1 py-4 text-[10px] font-mono text-muted tracking-widest uppercase hover:text-white transition-colors">BACK</button>
                            <button 
                              onClick={() => setStep(3)}
                              className="flex-[2] bg-brand-cyan text-bg-deep font-bold py-5 rounded-3xl hover:brightness-110 transition-all"
                            >
                              REVIEW ORDER
                            </button>
                         </div>
                      </motion.div>
                    )}

                    {step === 3 && (
                       <motion.div 
                         initial={{ x: 40, opacity: 0 }}
                         animate={{ x: 0, opacity: 1 }}
                         exit={{ x: -40, opacity: 0 }}
                         className="space-y-8"
                       >
                          <div className="bg-bg-surface/50 border border-white/5 p-8 rounded-[40px] space-y-6 shadow-2xl relative overflow-hidden">
                             <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                                <ShoppingBag size={120} />
                             </div>
                             
                             <div className="flex justify-between border-b border-white/5 pb-4">
                                <div className="space-y-1">
                                    <div className="text-[10px] font-mono text-brand-cyan font-bold tracking-widest uppercase">Bill Summary</div>
                                    <div className="text-xs text-muted flex items-center gap-2 uppercase tracking-widest"><MapPin size={10} /> {storeName}</div>
                                </div>
                                <div className={cn("h-fit text-[8px] font-bold px-3 py-1 rounded-full uppercase tracking-widest", urgency === 'URGENT' ? "bg-brand-red text-white" : "bg-white/10 text-white")}>
                                   {urgency}
                                </div>
                             </div>

                             <div className="space-y-3">
                                {billItems.map(item => (
                                   <div key={item.id} className="flex justify-between items-center px-2">
                                      <div className="text-xs font-bold text-white uppercase tracking-tighter">{item.qty}x {item.name}</div>
                                      <div className="text-xs font-mono text-muted">₹{item.qty * item.price}</div>
                                   </div>
                                ))}
                             </div>

                             <div className="space-y-2 border-t border-white/5 pt-6">
                                <div className="flex justify-between text-[10px] font-mono text-muted uppercase tracking-widest px-2">
                                   <span>Subtotal</span>
                                   <span>₹{billItems.reduce((acc, item) => acc + (item.qty * item.price), 0)}</span>
                                </div>
                                <div className="flex justify-between text-[10px] font-mono text-brand-cyan uppercase tracking-widest px-2 font-bold">
                                   <span>Delivery Fee</span>
                                   <span>₹{deliveryFee}</span>
                                </div>
                                <div className="border-t border-brand-cyan/20 pt-4 mt-2 flex justify-between items-end px-2">
                                   <div className="text-[10px] font-mono text-white tracking-[0.2em] uppercase font-black">Grand Total</div>
                                   <div className="text-4xl font-display text-white italic tracking-tighter">₹{billItems.reduce((acc, item) => acc + (item.qty * item.price), 0) + Number(deliveryFee)}</div>
                                </div>
                             </div>
                          </div>

                          <div className="flex gap-4">
                             <button 
                               onClick={() => setUrgency(prev => prev === 'NORMAL' ? 'URGENT' : 'NORMAL')}
                               className={cn(
                                 "flex-1 py-5 rounded-3xl border font-bold text-[10px] tracking-widest uppercase transition-all",
                                 urgency === 'URGENT' ? "border-brand-red bg-brand-red/10 text-brand-red shadow-[0_0_15px_rgba(239,68,68,0.1)]" : "border-white/10 text-muted hover:border-white/20"
                               )}
                             >
                                {urgency === 'URGENT' ? 'URGENT ⚡' : 'Mark Urgent?'}
                             </button>
                             <button 
                               onClick={handlePlaceOrder}
                               className="flex-[2] bg-white text-bg-deep font-black py-5 rounded-3xl hover:bg-brand-cyan hover:shadow-[0_0_30px_rgba(0,242,255,0.2)] transition-all uppercase tracking-widest"
                             >
                                CONFIRM & POST 🚀
                             </button>
                          </div>
                       </motion.div>
                    )}
                  </AnimatePresence>
               </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <StudioModal 
        isOpen={modal.isOpen}
        onClose={() => setModal({ ...modal, isOpen: false })}
        title={modal.title}
        message={modal.message}
        type={modal.type}
        confirmText={modal.confirmText}
        onConfirm={modal.onConfirm}
      />
    </div>
  );
};

// Utils
function cn(...inputs) {
  return inputs.filter(Boolean).join(' ');
}

export default RequesterDashboard;
