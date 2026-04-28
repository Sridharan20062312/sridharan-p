import { useState, useEffect, useRef } from 'react';

function getDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371e3; // metres
  const φ1 = lat1 * Math.PI/180;
  const φ2 = lat2 * Math.PI/180;
  const Δφ = (lat2-lat1) * Math.PI/180;
  const Δλ = (lon2-lon1) * Math.PI/180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
          Math.cos(φ1) * Math.cos(φ2) *
          Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  return R * c; // in metres
}

export function useGeofencing(
    location: { latitude: number, longitude: number } | null, 
    safeZones: any[],
    onEnter?: (zone: any) => void,
    onExit?: (zone: any) => void
) {
  const [currentZones, setCurrentZones] = useState<string[]>([]);
  const prevZonesRef = useRef<string[]>([]);

  useEffect(() => {
    if (!location) return;

    const insideZones: string[] = [];
    const activeZoneObjects: any[] = [];

    safeZones.forEach(zone => {
      const distance = getDistance(
        location.latitude, 
        location.longitude, 
        zone.center.latitude, 
        zone.center.longitude
      );

      if (distance <= zone.radius) {
        insideZones.push(zone.id);
        activeZoneObjects.push(zone);
      }
    });

    // Check for entries and exits
    let changed = false;
    
    insideZones.forEach(zoneId => {
      if (!prevZonesRef.current.includes(zoneId)) {
        const zone = safeZones.find(z => z.id === zoneId);
        onEnter?.(zone);
        changed = true;
      }
    });

    prevZonesRef.current.forEach(zoneId => {
      if (!insideZones.includes(zoneId)) {
        const zone = safeZones.find(z => z.id === zoneId);
        onExit?.(zone);
        changed = true;
      }
    });

    // Only update state if the actual list of zones changed
    if (changed || insideZones.length !== prevZonesRef.current.length) {
      prevZonesRef.current = insideZones;
      setCurrentZones(insideZones);
    }
  }, [location, safeZones, onEnter, onExit]);

  return { currentZones };
}
