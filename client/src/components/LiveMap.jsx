import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { motion, AnimatePresence } from 'framer-motion';

// Fix for default marker icons in Leaflet + React
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});

// Custom Carrier Icon (Cyan Pulsing look)
const carrierIcon = L.divIcon({
  className: 'custom-div-icon',
  html: `<div class="marker-container">
           <div class="marker-pulse"></div>
           <div class="marker-pin"></div>
         </div>`,
  iconSize: [40, 40],
  iconAnchor: [20, 20]
});

const RecenterMap = ({ lat, lng }) => {
  const map = useMap();
  useEffect(() => {
    if (lat && lng) {
      map.setView([lat, lng], map.getZoom(), { animate: true }); // Keep current zoom but center
    }
  }, [lat, lng, map]);
  return null;
};

const LiveMap = ({ tripId }) => {
  const [carrierLocation, setCarrierLocation] = useState(null);
  const [status, setStatus] = useState('OFFLINE');
  const [lastUpdated, setLastUpdated] = useState(null);

  // Default Campus Coordinates (IIIT Dharwad)
  const defaultCenter = [15.3926, 75.0252];

  useEffect(() => {
    if (!tripId) return;

    const fetchInitialLocation = async () => {
      try {
        const res = await axios.get(`http://localhost:5000/api/trips/${tripId}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        if (res.data.currentLat && res.data.currentLng) {
          const loc = { 
            lat: res.data.currentLat, 
            lng: res.data.currentLng, 
            timestamp: res.data.lastLocationAt || new Date() 
          };
          setCarrierLocation(loc);
          setLastUpdated(new Date(loc.timestamp));
        }
      } catch (err) {
        console.error('Initial location fetch failed', err);
      }
    };

    fetchInitialLocation();

    const socket = io('http://localhost:5000');
    socket.on('connect', () => {
      setStatus('CONNECTED');
      socket.emit('join_trip_tracking', tripId);
    });

    socket.on('location_updated', (data) => {
      setCarrierLocation({ lat: data.lat, lng: data.lng, timestamp: data.timestamp });
      setLastUpdated(new Date());
    });

    socket.on('disconnect', () => setStatus('OFFLINE'));
    return () => socket.disconnect();
  }, [tripId]);

  return (
    <div className="relative w-full h-full min-h-[400px] rounded-[32px] overflow-hidden border border-white/5 bg-bg-deep">
      {/* Diagnostic Overlay */}
      <div className="absolute top-6 right-6 z-[1000] flex flex-col gap-2 items-end">
        <div className={cn(
          "px-4 py-2 rounded-2xl text-[10px] font-black tracking-widest uppercase flex items-center gap-3 border border-white/10 backdrop-blur-xl shadow-2xl",
          status === 'CONNECTED' ? "bg-bg-deep/80 text-brand-cyan" : "bg-bg-deep/80 text-brand-red"
        )}>
          <div className={cn("w-2 h-2 rounded-full", status === 'CONNECTED' ? "bg-brand-cyan animate-pulse shadow-[0_0_8px_rgba(0,242,255,1)]" : "bg-brand-red")} />
          {status}
        </div>
        
        <AnimatePresence>
          {lastUpdated && (
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-bg-deep/80 px-4 py-2 rounded-2xl text-[10px] font-mono text-muted border border-white/5 backdrop-blur-xl shadow-2xl uppercase tracking-tighter"
            >
              Last Sync: {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Initializing Overlay */}
      <AnimatePresence>
        {!carrierLocation && status === 'CONNECTED' && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-[999] bg-bg-deep/80 backdrop-blur-xl flex items-center justify-center pointer-events-none"
          >
             <div className="flex flex-col items-center gap-6 text-center max-w-[300px]">
                <div className="w-24 h-24 rounded-full border border-brand-cyan/20 relative flex items-center justify-center">
                   <div className="absolute inset-0 rounded-full border-4 border-brand-cyan animate-ping opacity-10" />
                   <div className="w-6 h-6 bg-brand-cyan rounded-full shadow-[0_0_30px_rgba(0,242,255,1)]" />
                </div>
                <div className="space-y-2">
                   <div className="text-sm font-display text-white italic tracking-[0.2em] uppercase">Locating Partner</div>
                   <p className="text-[10px] font-mono text-muted uppercase tracking-widest leading-loose">Waiting for carrier to share real-time coordinates...</p>
                </div>
             </div>
          </motion.div>
        )}
      </AnimatePresence>

      <MapContainer 
        center={carrierLocation ? [carrierLocation.lat, carrierLocation.lng] : defaultCenter} 
        zoom={16} 
        style={{ height: '100%', width: '100%' }}
        zoomControl={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />
        
        {carrierLocation && (
          <>
            <RecenterMap lat={carrierLocation.lat} lng={carrierLocation.lng} />
            <Marker position={[carrierLocation.lat, carrierLocation.lng]} icon={carrierIcon}>
              <Popup className="studio-popup">
                <div className="p-3 min-w-[140px] space-y-1">
                  <div className="text-[10px] font-mono text-brand-cyan font-bold uppercase tracking-widest">Delivery Partner</div>
                  <div className="text-[11px] font-medium text-white italic">Synced at {lastUpdated?.toLocaleTimeString()}</div>
                </div>
              </Popup>
            </Marker>
          </>
        )}
      </MapContainer>

      <style>{`
        .studio-popup .leaflet-popup-content-wrapper {
          background: rgba(8, 9, 13, 0.9) !important;
          backdrop-filter: blur(16px);
          color: white !important;
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 20px;
          padding: 4px;
        }
        .studio-popup .leaflet-popup-tip {
          background: rgba(8, 9, 13, 0.9) !important;
        }
        
        .marker-container {
          width: 40px;
          height: 40px;
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .marker-pin {
          width: 16px;
          height: 16px;
          border-radius: 50% 50% 50% 0;
          background: #00F2FF;
          position: absolute;
          transform: rotate(-45deg);
          box-shadow: 0 0 20px rgba(0, 242, 255, 1);
          border: 2px solid white;
          z-index: 10;
        }

        .marker-pulse {
          background: rgba(0, 242, 255, 0.4);
          border-radius: 50%;
          height: 40px;
          width: 40px;
          position: absolute;
          animation: pulsate 2s ease-out infinite;
          opacity: 0;
          z-index: 5;
        }

        @keyframes pulsate {
          0% { transform: scale(0.1, 0.1); opacity: 0; }
          50% { opacity: 1; }
          100% { transform: scale(1.5, 1.5); opacity: 0; }
        }
      `}</style>
    </div>
  );
};

function cn(...inputs) {
  return inputs.filter(Boolean).join(' ');
}

export default LiveMap;
