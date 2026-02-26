import { MAX_FILES, MAX_TOTAL_BYTES } from '../config/limits';
import { bindOnboardingEvents, renderOnboarding, type OnboardingViewState } from '../onboarding/view';
import { formatFileSizeMb } from './dom';
import type { AppState } from './state';
import { getUsageText } from './state';

export interface RenderHandlers {
  onSelectFiles: (files: FileList | null) => void;
  onDropFiles: (files: FileList | null) => void;
  onRemoveFile: (id: string) => void;
  onMoveFile: (id: string, direction: 'up' | 'down') => void;
  onClearAll: () => void;
  onOutputNameChange: (value: string) => void;
  onMerge: () => void;
  onAcceptDisclaimer: () => void;
  onCancelDisclaimer: () => void;
  onOnboardingMove: (id: string, direction: 'up' | 'down') => void;
  onOnboardingCodeInput: (value: string) => void;
  onOnboardingContinue: () => void;
}

export type AppView = 'disclaimer' | 'onboarding' | 'app';

export interface RenderViewState {
  currentView: AppView;
  onboarding: OnboardingViewState;
}

export function renderApp(
  container: HTMLElement,
  state: AppState,
  viewState: RenderViewState,
  handlers: RenderHandlers
): void {
  container.innerHTML = `
    <main class="app-shell">
      <section class="card">
        ${viewState.currentView === 'onboarding' ? renderOnboarding(viewState.onboarding) : renderMainApp(state)}
      </section>
    </main>
    ${viewState.currentView === 'disclaimer' ? renderDisclaimerModal() : ''}
  `;

  if (viewState.currentView === 'disclaimer') {
    container.querySelector<HTMLButtonElement>('#accept-disclaimer')?.addEventListener('click', handlers.onAcceptDisclaimer);
    container.querySelector<HTMLButtonElement>('#cancel-disclaimer')?.addEventListener('click', handlers.onCancelDisclaimer);
    return;
  }

  if (viewState.currentView === 'onboarding') {
    bindOnboardingEvents(container, {
      onMove: handlers.onOnboardingMove,
      onCodeInput: handlers.onOnboardingCodeInput,
      onContinue: handlers.onOnboardingContinue
    });
    return;
  }

  bindAppInteractions(container, handlers);
}

function renderMainApp(state: AppState): string {
  return `
    <h1>PDF-sammenslåer</h1>
    <p class="muted">Dra inn filer eller velg PDF-er. Filene behandles lokalt i nettleseren.</p>

    <div class="dropzone" id="dropzone" tabindex="0" aria-label="Dra og slipp PDF-filer her">
      <p>Slipp PDF-filer her</p>
      <label class="button secondary" for="file-input">Velg filer</label>
      <input id="file-input" type="file" accept="application/pdf" multiple />
      <p class="usage">${getUsageText(state)}</p>
      <p class="usage-hint">Grense: maks ${MAX_FILES} filer og ${formatFileSizeMb(MAX_TOTAL_BYTES)} totalt.</p>
    </div>

    <div class="toolbar">
      <button class="button ghost" id="clear-all" ${state.files.length === 0 ? 'disabled' : ''}>Tøm alt</button>
    </div>

    <ul class="file-list" aria-label="Valgte filer">
      ${
        state.files.length === 0
          ? '<li class="empty">Ingen filer valgt ennå.</li>'
          : state.files
              .map(
                (item, index) => `
                  <li class="file-item">
                    <div class="file-meta">
                      <strong>${item.file.name}</strong>
                      <span>${formatFileSizeMb(item.file.size)}</span>
                    </div>
                    <div class="file-actions">
                      <button class="icon-btn" data-action="move-up" data-id="${item.id}" ${index === 0 ? 'disabled' : ''} aria-label="Flytt opp">↑</button>
                      <button class="icon-btn" data-action="move-down" data-id="${item.id}" ${index === state.files.length - 1 ? 'disabled' : ''} aria-label="Flytt ned">↓</button>
                      <button class="icon-btn danger" data-action="remove" data-id="${item.id}" aria-label="Fjern fil">✕</button>
                    </div>
                  </li>
                `
              )
              .join('')
      }
    </ul>

    <label class="field">
      Output-filnavn
      <input id="output-name" type="text" value="${state.outputFileName}" />
    </label>

    <button class="button primary" id="merge-btn" ${state.files.length < 2 || state.status === 'reading' || state.status === 'merging' ? 'disabled' : ''}>
      Slå sammen
    </button>

    <div class="status-row">
      ${state.status === 'reading' || state.status === 'merging' ? '<span class="spinner" aria-hidden="true"></span>' : ''}
      <p id="status" role="status" aria-live="polite">${state.statusMessage}</p>
    </div>

    ${state.noticeMessage ? `<p class="warning">${state.noticeMessage}</p>` : ''}
    ${state.errorMessage ? `<p class="error">${state.errorMessage}</p>` : ''}
  `;
}

