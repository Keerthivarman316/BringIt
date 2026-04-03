import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, AlertCircle, Info, CheckCircle2, HelpCircle } from 'lucide-react';

const StudioModal = ({ isOpen, onClose, title, message, type = 'info', confirmText, onConfirm, showCancel = true }) => {
  const icons = {
    info: <Info className="text-brand-cyan" size={40} />,
    warning: <AlertCircle className="text-brand-amber" size={40} />,
    error: <AlertCircle className="text-brand-red" size={40} />,
    success: <CheckCircle2 className="text-brand-green" size={40} />,
    confirm: <HelpCircle className="text-brand-cyan" size={40} />
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-bg-deep/80 backdrop-blur-md"
          />
          
          <motion.div 
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="relative w-full max-w-md glass p-10 rounded-[40px] border border-white/10 shadow-2xl overflow-hidden"
          >
             {/* Studio Architectural Lines */}
             <div className="absolute top-0 right-0 p-4 opacity-10">
                <div className="w-20 h-20 border-t-2 border-r-2 border-white rounded-tr-3xl" />
             </div>
             <div className="absolute bottom-0 left-0 p-4 opacity-10">
                <div className="w-20 h-20 border-b-2 border-l-2 border-white rounded-bl-3xl" />
             </div>

             <div className="flex flex-col items-center text-center gap-6 relative z-10">
                <div className="w-20 h-20 rounded-full bg-white/[0.03] border border-white/5 flex items-center justify-center shadow-inner">
                   {icons[type]}
                </div>
                
                <div className="space-y-2">
                   <h3 className="text-2xl font-display text-white uppercase tracking-tighter italic">{title}</h3>
                   <p className="text-sm text-muted font-body leading-relaxed max-w-[280px] mx-auto">{message}</p>
                </div>

                <div className="flex flex-col gap-3 w-full pt-4">
                   {onConfirm && (
                     <button 
                       onClick={() => { onConfirm(); onClose(); }}
                       className="w-full bg-white text-bg-deep font-black py-4 rounded-2xl hover:bg-brand-cyan transition-all uppercase tracking-widest text-[10px]"
                     >
                        {confirmText || 'Proceed'}
                     </button>
                   )}
                   {showCancel && (
                     <button 
                       onClick={onClose}
                       className="w-full bg-white/5 border border-white/10 text-white font-bold py-4 rounded-2xl hover:bg-white/10 transition-all uppercase tracking-widest text-[10px]"
                     >
                        {onConfirm ? 'Cancel' : 'Dismiss'}
                     </button>
                   )}
                </div>
             </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default StudioModal;
