const DISCLAIMER_KEY = 'pdfmerger_disclaimer_accepted';

export function isDisclaimerAccepted(): boolean {
  return localStorage.getItem(DISCLAIMER_KEY) === '1';
}

export function acceptDisclaimer(): void {
  localStorage.setItem(DISCLAIMER_KEY, '1');
}
