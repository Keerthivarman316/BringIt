import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Terminal, Grid, Shield, Box, ChevronRight, Zap, Target, Activity, Navigation, DollarSign } from 'lucide-react';

const Landing = ({ user }) => {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1 },
  };

  const dashboardPath = user?.role === 'CARRIER' 
    ? '/dashboard/carrier' 
    : '/dashboard/requester';

  return (
    <div 
      className="relative w-full min-h-screen flex flex-col items-center bg-transparent overflow-hidden pt-20 group/container"
    >
      

      {/* Main Content */}
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="relative z-10 w-full max-w-6xl px-10 flex flex-col items-center gap-24"
      >
        
        {/* Hero Section */}
        <div className="text-center space-y-8 flex flex-col items-center max-w-3xl pt-12">
          <motion.div variants={itemVariants} className="inline-flex items-center gap-3 bg-brand-cyan/10 border border-brand-cyan/20 px-6 py-2 rounded-full mb-4">
            <Zap size={14} className="text-brand-cyan animate-pulse" />
            <span className="text-[10px] font-mono font-bold text-brand-cyan tracking-[0.3em] uppercase">Ready for Delivery</span>
          </motion.div>

          <motion.h1 variants={itemVariants} className="text-7xl font-display font-black text-white italic tracking-tighter leading-[0.9] uppercase text-center">
            Bring<span className="text-brand-cyan drop-shadow-[0_0_20px_rgba(0,242,255,0.3)]">It</span>
          </motion.h1>

          <motion.p variants={itemVariants} className="text-muted text-lg max-w-xl mx-auto leading-relaxed font-body">
            Order what you need or deliver for others. Simple, fast, and secure campus logistics.
          </motion.p>

          <motion.div variants={itemVariants} className="pt-6 flex flex-col md:flex-row gap-6 w-full md:w-auto">
            <Link 
              to="/login" 
              className="bg-white text-bg-deep px-12 py-5 rounded-2xl font-black text-sm tracking-[0.1em] uppercase hover:bg-brand-cyan transition-all shadow-2xl hover:shadow-brand-cyan/20 flex items-center justify-center gap-3 group"
            >
              Login <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link 
              to="/register" 
              className="bg-bg-surface border border-white/5 text-white px-12 py-5 rounded-2xl font-bold text-sm tracking-[0.1em] uppercase hover:bg-white/5 transition-all flex items-center justify-center gap-3"
            >
              Register
            </Link>
          </motion.div>
        </div>

        {/* Key Features */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full">
           {[
             { label: 'Relay', value: 'P2P Delivery', desc: 'Securely connect with student couriers.', icon: <Zap /> },
             { label: 'Uplink', value: 'Live Map', desc: 'Monitor your delivery on the map.', icon: <Navigation /> },
             { label: 'Market', value: 'Earn Money', desc: 'Deliver orders and earn rewards.', icon: <DollarSign /> },
           ].map((stat, i) => (
             <motion.div 
               key={i}
               variants={itemVariants}
               whileHover={{ y: -5, borderColor: 'rgba(0, 242, 255, 0.3)' }}
               className="glass p-10 rounded-[40px] border border-white/5 space-y-6 group transition-all"
             >
               <div className="w-12 h-12 rounded-2xl bg-bg-surface flex items-center justify-center text-brand-cyan group-hover:scale-110 transition-transform">
                 {stat.icon}
               </div>
               <div className="space-y-1">
                 <div className="text-[10px] font-mono text-muted tracking-widest uppercase">{stat.label}</div>
                 <div className="text-3xl font-display text-white uppercase italic">{stat.value}</div>
                 <p className="text-[10px] font-mono text-white/40 tracking-tight">{stat.desc}</p>
               </div>
             </motion.div>
           ))}
        </section>

        {/* Roles */}
        <section className="w-full space-y-12">
           <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
              <motion.div 
                variants={itemVariants}
                whileHover={{ scale: 1.02 }}
                className="glass rounded-[48px] p-12 border border-white/5 flex flex-col gap-10 hover:border-brand-cyan/30 transition-all bg-gradient-to-br from-white/[0.02] to-transparent group"
              >
                 <div className="w-16 h-16 rounded-3xl bg-brand-cyan/10 flex items-center justify-center text-brand-cyan">
                    <Terminal size={32} />
                 </div>
                 <div className="space-y-4">
                    <h3 className="text-4xl font-display text-white italic uppercase tracking-tighter">Order Submissions</h3>
                    <p className="text-muted leading-relaxed font-body">Place orders for items you need and track them in real-time until they arrive.</p>
                 </div>
              </motion.div>

              <motion.div 
                variants={itemVariants}
                whileHover={{ scale: 1.02 }}
                className="glass rounded-[48px] p-12 border border-white/5 flex flex-col gap-10 hover:border-brand-purple/30 transition-all bg-gradient-to-br from-white/[0.02] to-transparent group"
              >
                 <div className="w-16 h-16 rounded-3xl bg-brand-purple/10 flex items-center justify-center text-brand-purple">
                    <Grid size={32} />
                 </div>
                 <div className="space-y-4">
                    <h3 className="text-4xl font-display text-white italic uppercase tracking-tighter text-brand-purple">Delivery Partners</h3>
                    <p className="text-muted leading-relaxed font-body">Accept delivery requests nearby and earn rewards for every successful trip.</p>
                 </div>
              </motion.div>
           </div>
        </section>

        {/* Footer */}
        <footer className="w-full pt-20 pb-12 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-8 opacity-50">
           <div className="flex items-center gap-4">
              <Box className="text-brand-cyan" size={24} />
              <span className="text-[10px] font-mono font-black tracking-[0.4em] uppercase text-white">BringIt v4.0.1</span>
           </div>
           <p className="text-[8px] font-mono tracking-widest text-muted uppercase">Designed for University Logistics · 2026</p>
        </footer>

      </motion.div>
    </div>
  );
};

export default Landing;
