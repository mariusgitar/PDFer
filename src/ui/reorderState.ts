import { sanitizeFileName } from './dom';

export type ReorderStatus = 'idle' | 'loading' | 'ready' | 'exporting' | 'error';
export type ThumbnailStatus = 'idle' | 'loading' | 'ready' | 'error';

export interface ReorderPageItem {
  id: string;
  sourceIndex: number;
  pageNumber: number;
  thumbnailUrl: string | null;
  thumbnailStatus: ThumbnailStatus;
}

export interface ReorderState {
  sourceName: string | null;
  sourceBytes: Uint8Array | null;
  outputFileName: string;
  status: ReorderStatus;
  statusMessage: string;
  errorMessage: string | null;
  pages: ReorderPageItem[];
}

export function createInitialReorderState(): ReorderState {
  return {
    sourceName: null,
    sourceBytes: null,
    outputFileName: 'organisert.pdf',
    status: 'idle',
    statusMessage: 'Last opp én PDF for å organisere sider.',
    errorMessage: null,
    pages: []
  };
}

export function clearReorderState(state: ReorderState): ReorderState {
  state.pages.forEach((page) => {
    if (page.thumbnailUrl) {
      URL.revokeObjectURL(page.thumbnailUrl);
    }
  });

  return createInitialReorderState();
}

export function setReorderLoading(state: ReorderState): ReorderState {
  return {
    ...state,
    status: 'loading',
    statusMessage: 'Leser PDF…',
    errorMessage: null
  };
}

export function setReorderSource(state: ReorderState, fileName: string, sourceBytes: Uint8Array, pageCount: number): ReorderState {
  state.pages.forEach((page) => {
    if (page.thumbnailUrl) {
      URL.revokeObjectURL(page.thumbnailUrl);
    }
  });

  return {
    sourceName: fileName,
    sourceBytes,
    outputFileName: sanitizeFileName(fileName.replace(/\.pdf$/i, '-organisert.pdf')),
    status: 'ready',
    statusMessage: `${pageCount} sider klare for organisering.`,
    errorMessage: null,
    pages: Array.from({ length: pageCount }, (_, index) => ({
      id: `${index + 1}-${crypto.randomUUID()}`,
      sourceIndex: index,
      pageNumber: index + 1,
      thumbnailUrl: null,
      thumbnailStatus: 'idle'
    }))
  };
}

export function setReorderError(state: ReorderState, message: string): ReorderState {
  return {
    ...state,
    status: 'error',
    statusMessage: message,
    errorMessage: message
  };
}

export function setReorderOutputName(state: ReorderState, value: string): ReorderState {
  return {
    ...state,
    outputFileName: sanitizeFileName(value)
  };
}

export function removePage(state: ReorderState, id: string): ReorderState {
  const removedPage = state.pages.find((page) => page.id === id);
  if (removedPage?.thumbnailUrl) {
    URL.revokeObjectURL(removedPage.thumbnailUrl);
  }

  const pages = state.pages.filter((page) => page.id !== id);
  return {
    ...state,
    pages,
    statusMessage: pages.length === 0 ? 'Alle sider er fjernet.' : `${pages.length} sider igjen.`
  };
}

export function movePageByIds(state: ReorderState, draggedId: string, targetId: string): ReorderState {
  if (draggedId === targetId) {
    return state;
  }

  const draggedIndex = state.pages.findIndex((page) => page.id === draggedId);
  const targetIndex = state.pages.findIndex((page) => page.id === targetId);

  if (draggedIndex === -1 || targetIndex === -1) {
    return state;
  }

  const pages = [...state.pages];
  const [draggedPage] = pages.splice(draggedIndex, 1);
  pages.splice(targetIndex, 0, draggedPage);

  return {
    ...state,
    pages,
    errorMessage: null
  };
}

export function setReorderStatus(state: ReorderState, status: ReorderStatus, message: string): ReorderState {
  return {
    ...state,
    status,
    statusMessage: message,
    errorMessage: status === 'error' ? state.errorMessage : null
  };
}

export function setThumbnailLoading(state: ReorderState, id: string): ReorderState {
  return {
    ...state,
    pages: state.pages.map((page) => (page.id === id ? { ...page, thumbnailStatus: 'loading' } : page))
  };
}

export function setThumbnailReady(state: ReorderState, id: string, thumbnailUrl: string): ReorderState {
  return {
    ...state,
    pages: state.pages.map((page) => {
      if (page.id !== id) {
        return page;
      }

      if (page.thumbnailUrl) {
        URL.revokeObjectURL(page.thumbnailUrl);
      }

      return { ...page, thumbnailStatus: 'ready', thumbnailUrl };
    })
  };
}

export function setThumbnailError(state: ReorderState, id: string): ReorderState {
  return {
    ...state,
    pages: state.pages.map((page) => (page.id === id ? { ...page, thumbnailStatus: 'error' } : page))
  };
}
