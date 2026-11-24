/**
 * Reads a whole-number CLI option. A typo must fail loudly: `--warn-days abc` would otherwise become NaN,
 * and every certificate would be reported as OK.
 */
export function parseWholeNumber(name: string, text: string | undefined, min: number, max: number): number {
  const value = Number(text);
  if (text === undefined || !/^\d+$/.test(text.trim()) || value < min || value > max) {
    throw new RangeError(`--${name} must be a whole number from ${min} to ${max}, got "${text ?? ""}"`);
  }
  return value;
}
