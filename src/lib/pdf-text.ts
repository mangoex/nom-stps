import { getDocumentProxy } from 'unpdf';
import { agruparItemsPorRenglon, ItemTexto } from './pdf-renglones';

export { agruparItemsPorRenglon };
export type { ItemTexto };

/**
 * Extracción en el servidor. La carga del reporte ya no la usa:
 * el navegador manda el texto para no rebasar el tope de la petición.
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
