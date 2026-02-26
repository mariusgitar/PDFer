import type { AppState } from './state';
import { formatFileSizeMb } from './dom';

export interface RenderHandlers {
  onSelectFiles: (files: FileList | null) => void;
  onDropFiles: (files: FileList | null) => void;
  onRemoveFile: (id: string) => void;
  onMoveFile: (id: string, direction: 'up' | 'down') => void;
  onClearAll: () => void;
  onOutputNameChange: (value: string) => void;
  onMerge: () => void;
}

export function renderApp(container: HTMLElement, state: AppState, handlers: RenderHandlers): void {
  container.innerHTML = `
    <main class="app-shell">
      <section class="card">
        <h1>PDF-sammenslåer</h1>
        <p class="muted">Dra inn filer eller velg PDF-er. Filene behandles lokalt i nettleseren.</p>

        <div class="dropzone" id="dropzone" tabindex="0" aria-label="Dra og slipp PDF-filer her">
          <p>Slipp PDF-filer her</p>
          <label class="button secondary" for="file-input">Velg filer</label>
          <input id="file-input" type="file" accept="application/pdf" multiple />
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

        ${state.warningMessage ? `<p class="warning">${state.warningMessage}</p>` : ''}
        ${state.errorMessage ? `<p class="error">${state.errorMessage}</p>` : ''}
      </section>
    </main>
  `;

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
