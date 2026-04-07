import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { Package, MapPin, Clock, Zap, Smartphone, Navigation, Trash2, Smartphone as User, Phone, CheckCircle, Activity, AlertCircle } from 'lucide-react';
import LiveMap from './LiveMap';
import StudioModal from './StudioModal';

const CarrierDashboard = ({ user, setUser }) => {
  const [pendingOrders, setPendingOrders] = useState([]);
  const [isOnline, setIsOnline] = useState(user?.isOnline || false);
  const [capacity, setCapacity] = useState(5);
  const [destination, setDestination] = useState('');
  const [departureTime, setDepartureTime] = useState('');
  const [returnTime, setReturnTime] = useState('');
  const [isLocationSharing, setIsLocationSharing] = useState(false);
  const [myTrips, setMyTrips] = useState([]);
  const [activeTab, setActiveTab] = useState('AVAILABLE');
  const [showOfflineConfirm, setShowOfflineConfirm] = useState(false);
  const [modal, setModal] = useState({ isOpen: false, title: '', message: '', type: 'info', onConfirm: null, confirmText: 'OK' });

  // Define currentTrip at the top level
  const currentTrip = myTrips.find(t => t.status === 'OPEN');

  const fetchPendingOrders = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/orders/pending', {
        headers: { Authorization: `Bearer ${sessionStorage.getItem('token')}` }
      });
      setPendingOrders(response.data);
    } catch (err) {
      console.error('Fetch error:', err);
    }
  };

  const fetchMyTrips = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/trips/my-trips', {
        headers: { Authorization: `Bearer ${sessionStorage.getItem('token')}` }
      });
      setMyTrips(response.data);
      
      const openTrip = response.data.find(t => t.status === 'OPEN');
      if (openTrip) {
        setCapacity(openTrip.capacity);
      }
    } catch (err) {
      console.error('Fetch trips error:', err);
    }
  };

  useEffect(() => {
    fetchPendingOrders();
    fetchMyTrips();
    const interval = setInterval(() => {
      fetchPendingOrders();
      fetchMyTrips();
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleToggleOnline = () => {
    if (isOnline) {
      // Check if carrier has active matches first
      const hasMatches = myTrips.some(t => t.matches?.length > 0 && t.status !== 'COMPLETED' && t.status !== 'CANCELLED');
      if (hasMatches) {
        setShowOfflineConfirm(true);
      } else {
        executeStatusToggle(false);
      }
    } else {
      executeStatusToggle(true);
    }
  };

  const executeStatusToggle = async (status) => {
    try {
      const res = await axios.patch('http://localhost:5000/api/auth/status', { isOnline: status }, {
        headers: { Authorization: `Bearer ${sessionStorage.getItem('token')}` }
      });
      setIsOnline(status);
      if (setUser) setUser({ ...user, isOnline: status });
      setShowOfflineConfirm(false);
      fetchMyTrips(); // Refresh to see cancelled trips if any
    } catch (err) {
      setModal({
        isOpen: true,
        title: 'Status Update Failed',
        message: err.response?.data?.message || 'Could not update online status.',
        type: 'error'
      });
    }
  };

  const handleCreateTrip = async (e) => {
    if (e) e.preventDefault();
    try {
      await axios.post('http://localhost:5000/api/trips', {
        destination,
        departureTime,
        returnTime,
        capacity
      }, {
        headers: { Authorization: `Bearer ${sessionStorage.getItem('token')}` }
      });
      setDestination('');
      setDepartureTime('');
      setReturnTime('');
      fetchMyTrips();
      setModal({ isOpen: true, title: 'Trip Planned', message: 'You are now visible to customers in this area!', type: 'success' });
    } catch (err) {
      setModal({ isOpen: true, title: 'Trip Failed', message: 'You can only have one active trip at a time.', type: 'error' });
    }
  };

  const handleAcceptOrder = async (orderId) => {
    try {
      const openTrip = myTrips.find(t => t.status === 'OPEN');
      if (!openTrip) {
        setModal({ isOpen: true, title: 'No Active Trip', message: 'Please create a trip before accepting orders.', type: 'error' });
        return;
      }
      await axios.post('http://localhost:5000/api/trips/match', {
        orderId,
        tripId: openTrip.id
      }, {
        headers: { Authorization: `Bearer ${sessionStorage.getItem('token')}` }
      });
      fetchPendingOrders();
      fetchMyTrips();
      setModal({ isOpen: true, title: 'Order Accepted!', message: 'The customer has been notified. Check "My Trips" for details.', type: 'success' });
    } catch (err) {
      setModal({ isOpen: true, title: 'Match Failed', message: err.response?.data?.message || 'Could not accept order.', type: 'error' });
    }
  };

  const handleCancelTrip = (tripId) => {
    setModal({
      isOpen: true,
      title: 'Cancel Trip?',
      message: 'This will disconnect all matched orders. Re-posting orders back to the pool.',
      type: 'confirm',
      confirmText: 'Yes, Cancel Trip',
      onConfirm: async () => {
        try {
          await axios.patch(`http://localhost:5000/api/trips/${tripId}/cancel`, {}, {
            headers: { Authorization: `Bearer ${sessionStorage.getItem('token')}` }
          });
          fetchMyTrips();
        } catch (err) {
          setModal({ isOpen: true, title: 'Error', message: 'Failed to cancel trip.', type: 'error' });
        }
      }
    });
  };

  const handleDeleteTrip = (tripId) => {
    setModal({
      isOpen: true,
      title: 'Delete History?',
      message: 'This will remove the trip record from your dashboard.',
      type: 'error',
      confirmText: 'Delete Record',
      onConfirm: async () => {
        try {
          await axios.delete(`http://localhost:5000/api/trips/${tripId}`, {
            headers: { Authorization: `Bearer ${sessionStorage.getItem('token')}` }
          });
          fetchMyTrips();
        } catch (err) {
           setModal({ isOpen: true, title: 'Error', message: 'Failed to delete record.', type: 'error' });
        }
      }
    });
  };

  const handleDeleteOrder = (orderId) => {
    setModal({
      isOpen: true,
      title: 'Delete Order Record?',
      message: 'This will remove the delivered/cancelled order from your view.',
      type: 'info',
      confirmText: 'Remove',
      onConfirm: async () => {
        try {
          // Since we might not want to delete the order from DB (customer might need it),
          // we just "hide" it by refreshing matches or similar.
          // For now, let's assume we can remove the match record or similar.
          fetchMyTrips();
        } catch (err) {
           setModal({ isOpen: true, title: 'Error', message: 'Failed to remove record.', type: 'error' });
        }
      }
    });
  };

  return (
    <div className="space-y-12">
      {/* Stats Header */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <button 
          onClick={handleToggleOnline}
          className="glass p-6 rounded-3xl border border-border flex flex-col items-center gap-3 transition-all hover:border-primary/40 group relative overflow-hidden shadow-premium hover:shadow-lg"
        >
          <div className="flex items-center justify-between w-full relative z-10">
            <span className="text-[10px] font-mono text-muted tracking-widest uppercase font-black">Status</span>
            <div className={cn("w-2 h-2 rounded-full", isOnline ? "bg-green shadow-[0_0_10px_rgba(16,185,129,0.5)]" : "bg-red")} />
          </div>
          <div className={cn("text-xl font-display uppercase italic relative z-10 font-black", isOnline ? "text-green" : "text-muted")}>
            {isOnline ? 'Active' : 'Standby'}
          </div>
          <div className="text-[8px] font-mono text-muted uppercase tracking-tighter relative z-10 font-bold">Click to {isOnline ? 'Go Offline' : 'Go Online'}</div>
          {isOnline && <div className="absolute inset-0 bg-green/5 animate-pulse" />}
        </button>

        {[
          { label: 'Capacity', value: `${capacity} items`, color: 'text-foreground', icon: <Activity size={14} /> },
          { label: 'GPS', value: isLocationSharing ? 'Live' : 'Off', color: isLocationSharing ? 'text-primary' : 'text-muted', icon: <Smartphone size={14} /> },
          { label: 'Orders', value: `${pendingOrders.length} Available`, color: 'text-foreground', icon: <Package size={14} /> },
        ].map((stat, i) => (
          <div key={i} className="glass p-6 rounded-3xl border border-border flex flex-col items-center gap-2 group hover:border-primary/30 transition-colors shadow-premium">
            <div className="flex items-center justify-between w-full">
              <span className="text-[10px] font-mono text-muted tracking-widest uppercase font-black">{stat.label}</span>
              <div className="text-muted group-hover:text-primary transition-colors">{stat.icon}</div>
            </div>
            <div className={cn("text-xl font-display uppercase italic font-black", stat.color)}>{stat.value}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-8 space-y-12">
          
          <div className="space-y-6">
            <div className="flex gap-8 border-b border-border pb-1">
              <button 
                onClick={() => setActiveTab('AVAILABLE')}
                className={`pb-4 text-xs font-mono font-black tracking-widest relative transition-all uppercase ${activeTab === 'AVAILABLE' ? 'text-primary' : 'text-muted hover:text-foreground'}`}
              >
                Available Orders ({isOnline && currentTrip ? pendingOrders.length : 0})
                {activeTab === 'AVAILABLE' && <motion.div layoutId="t" className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />}
              </button>
              <button 
                onClick={() => setActiveTab('MY_TRIPS')}
                className={`pb-4 text-xs font-mono font-black tracking-widest relative transition-all uppercase ${activeTab === 'MY_TRIPS' ? 'text-primary' : 'text-muted hover:text-foreground'}`}
              >
                My Trips ({myTrips.length})
                {activeTab === 'MY_TRIPS' && <motion.div layoutId="t" className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />}
              </button>
              <button 
                onClick={() => setActiveTab('ACCEPTED')}
                className={`pb-4 text-xs font-mono font-black tracking-widest relative transition-all uppercase ${activeTab === 'ACCEPTED' ? 'text-primary' : 'text-muted hover:text-foreground'}`}
              >
                Accepted ({myTrips.reduce((acc, t) => acc + (t.matches?.length || 0), 0)})
                {activeTab === 'ACCEPTED' && <motion.div layoutId="t" className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />}
              </button>
            </div>

            <div className="grid grid-cols-1 gap-4">
              <AnimatePresence mode="popLayout">
                {activeTab === 'AVAILABLE' ? (
                  (isOnline && currentTrip) ? (
                    pendingOrders.map((item) => (
                      <motion.div 
                        key={item.id}
                        layout
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 10 }}
                        className="glass p-8 rounded-[32px] border border-border flex flex-col md:flex-row justify-between items-center gap-8 group hover:border-primary/20 transition-all shadow-premium hover:shadow-lg"
                      >
                        <div className="flex items-center gap-6 flex-1">
                          <div className="w-16 h-16 rounded-2xl bg-bg-surface flex items-center justify-center text-primary relative border border-border">
                            <Package size={28} />
                            <div className="absolute -top-1 -right-1 w-3 h-3 bg-primary rounded-full animate-ping opacity-40" />
                          </div>
                          <div>
                            <div className="text-[10px] font-mono text-muted tracking-widest uppercase mb-1 font-black">Pending Order</div>
                            <h3 className="text-2xl font-display text-foreground uppercase italic tracking-tight font-black">{item.itemName}</h3>
                            <div className="flex items-center gap-4 mt-2">
                              <div className="flex items-center gap-2 text-[10px] font-mono text-muted uppercase font-black">
                                <MapPin size={10} className="text-primary" /> {item.storeName}
                              </div>
                              <div className="flex items-center gap-2 text-[10px] font-mono text-green font-black uppercase">
                                <Zap size={10} /> Earn: ₹{item.deliveryFee}
                              </div>
                            </div>
                            
                            {/* Display items for carrier */}
                            {item.items && item.items.length > 0 && (
                              <div className="mt-4 flex flex-wrap gap-3 pb-2">
                                {item.items.map((oi, idx) => (
                                  <div key={idx} className="bg-primary/5 border border-primary/20 px-3 py-1.5 rounded-sm text-[10px] font-mono text-primary font-black uppercase tracking-widest backdrop-blur-md">
                                    {oi.quantity}X {oi.name}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>

                        <button 
                          onClick={() => handleAcceptOrder(item.id)}
                          className="bg-primary text-white px-8 py-4 rounded-2xl font-black text-xs tracking-widest uppercase hover:brightness-110 transition-all shadow-xl shadow-primary/20 w-full md:w-auto"
                        >
                          ACCEPT ORDER
                        </button>
                      </motion.div>
                    ))
                  ) : []
                ) : activeTab === 'MY_TRIPS' ? (
                  myTrips.map((trip) => (
                    <motion.div 
                      key={trip.id}
                      layout
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 10 }}
                      className="glass p-8 rounded-[32px] border border-border flex flex-col gap-6 group hover:border-primary/20 transition-all shadow-premium"
                    >
                      <div className="flex flex-col md:flex-row justify-between items-start gap-6">
                        <div className="flex items-center gap-6">
                          <div className="w-16 h-16 rounded-2xl bg-bg-surface flex items-center justify-center text-primary border border-border">
                            <Navigation size={28} />
                          </div>
                          <div>
                            <div className="text-[10px] font-mono text-muted tracking-widest uppercase mb-1 font-black">Status: {trip.status}</div>
                            <h3 className="text-2xl font-display text-foreground uppercase italic tracking-tight font-black">{trip.destination}</h3>
                            <div className="flex items-center gap-4 mt-1">
                               <div className="text-[9px] font-mono text-muted uppercase font-bold">
                                 Scheduled: {new Date(trip.departureTime).toLocaleString()}
                               </div>
                               {trip.status === 'OPEN' && (
                                 <button 
                                   onClick={() => handleCancelTrip(trip.id)}
                                   className="text-[8px] font-mono font-black text-red uppercase tracking-widest hover:underline"
                                 >
                                   CANCEL TRIP
                                 </button>
                               )}
                               {(trip.status === 'COMPLETED' || trip.status === 'CANCELLED') && (
                                 <button 
                                   onClick={() => handleDeleteTrip(trip.id)}
                                   className="text-[8px] font-mono font-black text-muted hover:text-red uppercase tracking-widest flex items-center gap-1 transition-colors"
                                 >
                                   <Trash2 size={10} /> DELETE HISTORY
                                 </button>
                               )}
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex flex-col md:items-end gap-2">
                          <div className="text-[10px] font-mono text-muted tracking-widest uppercase mb-1 font-black">Capacity Used</div>
                          <div className="flex items-center gap-3">
                             <div className="w-32 h-1.5 bg-bg-surface rounded-full overflow-hidden">
                                <div 
                                  className="h-full bg-primary shadow-sm" 
                                  style={{ width: `${(trip.matches?.length / trip.capacity) * 100}%` || '0%' }} 
                                />
                             </div>
                             <span className="text-xs font-bold text-foreground font-black">{trip.matches?.length || 0} / {trip.capacity}</span>
                          </div>
                        </div>
                      </div>

                      {trip.matches?.length > 0 ? (
                        <div className="border-t border-border pt-6 space-y-4">
                          <div className="text-[10px] font-mono text-muted tracking-[0.2em] uppercase font-black">Matched Orders ({trip.matches.length})</div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                             {trip.matches.map(m => (
                              <div key={m.id} className={cn("border p-4 rounded-2xl flex items-center justify-between group/item transition-all shadow-sm", m.status === 'CANCELLED' || m.order?.status === 'CANCELLED' ? "bg-red/5 border-red/10 opacity-60 grayscale" : "bg-bg-card border-border")}>
                                 <div className="flex items-center gap-4">
                                   <div className={cn("w-8 h-8 rounded-lg bg-bg-surface flex items-center justify-center", m.status === 'CANCELLED' || m.order?.status === 'CANCELLED' ? "text-red/50" : "text-primary")}>
                                     <Package size={14} />
                                   </div>
                                   <div>
                                     <div className={cn("text-xs font-black uppercase", m.status === 'CANCELLED' || m.order?.status === 'CANCELLED' ? "text-foreground/40 line-through" : "text-foreground")}>{m.order?.itemName}</div>
                                     <div className="text-[8px] font-mono text-muted uppercase font-bold">To: {m.order?.requester?.name || 'Customer'}</div>
                                     
                                     {/* Item summary for trip card */}
                                     {m.order?.items && m.order.items.length > 0 && (
                                       <div className="mt-2 flex flex-wrap gap-2 transform scale-90 origin-left pb-1">
                                         {m.order.items.slice(0, 3).map((oi, idx) => (
                                           <span key={idx} className="bg-primary/5 border border-primary/10 px-2 py-1 rounded-sm text-[8px] font-mono text-primary uppercase tracking-wider whitespace-nowrap font-black">
                                             {oi.quantity}X {oi.name}
                                           </span>
                                         ))}
                                         {m.order.items.length > 3 && (
                                           <span className="text-[8px] font-mono text-muted uppercase tracking-widest bg-bg-surface px-2 py-1 rounded-sm font-bold">
                                             +{m.order.items.length - 3} MORE
                                           </span>
                                         )}
                                       </div>
                                     )}
                                   </div>
                                 </div>
                                 <div className="flex flex-col items-end gap-1">
                                    <div className={cn("text-xs font-display italic font-black", m.status === 'CANCELLED' || m.order?.status === 'CANCELLED' ? "text-red/50 line-through" : "text-green")}>₹{m.order?.deliveryFee}</div>
                                    {(m.status === 'CANCELLED' || m.order?.status === 'CANCELLED') && (
                                       <span className="text-[8px] font-bold text-red/80 uppercase tracking-widest bg-red/10 px-2 rounded-sm border border-red/20 shadow-sm py-0.5">Cancelled</span>
                                    )}
                                 </div>
                               </div>
                             ))}
                          </div>
                        </div>
                      ) : (
                        <div className="border-t border-border pt-6 text-[10px] font-mono text-muted uppercase italic tracking-widest font-bold">
                           No orders matched to this trip yet.
                        </div>
                      )}
                    </motion.div>
                  ))
                ) : (
                  myTrips.flatMap(t => t.matches || []).map((match) => (
                    <motion.div 
                      key={match.id}
                      layout
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 10 }}
                      className={cn("glass p-8 rounded-[32px] border flex flex-col md:flex-row justify-between items-center gap-8 group transition-all shadow-premium", match.status === 'CANCELLED' || match.order?.status === 'CANCELLED' ? "border-red/10 bg-red/5" : "border-border hover:border-primary/20")}
                    >
                      <div className={cn("flex items-center gap-6 flex-1", match.status === 'CANCELLED' || match.order?.status === 'CANCELLED' ? "opacity-50 grayscale" : "")}>
                        <div className={cn("w-16 h-16 rounded-2xl bg-bg-surface flex items-center justify-center", match.status === 'CANCELLED' || match.order?.status === 'CANCELLED' ? "text-red" : "text-primary")}>
                          <Package size={28} />
                        </div>
                        <div>
                          <div className={cn("text-[10px] font-mono tracking-widest uppercase mb-1 font-black", match.status === 'CANCELLED' || match.order?.status === 'CANCELLED' ? "text-red" : "text-muted")}>
                             {match.status === 'CANCELLED' || match.order?.status === 'CANCELLED' ? 'Cancelled Match' : 'Accepted Order'}
                          </div>
                          <h3 className={cn("text-2xl font-display uppercase italic tracking-tight font-black", match.status === 'CANCELLED' || match.order?.status === 'CANCELLED' ? "text-foreground/40 line-through" : "text-foreground")}>{match.order?.itemName}</h3>
                          <div className="flex items-center gap-4 mt-2">
                            <div className="flex items-center gap-2 text-[10px] font-mono text-muted uppercase font-bold">
                              <Smartphone size={10} className="text-primary" /> {match.order?.requester?.name || 'Customer'}
                            </div>
                            <div className="flex items-center gap-2 text-[10px] font-mono uppercase font-black text-green border-l border-border pl-4">
                              <Zap size={10} /> Fee: ₹{match.order?.deliveryFee}
                            </div>
                            {match.order?.requester?.phone && (
                               <a 
                                 href={`tel:${match.order.requester.phone}`}
                                 onClick={(e) => e.stopPropagation()}
                                 className="flex items-center gap-2 text-[10px] font-mono uppercase font-black text-primary bg-primary/10 px-3 py-1 rounded-lg border border-primary/20 ml-2"
                                 title="Call Customer"
                               >
                                 <Phone size={10} /> {match.order.requester.phone}
                               </a>
                            )}
                          </div>
                          
                          {/* Items for accepted order */}
                          {match.order?.items && match.order.items.length > 0 && (
                            <div className="mt-6 border-t border-border pt-6 flex flex-wrap gap-3 pb-2">
                               {match.order.items.map((oi, idx) => (
                                 <div key={idx} className="bg-primary/5 border border-primary/10 px-4 py-2 rounded-sm text-[11px] font-mono text-primary font-black uppercase tracking-widest flex items-center gap-2 backdrop-blur-md">
                                   {oi.quantity}X {oi.name}
                                 </div>
                               ))}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className={cn("px-6 py-2 rounded-xl border text-[10px] font-mono font-black tracking-widest uppercase", match.status === 'CANCELLED' || match.order?.status === 'CANCELLED' ? "bg-red/10 border-red/20 text-red" : "bg-primary/10 border-primary/20 text-primary")}>
                          {match.status === 'CANCELLED' || match.order?.status === 'CANCELLED' ? 'CANCELLED' : match.order?.status}
                        </div>
                        {(match.status === 'COMPLETED' || match.status === 'CANCELLED' || match.order?.status === 'DELIVERED') && (
                          <button 
                            onClick={(e) => { e.stopPropagation(); handleDeleteOrder(match.orderId); }}
                            className="p-2 rounded-xl bg-bg-surface border border-border text-muted hover:text-red transition-all"
                            title="Delete History"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </motion.div>
                  ))
                )}

                {activeTab === 'AVAILABLE' && (!isOnline || !currentTrip) && (
                   <div className="flex flex-col items-center justify-center py-16 border border-dashed border-border rounded-[40px] bg-bg-surface text-center gap-6">
                      <div className="p-4 rounded-full bg-bg-card border border-border opacity-50">
                        <Zap size={32} className="text-amber" />
                      </div>
                      <div className="space-y-2">
                        <p className="text-sm font-black text-foreground uppercase tracking-widest">Orders Locked</p>
                        <p className="text-[10px] font-mono text-muted uppercase leading-loose max-w-[300px] font-bold">
                          Go <span className="text-green font-black underline">Online</span> and <span className="text-primary font-black underline">Plan a Trip</span> to see available requests.
                        </p>
                      </div>
                   </div>
                )}

                {activeTab === 'AVAILABLE' && isOnline && currentTrip && pendingOrders.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-12 border border-dashed border-border rounded-[32px] bg-bg-surface text-muted gap-4">
                    <Package size={32} className="opacity-30" />
                    <p className="text-sm font-black text-foreground uppercase">No orders available right now</p>
                  </div>
                )}
                
                {activeTab === 'MY_TRIPS' && myTrips.length === 0 && (
                   <div className="flex flex-col items-center justify-center py-12 border border-dashed border-border rounded-[32px] bg-bg-surface text-muted gap-4">
                     <Package size={32} className="opacity-30" />
                     <p className="text-sm font-black text-foreground uppercase">No trips planned yet</p>
                   </div>
                )}
              </AnimatePresence>
            </div>
          </div>

          <div className="glass rounded-[40px] p-10 border border-border space-y-10 shadow-premium">
            <div>
              <h3 className="text-3xl font-display text-foreground uppercase italic tracking-tight font-black">Trip Planner</h3>
              <p className="text-muted text-sm font-body font-bold">Set up a delivery trip so customers can find you.</p>
            </div>
            
            <form onSubmit={handleCreateTrip} className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <label className="text-[10px] font-mono text-muted tracking-widest uppercase ml-1 font-black">Destination</label>
                <div className="relative group">
                  <Navigation size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted group-focus-within:text-primary transition-colors" />
                  <input 
                    type="text" 
                    value={destination}
                    onChange={e => setDestination(e.target.value)}
                    placeholder="e.g. North Dorms, CS Dept"
                    className="w-full bg-bg-surface border border-border rounded-2xl py-4 pl-12 pr-6 text-foreground outline-none focus:border-primary/30 hover:bg-white transition-all text-sm font-heading shadow-sm"
                    required
                  />
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="flex justify-between items-center px-1">
                  <label className="text-[10px] font-mono text-muted tracking-widest uppercase font-black">Go Time</label>
                </div>
                <div className="relative group">
                  <Clock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted group-focus-within:text-primary transition-colors" />
                  <input 
                    type="datetime-local" 
                    value={departureTime}
                    onChange={e => setDepartureTime(e.target.value)}
                    className="w-full bg-bg-surface border border-border rounded-2xl py-4 pl-12 pr-6 text-foreground outline-none focus:border-primary/30 hover:bg-white transition-all text-sm font-mono shadow-sm"
                    required
                  />
                </div>
              </div>

              <div className="space-y-4">
                <label className="text-[10px] font-mono text-muted tracking-widest uppercase ml-1 font-black">Return Time (Approx)</label>
                <div className="relative group">
                  <Clock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted group-focus-within:text-primary transition-colors" />
                  <input 
                    type="datetime-local" 
                    value={returnTime}
                    onChange={e => setReturnTime(e.target.value)}
                    className="w-full bg-bg-surface border border-border rounded-2xl py-4 pl-12 pr-6 text-foreground outline-none focus:border-primary/30 hover:bg-white transition-all text-sm font-mono shadow-sm"
                  />
                </div>
              </div>

              <div className="space-y-4 group md:col-span-1">
                <label className="text-[10px] font-mono text-muted tracking-widest uppercase ml-1 font-black">Max Capacity (Items)</label>
                <div className="relative group">
                  <Package size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted group-focus-within:text-primary transition-colors" />
                  <input 
                    type="number" 
                    min="1" max="20"
                    value={capacity}
                    onChange={e => setCapacity(Number(e.target.value))}
                    className="w-full bg-bg-surface border border-border rounded-2xl py-4 pl-12 pr-6 text-primary text-lg font-display uppercase italic outline-none focus:border-primary/30 hover:bg-white transition-all font-black shadow-sm"
                    placeholder="Enter maximum items"
                    required
                  />
                </div>
              </div>

              <div className="md:col-span-2 space-y-4 border-t border-border pt-8">
                  <button 
                   type="submit"
                   disabled={!destination || !departureTime}
                   className={cn(
                     "w-full text-white font-black py-5 rounded-2xl transition-all shadow-xl uppercase outline-none",
                     (destination && departureTime) ? "bg-primary hover:brightness-110 shadow-primary/20 cursor-pointer" : "bg-muted cursor-not-allowed"
                   )}
                  >
                     Plan Delivery Trip 🚀
                  </button>
              </div>
            </form>
          </div>
        </div>

        {/* Tracking Sidebar */}
        <div className="lg:col-span-4 space-y-8">
           <div className="glass p-8 rounded-[40px] border border-border space-y-6 shadow-premium">
             <div className="flex items-center justify-between border-b border-border pb-4">
                <h3 className="text-sm font-mono font-black tracking-widest text-foreground uppercase">Live Map</h3>
                {currentTrip && (
                  <button 
                    onClick={() => setIsLocationSharing(!isLocationSharing)}
                    className={`px-3 py-1 rounded-lg text-[8px] font-mono font-black tracking-widest uppercase transition-all shadow-sm ${
                      isLocationSharing ? 'bg-red/10 text-red border border-red/30' : 'bg-green/10 text-green border border-green/30'
                    }`}
                  >
                    {isLocationSharing ? 'Stop Sharing' : 'Go Live'}
                  </button>
                )}
             </div>
             
             <div className="aspect-square rounded-[32px] overflow-hidden border border-border bg-bg-surface relative">
               {currentTrip && isOnline ? (
                 <LiveMap tripId={currentTrip.id} />
               ) : (
                 <div className="absolute inset-0 flex flex-col items-center justify-center p-12 text-center gap-6">
                   <div className="w-16 h-16 rounded-full border border-border flex items-center justify-center bg-bg-card shadow-sm">
                     <Navigation size={32} className={cn("transition-all duration-700", isOnline ? "text-primary animate-pulse" : "text-muted opacity-20")} />
                   </div>
                   <div className="space-y-2">
                       <p className="text-[10px] font-mono text-muted tracking-widest uppercase font-black">{!currentTrip ? 'No active trip' : 'Location Offline'}</p>
                       <p className="text-[9px] font-mono text-muted leading-relaxed italic font-bold">
                         {!currentTrip ? 'Accept an order or create a trip to enable live tracking.' : 'Switch to ACTIVE status to enable the live map.'}
                       </p>
                   </div>
                 </div>
               )}
             </div>
           </div>

           <div className="glass p-8 rounded-[40px] border border-primary/20 bg-primary/5 shadow-premium">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
                   <Smartphone size={20} />
                </div>
                <div>
                   <div className="text-[12px] font-black text-foreground uppercase tracking-tight">Your Profile</div>
                   <div className="text-[9px] font-mono text-primary font-black tracking-widest uppercase">Delivery Partner</div>
                </div>
              </div>
              <div className="h-1.5 w-full bg-bg-surface rounded-full overflow-hidden border border-border">
                 <div className="h-full w-0 bg-primary shadow-sm" />
              </div>
              <div className="flex justify-between mt-4">
                 <span className="text-[8px] font-mono text-muted uppercase font-black">Deliveries completed</span>
                 <span className="text-[8px] font-mono text-foreground uppercase font-black">{user?.deliveryCount || 0}</span>
              </div>
              <div className="flex justify-between mt-1">
                 <span className="text-[8px] font-mono text-muted uppercase font-black">Total Earnings</span>
                 <span className="text-[10px] font-mono text-green font-black uppercase">₹{user?.totalEarnings || 0}</span>
              </div>
           </div>
        </div>
      </div>

      {/* Offline Confirmation Modal */}
      <AnimatePresence>
        {showOfflineConfirm && (
          <div className="fixed inset-0 z-[2000] flex items-center justify-center p-6 text-center">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowOfflineConfirm(false)}
              className="absolute inset-0 bg-foreground/20 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-sm glass rounded-[40px] p-10 border border-border space-y-8 shadow-2xl"
            >
              <div className="mx-auto w-16 h-16 rounded-full bg-red/10 border border-red/20 flex items-center justify-center text-red">
                <AlertCircle size={32} />
              </div>
              <div className="space-y-2">
                <h3 className="text-2xl font-display text-foreground uppercase italic font-black">Go Offline?</h3>
                <p className="text-muted text-xs font-body font-bold leading-relaxed">
                  Your active trips will be <span className="text-red font-black underline">CANCELLED</span> and accepted orders will be returned to the pool for other carriers.
                </p>
              </div>
              <div className="flex flex-col gap-2">
                <button 
                  onClick={() => executeStatusToggle(false)}
                  className="w-full bg-red text-white font-black py-4 rounded-2xl hover:brightness-110 transition-all shadow-lg shadow-red/20 uppercase tracking-widest"
                >
                  CONFIRM OFFLINE
                </button>
                <button 
                  onClick={() => setShowOfflineConfirm(false)}
                  className="w-full bg-bg-surface text-muted font-black py-4 rounded-2xl hover:bg-white transition-all uppercase tracking-widest border border-border"
                >
                  STAY ONLINE
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <StudioModal 
        isOpen={modal.isOpen}
        onClose={() => setModal({ ...modal, isOpen: false })}
        title={modal.title}
        message={modal.message}
        type={modal.type}
        onConfirm={modal.onConfirm}
        confirmText={modal.confirmText}
      />
    </div>
  );
};

// Utils
function cn(...inputs) {
  return inputs.filter(Boolean).join(' ');
}

export default CarrierDashboard;
