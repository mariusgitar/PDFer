import './styles/main.css';
import { mergePdfFiles } from './pdf/merge';
import { isPdfFile, sanitizeFileName, triggerDownload } from './ui/dom';
import { renderApp } from './ui/render';
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

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const arrayBuffer = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(arrayBuffer).set(bytes);
  return arrayBuffer;
}

const rerender = (): void => {
  renderApp(app, state, {
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
    }
  });
};

rerender();
