import * as pdfjsLib from 'pdfjs-dist';

// Configure worker for Vite
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();

/**
 * Converts a PDF file to an array of JPEG images (one per page).
 * Renders at 2x scale for OCR quality.
 */
export async function pdfToImages(
  pdfFile: File,
  options: { scale?: number; quality?: number; maxPages?: number } = {}
): Promise<File[]> {
  const { scale = 2.0, quality = 0.85, maxPages = 10 } = options;

  const arrayBuffer = await pdfFile.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  const pageCount = Math.min(pdf.numPages, maxPages);
  const images: File[] = [];

  for (let i = 1; i <= pageCount; i++) {
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale });

    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;

    const ctx = canvas.getContext('2d')!;
    await page.render({ canvasContext: ctx, viewport }).promise;

    const blob = await new Promise<Blob>((resolve) =>
      canvas.toBlob((b) => resolve(b!), 'image/jpeg', quality)
    );

    const baseName = pdfFile.name.replace(/\.pdf$/i, '');
    const fileName = `${baseName}_page${i}.jpg`;
    images.push(new File([blob], fileName, { type: 'image/jpeg' }));

    // Cleanup
    canvas.width = 0;
    canvas.height = 0;
  }

  return images;
}
