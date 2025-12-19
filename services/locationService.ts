import * as Location from "expo-location";

export const askLocationPermission = async (): Promise<boolean> => {
  const { status } = await Location.requestForegroundPermissionsAsync();
  const { status: backgroundStatus } =
    await Location.requestBackgroundPermissionsAsync();
  return status === "granted" && backgroundStatus === "granted";
};

export const checkIfLocationEnabled = async (): Promise<boolean> => {
  return await Location.hasServicesEnabledAsync();
};

export const watchUserLocation = async (
  callback: (location: Location.LocationObject) => void
): Promise<Location.LocationSubscription> => {

  return await Location.watchPositionAsync(
    {
      accuracy: Location.Accuracy.High,
      distanceInterval: 0, // meters
      timeInterval: 1000, // 10 sec
    },
    callback
  );
};
