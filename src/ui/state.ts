import { MAX_FILES, MAX_TOTAL_BYTES } from '../config/limits';
import { formatFileSizeMb, getUsageTone } from './dom';
import { validateIncomingFiles } from './validate';

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
  noticeMessage: string | null;
}

const DEFAULT_OUTPUT = 'merged.pdf';

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
    noticeMessage: null
  };
}

export function getTotalBytes(files: PdfFileItem[]): number {
  return files.reduce((sum, item) => sum + item.file.size, 0);
}

export function getUsageText(state: AppState): string {
  const totalBytes = getTotalBytes(state.files);
  return `${state.files.length}/${MAX_FILES} filer • ${formatFileSizeMb(totalBytes)} / ${formatFileSizeMb(MAX_TOTAL_BYTES)}`;
}

export function addFiles(state: AppState, files: File[]): AppState {
  const validation = validateIncomingFiles(state.files, files);
  const acceptedItems = validation.accepted.map((file) => ({
    id: `${file.name}-${file.lastModified}-${crypto.randomUUID()}`,
    file
  }));

  const nextFiles = [...state.files, ...acceptedItems];
  const rejectedMessage =
    validation.rejected.length > 0
      ? `Noen filer ble avvist: ${validation.rejected
          .slice(0, 3)
          .map((item) => `${item.file.name} (${item.reason})`)
          .join(', ')}${validation.rejected.length > 3 ? '…' : ''}`
      : null;

  return {
    ...state,
    files: nextFiles,
    status: 'idle',
    statusMessage: acceptedItems.length > 0 ? 'Filer lagt til. Klar til sammenslåing.' : state.statusMessage,
    errorMessage: rejectedMessage,
    noticeMessage: getUsageTone(validation.nextTotalBytes)
  };
}

export function removeFile(state: AppState, id: string): AppState {
  const nextFiles = state.files.filter((item) => item.id !== id);

  return {
    ...state,
    files: nextFiles,
    noticeMessage: getUsageTone(getTotalBytes(nextFiles)),
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
    noticeMessage: null
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
