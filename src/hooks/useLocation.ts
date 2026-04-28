import { useState, useEffect } from 'react';

export function useLocation() {
  const [gpsLocation, setGpsLocation] = useState<{ latitude: number, longitude: number } | null>(null);
  const [manualLocation, setManualLocation] = useState<{ latitude: number, longitude: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!navigator.geolocation) {
      setError('Geolocation not supported');
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        setGpsLocation({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude
        });
      },
      (err) => {
        setError(err.message);
      },
      {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 0
      }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  const location = manualLocation || gpsLocation;

  return { 
    location, 
    gpsLocation,
    manualLocation,
    setManualLocation,
    error 
  };
}
