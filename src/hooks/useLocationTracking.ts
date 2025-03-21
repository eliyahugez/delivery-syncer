
import { useState, useEffect } from 'react';

export function useLocationTracking() {
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);
  const [nearbyDeliveriesEnabled, setNearbyDeliveriesEnabled] = useState(false);

  // Get user's location if they allow it
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
          console.log("Got user location:", position.coords.latitude, position.coords.longitude);
        },
        (error) => {
          console.error("Error getting location:", error);
        }
      );
    }
  }, []);

  // Toggle nearby deliveries mode
  const toggleNearbyDeliveries = () => {
    if (!userLocation) {
      // Ask for location permission if we don't have it
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
          setNearbyDeliveriesEnabled(true);
        },
        (error) => {
          console.error("Error getting location:", error);
          alert("לא ניתן לקבל את המיקום שלך. בדוק את הרשאות המיקום בדפדפן.");
        }
      );
    } else {
      setNearbyDeliveriesEnabled(!nearbyDeliveriesEnabled);
    }
  };

  return {
    userLocation,
    nearbyDeliveriesEnabled,
    toggleNearbyDeliveries
  };
}
