import { ReactNode, useEffect } from "react";
import {
  askLocationPermission,
  checkIfLocationEnabled,
  watchUserLocation,
} from "../services/locationService";
import { useLocationStore } from "../store/useLocationStore";

interface LocationProviderProps {
  children: ReactNode;
}

export default function LocationProvider({ children }: LocationProviderProps) {
  const setLocation = useLocationStore((s) => s.setLocation);

  useEffect(() => {
    const init = async () => {
      const gpsEnabled = await checkIfLocationEnabled();
      if (!gpsEnabled) {
        console.warn("GPS OFF - show a modal to user to enable");
        return;
      }

      const granted = await askLocationPermission();
      if (!granted) {
        console.warn("Permission denied");
        return;
      }

      await watchUserLocation((pos) => {
        setLocation({
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        });
      });
    };

    init();
  }, []);

  return children;
}
