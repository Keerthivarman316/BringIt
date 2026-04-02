import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Star, Leaf, TrendingUp } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs) {
  return twMerge(clsx(inputs));
}

const Confetti = () => {
  const particles = Array.from({ length: 80 });
  const colors = ['#FF5C1A', '#FFB347', '#F5F2ED'];
  
  return (
    <div className="absolute inset-0 pointer-events-none z-[1001] overflow-hidden">
      {particles.map((_, i) => (
        <motion.div
           key={i}
           initial={{ 
             top: '100%', 
             left: `${Math.random() * 100}%`,
             scale: Math.random() * 0.5 + 0.5,
             rotate: 0,
             opacity: 1
           }}
           animate={{ 
             top: '-10%',
             left: `${Math.random() * 100}%`,
             rotate: 360 * (Math.random() > 0.5 ? 1 : -1),
             opacity: 0
           }}
           transition={{ 
             duration: 2 + Math.random() * 2, 
             ease: "easeOut",
             delay: Math.random() * 0.5
           }}
           className="absolute w-2 h-2 rounded-sm"
           style={{ backgroundColor: colors[Math.floor(Math.random() * colors.length)] }}
        />
      ))}
    </div>
  );
};

const ConfirmationOverlay = ({ isOpen, onClose, stats }) => {
  const [rating, setRating] = useState(0);
  const [time, setTime] = useState(0);

  useEffect(() => {
    if (isOpen) {
      const interval = setInterval(() => {
        setTime(prev => prev < 23 ? prev + 1 : prev);
      }, 50);
      return () => clearInterval(interval);
    }
  }, [isOpen]);

  const faces = [
    { label: '😠 Terrible', id: 1 },
    { label: '😕 Bad', id: 2 },
    { label: '😐 Okay', id: 3 },
    { label: '😊 Good', id: 4 },
    { label: '🤩 Amazing', id: 5 }
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[2000] bg-bg-deep/90 backdrop-blur-xl flex items-center justify-center p-4"
        >
          <Confetti />
          
          <motion.div 
            initial={{ scale: 0.8, y: 40, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            className="w-full max-w-xl glass-morphism rounded-[48px] p-12 space-y-12 text-center"
          >
             <div className="space-y-4">
                <motion.div 
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', delay: 0.5 }}
                  className="w-20 h-20 bg-brand-green rounded-full flex items-center justify-center mx-auto shadow-lg shadow-brand-green/20"
                >
                   <Check size={40} className="text-bg-deep" />
                </motion.div>
                <div className="space-y-1">
                   <h2 className="text-4xl font-display text-white tracking-widest uppercase italic">Mission Complete</h2>
                   <p className="text-muted text-[10px] font-mono tracking-[0.3em] uppercase">DELIVERED IN {time} MIN</p>
                </div>
             </div>

             <div className="space-y-6">
                <p className="text-white font-bold tracking-tighter text-lg uppercase italic">Rate the operative</p>
                <div className="flex justify-between items-center px-4">
                   {faces.map((face) => (
                      <button 
                        key={face.id}
                        onClick={() => setRating(face.id)}
                        className="group flex flex-col items-center gap-3"
                      >
                         <motion.div 
                          animate={rating === face.id ? { scale: 1.3 } : { scale: 1 }}
                          className={cn(
                            "w-12 h-12 rounded-full flex items-center justify-center border transition-all duration-300",
                            rating === face.id ? "bg-brand-orange border-brand-orange shadow-lg shadow-brand-orange/20" : "bg-white/5 border-white/5 opacity-50 hover:opacity-100"
                          )}
                         >
                            <User size={20} className={cn(rating === face.id ? "text-white" : "text-muted")} />
                         </motion.div>
                         <span className={cn("text-[8px] font-bold tracking-tighter", rating === face.id ? "text-white" : "text-muted")}>
                           {face.label.split(' ')[1]}
                         </span>
                      </button>
                   ))}
                </div>
             </div>

             <div className="grid grid-cols-2 gap-6">
                <div className="bg-bg-surface/50 border border-white/5 p-6 rounded-3xl space-y-2">
                   <div className="text-[10px] font-mono text-muted uppercase">CREDIT REWARD</div>
                   <div className="text-3xl font-display text-brand-orange flex items-center justify-center gap-2">
                      <motion.div initial={{ rotateY: 0 }} animate={{ rotateY: 360 }} transition={{ repeat: Infinity, duration: 2 }}>◈</motion.div> 40
                   </div>
                </div>
                <div className="bg-bg-surface/50 border border-white/5 p-6 rounded-3xl space-y-2">
                   <div className="text-[10px] font-mono text-muted uppercase">CARBON SAVED</div>
                   <div className="text-2xl font-display text-brand-green flex items-center justify-center gap-2 mt-2">
                      <Leaf size={18} className="animate-float" /> 384g
                   </div>
                </div>
             </div>

             <button 
               onClick={onClose}
               className="w-full bg-white text-bg-deep font-display text-xl tracking-widest py-5 rounded-[24px] uppercase hover:bg-white/90 transition-all font-bold"
             >
                RETURN TO MISSION CONTROL
             </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ConfirmationOverlay;
