import React, { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { motion, AnimatePresence } from 'framer-motion';

// Import Leaflet CSS (CRITICAL for map rendering)
import 'leaflet/dist/leaflet.css';

// --- LEAFLET ASSET FIX (Vite/React) ---
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: markerIcon2x,
    iconUrl: markerIcon,
    shadowUrl: markerShadow,
});

// Helper component to auto-center the map when location updates
const RecenterMap = ({ lat, lng }) => {
  const map = useMap();
  useEffect(() => {
    if (lat && lng) {
      map.setView([lat, lng], 16, { animate: true });
    }
  }, [lat, lng, map]);
  return null;
};

const LiveMap = ({ tripId }) => {
  const [carrierLocation, setCarrierLocation] = useState(null);
  const [status, setStatus] = useState('OFFLINE');

  // Default Campus Coordinates (VIT Chennai)
  const defaultCenter = [12.8406, 80.1534];

  useEffect(() => {
    if (!tripId) return;

    const socket = io('http://localhost:5000');

    socket.on('connect', () => {
      setStatus('CONNECTED');
      socket.emit('join_trip_tracking', tripId);
    });

    socket.on('location_updated', (data) => {
      setCarrierLocation({ lat: data.lat, lng: data.lng, timestamp: data.timestamp });
    });

    socket.on('disconnect', () => {
      setStatus('OFFLINE');
    });

    return () => {
      socket.disconnect();
    };
  }, [tripId]);

  return (
    <div className="w-full h-full relative bg-bg-card group/map">
      <MapContainer 
        center={carrierLocation ? [carrierLocation.lat, carrierLocation.lng] : defaultCenter} 
        zoom={16} 
        style={{ height: '100%', width: '100%', background: '#08090D' }}
        zoomControl={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />
        
        {carrierLocation && (
          <>
            <Marker position={[carrierLocation.lat, carrierLocation.lng]}>
              <Popup className="custom-popup">
                <div className="text-[10px] font-mono text-white font-bold p-1 uppercase">Delivery partner is here</div>
              </Popup>
            </Marker>
            <RecenterMap lat={carrierLocation.lat} lng={carrierLocation.lng} />
          </>
        )}
      </MapContainer>

      {/* UI Overlays */}
      <div className="absolute inset-0 pointer-events-none z-[1000] border border-white/5">
         <AnimatePresence>
            {!carrierLocation && (
               <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 flex items-center justify-center bg-bg-deep/60 backdrop-blur-md"
               >
                  <div className="flex flex-col items-center gap-6 text-center">
                     <div className="w-16 h-16 rounded-full border border-brand-cyan/30 relative flex items-center justify-center">
                        <div className="absolute inset-0 rounded-full border-2 border-brand-cyan animate-ping opacity-20" />
                        <div className="w-3 h-3 bg-brand-cyan rounded-full shadow-[0_0_15px_rgba(0,242,255,0.8)]" />
                     </div>
                     <div className="space-y-2">
                        <div className="text-[10px] font-mono text-white font-bold tracking-[0.3em] uppercase">Waiting for location...</div>
                        <div className="text-[8px] font-mono text-muted uppercase tracking-[0.1em]">The map will update when the delivery partner shares their location.</div>
                     </div>
                  </div>
               </motion.div>
            )}
         </AnimatePresence>

         <div className="absolute top-4 right-4 flex flex-col gap-2 items-end">
            <div className="bg-bg-deep/80 backdrop-blur px-3 py-1.5 rounded-lg border border-white/5 flex items-center gap-2">
               <div className={cn("w-1.5 h-1.5 rounded-full shadow-lg", status === 'CONNECTED' ? "bg-brand-green shadow-brand-green/40" : "bg-brand-red shadow-brand-red/40")} />
               <span className="text-[9px] font-mono text-white font-bold uppercase tracking-widest">{status === 'CONNECTED' ? 'Online' : 'Offline'}</span>
            </div>
            {carrierLocation && (
              <div className="bg-bg-deep/80 backdrop-blur px-3 py-1.5 rounded-lg border border-white/5 text-[8px] font-mono text-muted uppercase tracking-widest">
                Updated: {new Date(carrierLocation.timestamp).toLocaleTimeString()}
              </div>
            )}
         </div>
      </div>

      <style>{`
        .leaflet-container {
          filter: saturate(0.5) contrast(1.2) brightness(0.9);
        }
        .custom-popup .leaflet-popup-content-wrapper {
          background: #11131A;
          color: #FFFFFF;
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 12px;
          padding: 0;
        }
        .custom-popup .leaflet-popup-tip {
          background: #11131A;
        }
      `}</style>
    </div>
  );
};

function cn(...inputs) {
  return inputs.filter(Boolean).join(' ');
}

export default LiveMap;
