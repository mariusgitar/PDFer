import { MAX_FILES, MAX_TOTAL_BYTES } from '../config/limits';
import { bindOnboardingEvents, renderOnboarding, type OnboardingViewState } from '../onboarding/view';
import { formatFileSizeMb } from './dom';
import { TOOL_MODES, type ToolMode } from './mode';
import type { ReorderState } from './reorderState';
import type { AppState } from './state';
import { getUsageText } from './state';

let activeThumbnailObserver: IntersectionObserver | null = null;


export interface RenderHandlers {
  onSelectFiles: (files: FileList | null) => void;
  onDropFiles: (files: FileList | null) => void;
  onRemoveFile: (id: string) => void;
  onMoveFile: (id: string, direction: 'up' | 'down') => void;
  onClearAll: () => void;
  onOutputNameChange: (value: string) => void;
  onMerge: () => void;
  onSelectMode: (mode: ToolMode) => void;
  onSelectReorderFile: (files: FileList | null) => void;
  onDropReorderFile: (files: FileList | null) => void;
  onReorderOutputNameChange: (value: string) => void;
  onReorderPageDrop: (draggedId: string, targetId: string) => void;
  onRemoveReorderPage: (id: string) => void;
  onExportReorderPdf: () => void;
  onLoadThumbnail: (id: string) => void;
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
  mode: ToolMode;
  reorder: ReorderState;
}

