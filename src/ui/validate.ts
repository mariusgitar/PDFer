import { MAX_FILES, MAX_TOTAL_BYTES } from '../config/limits';
import type { PdfFileItem } from './state';

export interface RejectedFile {
  file: File;
  reason: string;
}

export interface ValidationResult {
  accepted: File[];
  rejected: RejectedFile[];
  nextTotalBytes: number;
}

export function validateIncomingFiles(existingFiles: PdfFileItem[], incomingFiles: File[]): ValidationResult {
  const accepted: File[] = [];
  const rejected: RejectedFile[] = [];
  let nextTotalBytes = existingFiles.reduce((sum, item) => sum + item.file.size, 0);
  let fileCount = existingFiles.length;

  for (const file of incomingFiles) {
    if (fileCount >= MAX_FILES) {
      rejected.push({ file, reason: `Maks ${MAX_FILES} filer er tillatt.` });
      continue;
    }

    if (nextTotalBytes + file.size > MAX_TOTAL_BYTES) {
      rejected.push({ file, reason: 'Total størrelse kan ikke overstige 200 MB.' });
      continue;
    }

    accepted.push(file);
    fileCount += 1;
    nextTotalBytes += file.size;
  }

  return { accepted, rejected, nextTotalBytes };
}
