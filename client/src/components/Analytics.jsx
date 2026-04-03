import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, DollarSign, CheckCircle, Clock, BarChart3, ArrowUpRight, RefreshCcw, Activity } from 'lucide-react';
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
    recentMissions: []
  });

  const fetchStats = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const token = sessionStorage.getItem('token');
      const res = await axios.get('http://localhost:5000/api/matches/my-matches', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Robust Filter: Any match with a status or a delivered order is valid for analytics
      const completed = res.data.filter(m => 
        m.status === 'COMPLETED' || 
        m.order?.status === 'DELIVERED' || 
        (m.status === 'ACCEPTED' && m.completedAt)
      );
      const earnings = completed.reduce((acc, m) => acc + (m.order?.deliveryFee || 0), 0);
      
      let totalMinutesSaved = 0;
      completed.forEach(m => {
        // Fallback chain for completion date: completedAt -> order.updatedAt -> acceptedAt
        const end = m.completedAt ? new Date(m.completedAt) : (m.order?.updatedAt ? new Date(m.order.updatedAt) : (m.acceptedAt ? new Date(m.acceptedAt) : null));
        const start = m.order?.createdAt ? new Date(m.order.createdAt) : null;
        
        if (end && start) {
          const diff = Math.max(1, Math.round((end - start) / (1000 * 60)));
          totalMinutesSaved += diff;
        }
      });
      const avgTimeSaved = completed.length > 0 ? Math.round(totalMinutesSaved / completed.length) : 0;

      // Map daily earnings using strict date normalization to avoid timezone/rounding gaps
      const daily = new Array(7).fill(0);
      const now = new Date();
      now.setHours(23, 59, 59, 999);
      const todayStart = new Date(now.toDateString()).getTime(); // Normalize based on local date
      
      completed.forEach(m => {
        const effectiveDateStr = m.completedAt || m.acceptedAt || m.order?.createdAt;
        if (!effectiveDateStr) return;
        
        const effectiveDate = new Date(effectiveDateStr);
        const thisDateStart = new Date(effectiveDate.toDateString()).getTime();
        
        // Calculate difference in whole calendar days
        const diffDays = Math.floor((todayStart - thisDateStart) / (1000 * 60 * 60 * 24));
        
        if (diffDays >= 0 && diffDays < 7) {
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
        dailyEarnings: daily,
        recentMissions: completed.slice(0, 5) // Last 5 completed missions
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

      {/* Top Stats Cards */}
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
        {/* Recent Activity Timeline */}
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="lg:col-span-8 glass p-10 rounded-[40px] border border-white/5 space-y-8"
        >
          <div className="flex justify-between items-center">
            <div className="space-y-1">
              <h3 className="text-xl font-display text-white uppercase tracking-tight">Recent Activity</h3>
              <p className="text-[10px] font-mono text-muted uppercase tracking-widest">Chronological feed of your success</p>
            </div>
            <Activity className="text-brand-cyan opacity-20" size={32} />
          </div>

          <div className="space-y-4">
            {stats.recentMissions.length > 0 ? stats.recentMissions.map((m, i) => (
              <motion.div 
                key={m.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="flex items-center gap-6 p-6 rounded-3xl bg-white/[0.02] border border-white/5 hover:border-white/10 transition-all group"
              >
                <div className="w-12 h-12 rounded-2xl bg-brand-green/10 border border-brand-green/20 flex items-center justify-center text-brand-green">
                  <CheckCircle size={20} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[10px] font-mono text-muted uppercase tracking-widest mb-1">
                    {m.completedAt ? new Date(m.completedAt).toLocaleString([], { month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' }) : 'Recently'}
                  </div>
                  <div className="text-sm font-bold text-white uppercase truncate group-hover:text-brand-cyan transition-colors">
                    {m.order?.itemName || 'Unknown Item'}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] font-mono text-muted uppercase tracking-widest mb-1">Revenue</div>
                  <div className="text-lg font-display text-brand-green italic tracking-tighter">+₹{m.order?.deliveryFee || 0}</div>
                </div>
              </motion.div>
            )) : (
              <div className="flex flex-col items-center justify-center py-16 text-center space-y-4">
                 <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center text-muted">
                    <Activity size={32} />
                 </div>
                 <p className="text-[10px] font-mono text-muted uppercase tracking-[0.2em]">No recent activity entries found</p>
              </div>
            )}
          </div>
        </motion.div>

        {/* Performance Metrics Right Sidebar */}
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
             <p className="text-[9px] text-muted italic leading-relaxed">Your account maintains top-tier reliability status.</p>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Analytics;
