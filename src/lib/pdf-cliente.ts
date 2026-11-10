import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist';
import { agruparItemsPorRenglon, ItemTexto } from './pdf-renglones';

export const MAX_BYTES_PDF_CLIENTE = 50 * 1024 * 1024;
export const WORKER_PDF_PUBLICO = '/pdf.worker.min.mjs';

export function configurarWorkerPdf(workerSrc = WORKER_PDF_PUBLICO): void {
  GlobalWorkerOptions.workerSrc = workerSrc;
}

export function validarPdfCliente(bytes: Uint8Array, tamanoBytes: number): string | null {
  if (tamanoBytes < 1) return 'El archivo está vacío.';
  if (tamanoBytes > MAX_BYTES_PDF_CLIENTE) return 'El PDF supera el máximo de 50 MB.';
  const firma = String.fromCharCode(bytes[0] ?? 0, bytes[1] ?? 0, bytes[2] ?? 0, bytes[3] ?? 0, bytes[4] ?? 0);
  if (!firma.startsWith('%PDF-')) return 'El archivo no tiene la firma de un PDF (%PDF-).';
  return null;
}

export async function sha256Hex(datos: ArrayBuffer): Promise<string> {
  const resumen = await crypto.subtle.digest('SHA-256', datos);
  const bytes = new Uint8Array(resumen);
  let hex = '';
  for (let indice = 0; indice < bytes.length; indice += 1) {
    hex += bytes[indice].toString(16).padStart(2, '0');
  }
  return hex;
}

/**
 * Lee el texto en el navegador con pdfjs-dist y la misma agrupación de renglones
 * que usa el servidor. El worker se sirve desde public/pdf.worker.min.mjs.
 */
export async function extraerTextoPdfEnCliente(datos: ArrayBuffer, workerSrc?: string): Promise<string> {
  configurarWorkerPdf(workerSrc ?? (typeof window === 'undefined' ? GlobalWorkerOptions.workerSrc : WORKER_PDF_PUBLICO));
  if (!GlobalWorkerOptions.workerSrc) {
    throw new Error('No está configurado el worker de PDF.');
  }
  const pdf = await getDocument({ data: new Uint8Array(datos), isEvalSupported: false }).promise;
  const paginas: string[] = [];
  for (let numero = 1; numero <= pdf.numPages; numero += 1) {
    const pagina = await pdf.getPage(numero);
    const contenido = await pagina.getTextContent();
    paginas.push(agruparItemsPorRenglon(contenido.items as ItemTexto[]));
  }
  return paginas.filter(Boolean).join('\n');
}
