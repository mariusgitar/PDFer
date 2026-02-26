const DEFAULT_SALT = 'pdfmerger-order-v1';
const DEFAULT_CODES = ['3-1-4', '5-8-9', '2-6-5', '9-7-9', '1-1-2', '4-6-2', '6-4-3', '3-8-3', '2-7-1', '8-2-8'];

function hash(input: string): number {
  let value = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    value ^= input.charCodeAt(i);
    value = Math.imul(value, 16777619);
  }

  return Math.abs(value);
}

export function computeDailyCode(
  dateStr = new Date().toISOString().slice(0, 10),
  salt = DEFAULT_SALT,
  codes = DEFAULT_CODES
): string {
  const index = hash(`${dateStr}|${salt}`) % codes.length;
  return codes[index];
}
