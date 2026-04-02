import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, MapPin, DollarSign, Plus, Sparkles, Navigation, ShoppingBag } from 'lucide-react';
import LiveMap from './LiveMap';

const RequesterDashboard = () => {
  const [orders, setOrders] = useState([]);
  const [isFormVisible, setIsFormVisible] = useState(false);
  const [activeTab, setActiveTab] = useState('ACTIVE');
  const [searchQuery, setSearchQuery] = useState('');
  
  // New Order State
  const [itemName, setItemName] = useState('');
  const [storeName, setStoreName] = useState('');
  const [deliveryFee, setDeliveryFee] = useState(25);
  const [budget, setBudget] = useState('');
  const [urgency, setUrgency] = useState('NORMAL');
  const [step, setStep] = useState(1);

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, 10000);
    return () => clearInterval(interval);
  }, []);

  const fetchOrders = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/orders/my-orders', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setOrders(response.data);
    } catch (err) {
      console.error('Fetch error:', err);
    }
  };

  const handlePlaceOrder = async (e) => {
    if (e) e.preventDefault();
    try {
      await axios.post('http://localhost:5000/api/orders', {
        itemName,
        storeName,
        deliveryFee: Number(deliveryFee),
        budget: Number(budget),
        urgency
      }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setIsFormVisible(false);
      setItemName('');
      setStoreName('');
      setBudget('');
      setStep(1);
      fetchOrders();
    } catch (err) {
      alert('Failed to initiate order.');
    }
  };

  const activeOrders = orders.filter(o => o.status !== 'DELIVERED' && o.status !== 'CANCELLED');
  const historyOrders = orders.filter(o => o.status === 'DELIVERED' || o.status === 'CANCELLED');

  return (
    <div className="flex flex-col gap-12 max-w-6xl mx-auto pb-24">
      
      {/* Search Hero */}
      <section className="relative h-[240px] rounded-[40px] overflow-hidden bg-bg-card border border-white/5 p-12 flex flex-col items-center justify-center">
        <div className="absolute inset-0 opacity-10 pointer-events-none">
           {/* Animated SVG Path for map feel */}
           <svg width="100%" height="100%" viewBox="0 0 1000 300" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M0 50 Q 250 100 500 50 T 1000 50" stroke="white" strokeWidth="2" strokeDasharray="10 10" />
              <path d="M0 250 Q 250 200 500 250 T 1000 250" stroke="white" strokeWidth="2" strokeDasharray="10 10" />
              <circle cx="200" cy="80" r="4" fill="var(--orange)" className="animate-pulse" />
              <circle cx="800" cy="220" r="4" fill="var(--orange)" className="animate-pulse" />
           </svg>
        </div>
        
        <div className="relative z-10 w-full max-w-2xl text-center space-y-6">
           <div className="space-y-2">
              <h2 className="text-4xl font-display text-white tracking-widest uppercase">What do you need?</h2>
              <p className="text-muted text-sm font-mono tracking-wider">NETWORK STATUS: OPTIMAL · 12 CARRIERS NEARBY</p>
           </div>
           
           <div className="group relative">
              <div className="absolute inset-y-0 left-6 flex items-center">
                 <Search size={22} className="text-muted group-focus-within:text-brand-orange transition-colors" />
              </div>
              <input 
                type="text" 
                placeholder="medicine from Apollo pharmacy..."
                onFocus={() => setIsFormVisible(true)}
                className="w-full bg-white/5 border border-white/10 rounded-full py-6 pl-16 pr-8 text-xl font-body text-white placeholder-muted focus:bg-white/10 focus:border-brand-orange/40 outline-none transition-all shadow-2xl shadow-black/40"
              />
              <motion.div 
                animate={{ x: [0, 5, 0] }}
                transition={{ repeat: Infinity, duration: 2 }}
                className="absolute right-6 top-1/2 -translate-y-1/2 bg-brand-orange/20 text-brand-orange border border-brand-orange/30 px-4 py-1 rounded-full text-[10px] font-bold tracking-widest flex items-center gap-2"
              >
                 AUTOFILL ACTIVE <Sparkles size={12} />
              </motion.div>
           </div>
        </div>
      </section>

      {/* Active Missions */}
      <section className="space-y-6">
         <div className="flex items-center justify-between">
            <h3 className="text-2xl font-display text-white uppercase tracking-tighter">Active Missions</h3>
            <span className="text-[10px] font-mono tracking-[0.2em] text-muted">{orders.length} TOTAL</span>
         </div>
         
         <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 overflow-x-auto pb-4 custom-scrollbar">
            {orders.map(order => (
               <motion.div 
                key={order.id}
                layoutId={order.id}
                className={cn(
                  "flex-shrink-0 w-full glass h-[180px] rounded-[32px] p-6 flex flex-col justify-between group cursor-pointer hover:border-brand-orange/40 transition-all",
                  order.urgency === 'URGENT' ? "border-brand-red/50 shadow-lg shadow-brand-red/5" : "border-white/5"
                )}
               >
                  <div className="flex justify-between items-start">
                     <div className="space-y-1">
                        <div className="text-[10px] font-mono text-muted uppercase tracking-widest">{order.storeName || 'ANY STORE'}</div>
                        <h4 className="text-xl font-heading text-white">{order.itemName}</h4>
                     </div>
                     <div className={cn(
                       "px-3 py-1 rounded-full text-[9px] font-bold tracking-widest uppercase",
                       order.status === 'PENDING' ? "bg-brand-amber/10 text-brand-amber border border-brand-amber/20" :
                       order.status === 'MATCHED' ? "bg-brand-blue/10 text-brand-blue border border-brand-blue/20" :
                       "bg-brand-green/10 text-brand-green border border-brand-green/20"
                     )}>
                        {order.status}
                     </div>
                  </div>
                  
                  <div className="space-y-3">
                     <div className="flex justify-between items-end">
                        <div className="flex items-center gap-3">
                           <div className="w-8 h-8 rounded-full bg-bg-surface flex items-center justify-center border border-white/5">
                              <Navigation size={14} className="text-brand-orange" />
                           </div>
                           <div className="text-[10px] font-mono text-muted">ETA: <span className="text-white">12 MIN</span></div>
                        </div>
                        <div className="text-xl font-display text-white italic">◈ {order.deliveryFee + order.budget}</div>
                     </div>
                     
                     <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: order.status === 'PENDING' ? '10%' : order.status === 'MATCHED' ? '50%' : '100%' }}
                          className={cn("h-full transition-all duration-1000", order.status === 'PENDING' ? "bg-brand-amber" : "bg-brand-orange")}
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
                     <p className="text-sm font-bold text-white">No active deliveries.</p>
                     <p className="text-[10px] font-mono tracking-widest mt-1 uppercase">ALL QUIET ON CAMPUS</p>
                  </div>
               </div>
            )}
         </div>
      </section>

      {/* Creation Overlay Form */}
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
              className={cn(
                "w-full max-w-xl glass-morphism rounded-[40px] p-10 space-y-10 relative overflow-hidden"
              )}
            >
               {/* Background Pattern */}
               <div className="absolute inset-0 opacity-5 pointer-events-none select-none">
                  <svg width="100%" height="100%" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="50" cy="50" r="40" stroke="white" strokeWidth="0.1" />
                    <circle cx="50" cy="50" r="30" stroke="white" strokeWidth="0.1" />
                    <circle cx="50" cy="50" r="20" stroke="white" strokeWidth="0.1" />
                  </svg>
               </div>

               <div className="flex justify-between items-center relative z-10">
                  <div className="space-y-1">
                    <h3 className="text-3xl font-display text-white uppercase tracking-tighter">Place Mission</h3>
                    <p className="text-muted text-[10px] font-mono tracking-widest uppercase">STEP {step} OF 3</p>
                  </div>
                  <button onClick={() => setIsFormVisible(false)} className="text-muted hover:text-white font-mono text-[10px] tracking-widest uppercase border border-white/10 px-4 py-2 rounded-full">ABORT</button>
               </div>

               <div className="space-y-12 relative z-10">
                  {/* Step 1: Item & Location */}
                  <AnimatePresence mode="wait">
                    {step === 1 && (
                      <motion.div 
                        initial={{ x: 40, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: -40, opacity: 0 }}
                        className="space-y-6"
                      >
                         <div className="group space-y-2">
                           <label className="text-[10px] font-mono text-muted tracking-widest uppercase ml-4">What do you need?</label>
                           <div className="relative">
                              <ShoppingBag className="absolute left-6 top-1/2 -translate-y-1/2 text-muted group-focus-within:text-brand-orange transition-colors" size={20} />
                              <input 
                                type="text" 
                                value={itemName}
                                onChange={(e) => setItemName(e.target.value)}
                                placeholder="Iced Americano + Brownie"
                                className="w-full bg-bg-surface/50 border border-white/5 rounded-3xl py-5 pl-16 pr-6 text-white outline-none focus:border-brand-orange/50 transition-all font-heading"
                              />
                           </div>
                         </div>

                         <div className="group space-y-2">
                           <label className="text-[10px] font-mono text-muted tracking-widest uppercase ml-4">Pickup Point</label>
                           <div className="relative">
                              <MapPin className="absolute left-6 top-1/2 -translate-y-1/2 text-muted group-focus-within:text-brand-orange transition-colors" size={20} />
                              <input 
                                type="text" 
                                value={storeName}
                                onChange={(e) => setStoreName(e.target.value)}
                                placeholder="Campus Starbucks"
                                className="w-full bg-bg-surface/50 border border-white/5 rounded-3xl py-5 pl-16 pr-6 text-white outline-none focus:border-brand-orange/50 transition-all font-heading"
                              />
                           </div>
                         </div>
                         
                         <button 
                          onClick={() => itemName && storeName && setStep(2)}
                          className="w-full bg-brand-orange text-white font-bold py-5 rounded-3xl shadow-xl shadow-brand-orange/20 flex items-center justify-center gap-3 group"
                         >
                            NEXT CLEARANCE <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
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
                         <div className="space-y-6">
                            <div className="flex justify-between items-end">
                               <label className="text-[10px] font-mono text-muted tracking-widest uppercase ml-4">Delivery Bounty</label>
                               <div className="text-2xl font-display text-brand-orange">◈ {deliveryFee}</div>
                            </div>
                            <input 
                              type="range" 
                              min="5" max="100" step="5"
                              value={deliveryFee}
                              onChange={(e) => setDeliveryFee(e.target.value)}
                              className="w-full h-2 bg-white/5 rounded-lg appearance-none cursor-pointer accent-brand-orange"
                            />
                            <div className="bg-brand-blue/10 border border-brand-blue/20 rounded-2xl p-4 text-[10px] font-bold text-center text-brand-blue tracking-widest uppercase">
                               RECOMMENDED BOUNTY: ◈ 25+ FOR THIS SECTOR
                            </div>
                         </div>

                         <div className="group space-y-2">
                           <label className="text-[10px] font-mono text-muted tracking-widest uppercase ml-4">Item Budget ($ Cash)</label>
                           <div className="relative">
                              <DollarSign className="absolute left-6 top-1/2 -translate-y-1/2 text-muted group-focus-within:text-brand-orange transition-colors" size={20} />
                              <input 
                                type="number" 
                                value={budget}
                                onChange={(e) => setBudget(e.target.value)}
                                placeholder="Max price items"
                                className="w-full bg-bg-surface/50 border border-white/5 rounded-3xl py-5 pl-16 pr-6 text-white outline-none focus:border-brand-orange/50 transition-all font-heading"
                              />
                           </div>
                         </div>

                         <div className="flex gap-4">
                            <button onClick={() => setStep(1)} className="flex-1 py-4 text-[10px] font-mono text-muted tracking-widest uppercase hover:text-white">BACK</button>
                            <button 
                              onClick={() => budget && setStep(3)}
                              className="flex-[2] bg-brand-orange text-white font-bold py-5 rounded-3xl"
                            >
                              FINALIZE LOADOUT
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
                         <div className="bg-bg-surface/50 border border-white/5 p-8 rounded-[32px] space-y-6">
                            <div className="flex justify-between">
                               <div className="text-[10px] font-mono text-muted tracking-widest uppercase">MISSION SUMMARY</div>
                               <div className={cn("text-[8px] font-bold px-2 py-0.5 rounded-full", urgency === 'URGENT' ? "bg-brand-red text-white" : "bg-white/10 text-white")}>
                                  {urgency}
                               </div>
                            </div>
                            <div className="space-y-2">
                               <div className="text-2xl font-heading text-white">{itemName}</div>
                               <div className="text-xs text-muted flex items-center gap-2"><MapPin size={12} /> {storeName}</div>
                            </div>
                            <div className="border-t border-white/5 pt-4 flex justify-between items-center">
                               <div className="text-[10px] font-mono text-muted uppercase">TOTAL BOUNTY</div>
                               <div className="text-3xl font-display text-white">◈ {Number(budget) + Number(deliveryFee)}</div>
                            </div>
                         </div>

                         <div className="flex gap-4">
                            <button 
                              onClick={() => setUrgency(prev => prev === 'NORMAL' ? 'URGENT' : 'NORMAL')}
                              className={cn(
                                "flex-1 py-4 rounded-2xl border font-bold text-[10px] tracking-widest uppercase transition-all",
                                urgency === 'URGENT' ? "border-brand-red bg-brand-red/10 text-brand-red" : "border-white/10 text-muted hover:border-white/20"
                              )}
                            >
                               {urgency === 'URGENT' ? 'URGENT ACTIVE ⚡' : 'GO URGENT?'}
                            </button>
                            <button 
                              onClick={handlePlaceOrder}
                              className="flex-[2] bg-brand-orange text-white font-bold py-5 rounded-3xl animate-pulse-orange"
                            >
                              BROADCAST REQUEST 🚀
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
    </div>
  );
};

// Utils
function cn(...inputs) {
  return inputs.filter(Boolean).join(' ');
}

export default RequesterDashboard;
