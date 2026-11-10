export interface ItemTexto {
  str?: string;
  transform?: number[];
}

export interface FragmentoPdf {
  x: number;
  y: number;
  texto: string;
}

export interface RenglonPdf {
  y: number;
  partes: FragmentoPdf[];
}

const TOLERANCIA_Y_PX = 2;

export function fragmentosDesdeItems(items: ItemTexto[]): FragmentoPdf[] {
  const fragmentos: FragmentoPdf[] = [];
  for (const item of items) {
    const texto = item.str?.trim();
    const transform = item.transform;
    if (!texto || !transform || transform.length < 6) continue;
    fragmentos.push({ x: transform[4], y: transform[5], texto });
  }
  return fragmentos;
}

/**
 * Junta los fragmentos de una página en renglones.
 * Dos piezas con distinta X y una Y a ±2 px pertenecen al mismo renglón.
 */
export function agruparEnRenglones(fragmentos: FragmentoPdf[]): RenglonPdf[] {
  const ordenados = fragmentos
    .filter((fragmento) => fragmento.texto.trim())
    .map((fragmento) => ({ ...fragmento, texto: fragmento.texto.trim() }))
    .sort((a, b) => b.y - a.y || a.x - b.x);
  const filas: RenglonPdf[] = [];
  for (const fragmento of ordenados) {
    const ultima = filas[filas.length - 1];
    if (ultima && Math.abs(ultima.y - fragmento.y) <= TOLERANCIA_Y_PX) {
      ultima.partes.push(fragmento);
    } else {
      filas.push({ y: fragmento.y, partes: [fragmento] });
    }
  }
  for (const fila of filas) {
    fila.partes.sort((a, b) => a.x - b.x);
  }
  return filas;
}

export function agruparItemsPorRenglon(items: ItemTexto[]): string {
  return agruparEnRenglones(fragmentosDesdeItems(items))
    .map((fila) => fila.partes.map((parte) => parte.texto).join(' '))
    .join('\n');
}
