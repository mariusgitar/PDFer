import './styles/main.css';
import { mergePdfFiles } from './pdf/merge';
import { computeDailyCode } from './onboarding/dailyCode';
import { createInitialChallengeState, isSolved, moveDown, moveUp, type ChallengeState } from './onboarding/challenge';
import { isOnboardingDone, setOnboardingDone } from './onboarding/onboarding';
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
  renderApp(
    app,
    state,
    {
      currentView,
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
      onOnboardingMove: (id, direction) => {
        challengeState = direction === 'up' ? moveUp(challengeState, id) : moveDown(challengeState, id);
        onboardingCodeError = null;
        rerender();
      },
      onOnboardingCodeInput: (value) => {
        onboardingCodeInput = value;
        onboardingCodeError = null;
        rerender();
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

rerender();