function renderDisclaimerModal(): string {
  return `
    <div class="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="disclaimer-title">
      <section class="modal-card">
        <h2 id="disclaimer-title">Før du bruker verktøyet</h2>
        <ul>
          <li>Filene behandles lokalt i nettleseren din (ikke lastes opp).</li>
          <li>Bruk på eget ansvar.</li>
          <li>Unngå hemmelige eller svært sensitive dokumenter hvis du er usikker.</li>
          <li>Store filer kan gjøre nettleseren treg eller krasje.</li>
        </ul>
        <div class="modal-actions">
          <button id="cancel-disclaimer" class="button ghost">Avbryt</button>
          <button id="accept-disclaimer" class="button primary">Jeg forstår – fortsett</button>
        </div>
      </section>
    </div>
  `;
}

function bindAppInteractions(container: HTMLElement, handlers: RenderHandlers): void {
  const fileInput = container.querySelector<HTMLInputElement>('#file-input');
  const dropzone = container.querySelector<HTMLElement>('#dropzone');
  const clearAllButton = container.querySelector<HTMLButtonElement>('#clear-all');
  const outputNameInput = container.querySelector<HTMLInputElement>('#output-name');
  const mergeButton = container.querySelector<HTMLButtonElement>('#merge-btn');

  fileInput?.addEventListener('change', () => handlers.onSelectFiles(fileInput.files));
  clearAllButton?.addEventListener('click', handlers.onClearAll);
  outputNameInput?.addEventListener('input', (event) => {
    handlers.onOutputNameChange((event.target as HTMLInputElement).value);
  });
  mergeButton?.addEventListener('click', handlers.onMerge);

  container.querySelectorAll<HTMLButtonElement>('[data-action="remove"]').forEach((button) => {
    button.addEventListener('click', () => handlers.onRemoveFile(button.dataset.id ?? ''));
  });

  container.querySelectorAll<HTMLButtonElement>('[data-action="move-up"]').forEach((button) => {
    button.addEventListener('click', () => handlers.onMoveFile(button.dataset.id ?? '', 'up'));
  });

  container.querySelectorAll<HTMLButtonElement>('[data-action="move-down"]').forEach((button) => {
    button.addEventListener('click', () => handlers.onMoveFile(button.dataset.id ?? '', 'down'));
  });

  if (dropzone) {
    dropzone.addEventListener('dragover', (event) => {
      event.preventDefault();
      dropzone.classList.add('drag-active');
    });

    dropzone.addEventListener('dragleave', () => {
      dropzone.classList.remove('drag-active');
    });

    dropzone.addEventListener('drop', (event) => {
      event.preventDefault();
      dropzone.classList.remove('drag-active');
      handlers.onDropFiles(event.dataTransfer?.files ?? null);
    });

    dropzone.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        fileInput?.click();
      }
    });
  }
}
