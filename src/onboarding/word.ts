const DEFAULT_SALT = 'pdfmerger-joy-v1';
const WORDLIST = [
  'FJORD',
  'NORDLYS',
  'KOMPASS',
  'KYST',
  'SNØ',
  'ISBRE',
  'SKOG',
  'VIND',
  'BØLGE',
  'STJERNE'
];

function hash(input: string): number {
  let value = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    value ^= input.charCodeAt(i);
    value = Math.imul(value, 16777619);
  }

  return Math.abs(value);
}

export function computeDailyWord(date = new Date(), salt = DEFAULT_SALT, wordlist = WORDLIST): string {
  const key = `${date.toISOString().slice(0, 10)}|${salt}`;
  const index = hash(key) % wordlist.length;
  return wordlist[index];
}
