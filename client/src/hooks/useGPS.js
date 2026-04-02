import { useState, useEffect, useRef } from 'react';

/**
 * useGPS Hook
 * @param {boolean} active - Whether to start tracking high-accuracy location
 * @param {Function} onUpdate - Callback function when location changes
 */
const useGPS = (active, onUpdate) => {
  const [error, setError] = useState(null);
  const watchId = useRef(null);

  useEffect(() => {
    if (!active) {
      if (watchId.current) {
        navigator.geolocation.clearWatch(watchId.current);
        watchId.current = null;
      }
      return;
    }

    if (!navigator.geolocation) {
      setError('Geolocation not supported by this browser.');
      return;
    }

    watchId.current = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        onUpdate({ lat: latitude, lng: longitude, timestamp: Date.now() });
        setError(null);
      },
      (err) => {
        console.error('GPS Error:', err);
        setError(`Failed to retrieve location: ${err.message}`);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );

    return () => {
      if (watchId.current) {
        navigator.geolocation.clearWatch(watchId.current);
      }
    };
  }, [active, onUpdate]);

  return { error };
};

export default useGPS;
