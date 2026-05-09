// Lightweight haptic emulation. Real devices via `navigator.vibrate`;
// no-op on desktop. Patterns map to spec: light/medium/success.
export const haptic = {
  light:   () => navigator.vibrate?.(8),
  medium:  () => navigator.vibrate?.(16),
  heavy:   () => navigator.vibrate?.(28),
  success: () => navigator.vibrate?.([12, 40, 18]),
};
