import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, DollarSign, CheckCircle, Clock, BarChart3, ArrowUpRight, RefreshCcw } from 'lucide-react';
import axios from 'axios';

const Analytics = ({ user }) => {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [stats, setStats] = useState({
    totalEarnings: 0,
    completedDeliveries: 0,
    activeTime: 0,
    reliability: 0,
    avgTimeSaved: 0,
    maxDaily: 100,
    dailyEarnings: [0, 0, 0, 0, 0, 0, 0],
    weeklyVolume: [0, 0, 0, 0, 0, 0, 0]
  });

  const fetchStats = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const token = sessionStorage.getItem('token');
      const res = await axios.get('http://localhost:5000/api/matches/my-matches', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const completed = res.data.filter(m => m.status === 'COMPLETED');
      const earnings = completed.reduce((acc, m) => acc + (m.order?.deliveryFee || 0), 0);
      
      let totalMinutesSaved = 0;
      completed.forEach(m => {
        if (m.completedAt && m.order?.createdAt) {
          const start = new Date(m.order.createdAt);
          const end = new Date(m.completedAt);
          const diff = Math.max(1, Math.round((end - start) / (1000 * 60))); // Min 1 min
          totalMinutesSaved += diff;
        }
      });
      const avgTimeSaved = completed.length > 0 ? Math.round(totalMinutesSaved / completed.length) : 0;

      // Calculate daily earnings for last 7 days
      const daily = new Array(7).fill(0);
      const now = new Date();
      now.setHours(23, 59, 59, 999);
      
      completed.forEach(m => {
        if (!m.completedAt) return;
        const compDate = new Date(m.completedAt);
        const diffDays = Math.floor((now - compDate) / (1000 * 60 * 60 * 24));
        if (diffDays >= 0 && diffDays < 7) {
          // Index 6 is today, 5 is yesterday, etc.
          daily[6 - diffDays] += (m.order?.deliveryFee || 0);
        }
      });

      const maxDaily = Math.max(...daily, 100);
      const reliabilityValue = res.data.length > 0 
        ? Math.round((completed.length / res.data.length) * 100) 
        : 0;

      setStats(prev => ({
        ...prev,
        totalEarnings: user?.totalEarnings ?? earnings,
        completedDeliveries: user?.deliveryCount ?? completed.length,
        avgTimeSaved,
        maxDaily,
        reliability: reliabilityValue,
        dailyEarnings: daily
      }));
    } catch (err) {
      console.error('Fetch stats error:', err);
    } finally {
      setIsRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const formatTime = (mins) => {
    if (mins < 60) return `${mins}m`;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${h}h ${m}m`;
  };

  return (
    <div className="space-y-10 pb-20">
      <div className="flex justify-between items-end">
         <div className="space-y-1">
            <h2 className="text-3xl font-display text-white uppercase italic tracking-tighter">Performance Hub</h2>
            <p className="text-muted text-[10px] font-mono tracking-widest uppercase">Live insights from your activity</p>
         </div>
         <button 
           onClick={fetchStats}
           disabled={isRefreshing}
           className="bg-white/5 hover:bg-white/10 border border-white/5 p-3 rounded-2xl text-muted hover:text-brand-cyan transition-all disabled:opacity-50"
         >
            <RefreshCcw size={18} className={isRefreshing ? 'animate-spin text-brand-cyan' : ''} />
         </button>
      </div>

      {/* Top Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Total Revenue', value: `₹${stats.totalEarnings}`, icon: <DollarSign size={20} />, color: 'text-brand-cyan', trend: 'Global' },
          { label: 'Deliveries', value: stats.completedDeliveries, icon: <CheckCircle size={20} />, color: 'text-brand-green', trend: 'Lifetime' },
          { label: 'Time Saved', value: formatTime(stats.avgTimeSaved), icon: <Clock size={20} />, color: 'text-brand-amber', trend: 'Efficiency' },
          { label: 'Reliability', value: `${stats.reliability}%`, icon: <TrendingUp size={20} />, color: 'text-white', trend: stats.reliability > 90 ? 'EXCELLENT' : 'STABLE' },
        ].map((item, i) => (
          <motion.div 
            key={item.label}
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
                    animate={{ height: value > 0 ? `${Math.max(10, (value / stats.maxDaily) * 100)}%` : '0%' }}
                    transition={{ delay: 0.5 + (i * 0.1), duration: 1, ease: 'easeOut' }}
                    className="w-full max-w-[40px] bg-brand-cyan/20 border border-brand-cyan/30 rounded-t-xl group-hover:bg-brand-cyan/40 transition-all relative"
                  >
                     <div className="absolute -top-8 left-1/2 -translate-x-1/2 text-[10px] font-mono font-bold text-brand-cyan opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                        ₹{value}
                     </div>
                  </motion.div>
                </div>
                <span className="text-[9px] font-mono text-muted uppercase tracking-widest">
                  {i === 6 ? 'Today' : `${6-i}d ago`}
                </span>
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
                { label: 'Completion Rate', value: stats.reliability },
                { label: 'User Rating', value: 100 },
                { label: 'Punctuality', value: 100 },
              ].map((metric, i) => (
                <div key={metric.label} className="space-y-3">
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
             <div className="text-[10px] font-mono text-brand-cyan font-bold tracking-widest uppercase">Verified Tier</div>
             <p className="text-[9px] text-muted italic leading-relaxed">You are currently at the top tier of reliability!</p>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Analytics;
