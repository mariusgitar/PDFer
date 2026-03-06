import './styles/main.css';
import { mergePdfFiles } from './pdf/merge';
import { createPagePreviewPdf, exportReorderedPdf, loadPdfForReorder } from './pdf/reorder';
import { computeDailyCode } from './onboarding/dailyCode';
import { createInitialChallengeState, isSolved, moveDown, moveUp, type ChallengeState } from './onboarding/challenge';
import { isOnboardingDone, setOnboardingDone } from './onboarding/onboarding';
import { isPdfFile, sanitizeFileName, triggerDownload } from './ui/dom';
import { acceptDisclaimer, isDisclaimerAccepted } from './ui/disclaimer';
import { type ToolMode } from './ui/mode';
import {
  clearReorderState,
  createInitialReorderState,
  movePageByIds,
  removePage,
  setReorderError,
  setReorderLoading,
  setReorderOutputName,
  setReorderSource,
  setReorderStatus,
  setThumbnailError,
  setThumbnailLoading,
  setThumbnailReady,
  type ReorderState
} from './ui/reorderState';
import { type AppView, renderApp } from './ui/render';
import {
  addFiles,
  clearFiles,
  createInitialState,
  moveFile,
  removeFile,
  setError,
  setOutputFileName,
  setStatus,
  type AppState
} from './ui/state';

const app = document.querySelector<HTMLDivElement>('#app');

if (!app) {
  throw new Error('Mangler #app-container.');
}

let state: AppState = createInitialState();
let reorderState: ReorderState = createInitialReorderState();
let currentView: AppView = isDisclaimerAccepted() ? (isOnboardingDone() ? 'app' : 'onboarding') : 'disclaimer';
let mode: ToolMode = 'merge';
let challengeState: ChallengeState = createInitialChallengeState();
let onboardingCodeInput = '';
let onboardingCodeError: string | null = null;

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const arrayBuffer = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(arrayBuffer).set(bytes);
  return arrayBuffer;
}

function closeApp(): void {
  currentView = 'disclaimer';
  state = setError(state, 'Verktøyet er deaktivert til du godtar informasjonen.');
}

