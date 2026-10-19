// Expo merges this on top of app.json.
// The Google key is NOT stored in app.json: it comes from
//   - .env                       (local runs / `eas build --local`)
//   - EAS environment variables  (cloud `eas build`)
// as GOOGLE_MAPS_API_KEY.
module.exports = ({ config }) => {
  const key = process.env.GOOGLE_MAPS_API_KEY ?? "";

  if (!key) {
    console.warn(
      "[app.config] GOOGLE_MAPS_API_KEY is not set. The map will not load and search/routing will fail.",
    );
  }

  return {
    ...config,
    android: {
      ...config.android,
      config: {
        ...config.android?.config,
        // Used by the native Google map on Android
        googleMaps: { apiKey: key },
      },
    },
    extra: {
      ...config.extra,
      // Used by the Places + Routes web calls in navigation-page.jsx
      googleApiKey: key,
    },
  };
};
