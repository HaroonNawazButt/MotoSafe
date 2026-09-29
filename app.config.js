module.exports = ({ config }) => {
  const googleMapsApiKey = process.env.GOOGLE_MAPS_API_KEY;

  if (!googleMapsApiKey) {
    throw new Error(
      "GOOGLE_MAPS_API_KEY is required for the MotoSafe Android build."
    );
  }

  return {
    ...config,

    plugins: [
      ...(config.plugins || []),

      [
        "react-native-maps",
        {
          androidGoogleMapsApiKey: googleMapsApiKey,
        },
      ],
    ],
  };
};