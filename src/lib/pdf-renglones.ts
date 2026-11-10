export interface ItemTexto {
  str?: string;
  transform?: number[];
}

const TOLERANCIA_Y_PX = 2;

/**
 * Junta los fragmentos de una página en renglones.
 * Dos piezas con la misma X distinta y una Y a ±2 px pertenecen al mismo renglón.
 */
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