export function renderApp(container: HTMLElement, state: AppState, viewState: RenderViewState, handlers: RenderHandlers): void {
  container.innerHTML = `
    <main class="app-shell">
      ${viewState.currentView === 'app' ? `<div class="merge-wave ${state.status === 'merging' ? 'active' : ''}" aria-hidden="true"></div>` : ''}
      <section class="card">
        ${viewState.currentView === 'onboarding' ? renderOnboarding(viewState.onboarding) : renderMainApp(state, viewState)}
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

function renderMainApp(state: AppState, viewState: RenderViewState): string {
  return `
    <h1>PDF-stifteren</h1>
    <p class="muted">Dra inn filer eller velg PDF-er. Filene behandles lokalt i nettleseren.</p>
    ${renderModeSwitcher(viewState.mode)}
    ${viewState.mode === 'merge' ? renderMergeMode(state) : renderReorderMode(viewState.reorder)}
  `;
}

function renderModeSwitcher(activeMode: ToolMode): string {
  return `
    <section class="mode-switcher" aria-label="Velg arbeidsmodus">
      <div class="mode-buttons" role="tablist" aria-label="Moduser">
        ${TOOL_MODES.map(
          (mode) => `
            <button
              class="mode-btn ${mode.id === activeMode ? 'active' : ''}"
              role="tab"
              aria-selected="${mode.id === activeMode}"
              data-action="switch-mode"
              data-mode="${mode.id}"
            >
              ${mode.label}
            </button>
          `
        ).join('')}
      </div>
      <p class="mode-help">${TOOL_MODES.find((mode) => mode.id === activeMode)?.description ?? ''}</p>
    </section>
  `;
}

function renderMergeMode(state: AppState): string {
  return `
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

function renderReorderMode(state: ReorderState): string {
  return `
    <section class="reorder-mode">
      <div class="dropzone" id="reorder-dropzone" tabindex="0" aria-label="Dra og slipp en PDF-fil her">
        <p>Slipp én PDF-fil her</p>
        <label class="button secondary" for="reorder-file-input">Velg PDF</label>
        <input id="reorder-file-input" type="file" accept="application/pdf" />
        <p class="usage-hint">Tips: store skannede PDF-er kan være tyngre i nettleseren.</p>
      </div>

      ${
        state.sourceName
          ? `<p class="usage">Kilde: <strong>${state.sourceName}</strong></p>`
          : '<p class="usage">Ingen PDF valgt ennå.</p>'
      }

      <label class="field">
        Output-filnavn
        <input id="reorder-output-name" type="text" value="${state.outputFileName}" ${state.sourceBytes ? '' : 'disabled'} />
      </label>

      <ul class="page-grid" id="page-grid" aria-label="Sider i valgt PDF">
        ${
          state.pages.length === 0
            ? '<li class="empty">Last opp en PDF for å vise sider.</li>'
            : state.pages
                .map(
                  (page) => `
                    <li class="page-card" draggable="true" data-page-id="${page.id}">
                      <div class="page-thumb" data-action="thumb" data-id="${page.id}" data-status="${page.thumbnailStatus}">
                        ${
                          page.thumbnailStatus === 'ready' && page.thumbnailUrl
                            ? `<iframe src="${page.thumbnailUrl}#toolbar=0&navpanes=0&scrollbar=0" title="Miniatyr side ${page.pageNumber}" loading="lazy"></iframe>`
                            : `<span>${page.thumbnailStatus === 'loading' ? 'Laster miniatyr…' : page.thumbnailStatus === 'error' ? 'Kunne ikke vise miniatyr' : 'Klar for miniatyr'}</span>`
                        }
                      </div>
                      <div class="page-card-footer">
                        <strong>Side ${page.pageNumber}</strong>
                        <button class="icon-btn danger" data-action="remove-page" data-id="${page.id}" aria-label="Slett side ${page.pageNumber}">✕</button>
                      </div>
                    </li>
                  `
                )
                .join('')
        }
      </ul>

      <button class="button primary" id="export-reorder-btn" ${state.pages.length === 0 || state.status === 'loading' || state.status === 'exporting' ? 'disabled' : ''}>Eksporter ny PDF</button>

      <div class="status-row">
        ${state.status === 'loading' || state.status === 'exporting' ? '<span class="spinner" aria-hidden="true"></span>' : ''}
        <p role="status" aria-live="polite">${state.statusMessage}</p>
      </div>

      ${state.errorMessage ? `<p class="error">${state.errorMessage}</p>` : ''}
    </section>
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
  container.querySelectorAll<HTMLButtonElement>('[data-action="switch-mode"]').forEach((button) => {
    button.addEventListener('click', () => {
      const mode = button.dataset.mode as ToolMode | undefined;
      if (mode) {
        handlers.onSelectMode(mode);
      }
    });
  });

  bindMergeModeInteractions(container, handlers);
  bindReorderModeInteractions(container, handlers);
}

function bindMergeModeInteractions(container: HTMLElement, handlers: RenderHandlers): void {
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

function bindReorderModeInteractions(container: HTMLElement, handlers: RenderHandlers): void {
  const fileInput = container.querySelector<HTMLInputElement>('#reorder-file-input');
  const dropzone = container.querySelector<HTMLElement>('#reorder-dropzone');
  const outputNameInput = container.querySelector<HTMLInputElement>('#reorder-output-name');
  const exportButton = container.querySelector<HTMLButtonElement>('#export-reorder-btn');

  fileInput?.addEventListener('change', () => handlers.onSelectReorderFile(fileInput.files));
  outputNameInput?.addEventListener('input', (event) => handlers.onReorderOutputNameChange((event.target as HTMLInputElement).value));
  exportButton?.addEventListener('click', handlers.onExportReorderPdf);

  container.querySelectorAll<HTMLButtonElement>('[data-action="remove-page"]').forEach((button) => {
    button.addEventListener('click', () => handlers.onRemoveReorderPage(button.dataset.id ?? ''));
  });

  container.querySelectorAll<HTMLElement>('.page-card').forEach((card) => {
    card.addEventListener('dragstart', (event) => {
      event.dataTransfer?.setData('text/plain', card.dataset.pageId ?? '');
      card.classList.add('dragging');
    });

    card.addEventListener('dragend', () => {
      card.classList.remove('dragging');
    });

    card.addEventListener('dragover', (event) => {
      event.preventDefault();
      card.classList.add('drop-target');
    });

    card.addEventListener('dragleave', () => {
      card.classList.remove('drop-target');
    });

    card.addEventListener('drop', (event) => {
      event.preventDefault();
      card.classList.remove('drop-target');
      const draggedId = event.dataTransfer?.getData('text/plain') ?? '';
      const targetId = card.dataset.pageId ?? '';
      handlers.onReorderPageDrop(draggedId, targetId);
    });
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
      handlers.onDropReorderFile(event.dataTransfer?.files ?? null);
    });

    dropzone.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        fileInput?.click();
      }
    });
  }

  activeThumbnailObserver?.disconnect();

  const thumbObserver = new IntersectionObserver(
    (entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) {
          return;
        }

        const element = entry.target as HTMLElement;
        const id = element.dataset.id;
        if (id && element.dataset.status === 'idle') {
          handlers.onLoadThumbnail(id);
          observer.unobserve(element);
        }
      });
    },
    { rootMargin: '200px' }
  );

  container.querySelectorAll<HTMLElement>('[data-action="thumb"]').forEach((thumb) => {
    if (thumb.dataset.status === 'idle') {
      thumbObserver.observe(thumb);
    }
  });

  activeThumbnailObserver = thumbObserver;
}
