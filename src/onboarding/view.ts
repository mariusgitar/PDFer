import { computeDailyCode } from './dailyCode';
import { isSolved, type ChallengeState } from './challenge';

export interface OnboardingViewState {
  challenge: ChallengeState;
  codeInput: string;
  codeError: string | null;
}

export interface OnboardingHandlers {
  onMove: (id: string, direction: 'up' | 'down') => void;
  onCodeInput: (value: string) => void;
  onContinue: () => void;
}

export function renderOnboarding(state: OnboardingViewState): string {
  const solved = isSolved(state.challenge);
  const dailyCode = computeDailyCode();

  return `
    <h1>Første gang: sett filene i riktig rekkefølge</h1>
    <p class="muted">Minioppgave (20–30 sek): Sorter filene med opp/ned-knapper slik at rekkefølgen blir 01 til 03.</p>
    <ul class="file-list" aria-label="Onboarding-rekkefølge">
      ${state.challenge.items
        .map(
          (item, index) => `
            <li class="file-item">
              <div class="file-meta"><strong>${item.label}</strong></div>
              <div class="file-actions">
                <button class="icon-btn" data-onboarding-action="move-up" data-id="${item.id}" ${index === 0 ? 'disabled' : ''} aria-label="Flytt opp">↑</button>
                <button class="icon-btn" data-onboarding-action="move-down" data-id="${item.id}" ${index === state.challenge.items.length - 1 ? 'disabled' : ''} aria-label="Flytt ned">↓</button>
              </div>
            </li>
          `
        )
        .join('')}
    </ul>
    <p id="onboarding-status" role="status" aria-live="polite">${solved ? 'Riktig rekkefølge! Skriv inn koden for å fortsette.' : 'Sorter filene i riktig rekkefølge for å låse opp.'}</p>
    ${solved ? `<p class="warning">Klar! Skriv inn: <strong>${dailyCode}</strong></p>` : ''}
    <label class="field">
      Bekreftelseskode
      <input id="onboarding-code" type="text" value="${state.codeInput}" autocomplete="off" ${solved ? '' : 'disabled'} />
    </label>
    <button id="onboarding-continue" class="button primary" ${solved && state.codeInput.trim() === dailyCode ? '' : 'disabled'}>Fortsett</button>
    ${state.codeError ? `<p class="error">${state.codeError}</p>` : ''}
  `;
}

export function bindOnboardingEvents(container: HTMLElement, handlers: OnboardingHandlers): void {
  container.querySelectorAll<HTMLButtonElement>('[data-onboarding-action="move-up"]').forEach((button) => {
    button.addEventListener('click', () => handlers.onMove(button.dataset.id ?? '', 'up'));
  });

  container.querySelectorAll<HTMLButtonElement>('[data-onboarding-action="move-down"]').forEach((button) => {
    button.addEventListener('click', () => handlers.onMove(button.dataset.id ?? '', 'down'));
  });

  container.querySelector<HTMLInputElement>('#onboarding-code')?.addEventListener('input', (event) => {
    handlers.onCodeInput((event.target as HTMLInputElement).value);
  });

  container.querySelector<HTMLButtonElement>('#onboarding-continue')?.addEventListener('click', handlers.onContinue);
}

