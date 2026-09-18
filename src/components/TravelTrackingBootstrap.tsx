import { useEffect } from 'react';
import { restoreTravelTrackingIfNeeded } from '../services/travelTrackingService';

export default function TravelTrackingBootstrap() {
  useEffect(() => {
    restoreTravelTrackingIfNeeded();
  }, []);

  return null;
}
