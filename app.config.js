const read = (name) => process.env[name]?.trim();

module.exports = ({ config }) => {
  const androidMapsKey = read("GOOGLE_MAPS_ANDROID_API_KEY");
  const iosMapsKey = read("GOOGLE_MAPS_IOS_API_KEY");
  const easProjectId = read("EAS_PROJECT_ID");

  return {
    ...config,

    ios: {
      ...config.ios,
      ...(iosMapsKey
        ? {
            config: {
              ...(config.ios?.config ?? {}),
              googleMapsApiKey: iosMapsKey,
            },
          }
        : {}),
    },

    android: {
      ...config.android,
      ...(androidMapsKey
        ? {
            config: {
              ...(config.android?.config ?? {}),
              googleMaps: {
                ...(config.android?.config?.googleMaps ?? {}),
                apiKey: androidMapsKey,
              },
            },
          }
        : {}),
    },

    extra: {
      ...config.extra,
      ...(easProjectId
        ? {
            eas: {
              ...(config.extra?.eas ?? {}),
              projectId: easProjectId,
            },
          }
        : {}),
    },
  };
};
