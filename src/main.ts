import './styles/main.css';
import { mergePdfFiles } from './pdf/merge';
import { createPartPdf } from './onboarding/pdfs';
import { isOnboardingDone, setOnboardingDone } from './onboarding/onboarding';
import { computeDailyWord } from './onboarding/word';
import { isPdfFile, sanitizeFileName, triggerDownload } from './ui/dom';
import { acceptDisclaimer, isDisclaimerAccepted } from './ui/disclaimer';
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
let currentView: AppView = isDisclaimerAccepted() ? (isOnboardingDone() ? 'app' : 'onboarding') : 'disclaimer';
let onboardingInput = '';
let onboardingError: string | null = null;

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
  renderApp(
    app,
    state,
    {
      currentView,
      onboardingInput,
      onboardingError
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
        rerender();
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
      onAcceptDisclaimer: () => {
        acceptDisclaimer();
        currentView = isOnboardingDone() ? 'app' : 'onboarding';
        rerender();
      },
      onCancelDisclaimer: () => {
        closeApp();
        rerender();
      },
      onDownloadPart: async (part) => {
        const word = computeDailyWord();
        const bytes = await createPartPdf(part, word);
        const buffer = toArrayBuffer(bytes);
        triggerDownload(new Blob([buffer], { type: 'application/pdf' }), `onboarding-del-${part}.pdf`);
      },
      onOnboardingInput: (value) => {
        onboardingInput = value;
      },
      onUnlockOnboarding: () => {
        const expectedWord = computeDailyWord();
        if (onboardingInput.trim().toUpperCase() !== expectedWord) {
          onboardingError = 'Feil ord. Prøv igjen etter å ha åpnet den sammenslåtte PDF-en.';
          rerender();
          return;
        }

        onboardingError = null;
        onboardingInput = '';
        setOnboardingDone();
        currentView = 'app';
        rerender();
      }
    }
  );
};

rerender();
