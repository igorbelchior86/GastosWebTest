export const getFeatureFlags = () => ({
  FEATURE_BUDGETS: true,
  FEATURE_PANORAMA: true,
});

export const setFeatureFlagOverride = () => true;
export const clearFeatureFlagOverrides = () => getFeatureFlags();

export const isBudgetsEnabled = () => true;
export const isPanoramaEnabled = () => true;

export function getFeatureFlagsApi() {
  return {
    defaults: getFeatureFlags(),
    getOverrides: () => ({}),
    isBudgetsEnabled,
    isPanoramaEnabled,
    getAll: getFeatureFlags,
    setOverride: () => true,
    clearOverrides: clearFeatureFlagOverrides,
  };
}
