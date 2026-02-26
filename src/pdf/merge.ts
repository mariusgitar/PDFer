import { PDFDocument } from 'pdf-lib';

export async function mergePdfFiles(files: File[]): Promise<Uint8Array> {
  const mergedPdf = await PDFDocument.create();

  for (const file of files) {
    const buffer = await file.arrayBuffer();
    let sourcePdf: PDFDocument;

    try {
      sourcePdf = await PDFDocument.load(buffer);
    } catch {
      throw new Error(`Kunne ikke lese PDF-filen: ${file.name}`);
    }

    const pageIndices = sourcePdf.getPageIndices();
    const copiedPages = await mergedPdf.copyPages(sourcePdf, pageIndices);

    copiedPages.forEach((page) => mergedPdf.addPage(page));
  }

  return mergedPdf.save();
}
