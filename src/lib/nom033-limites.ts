import { EspacioNom033, TipoEspacioConfinado } from './types';

/**
 * Criterios de esta fase para NOM-033-STPS-2015.
 *
 * No hay columna de cumple en el anexo: se calcula aquí.
 * - Oxígeno aceptable: 19.5 % a 23.5 %, inclusive.
 * - Medición Tipo I solo si, además, LEL es menor al 10 % del LIE
 *   y H2S y CO quedan debajo de la fracción configurada del VLE.
 * - La clasificación escrita en la ficha (tipo declarado) no se pisa
 *   con la que sale de los números (tipo calculado).
 *
 * VLE de referencia, configurables:
 * - Sulfuro de hidrógeno, CAS 7783-06-4: VLE-PPT 1 ppm y VLE-CT 5 ppm
 *   en el Apéndice I de la NOM-010-STPS-2014. El default usa el PPT.
 * - Monóxido de carbono, CAS 630-08-0: la cifra publicada en ese apéndice
 *   es 25 ppm (notación IBE). En el compendio tabular de la STPS la celda
 *   puede verse en la columna de corto tiempo; por eso el valor es configurable.
 */
export interface LimitesNom033 {
  o2Min: number;
  o2Max: number;
  lelMaxPorcentajeLie: number;
  fraccionVleToxicos: number;
  vleH2sPpm: number;
  vleCoPpm: number;
}

export const LIMITES_NOM033: LimitesNom033 = {
  o2Min: 19.5,
  o2Max: 23.5,
  lelMaxPorcentajeLie: 10,
  fraccionVleToxicos: 0.5,
  vleH2sPpm: 1,
  vleCoPpm: 25,
};

export const COLUMNAS_ESPACIOS_NOM033 = [
  'Clave',
  'Nombre',
  'Área',
  'LEL (%)',
  'O2 (%)',
  'H2S (ppm)',
  'CO (ppm)',
  'Fecha',
  'Tipo I/II',
] as const;

export const CAMPO_ESPACIOS_NOM033 = 'espacios_confinados';

export function textoCriterioCumplimiento(limites: LimitesNom033 = LIMITES_NOM033): string {
  const topeH2s = limites.fraccionVleToxicos * limites.vleH2sPpm;
  const topeCo = limites.fraccionVleToxicos * limites.vleCoPpm;
  return `El cumplimiento no viene en el archivo. Se calcula con O2 de ${limites.o2Min} a ${limites.o2Max} %. La medición se clasifica como Tipo I solo si, además, LEL < ${limites.lelMaxPorcentajeLie} % del LIE, H2S < ${topeH2s} ppm y CO < ${topeCo} ppm (${limites.fraccionVleToxicos} del VLE configurado: H2S ${limites.vleH2sPpm} ppm, CO ${limites.vleCoPpm} ppm). La clasificación escrita en el reporte se guarda aparte de la calculada.`;
}

export function normalizarClaveEspacio(raw: string): string {
  const match = raw.toUpperCase().match(/EC\s*-\s*(\d+)/);
  if (!match) return raw.trim().toUpperCase();
  return `EC-${String(parseInt(match[1], 10)).padStart(2, '0')}`;
}

export function normalizarFechaMedicion(raw: string): string {
  const texto = raw.trim();
  const iso = texto.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) {
    return fechaValida(iso[1], iso[2], iso[3]) ? `${iso[1]}-${iso[2]}-${iso[3]}` : '';
  }
  const latam = texto.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
  if (!latam) return '';
  const dia = latam[1].padStart(2, '0');
  const mes = latam[2].padStart(2, '0');
  const anio = latam[3].length === 2 ? `20${latam[3]}` : latam[3];
  return fechaValida(anio, mes, dia) ? `${anio}-${mes}-${dia}` : '';
}

function fechaValida(anio: string, mes: string, dia: string): boolean {
  const fecha = new Date(`${anio}-${mes}-${dia}T00:00:00Z`);
  return (
    fecha.getUTCFullYear() === Number(anio) &&
    fecha.getUTCMonth() + 1 === Number(mes) &&
    fecha.getUTCDate() === Number(dia)
  );
}

export function parseTipoEspacio(raw: string | null | undefined): TipoEspacioConfinado | null {
  if (!raw) return null;
  const match = raw.toUpperCase().match(/TIPO\s*(II|I)\b|^(II|I)$/);
  if (!match) return null;
  const valor = match[1] || match[2];
  return valor === 'II' ? 'II' : 'I';
}

export function numeroFlexible(raw: unknown): number | null {
  if (typeof raw === 'number') return Number.isFinite(raw) ? raw : null;
  if (typeof raw !== 'string') return null;
  const limpio = raw.trim().replace(',', '.');
  if (!limpio) return null;
  const valor = Number(limpio);
  return Number.isFinite(valor) ? valor : null;
}

export function etiquetaCumple(cumple: boolean | null): string {
  if (cumple === true) return 'Cumple';
  if (cumple === false) return 'No cumple';
  return 'Sin dato';
}

export function etiquetaTipo(tipo: 'I' | 'II' | null): string {
  if (tipo === 'I' || tipo === 'II') return `Tipo ${tipo}`;
  return 'Sin dato';
}

export interface EntradaEspacioNom033 {
  clave: string;
  nombre: string;
  area: string;
  lel: number | null;
  o2: number | null;
  h2s: number | null;
  co: number | null;
  fecha: string;
  tipoDeclarado: TipoEspacioConfinado | null;
}

export function evaluarEspacioNom033(
  entrada: EntradaEspacioNom033,
  limites: LimitesNom033 = LIMITES_NOM033
): EspacioNom033 {
  const lel = entrada.lel;
  const o2 = entrada.o2;
  const h2s = entrada.h2s;
  const co = entrada.co;
  const completo = lel != null && o2 != null && h2s != null && co != null;

  if (!completo) {
    return { ...entrada, tipoCalculado: null, cumple: null };
  }

  const o2Ok = o2 >= limites.o2Min && o2 <= limites.o2Max;
  const lelOk = lel < limites.lelMaxPorcentajeLie;
  const h2sOk = h2s < limites.fraccionVleToxicos * limites.vleH2sPpm;
  const coOk = co < limites.fraccionVleToxicos * limites.vleCoPpm;
  const tipoI = o2Ok && lelOk && h2sOk && coOk;

  return {
    ...entrada,
    tipoCalculado: tipoI ? 'I' : 'II',
    cumple: tipoI,
  };
}
