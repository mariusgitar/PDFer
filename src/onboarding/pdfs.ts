import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

export async function createPartPdf(part: 'A' | 'B', word: string): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595, 842]);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

  page.drawText(`Dette er Del ${part} (side 1)`, {
    x: 56,
    y: 760,
    size: 22,
    font: bold,
    color: rgb(0.1, 0.1, 0.1)
  });

  page.drawText('→', {
    x: 56,
    y: 700,
    size: 36,
    font,
    color: rgb(0.15, 0.35, 0.9)
  });

  if (part === 'A') {
    page.drawText(`Dagens nøkkelord: ${word}`, {
      x: 56,
      y: 640,
      size: 18,
      font: bold,
      color: rgb(0.15, 0.15, 0.15)
    });
  }

  page.drawText('Last ned begge delene og slå dem sammen i appen.', {
    x: 56,
    y: 600,
    size: 12,
    font,
    color: rgb(0.3, 0.35, 0.45)
  });

  return pdf.save();
}
