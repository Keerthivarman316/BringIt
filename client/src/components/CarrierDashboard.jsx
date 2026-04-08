import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, ShoppingBag, Clock, Shield, CheckCircle, Package, Send, Plus, X, User, LogOut, ChevronRight, Zap, Phone, AlertCircle, Trash2, Edit3, Navigation, ExternalLink, Mail, ArrowRight, Activity, Smartphone } from 'lucide-react';
import LiveMap from './LiveMap';
import useGPS from '../hooks/useGPS';
import StudioModal from './StudioModal';

const CarrierDashboard = ({ user, setUser }) => {
  const [pendingOrders, setPendingOrders] = useState([]);
  const [myTrips, setMyTrips] = useState([]);
  const [isLocationSharing, setIsLocationSharing] = useState(false);
  const [activeTab, setActiveTab] = useState('AVAILABLE');
  const [isOnline, setIsOnline] = useState(user?.isOnline || false);
  
  // Trip creation state
  const [destination, setDestination] = useState('');
  const [capacity, setCapacity] = useState(4);
  const [departureTime, setDepartureTime] = useState(''); 
  const [returnTime, setReturnTime] = useState(''); 
  const [modal, setModal] = useState({ isOpen: false, title: '', message: '', type: 'info' });
  const [showOfflineConfirm, setShowOfflineConfirm] = useState(false);
  const socketRef = useRef(null);
  const currentTripRef = useRef(null);
  const lastRestUpdateRef = useRef(0);

  const currentTrip = myTrips.find(t => t.status !== 'COMPLETED' && t.status !== 'CANCELLED');

  useEffect(() => {
    currentTripRef.current = currentTrip;
    
    // Automated GPS activation
    if (isOnline && currentTrip && (currentTrip.status === 'OPEN' || currentTrip.status === 'IN_PROGRESS')) {
      if (!isLocationSharing) setIsLocationSharing(true);
    } else {
      if (isLocationSharing) setIsLocationSharing(false);
    }
  }, [currentTrip, isOnline, isLocationSharing]);

  const fetchData = useCallback(async () => {
    try {
      const token = sessionStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      const [ordersRes, tripsRes, authRes] = await Promise.all([
        axios.get('http://localhost:5000/api/orders/pending', { headers }),
        axios.get('http://localhost:5000/api/trips/my-trips', { headers }),
        axios.get('http://localhost:5000/api/auth/me', { headers })
      ]);
      setPendingOrders(ordersRes.data);
      setMyTrips(tripsRes.data);
      if (authRes.data && setUser) {
        setUser(authRes.data.user || authRes.data);
        if (authRes.data.user?.isOnline !== undefined) {
           setIsOnline(authRes.data.user.isOnline);
        } else if (authRes.data.isOnline !== undefined) {
           setIsOnline(authRes.data.isOnline);
        }
      }
    } catch (err) {
      console.error('Fetch data error:', err);
    }
  }, []);

  useEffect(() => {
    fetchData();
    socketRef.current = io('http://localhost:5000');
    const interval = setInterval(fetchData, 10000);
    return () => {
      clearInterval(interval);
      if (socketRef.current) socketRef.current.disconnect();
    };
  }, [fetchData]);

  const handleGPSUpdate = useCallback(async (location) => {
    if (currentTripRef.current && isLocationSharing && socketRef.current) {
      // 1. WebSocket Update (Real-time)
      socketRef.current.emit('update_location', {
        tripId: currentTripRef.current.id,
        lat: location.lat,
        lng: location.lng
      });

      // 2. Throttled REST Update (Fallback / Sync - Every 30 seconds)
      const now = Date.now();
      if (now - lastRestUpdateRef.current > 30000) {
        try {
          lastRestUpdateRef.current = now;
          await axios.patch(`http://localhost:5000/api/trips/${currentTripRef.current.id}/location`, {
            lat: location.lat,
            lng: location.lng
          }, {
            headers: { Authorization: `Bearer ${sessionStorage.getItem('token')}` }
          });
          console.log('[GPS] REST sync successful');
        } catch (err) {
          console.error('[GPS] REST sync failed:', err);
        }
      }
    }
  }, [isLocationSharing]);

  const { error: gpsError } = useGPS(isLocationSharing, handleGPSUpdate);

  const handleCreateTrip = async (e) => {
    e.preventDefault();
    if (!departureTime) {
      setModal({ isOpen: true, title: 'Missing Info', message: 'Please select a departure time.', type: 'error' });
      return;
    }

    const now = new Date();
    const threshold = new Date(now.getTime() - 120000); // 2 minute grace for "NOW"
    const selectedDate = new Date(departureTime);
    const tenHoursFromNow = new Date(now.getTime() + 10 * 60 * 60 * 1000);

    if (selectedDate < threshold) {
      setModal({ isOpen: true, title: 'Clock Error', message: 'Departure time must be in the future (or now).', type: 'warning' });
      return;
    }

    if (selectedDate > tenHoursFromNow) {
      setModal({ isOpen: true, title: 'Limit Exceeded', message: 'Trip can only be planned within 10 hours from the current time.', type: 'error' });
      return;
    }

    const departureIso = selectedDate.toISOString();
    const returnIso = returnTime ? new Date(returnTime).toISOString() : null;

    if (returnIso && new Date(returnIso) <= selectedDate) {
      setModal({ isOpen: true, title: 'Timeline Error', message: 'Return time must be after departure time.', type: 'error' });
      return;
    }

    try {
      await axios.post('http://localhost:5000/api/trips', {
        destination,
        capacity: Number(capacity),
        departureTime: departureIso,
        returnTime: returnIso
      }, {
        headers: { Authorization: `Bearer ${sessionStorage.getItem('token')}` }
      });
      setDestination('');
      setDepartureTime('');
      setReturnTime('');
      await fetchData();
      setActiveTab('MY_TRIPS');
      
      // Auto-toggle online status for visibility
      try {
        await axios.patch('http://localhost:5000/api/auth/status', { isOnline: true }, {
          headers: { Authorization: `Bearer ${sessionStorage.getItem('token')}` }
        });
        setIsOnline(true);
      } catch (err) {
        console.error('Auto-online failed', err);
      }

      setModal({ isOpen: true, title: 'Trip Planned', message: `Trip to ${destination} scheduled successfully! You are now ONLINE for visibility.`, type: 'success' });
    } catch (err) {
      setModal({ isOpen: true, title: 'Sync Error', message: err.response?.data?.message || 'Started Failed: Check connection.', type: 'error' });
    }
  };

  const handleToggleOnline = async () => {
    if (isOnline) {
      setShowOfflineConfirm(true);
      return;
    }
    executeStatusToggle(true);
  };

  const executeStatusToggle = async (onlineStatus) => {
    try {
      const res = await axios.patch('http://localhost:5000/api/auth/status', { 
        isOnline: onlineStatus,
        reason: !onlineStatus ? 'Carrier manually went offline' : undefined
      }, {
        headers: { Authorization: `Bearer ${sessionStorage.getItem('token')}` }
      });
      setIsOnline(res.data.isOnline);
      if (setUser) setUser(prev => ({ ...prev, isOnline: res.data.isOnline }));
      setShowOfflineConfirm(false);
    } catch (err) {
      setModal({ isOpen: true, title: 'Connection Issue', message: 'Could not sync online status with the server.', type: 'error' });
    }
  };

  const handleAcceptOrder = async (orderId) => {
    if (!currentTrip) {
      setModal({ isOpen: true, title: 'Trip Required', message: 'You must plan a trip before accepting orders!', type: 'warning' });
      return;
    }
    try {
      await axios.post('http://localhost:5000/api/matches', { 
        tripId: currentTrip.id,
        orderId 
      }, {
        headers: { Authorization: `Bearer ${sessionStorage.getItem('token')}` }
      });
      await fetchData();
      setModal({ isOpen: true, title: 'Order Accepted', message: 'The order has been matched to your trip.', type: 'success' });
    } catch (err) {
      setModal({ isOpen: true, title: 'Accept Error', message: err.response?.data?.message || 'Could not accept this order.', type: 'error' });
    }
  };

  const handleCancelTrip = (tripId) => {
    setModal({
      isOpen: true,
      title: 'Cancel Trip?',
      message: 'Are you sure you want to cancel this trip? Matched orders will be reverted to pending.',
      type: 'confirm',
      confirmText: 'YES, CANCEL TRIP',
      onConfirm: async () => {
        try {
          await axios.patch(`http://localhost:5000/api/trips/${tripId}/cancel`, {}, {
            headers: { Authorization: `Bearer ${sessionStorage.getItem('token')}` }
          });
          await fetchData();
          setModal({ isOpen: true, title: 'Trip Cancelled', message: 'The trip has been removed and orders reverted.', type: 'success' });
        } catch (err) {
          setModal({ isOpen: true, title: 'Action Failed', message: err.response?.data?.message || 'Could not cancel trip.', type: 'error' });
        }
      }
    });
  };

  const handleDeleteTrip = (tripId) => {
    setModal({
      isOpen: true,
      title: 'Delete Trip History?',
      message: 'Are you sure you want to permanently delete this trip? This action cannot be undone.',
      type: 'warning',
      confirmText: 'YES, DELETE',
      onConfirm: async () => {
        try {
          await axios.delete(`http://localhost:5000/api/trips/${tripId}`, {
            headers: { Authorization: `Bearer ${sessionStorage.getItem('token')}` }
          });
          await fetchData();
          setModal({ isOpen: true, title: 'Trip Deleted', message: 'The trip history has been permanently removed.', type: 'success' });
        } catch (err) {
          setModal({ isOpen: true, title: 'Action Failed', message: err.response?.data?.message || 'Could not delete trip.', type: 'error' });
        }
      }
    });
  };

  const handleDeleteOrder = (orderId) => {
    setModal({
      isOpen: true,
      title: 'Delete History?',
      message: 'This will remove the delivery record from your dashboard. It will not affect your earnings.',
      type: 'warning',
      confirmText: 'YES, DELETE',
      onConfirm: async () => {
        try {
          await axios.delete(`http://localhost:5000/api/orders/${orderId}`, {
            headers: { Authorization: `Bearer ${sessionStorage.getItem('token')}` }
          });
          await fetchData();
          setModal({ isOpen: true, title: 'History Deleted', message: 'The record has been permanently removed.', type: 'success' });
        } catch (err) {
          setModal({ isOpen: true, title: 'Action Failed', message: err.response?.data?.message || 'Could not delete record.', type: 'error' });
        }
      }
    });
  };

  // Remove the previous redundant currentTrip calculation since it's now handled at the top


  return (
    <div className="space-y-12">
      {/* Stats Header */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <button 
          onClick={handleToggleOnline}
          className="glass p-6 rounded-3xl border border-white/5 flex flex-col items-center gap-3 transition-all hover:border-brand-cyan/40 group relative overflow-hidden"
        >
          <div className="flex items-center justify-between w-full relative z-10">
            <span className="text-[10px] font-mono text-muted tracking-widest uppercase">Status</span>
            <div className={cn("w-2 h-2 rounded-full", isOnline ? "bg-brand-green shadow-[0_0_10px_rgba(16,185,129,0.5)]" : "bg-brand-red")} />
          </div>
          <div className={cn("text-xl font-display uppercase italic relative z-10", isOnline ? "text-brand-green" : "text-muted")}>
            {isOnline ? 'Active' : 'Standby'}
          </div>
          <div className="text-[8px] font-mono text-white/20 uppercase tracking-tighter relative z-10">Click to {isOnline ? 'Go Offline' : 'Go Online'}</div>
          {isOnline && <div className="absolute inset-0 bg-brand-green/5 animate-pulse" />}
        </button>

        {[
          { label: 'Capacity', value: `${capacity} items`, color: 'text-white', icon: <Activity size={14} /> },
          { 
            label: 'GPS Status', 
            value: isLocationSharing ? 'AUTO-TRACKING' : 'STANDBY', 
            color: isLocationSharing ? 'text-brand-cyan' : 'text-muted', 
            icon: <Smartphone size={14} className={cn(isLocationSharing && "animate-pulse text-brand-cyan")} /> 
          },
          { label: 'Orders', value: `${pendingOrders.length} Available`, color: 'text-white', icon: <Package size={14} /> },
        ].map((stat, i) => (
          <div key={i} className={cn(
            "glass p-6 rounded-3xl border flex flex-col items-center gap-2 group transition-all",
            stat.label === 'GPS Status' && isLocationSharing ? "border-brand-cyan/20 bg-brand-cyan/5" : "border-white/5 hover:border-white/10"
          )}>
            <div className="flex items-center justify-between w-full">
              <span className="text-[10px] font-mono text-muted tracking-widest uppercase">{stat.label}</span>
              <div className="text-muted group-hover:text-brand-cyan transition-colors">{stat.icon}</div>
            </div>
            <div className={cn("text-xl font-display uppercase italic", stat.color)}>{stat.value}</div>
            {stat.label === 'GPS Status' && isLocationSharing && (
              <div className="text-[8px] font-mono text-brand-cyan/60 uppercase tracking-widest mt-1">Live Sync Active</div>
            )}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-8 space-y-12">
          
          <div className="space-y-6">
            <div className="flex gap-8 border-b border-white/5 pb-1">
              <button 
                onClick={() => setActiveTab('AVAILABLE')}
                className={`pb-4 text-xs font-mono font-bold tracking-widest relative transition-all uppercase ${activeTab === 'AVAILABLE' ? 'text-brand-cyan' : 'text-muted hover:text-white'}`}
              >
                Available Orders ({isOnline && currentTrip ? pendingOrders.length : 0})
                {activeTab === 'AVAILABLE' && <motion.div layoutId="t" className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-cyan" />}
              </button>
              <button 
                onClick={() => setActiveTab('MY_TRIPS')}
                className={`pb-4 text-xs font-mono font-bold tracking-widest relative transition-all uppercase ${activeTab === 'MY_TRIPS' ? 'text-brand-cyan' : 'text-muted hover:text-white'}`}
              >
                My Trips ({myTrips.length})
                {activeTab === 'MY_TRIPS' && <motion.div layoutId="t" className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-cyan" />}
              </button>
              <button 
                onClick={() => setActiveTab('ACCEPTED')}
                className={`pb-4 text-xs font-mono font-bold tracking-widest relative transition-all uppercase ${activeTab === 'ACCEPTED' ? 'text-brand-cyan' : 'text-muted hover:text-white'}`}
              >
                Accepted ({myTrips.reduce((acc, t) => acc + (t.matches?.length || 0), 0)})
                {activeTab === 'ACCEPTED' && <motion.div layoutId="t" className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-cyan" />}
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
                        className="glass p-8 rounded-[32px] border border-white/5 flex flex-col md:flex-row justify-between items-center gap-8 group hover:border-brand-cyan/20 transition-all"
                      >
                        <div className="flex items-center gap-6 flex-1">
                          <div className="w-16 h-16 rounded-2xl bg-bg-surface flex items-center justify-center text-brand-cyan relative">
                            <Package size={28} />
                            <div className="absolute -top-1 -right-1 w-3 h-3 bg-brand-cyan rounded-full animate-ping opacity-40" />
                          </div>
                          <div>
                            <div className="text-[10px] font-mono text-muted tracking-widest uppercase mb-1">Pending Order</div>
                            <h3 className="text-2xl font-display text-white uppercase italic tracking-tight">{item.itemName}</h3>
                            <div className="flex items-center gap-4 mt-2">
                              <div className="flex items-center gap-2 text-[10px] font-mono text-muted uppercase">
                                <MapPin size={10} className="text-brand-cyan" /> {item.storeName}
                              </div>
                              <div className="flex items-center gap-2 text-[10px] font-mono text-brand-green font-bold uppercase border-l border-white/10 pl-4">
                                <Zap size={10} /> Earn: ₹{item.deliveryFee}
                              </div>
                              <div className={cn(
                                "flex items-center gap-2 text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded border ml-2",
                                item.paymentMethod === 'COD' ? "text-brand-amber bg-brand-amber/10 border-brand-amber/20" : "text-brand-cyan bg-brand-cyan/10 border-brand-cyan/20"
                              )}>
                                {item.paymentMethod === 'COD' ? 'CASH' : 'PREPAID'}
                              </div>
                            </div>
                            
                            {/* Display items for carrier */}
                            {item.items && item.items.length > 0 && (
                              <div className="mt-4 flex flex-wrap gap-3 pb-2">
                                {item.items.map((oi, idx) => (
                                  <div key={idx} className="bg-brand-cyan/5 border border-brand-cyan/20 px-3 py-1.5 rounded-sm text-[10px] font-mono text-brand-cyan font-bold uppercase tracking-widest backdrop-blur-md">
                                    {oi.quantity}X {oi.name}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>

                        <button 
                          onClick={() => handleAcceptOrder(item.id)}
                          className="bg-white text-bg-deep px-8 py-4 rounded-2xl font-black text-xs tracking-widest uppercase hover:bg-brand-cyan transition-all shadow-xl w-full md:w-auto"
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
                      className="glass p-8 rounded-[32px] border border-white/5 flex flex-col gap-6 group hover:border-brand-cyan/20 transition-all"
                    >
                      <div className="flex flex-col md:flex-row justify-between items-start gap-6">
                        <div className="flex items-center gap-6">
                          <div className="w-16 h-16 rounded-2xl bg-bg-surface flex items-center justify-center text-brand-cyan border border-white/5">
                            <Navigation size={28} />
                          </div>
                          <div>
                            <div className="text-[10px] font-mono text-muted tracking-widest uppercase mb-1">Status: {trip.status}</div>
                            <h3 className="text-2xl font-display text-white uppercase italic tracking-tight">{trip.destination}</h3>
                            <div className="flex items-center gap-4 mt-1">
                               <div className="text-[9px] font-mono text-muted uppercase">
                                 Scheduled: {new Date(trip.departureTime).toLocaleString()}
                               </div>
                               {trip.status === 'OPEN' && (
                                 <button 
                                   onClick={() => handleCancelTrip(trip.id)}
                                   className="text-[8px] font-mono font-bold text-brand-red uppercase tracking-widest hover:underline"
                                 >
                                   CANCEL TRIP
                                 </button>
                               )}
                               {(trip.status === 'COMPLETED' || trip.status === 'CANCELLED') && (
                                 <button 
                                   onClick={() => handleDeleteTrip(trip.id)}
                                   className="text-[8px] font-mono font-bold text-muted hover:text-brand-red uppercase tracking-widest flex items-center gap-1 transition-colors"
                                 >
                                   <Trash2 size={10} /> DELETE HISTORY
                                 </button>
                               )}
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex flex-col md:items-end gap-2">
                          <div className="text-[10px] font-mono text-muted tracking-widest uppercase mb-1">Capacity Used</div>
                          <div className="flex items-center gap-3">
                             <div className="w-32 h-1.5 bg-white/5 rounded-full overflow-hidden">
                                <div 
                                  className="h-full bg-brand-cyan shadow-[0_0_8px_rgba(0,242,255,0.4)]" 
                                  style={{ width: `${(trip.matches?.length / trip.capacity) * 100}%` }} 
                                />
                             </div>
                             <span className="text-xs font-bold text-white">{trip.matches?.length || 0} / {trip.capacity}</span>
                          </div>
                        </div>
                      </div>

                      {trip.matches?.length > 0 ? (
                        <div className="border-t border-white/5 pt-6 space-y-4">
                          <div className="text-[10px] font-mono text-white/40 tracking-[0.2em] uppercase">Matched Orders ({trip.matches.length})</div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                             {trip.matches.map(m => (
                               <div key={m.id} className={cn("border p-4 rounded-2xl flex items-center justify-between group/item transition-all", m.status === 'CANCELLED' || m.order?.status === 'CANCELLED' ? "bg-brand-red/5 border-brand-red/10 opacity-60 grayscale" : "bg-white/[0.03] border-white/5")}>
                                 <div className="flex items-center gap-4">
                                   <div className={cn("w-8 h-8 rounded-lg bg-bg-surface flex items-center justify-center", m.status === 'CANCELLED' || m.order?.status === 'CANCELLED' ? "text-brand-red/50" : "text-brand-cyan")}>
                                     <Package size={14} />
                                   </div>
                                   <div>
                                     <div className={cn("text-xs font-bold uppercase", m.status === 'CANCELLED' || m.order?.status === 'CANCELLED' ? "text-white/40 line-through" : "text-white")}>{m.order?.itemName}</div>
                                     <div className="text-[8px] font-mono text-muted uppercase">To: {m.order?.requester?.name || 'Customer'}</div>
                                     
                                     {/* Item summary for trip card */}
                                     {m.order?.items && m.order.items.length > 0 && (
                                       <div className="mt-2 flex flex-wrap gap-2 transform scale-90 origin-left pb-1">
                                         {m.order.items.slice(0, 3).map((oi, idx) => (
                                           <span key={idx} className="bg-white/5 border border-white/10 px-2 py-1 rounded-sm text-[8px] font-mono text-brand-cyan uppercase tracking-wider whitespace-nowrap">
                                             {oi.quantity}X {oi.name}
                                           </span>
                                         ))}
                                         {m.order.items.length > 3 && (
                                           <span className="text-[8px] font-mono text-muted uppercase tracking-widest bg-white/5 px-2 py-1 rounded-sm">
                                             +{m.order.items.length - 3} MORE
                                           </span>
                                         )}
                                       </div>
                                     )}
                                   </div>
                                 </div>
                                 <div className="flex flex-col items-end gap-1">
                                    <div className={cn("text-xs font-display italic", m.status === 'CANCELLED' || m.order?.status === 'CANCELLED' ? "text-brand-red/50 line-through" : "text-brand-green")}>₹{m.order?.deliveryFee}</div>
                                    {(m.status === 'CANCELLED' || m.order?.status === 'CANCELLED') && (
                                       <span className="text-[8px] font-bold text-brand-red/80 uppercase tracking-widest bg-brand-red/10 px-2 rounded-sm border border-brand-red/20 shadow-xl py-0.5">Cancelled</span>
                                    )}
                                 </div>
                               </div>
                             ))}
                          </div>
                        </div>
                      ) : (
                        <div className="border-t border-white/5 pt-6 text-[10px] font-mono text-muted uppercase italic tracking-widest">
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
                      className={cn("glass p-8 rounded-[32px] border flex flex-col md:flex-row justify-between items-center gap-8 group transition-all", match.status === 'CANCELLED' || match.order?.status === 'CANCELLED' ? "border-brand-red/10 bg-brand-red/5" : "border-white/5 hover:border-brand-cyan/20")}
                    >
                      <div className={cn("flex items-center gap-6 flex-1", match.status === 'CANCELLED' || match.order?.status === 'CANCELLED' ? "opacity-50 grayscale" : "")}>
                        <div className={cn("w-16 h-16 rounded-2xl bg-bg-surface flex items-center justify-center", match.status === 'CANCELLED' || match.order?.status === 'CANCELLED' ? "text-brand-red" : "text-brand-cyan")}>
                          <Package size={28} />
                        </div>
                        <div>
                          <div className={cn("text-[10px] font-mono tracking-widest uppercase mb-1", match.status === 'CANCELLED' || match.order?.status === 'CANCELLED' ? "text-brand-red font-bold" : "text-muted")}>
                             {match.status === 'CANCELLED' || match.order?.status === 'CANCELLED' ? 'Cancelled Match' : 'Accepted Order'}
                          </div>
                          <h3 className={cn("text-2xl font-display uppercase italic tracking-tight", match.status === 'CANCELLED' || match.order?.status === 'CANCELLED' ? "text-white/40 line-through" : "text-white")}>{match.order?.itemName}</h3>
                          <div className="flex items-center gap-4 mt-2">
                            <div className="flex items-center gap-2 text-[10px] font-mono text-muted uppercase">
                              <User size={10} className="text-brand-cyan" /> {match.order?.requester?.name || 'Customer'}
                            </div>
                            <div className="flex items-center gap-2 text-[10px] font-mono uppercase font-bold text-brand-green border-l border-white/10 pl-4">
                              <Zap size={10} /> Fee: ₹{match.order?.deliveryFee}
                            </div>
                            <div className={cn(
                                "flex items-center gap-2 text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded border ml-2",
                                match.order?.paymentMethod === 'COD' ? "text-brand-amber bg-brand-amber/10 border-brand-amber/20" : "text-brand-cyan bg-brand-cyan/10 border-brand-cyan/20"
                            )}>
                              {match.order?.paymentMethod === 'COD' ? 'CASH' : 'PREPAID'}
                            </div>
                            {match.order?.requester?.phone && (
                               <a 
                                 href={`tel:${match.order.requester.phone}`}
                                 onClick={(e) => e.stopPropagation()}
                                 className="flex items-center gap-2 text-[10px] font-mono uppercase font-black text-brand-cyan bg-brand-cyan/10 px-3 py-1 rounded-lg border border-brand-cyan/20 ml-2"
                                 title="Call Customer"
                               >
                                 <Phone size={10} /> {match.order.requester.phone}
                               </a>
                            )}
                          </div>
                          
                          {/* Items for accepted order */}
                          {match.order?.items && match.order.items.length > 0 && (
                            <div className="mt-6 border-t border-white/5 pt-6 flex flex-wrap gap-3 pb-2">
                               {match.order.items.map((oi, idx) => (
                                 <div key={idx} className="bg-white/5 border border-brand-cyan/10 px-4 py-2 rounded-sm text-[11px] font-mono text-brand-cyan font-bold uppercase tracking-widest flex items-center gap-2 backdrop-blur-md">
                                   {oi.quantity}X {oi.name}
                                 </div>
                               ))}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className={cn("px-6 py-2 rounded-xl border text-[10px] font-mono font-bold tracking-widest uppercase", match.status === 'CANCELLED' || match.order?.status === 'CANCELLED' ? "bg-brand-red/10 border-brand-red/20 text-brand-red" : "bg-brand-cyan/10 border-brand-cyan/20 text-brand-cyan")}>
                          {match.status === 'CANCELLED' || match.order?.status === 'CANCELLED' ? 'CANCELLED' : match.order?.status}
                        </div>
                        {(match.status === 'COMPLETED' || match.status === 'CANCELLED' || match.order?.status === 'DELIVERED') && (
                          <button 
                            onClick={(e) => { e.stopPropagation(); handleDeleteOrder(match.orderId); }}
                            className="p-2 rounded-xl bg-bg-surface border border-white/5 text-muted hover:text-brand-red transition-all"
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
                   <div className="flex flex-col items-center justify-center py-16 border border-dashed border-white/5 rounded-[40px] bg-white/[0.01] text-center gap-6">
                      <div className="p-4 rounded-full bg-bg-surface border border-white/5 opacity-50">
                        <Zap size={32} className="text-brand-amber" />
                      </div>
                      <div className="space-y-2">
                        <p className="text-sm font-bold text-white uppercase tracking-widest">Orders Locked</p>
                        <p className="text-[10px] font-mono text-muted uppercase leading-loose max-w-[300px]">
                          Go <span className="text-brand-green font-black underline">Online</span> and <span className="text-brand-cyan font-black underline">Plan a Trip</span> to see available requests.
                        </p>
                      </div>
                   </div>
                )}

                {activeTab === 'AVAILABLE' && isOnline && currentTrip && pendingOrders.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-12 border border-dashed border-white/5 rounded-[32px] bg-white/[0.02] text-muted gap-4">
                    <Package size={32} className="opacity-30" />
                    <p className="text-sm font-bold text-white">No orders available right now</p>
                  </div>
                )}
                
                {activeTab === 'MY_TRIPS' && myTrips.length === 0 && (
                   <div className="flex flex-col items-center justify-center py-12 border border-dashed border-white/5 rounded-[32px] bg-white/[0.02] text-muted gap-4">
                     <Package size={32} className="opacity-30" />
                     <p className="text-sm font-bold text-white">No trips planned yet</p>
                   </div>
                )}
              </AnimatePresence>
            </div>
          </div>

          <div className="glass rounded-[40px] p-10 border border-white/5 space-y-10">
            <div>
              <h3 className="text-3xl font-display text-white uppercase italic tracking-tight">Trip Planner</h3>
              <p className="text-muted text-sm font-body">Set up a delivery trip so customers can find you.</p>
            </div>
            
            <form onSubmit={handleCreateTrip} className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <label className="text-[10px] font-mono text-muted tracking-widest uppercase ml-1">Destination</label>
                <div className="relative group">
                  <Navigation size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted group-focus-within:text-brand-cyan transition-colors" />
                  <input 
                    type="text" 
                    value={destination}
                    onChange={e => setDestination(e.target.value)}
                    placeholder="e.g. North Dorms, CS Dept"
                    className="w-full bg-bg-surface/50 border border-white/5 rounded-2xl py-4 pl-12 pr-6 text-white outline-none focus:border-brand-cyan/30 hover:border-white/10 transition-all text-sm"
                    required
                  />
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="flex justify-between items-center px-1">
                  <label className="text-[10px] font-mono text-muted tracking-widest uppercase">Go Time</label>
                  <button 
                    type="button"
                    onClick={() => {
                      const now = new Date();
                      const offset = now.getTimezoneOffset() * 60000;
                      const localISOTime = (new Date(now - offset)).toISOString().slice(0, 16);
                      setDepartureTime(localISOTime);
                    }}
                    className="text-[9px] font-black bg-brand-cyan/20 text-brand-cyan px-2 py-0.5 rounded border border-brand-cyan/30 hover:bg-brand-cyan hover:text-bg-deep transition-all"
                  >
                    NOW
                  </button>
                </div>
                <div className="relative group">
                  <Clock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted group-focus-within:text-brand-cyan transition-colors" />
                  <input 
                    type="datetime-local" 
                    value={departureTime}
                    onChange={e => setDepartureTime(e.target.value)}
                    className="w-full bg-bg-surface/50 border border-white/5 rounded-2xl py-4 pl-12 pr-6 text-white outline-none focus:border-brand-cyan/30 hover:border-white/10 transition-all"
                    required
                  />
                </div>
              </div>

              <div className="space-y-4">
                <label className="text-[10px] font-mono text-muted tracking-widest uppercase ml-1">Return Time (Approx)</label>
                <div className="relative group">
                  <Clock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted group-focus-within:text-brand-cyan transition-colors" />
                  <input 
                    type="datetime-local" 
                    value={returnTime}
                    onChange={e => setReturnTime(e.target.value)}
                    className="w-full bg-bg-surface/50 border border-white/5 rounded-2xl py-4 pl-12 pr-6 text-white outline-none focus:border-brand-cyan/30 hover:border-white/10 transition-all font-mono text-xs"
                  />
                </div>
              </div>

              <div className="space-y-4 group md:col-span-2">
                <label className="text-[10px] font-mono text-muted tracking-widest uppercase ml-1">Max Capacity (Items)</label>
                <div className="relative group">
                  <Package size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted group-focus-within:text-brand-cyan transition-colors" />
                  <input 
                    type="number" 
                    min="1" max="20"
                    value={capacity}
                    onChange={e => setCapacity(Number(e.target.value))}
                    className="w-full bg-bg-surface/50 border border-white/5 rounded-2xl py-4 pl-12 pr-6 text-brand-cyan text-lg font-display uppercase italic outline-none focus:border-brand-cyan/30 hover:border-white/10 transition-all font-black"
                    placeholder="Enter maximum items"
                    required
                  />
                </div>
              </div>

              <div className="md:col-span-2 space-y-4">
                <label className="text-[10px] font-mono text-muted tracking-widest uppercase ml-1">Departure Time</label>
                <div className="relative group">
                  <input 
                    type="datetime-local" 
                    value={departureTime}
                    onChange={e => setDepartureTime(e.target.value)}
                    className="w-full bg-bg-surface/50 border border-white/5 rounded-2xl py-4 px-6 text-white outline-none focus:border-brand-cyan/30 hover:border-white/10 transition-all text-sm [color-scheme:dark]"
                    required
                  />
                </div>
              </div>

              <div className="md:col-span-2 space-y-4 border-t border-white/5 pt-8">
                  <button 
                   type="submit"
                   disabled={!destination || !departureTime}
                   className={cn(
                     "w-full text-bg-deep font-black py-5 rounded-2xl transition-all shadow-xl uppercase outline-none",
                     (destination && departureTime) ? "bg-white hover:bg-brand-cyan hover:shadow-lg hover:shadow-brand-cyan/20 cursor-pointer" : "bg-white/50 cursor-not-allowed"
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
           <div className="glass p-8 rounded-[40px] border border-white/5 space-y-6">
             <div className="flex items-center justify-between border-b border-white/5 pb-4">
                <h3 className="text-sm font-mono font-bold tracking-widest text-white uppercase">Live Tracking</h3>
                {isLocationSharing && (
                  <div className="flex items-center gap-2 bg-brand-green/10 px-3 py-1 rounded-full border border-brand-green/20">
                    <div className="w-1.5 h-1.5 bg-brand-green rounded-full animate-ping" />
                    <span className="text-[8px] font-mono font-bold text-brand-green uppercase tracking-widest">Live</span>
                  </div>
                )}
             </div>
             
             <div className="aspect-square rounded-[32px] overflow-hidden border border-white/5 bg-bg-deep relative">
               {currentTrip && isOnline ? (
                 <LiveMap tripId={currentTrip.id} />
               ) : (
                 <div className="absolute inset-0 flex flex-col items-center justify-center p-12 text-center gap-6">
                   <div className="w-16 h-16 rounded-full border border-white/10 flex items-center justify-center bg-bg-card">
                     <Navigation size={32} className={cn("transition-all duration-700", isOnline ? "text-brand-cyan animate-pulse" : "text-muted opacity-10")} />
                   </div>
                   <div className="space-y-2">
                       <p className="text-[10px] font-mono text-muted tracking-widest uppercase">{!currentTrip ? 'No active trip' : 'Location Offline'}</p>
                       <p className="text-[9px] font-mono text-white/40 leading-relaxed italic">
                         {!currentTrip ? 'Accept an order or create a trip to enable live tracking.' : 'Switch to ACTIVE status to enable the live map.'}
                       </p>
                   </div>
                 </div>
               )}
             </div>
           </div>

           <div className="glass p-8 rounded-[40px] border border-white/5 bg-brand-cyan/5">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-10 h-10 rounded-xl bg-brand-cyan/10 flex items-center justify-center text-brand-cyan">
                   <User size={20} />
                </div>
                <div>
                   <div className="text-[12px] font-bold text-white uppercase tracking-tight">Your Profile</div>
                   <div className="text-[9px] font-mono text-brand-cyan font-bold tracking-widest uppercase">Delivery Partner</div>
                </div>
              </div>
              <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                 <div className="h-full w-0 bg-brand-cyan shadow-[0_0_8px_rgba(0,242,255,0.4)]" />
              </div>
              <div className="flex justify-between mt-2">
                 <span className="text-[8px] font-mono text-muted uppercase">Deliveries completed</span>
                 <span className="text-[8px] font-mono text-white/50 uppercase">{user?.deliveryCount || 0}</span>
              </div>
              <div className="flex justify-between mt-1">
                 <span className="text-[8px] font-mono text-muted uppercase">Total Earnings</span>
                 <span className="text-[8px] font-mono text-brand-green font-bold uppercase">₹{user?.totalEarnings || 0}</span>
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
              className="absolute inset-0 bg-bg-deep/80 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-sm glass rounded-[40px] p-10 border border-white/10 space-y-8"
            >
              <div className="mx-auto w-16 h-16 rounded-full bg-brand-red/10 border border-brand-red/20 flex items-center justify-center text-brand-red">
                <AlertCircle size={32} />
              </div>
              <div className="space-y-2">
                <h3 className="text-2xl font-display text-white uppercase italic">Go Offline?</h3>
                <p className="text-muted text-xs font-body leading-relaxed">
                  Your active trips will be <span className="text-brand-red font-bold">CANCELLED</span> and accepted orders will be returned to the pool for other carriers.
                </p>
              </div>
              <div className="flex flex-col gap-2">
                <button 
                  onClick={() => executeStatusToggle(false)}
                  className="w-full bg-brand-red text-white font-black py-4 rounded-2xl hover:brightness-110 transition-all shadow-lg shadow-brand-red/10"
                >
                  CONFIRM OFFLINE
                </button>
                <button 
                  onClick={() => setShowOfflineConfirm(false)}
                  className="w-full bg-white/5 text-muted font-bold py-4 rounded-2xl hover:bg-white/10 transition-all"
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
