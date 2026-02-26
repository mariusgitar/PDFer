export type MergeStatus = 'idle' | 'reading' | 'merging' | 'done' | 'error';

export interface PdfFileItem {
  id: string;
  file: File;
}

export interface AppState {
  files: PdfFileItem[];
  outputFileName: string;
  status: MergeStatus;
  statusMessage: string;
  errorMessage: string | null;
  warningMessage: string | null;
}

const DEFAULT_OUTPUT = 'merged.pdf';
const LARGE_FILE_WARNING_BYTES = 200 * 1024 * 1024;

function ensurePdfExtension(fileName: string): string {
  const trimmed = fileName.trim();
  if (!trimmed) {
    return DEFAULT_OUTPUT;
  }

  return trimmed.toLowerCase().endsWith('.pdf') ? trimmed : `${trimmed}.pdf`;
}

export function createInitialState(): AppState {
  return {
    files: [],
    outputFileName: DEFAULT_OUTPUT,
    status: 'idle',
    statusMessage: 'Legg til minst to PDF-filer for å slå sammen.',
    errorMessage: null,
    warningMessage: null
  };
}

export function addFiles(state: AppState, files: File[]): AppState {
  const pdfFiles = files
    .filter((file) => file.type === 'application/pdf')
    .map((file) => ({
      id: `${file.name}-${file.lastModified}-${crypto.randomUUID()}`,
      file
    }));

  const nextFiles = [...state.files, ...pdfFiles];

  return {
    ...state,
    files: nextFiles,
    status: 'idle',
    statusMessage: 'Filer lagt til. Klar til sammenslåing.',
    errorMessage: null,
    warningMessage: getLargeFileWarning(nextFiles)
  };
}

export function removeFile(state: AppState, id: string): AppState {
  const nextFiles = state.files.filter((item) => item.id !== id);

  return {
    ...state,
    files: nextFiles,
    warningMessage: getLargeFileWarning(nextFiles),
    errorMessage: null
  };
}

export function clearFiles(state: AppState): AppState {
  return {
    ...state,
    files: [],
    status: 'idle',
    statusMessage: 'Alle filer er fjernet.',
    errorMessage: null,
    warningMessage: null
  };
}

export function moveFile(state: AppState, id: string, direction: 'up' | 'down'): AppState {
  const index = state.files.findIndex((item) => item.id === id);
  if (index === -1) {
    return state;
  }

  const targetIndex = direction === 'up' ? index - 1 : index + 1;
  if (targetIndex < 0 || targetIndex >= state.files.length) {
    return state;
  }

  const nextFiles = [...state.files];
  const [moved] = nextFiles.splice(index, 1);
  nextFiles.splice(targetIndex, 0, moved);

  return {
    ...state,
    files: nextFiles,
    errorMessage: null
  };
}

export function setOutputFileName(state: AppState, value: string): AppState {
  return {
    ...state,
    outputFileName: ensurePdfExtension(value)
  };
}

export function setStatus(state: AppState, status: MergeStatus, message: string): AppState {
  return {
    ...state,
    status,
    statusMessage: message,
    errorMessage: status === 'error' ? state.errorMessage : null
  };
}

export function setError(state: AppState, message: string): AppState {
  return {
    ...state,
    status: 'error',
    errorMessage: message,
    statusMessage: message
  };
}

function getLargeFileWarning(files: PdfFileItem[]): string | null {
  const total = files.reduce((sum, current) => sum + current.file.size, 0);
  if (total > LARGE_FILE_WARNING_BYTES) {
    return 'Advarsel: Total filstørrelse er over 200 MB. Sammenslåing kan ta tid.';
  }

  return null;
}
