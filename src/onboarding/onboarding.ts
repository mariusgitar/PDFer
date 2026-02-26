const ONBOARDING_KEY = 'pdfmerger_onboarding_done';

export function isOnboardingDone(): boolean {
  return localStorage.getItem(ONBOARDING_KEY) === '1';
}

export function setOnboardingDone(): void {
  localStorage.setItem(ONBOARDING_KEY, '1');
}
