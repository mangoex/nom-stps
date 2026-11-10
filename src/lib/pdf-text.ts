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
    paginas.push(agruparRenglones(items));
  }

  return paginas.filter(Boolean).join('\n');
}

function agruparRenglones(items: ItemTexto[]): string {
  const filas = new Map<number, { x: number; texto: string }[]>();

  for (const item of items) {
    const texto = item.str?.trim();
    const transform = item.transform;
    if (!texto || !transform || transform.length < 6) continue;
    const y = Math.round(transform[5]);
    const grupo = filas.get(y) ?? [];
    grupo.push({ x: transform[4], texto });
    filas.set(y, grupo);
  }

  const ys: number[] = [];
  filas.forEach((_grupo, y) => ys.push(y));
  ys.sort((a, b) => b - a);
  return ys
    .map((y) =>
      (filas.get(y) ?? [])
        .sort((a, b) => a.x - b.x)
        .map((parte) => parte.texto)
        .join(' ')
    )
    .join('\n');
}
