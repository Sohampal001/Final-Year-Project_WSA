// Dynamic Expo config. app.json stays the static base; this layer injects the
// Google Maps key from the environment (EXPO_PUBLIC_GOOGLE_MAPS_API_KEY in .env)
// so nothing is hardcoded. Applies on `expo prebuild` / EAS builds.
// Note: the current local gradle build reads the key from .env directly via a
// manifestPlaceholder in android/app/build.gradle, independent of this file.
module.exports = ({ config }) => ({
  ...config,
  android: {
    ...config.android,
    config: {
      ...(config.android && config.android.config),
      googleMaps: {
        apiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY,
      },
    },
  },
});
