import { PDFDocument } from 'pdf-lib';

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const arrayBuffer = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(arrayBuffer).set(bytes);
  return arrayBuffer;
}

export interface ReorderSource {
  fileName: string;
  sourceBytes: Uint8Array;
  pageCount: number;
}

export async function loadPdfForReorder(file: File): Promise<ReorderSource> {
  const sourceBuffer = await file.arrayBuffer();
  const sourceBytes = new Uint8Array(sourceBuffer);

  try {
    const sourcePdf = await PDFDocument.load(sourceBytes);
    return {
      fileName: file.name,
      sourceBytes,
      pageCount: sourcePdf.getPageCount()
    };
  } catch {
    throw new Error(`Kunne ikke lese PDF-filen: ${file.name}`);
  }
}

export async function exportReorderedPdf(source: Uint8Array, pageOrder: number[]): Promise<Uint8Array> {
  const sourcePdf = await PDFDocument.load(source);
  const outputPdf = await PDFDocument.create();
  const copiedPages = await outputPdf.copyPages(sourcePdf, pageOrder);

  copiedPages.forEach((page) => outputPdf.addPage(page));
  return outputPdf.save();
}

export async function createPagePreviewPdf(source: Uint8Array, pageIndex: number): Promise<Blob> {
  const sourcePdf = await PDFDocument.load(source);
  const previewPdf = await PDFDocument.create();
  const [page] = await previewPdf.copyPages(sourcePdf, [pageIndex]);
  previewPdf.addPage(page);
  const bytes = await previewPdf.save();
  return new Blob([toArrayBuffer(bytes)], { type: 'application/pdf' });
}
