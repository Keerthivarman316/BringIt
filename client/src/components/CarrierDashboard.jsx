import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';
import { motion, AnimatePresence } from 'framer-motion';
import { Navigation, Package, ChevronRight, MapPin, User, Activity, Smartphone, Zap } from 'lucide-react';
import LiveMap from './LiveMap';
import useGPS from '../hooks/useGPS';

const CarrierDashboard = () => {
  const [pendingOrders, setPendingOrders] = useState([]);
  const [myTrips, setMyTrips] = useState([]);
  const [isLocationSharing, setIsLocationSharing] = useState(false);
  const [activeTab, setActiveTab] = useState('AVAILABLE');
  
  // Trip creation state
  const [destination, setDestination] = useState('');
  const [capacity, setCapacity] = useState(4);
  const [departureOffset, setDepartureOffset] = useState(30); 
  const socketRef = useRef(null);

  const fetchData = useCallback(async () => {
    try {
      const headers = { Authorization: `Bearer ${localStorage.getItem('token')}` };
      const [pendingRes, tripsRes] = await Promise.all([
        axios.get('http://localhost:5000/api/orders/available', { headers }),
        axios.get('http://localhost:5000/api/trips/my-trips', { headers })
      ]);
      setPendingOrders(pendingRes.data);
      setMyTrips(tripsRes.data);
    } catch (err) {
      console.error('Fetch error:', err);
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

  const handleGPSUpdate = useCallback((location) => {
    if (myTrips.length > 0 && isLocationSharing && socketRef.current) {
      socketRef.current.emit('update_location', {
        tripId: myTrips[0].id,
        lat: location.lat,
        lng: location.lng
      });
    }
  }, [myTrips, isLocationSharing]);

  const { error: gpsError } = useGPS(isLocationSharing, handleGPSUpdate);

  const handleCreateTrip = async (e) => {
    e.preventDefault();
    const departureTime = new Date(Date.now() + departureOffset * 60000).toISOString();
    try {
      await axios.post('http://localhost:5000/api/trips', {
        destination,
        capacity: Number(capacity),
        departureTime
      }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setDestination('');
      fetchData();
      setActiveTab('MY_TRIPS');
    } catch (err) {
      alert(err.response?.data?.message || 'Started Failed: Check connection.');
      console.error(err);
    }
  };

  const handleAcceptOrder = async (orderId) => {
    try {
      await axios.post('http://localhost:5000/api/trips/join', { orderId }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      fetchData();
    } catch (err) {
      alert('Could not accept this order.');
    }
  };

  const currentTrip = myTrips.find(t => t.status !== 'COMPLETED');

  return (
    <div className="space-y-12">
      {/* Stats Header */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'Status', value: currentTrip ? 'Active' : 'Standby', color: currentTrip ? 'text-brand-cyan' : 'text-muted', icon: <Zap size={14} /> },
          { label: 'Capacity', value: `${capacity} items`, color: 'text-white', icon: <Activity size={14} /> },
          { label: 'GPS', value: isLocationSharing ? 'Live' : 'Off', color: isLocationSharing ? 'text-brand-green' : 'text-brand-red', icon: <Smartphone size={14} /> },
          { label: 'Orders', value: `${pendingOrders.length} available`, color: 'text-muted', icon: <Package size={14} /> },
        ].map(item => (
          <div key={item.label} className="glass p-6 rounded-3xl border border-white/5 flex items-center justify-between group hover:border-white/10 transition-all">
            <div className="space-y-1">
              <span className="text-[10px] font-mono text-muted tracking-widest uppercase">{item.label}</span>
              <div className={`text-xl font-display font-black ${item.color}`}>{item.value}</div>
            </div>
            <div className="text-muted group-hover:text-brand-cyan transition-colors">{item.icon}</div>
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
                Available Orders ({pendingOrders.length})
                {activeTab === 'AVAILABLE' && <motion.div layoutId="t" className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-cyan" />}
              </button>
              <button 
                onClick={() => setActiveTab('MY_TRIPS')}
                className={`pb-4 text-xs font-mono font-bold tracking-widest relative transition-all uppercase ${activeTab === 'MY_TRIPS' ? 'text-brand-cyan' : 'text-muted hover:text-white'}`}
              >
                My Trips ({myTrips.length})
                {activeTab === 'MY_TRIPS' && <motion.div layoutId="t" className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-cyan" />}
              </button>
            </div>

            <div className="grid grid-cols-1 gap-4">
              <AnimatePresence mode="popLayout">
                {(activeTab === 'AVAILABLE' ? pendingOrders : myTrips).map((item) => (
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
                        {activeTab === 'AVAILABLE' && <div className="absolute -top-1 -right-1 w-3 h-3 bg-brand-cyan rounded-full animate-ping opacity-40" />}
                      </div>
                      <div>
                        <div className="text-[10px] font-mono text-muted tracking-widest uppercase mb-1">
                          {activeTab === 'AVAILABLE' ? 'Pending Order' : `Status: ${item.status}`}
                        </div>
                        <h3 className="text-2xl font-display text-white uppercase italic tracking-tight">{item.itemName || item.order?.itemName || 'Order'}</h3>
                        <div className="flex items-center gap-4 mt-2">
                          <div className="flex items-center gap-2 text-[10px] font-mono text-muted uppercase">
                            <MapPin size={10} className="text-brand-cyan" /> {item.storeName || item.order?.storeName || 'Any store'}
                          </div>
                          <div className="flex items-center gap-2 text-[10px] font-mono text-brand-green font-bold uppercase">
                            <Zap size={10} /> Earn: ₹{item.deliveryFee || item.order?.deliveryFee || 0}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-3 w-full md:w-auto">
                      {activeTab === 'AVAILABLE' ? (
                        <button 
                          onClick={() => handleAcceptOrder(item.id)}
                          className="flex-1 md:flex-none bg-white text-bg-deep px-8 py-4 rounded-2xl font-black text-xs tracking-widest uppercase hover:bg-brand-cyan transition-all shadow-xl"
                        >
                          ACCEPT ORDER
                        </button>
                      ) : (
                        <button className="flex-1 md:flex-none bg-bg-surface border border-white/5 text-white px-8 py-4 rounded-2xl font-bold text-xs tracking-widest uppercase hover:bg-white/5 transition-all">
                          VIEW DETAILS
                        </button>
                      )}
                    </div>
                  </motion.div>
                ))}

                {(activeTab === 'AVAILABLE' ? pendingOrders : myTrips).length === 0 && (
                  <div className="flex flex-col items-center justify-center py-12 border border-dashed border-white/5 rounded-[32px] bg-white/[0.02] text-muted gap-4">
                    <Package size={32} className="opacity-30" />
                    <p className="text-sm font-bold text-white">{activeTab === 'AVAILABLE' ? 'No orders available right now' : 'No trips yet'}</p>
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
                  <label className="text-[10px] font-mono text-muted tracking-widest uppercase">Max Items</label>
                  <span className="text-xs font-bold text-white uppercase">{capacity}</span>
                </div>
                <input 
                  type="range" 
                  min="1" max="10"
                  value={capacity}
                  onChange={e => setCapacity(e.target.value)}
                  className="w-full h-1.5 bg-white/5 rounded-lg appearance-none cursor-pointer accent-brand-cyan"
                />
              </div>

              <div className="md:col-span-2 space-y-4 border-t border-white/5 pt-8">
                 <button 
                  type="submit"
                  disabled={!destination}
                  className={cn(
                    "w-full text-bg-deep font-black py-5 rounded-2xl transition-all shadow-xl uppercase outline-none",
                    destination ? "bg-white hover:bg-brand-cyan hover:shadow-lg hover:shadow-brand-cyan/20 cursor-pointer" : "bg-white/50 cursor-not-allowed"
                  )}
                 >
                    Start Trip
                 </button>
              </div>
            </form>
          </div>
        </div>

        {/* Tracking Sidebar */}
        <div className="lg:col-span-4 space-y-8">
           <div className="glass p-8 rounded-[40px] border border-white/5 space-y-6">
             <div className="flex items-center justify-between border-b border-white/5 pb-4">
                <h3 className="text-sm font-mono font-bold tracking-widest text-white uppercase">Live Map</h3>
                {currentTrip && (
                  <button 
                    onClick={() => setIsLocationSharing(!isLocationSharing)}
                    className={`px-3 py-1 rounded-lg text-[8px] font-mono font-bold tracking-widest uppercase transition-all ${
                      isLocationSharing ? 'bg-brand-red/20 text-brand-red border border-brand-red/30' : 'bg-brand-green/20 text-brand-green border border-brand-green/30'
                    }`}
                  >
                    {isLocationSharing ? 'Stop Sharing' : 'Go Live'}
                  </button>
                )}
             </div>
             
             <div className="aspect-square rounded-[32px] overflow-hidden border border-white/5 bg-bg-deep relative">
               {currentTrip ? (
                 <LiveMap tripId={currentTrip.id} />
               ) : (
                 <div className="absolute inset-0 flex flex-col items-center justify-center p-12 text-center gap-6">
                   <div className="w-16 h-16 rounded-full border border-white/10 flex items-center justify-center bg-bg-card">
                     <Navigation size={32} className="text-muted opacity-10 animate-pulse" />
                   </div>
                   <div className="space-y-2">
                      <p className="text-[10px] font-mono text-muted tracking-widest uppercase">No active trip</p>
                      <p className="text-[9px] font-mono text-white/40 leading-relaxed italic">Accept an order or create a trip to enable live tracking.</p>
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
                 <span className="text-[8px] font-mono text-white/50 uppercase">0</span>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};

// Utils
function cn(...inputs) {
  return inputs.filter(Boolean).join(' ');
}

export default CarrierDashboard;
