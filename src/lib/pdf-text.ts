import { getDocumentProxy } from 'unpdf';

interface ItemTexto {
  str?: string;
  transform?: number[];
}

/**
 * Extrae el texto de un PDF digital agrupando por renglón.
 * Sirve para anexos que pdftotext -layout parte en dos o tres líneas.
 */
export async function extraerTextoPdf(contenido: Buffer): Promise<string> {
  const pdf = await getDocumentProxy(new Uint8Array(contenido));
  const paginas: string[] = [];

  for (let numero = 1; numero <= pdf.numPages; numero += 1) {
    const pagina = await pdf.getPage(numero);
    const contenidoPagina = await pagina.getTextContent();
    const items = contenidoPagina.items as ItemTexto[];
    paginas.push(agruparItemsPorRenglon(items));
  }

  return paginas.filter(Boolean).join('\n');
}

const TOLERANCIA_Y_PX = 2;

export function agruparItemsPorRenglon(items: ItemTexto[]): string {
  const partes: { x: number; y: number; texto: string }[] = [];
  for (const item of items) {
    const texto = item.str?.trim();
    const transform = item.transform;
    if (!texto || !transform || transform.length < 6) continue;
    partes.push({ x: transform[4], y: transform[5], texto });
  }

  partes.sort((a, b) => b.y - a.y || a.x - b.x);
  const filas: { ancla: number; partes: { x: number; y: number; texto: string }[] }[] = [];
  for (const parte of partes) {
    const ultima = filas[filas.length - 1];
    if (ultima && Math.abs(ultima.ancla - parte.y) <= TOLERANCIA_Y_PX) {
      ultima.partes.push(parte);
    } else {
      filas.push({ ancla: parte.y, partes: [parte] });
    }
  }

  return filas
    .map((fila) =>
      fila.partes
        .sort((a, b) => a.x - b.x)
        .map((parte) => parte.texto)
        .join(' ')
    )
    .join('\n');
}