const rerender = (): void => {
  const handleReorderFiles = async (files: FileList | null): Promise<void> => {
    const file = files?.[0];
    if (!file || !isPdfFile(file)) {
      reorderState = setReorderError(reorderState, 'Velg en gyldig PDF-fil.');
      rerender();
      return;
    }

    try {
      reorderState = setReorderLoading(reorderState);
      rerender();
      const loaded = await loadPdfForReorder(file);
      reorderState = setReorderSource(reorderState, loaded.fileName, loaded.sourceBytes, loaded.pageCount);
      rerender();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Kunne ikke lese PDF-filen.';
      reorderState = setReorderError(reorderState, message);
      rerender();
    }
  };

  renderApp(
    app,
    state,
    {
      currentView,
      mode,
      reorder: reorderState,
      onboarding: {
        challenge: challengeState,
        codeInput: onboardingCodeInput,
        codeError: onboardingCodeError
      }
    },
    {
      onSelectFiles: (files) => {
        const validFiles = [...(files ?? [])].filter(isPdfFile);
        state = addFiles(state, validFiles);
        rerender();
      },
      onDropFiles: (files) => {
        const validFiles = [...(files ?? [])].filter(isPdfFile);
        state = addFiles(state, validFiles);
        rerender();
      },
      onRemoveFile: (id) => {
        state = removeFile(state, id);
        rerender();
      },
      onMoveFile: (id, direction) => {
        state = moveFile(state, id, direction);
        rerender();
      },
      onClearAll: () => {
        state = clearFiles(state);
        rerender();
      },
      onOutputNameChange: (value) => {
        state = setOutputFileName(state, sanitizeFileName(value));
      },
      onMerge: async () => {
        if (state.files.length < 2) {
          return;
        }

        try {
          state = setStatus(state, 'reading', 'Leser filer…');
          rerender();

          state = setStatus(state, 'merging', 'Slår sammen…');
          rerender();

          const mergedBytes = await mergePdfFiles(state.files.map((item) => item.file));
          const outputName = sanitizeFileName(state.outputFileName);
          const mergedBuffer = toArrayBuffer(mergedBytes);
          triggerDownload(new Blob([mergedBuffer], { type: 'application/pdf' }), outputName);

          state = setStatus(state, 'done', `Ferdig: ${outputName}`);
          rerender();
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Noe gikk galt under sammenslåing.';
          state = setError(state, message);
          rerender();
        }
      },
      onSelectMode: (nextMode) => {
        mode = nextMode;
        rerender();
      },
      onSelectReorderFile: handleReorderFiles,
      onDropReorderFile: handleReorderFiles,
      onReorderOutputNameChange: (value) => {
        reorderState = setReorderOutputName(reorderState, value);
      },
      onReorderPageDrop: (draggedId, targetId) => {
        reorderState = movePageByIds(reorderState, draggedId, targetId);
        rerender();
      },
      onRemoveReorderPage: (id) => {
        reorderState = removePage(reorderState, id);
        rerender();
      },
      onExportReorderPdf: async () => {
        if (!reorderState.sourceBytes || reorderState.pages.length === 0) {
          return;
        }

        const sourceBytes = reorderState.sourceBytes;

        try {
          reorderState = setReorderStatus(reorderState, 'exporting', 'Bygger ny PDF…');
          rerender();
          const pageOrder = reorderState.pages.map((page) => page.sourceIndex);
          const outputBytes = await exportReorderedPdf(sourceBytes, pageOrder);
          const outputName = sanitizeFileName(reorderState.outputFileName);
          triggerDownload(new Blob([toArrayBuffer(outputBytes)], { type: 'application/pdf' }), outputName);
          reorderState = setReorderStatus(reorderState, 'ready', `Ferdig: ${outputName}`);
          rerender();
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Kunne ikke eksportere PDF-en.';
          reorderState = setReorderError(reorderState, message);
          rerender();
        }
      },
      onLoadThumbnail: async (id) => {
        const page = reorderState.pages.find((item) => item.id === id);
        const sourceBytes = reorderState.sourceBytes;
        if (!page || !sourceBytes || page.thumbnailStatus !== 'idle') {
          return;
        }

        reorderState = setThumbnailLoading(reorderState, id);
        rerender();

        try {
          const previewBlob = await createPagePreviewPdf(sourceBytes, page.sourceIndex);
          const previewUrl = URL.createObjectURL(previewBlob);
          reorderState = setThumbnailReady(reorderState, id, previewUrl);
        } catch {
          reorderState = setThumbnailError(reorderState, id);
        }

        rerender();
      },
      onAcceptDisclaimer: () => {
        acceptDisclaimer();
        currentView = isOnboardingDone() ? 'app' : 'onboarding';
        rerender();
      },
      onCancelDisclaimer: () => {
        closeApp();
        rerender();
      },
      onOnboardingMove: (id, direction) => {
        challengeState = direction === 'up' ? moveUp(challengeState, id) : moveDown(challengeState, id);
        onboardingCodeError = null;
        rerender();
      },
      onOnboardingCodeInput: (value) => {
        onboardingCodeInput = value;
        onboardingCodeError = null;
      },
      onOnboardingContinue: () => {
        const solved = isSolved(challengeState);
        const expectedCode = computeDailyCode();

        if (!solved) {
          onboardingCodeError = 'Sorter filene riktig før du fortsetter.';
          rerender();
          return;
        }

        if (onboardingCodeInput.trim() !== expectedCode) {
          onboardingCodeError = 'Koden stemmer ikke. Sjekk koden som vises.';
          rerender();
          return;
        }

        setOnboardingDone();
        currentView = 'app';
        onboardingCodeInput = '';
        onboardingCodeError = null;
        rerender();
      }
    }
  );
};

window.addEventListener('beforeunload', () => {
  reorderState = clearReorderState(reorderState);
});

rerender();
