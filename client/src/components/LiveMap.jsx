import React, { useEffect, useState } from 'react';
import { io } from 'socket.io-client';

const LiveMap = ({ tripId }) => {
  const [carrierLocation, setCarrierLocation] = useState(null);
  const [status, setStatus] = useState('Connecting...');

  useEffect(() => {
    if (!tripId) return;

    // Connect to BringIt backend
    const socket = io('http://localhost:5000');

    socket.on('connect', () => {
      setStatus('Tracking Active');
      // Join the trip tracking room
      socket.emit('join_trip_tracking', tripId);
    });

    // Listen for location updates
    socket.on('location_updated', (data) => {
      setCarrierLocation({ lat: data.lat, lng: data.lng, timestamp: data.timestamp });
    });

    socket.on('disconnect', () => {
      setStatus('Disconnected');
    });

    return () => {
      socket.disconnect();
    };
  }, [tripId]);

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mt-4">
      <h2 className="text-xl font-bold mb-4">Live Tracking</h2>
      <div className="flex items-center justify-between mb-4">
        <span className="font-medium text-gray-700">Status:</span>
        <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
          status === 'Tracking Active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
        }`}>
          {status}
        </span>
      </div>
      
      <div className="bg-gray-100 rounded-lg h-64 flex flex-col items-center justify-center border border-gray-200">
        <span className="text-gray-500 mb-2">[ Map Component Goes Here ]</span>
        {carrierLocation ? (
          <div className="text-sm font-medium text-blue-600 bg-blue-50 px-3 py-2 rounded-md">
            📍 Lat: {carrierLocation.lat.toFixed(4)}, Lng: {carrierLocation.lng.toFixed(4)}
            <div className="text-xs text-gray-500 mt-1">
              Last updated: {new Date(carrierLocation.timestamp).toLocaleTimeString()}
            </div>
          </div>
        ) : (
          <span className="text-sm text-gray-400">Waiting for carrier location...</span>
        )}
      </div>
    </div>
  );
};

export default LiveMap;
