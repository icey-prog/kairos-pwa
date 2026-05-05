// Web Vibration API wrapper — no-ops silently on unsupported browsers
export const haptic = {
  light:   () => navigator.vibrate?.(8),
  medium:  () => navigator.vibrate?.(15),
  success: () => navigator.vibrate?.([10, 40, 10]),
  error:   () => navigator.vibrate?.([60, 40, 60]),
  select:  () => navigator.vibrate?.(5),
}
