import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, DollarSign, CheckCircle, Clock, BarChart3, ArrowUpRight } from 'lucide-react';
import axios from 'axios';

const Analytics = () => {
  const [stats, setStats] = useState({
    totalEarnings: 0,
    completedDeliveries: 0,
    activeTime: 0,
    reliability: 0,
    dailyEarnings: [0, 0, 0, 0, 0, 0, 0],
    weeklyVolume: [0, 0, 0, 0, 0, 0, 0]
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await axios.get('http://localhost:5000/api/matches/my-matches', {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        const completed = res.data.filter(m => m.status === 'COMPLETED');
        const earnings = completed.reduce((acc, m) => acc + (m.order?.deliveryFee || 0), 0);
        
        const reliabilityValue = res.data.length > 0 
          ? Math.round((completed.length / res.data.length) * 100) 
          : 0;

        setStats(prev => ({
          ...prev,
          totalEarnings: earnings,
          completedDeliveries: completed.length,
          reliability: reliabilityValue
        }));
      } catch (err) {
        console.error('Fetch stats error:', err);
      }
    };
    fetchStats();
  }, []);

  return (
    <div className="space-y-10 pb-20">
      {/* Top Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Total Revenue', value: `₹${stats.totalEarnings}`, icon: <DollarSign size={20} />, color: 'text-brand-cyan', trend: stats.completedDeliveries > 0 ? '+New' : 'Zero' },
          { label: 'Deliveries', value: stats.completedDeliveries, icon: <CheckCircle size={20} />, color: 'text-brand-green', trend: stats.completedDeliveries.toString() },
          { label: 'Avg. Speed', value: stats.completedDeliveries > 0 ? '---' : '0 min', icon: <Clock size={20} />, color: 'text-brand-amber', trend: '-' },
          { label: 'Reliability', value: `${stats.reliability}%`, icon: <TrendingUp size={20} />, color: 'text-white', trend: stats.reliability > 90 ? 'EXCELLENT' : 'STABLE' },
        ].map((item, i) => (
          <motion.div 
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="glass p-8 rounded-[32px] border border-white/5 space-y-4 hover:border-white/10 transition-all group"
          >
            <div className="flex justify-between items-start">
              <div className={`p-3 rounded-2xl bg-bg-surface border border-white/5 ${item.color}`}>
                {item.icon}
              </div>
              <div className="flex items-center gap-1 text-[10px] font-mono text-brand-cyan font-bold tracking-tighter">
                {item.trend} <ArrowUpRight size={10} />
              </div>
            </div>
            <div>
              <div className="text-[10px] font-mono text-muted uppercase tracking-widest mb-1">{item.label}</div>
              <div className="text-3xl font-display text-white uppercase italic tracking-tighter">{item.value}</div>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Earnings Chart */}
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="lg:col-span-8 glass p-10 rounded-[40px] border border-white/5 space-y-8"
        >
          <div className="flex justify-between items-center">
            <div className="space-y-1">
              <h3 className="text-xl font-display text-white uppercase tracking-tight">Earnings Flow</h3>
              <p className="text-[10px] font-mono text-muted uppercase tracking-widest">Last 7 Days (Values in INR)</p>
            </div>
            <BarChart3 className="text-muted opacity-20" size={32} />
          </div>

          <div className="h-[240px] flex items-end justify-between gap-4 pt-10">
            {stats.dailyEarnings.map((value, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-4 group">
                <div className="relative w-full flex justify-center items-end h-full">
                  <motion.div 
                    initial={{ height: 0 }}
                    animate={{ height: `${(value / 1000) * 100}%` }}
                    transition={{ delay: 0.5 + (i * 0.1), duration: 1, ease: 'easeOut' }}
                    className="w-full max-w-[40px] bg-brand-cyan/20 border border-brand-cyan/30 rounded-t-xl group-hover:bg-brand-cyan/40 transition-all relative"
                  >
                     <div className="absolute -top-8 left-1/2 -translate-x-1/2 text-[10px] font-mono font-bold text-brand-cyan opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                        ₹{value}
                     </div>
                  </motion.div>
                </div>
                <span className="text-[9px] font-mono text-muted uppercase tracking-widest">Day {i+1}</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* performance metrics */}
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="lg:col-span-4 glass p-10 rounded-[40px] border border-white/5 flex flex-col justify-between"
        >
          <div className="space-y-8">
            <h3 className="text-sm font-mono font-bold text-white uppercase tracking-widest border-b border-white/5 pb-4">Performance</h3>
            
            <div className="space-y-6">
              {[
                { label: 'Completion Rate', value: 0 },
                { label: 'User Rating', value: 0 },
                { label: 'Punctuality', value: 0 },
              ].map((metric, i) => (
                <div key={i} className="space-y-3">
                  <div className="flex justify-between items-end px-1">
                    <span className="text-[9px] font-mono text-muted uppercase tracking-widest">{metric.label}</span>
                    <span className="text-xs font-bold text-white">{metric.value}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${metric.value}%` }}
                      transition={{ delay: 1 + (i * 0.2), duration: 0.8 }}
                      className="h-full bg-brand-cyan shadow-[0_0_10px_rgba(0,242,255,0.4)]"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-12 bg-bg-surface/50 border border-white/5 p-6 rounded-3xl text-center space-y-2">
             <div className="text-[10px] font-mono text-brand-cyan font-bold tracking-widest uppercase">Newbie Tier</div>
             <p className="text-[9px] text-muted italic leading-relaxed">Start your first delivery to begin climbing the trust ladder!</p>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Analytics;
