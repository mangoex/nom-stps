import {
  COLUMNAS_ESPACIOS_NOM033,
  evaluarEspacioNom033,
  LimitesNom033,
  LIMITES_NOM033,
  normalizarClaveEspacio,
  normalizarFechaMedicion,
  numeroFlexible,
  parseTipoEspacio,
} from './nom033-limites';
import { EspacioNom033 } from './types';

export type SituacionComparacion = 'SIN_CAMBIO' | 'MODIFICADO' | 'NUEVO' | 'ELIMINADO';
export type ParametroNom033 = 'lel' | 'o2' | 'h2s' | 'co';

export interface DeltaParametro {
  parametro: ParametroNom033;
  anterior: number | null;
  nuevo: number | null;
  delta: number | null;
}

export interface FilaComparacion {
  clave: string;
  situacion: SituacionComparacion;
  anterior: EspacioNom033 | null;
  nuevo: EspacioNom033 | null;
  deltas: DeltaParametro[];
  cambioTipoDeclarado: boolean;
  cambioTipoCalculado: boolean;
  cambioCumplimiento: boolean;
}

export interface ResultadoComparacion {
  filas: FilaComparacion[];
  resumen: {
    total: number;
    sinCambio: number;
    modificados: number;
    nuevos: number;
    eliminados: number;
    cambiosTipo: number;
    cambiosCumplimiento: number;
  };
  limites: LimitesNom033;
}

const PARAMETROS: ParametroNom033[] = ['lel', 'o2', 'h2s', 'co'];

export function espaciosDesdeCaptura(
  filas: unknown,
  limites: LimitesNom033 = LIMITES_NOM033
): EspacioNom033[] {
  if (!Array.isArray(filas)) return [];
  const [claveCol, nombreCol, areaCol, lelCol, o2Col, h2sCol, coCol, fechaCol, tipoCol] = COLUMNAS_ESPACIOS_NOM033;

  return filas.flatMap((fila) => {
    if (!fila || typeof fila !== 'object') return [];
    const registro = fila as Record<string, unknown>;
    const clave = normalizarClaveEspacio(String(registro[claveCol] ?? ''));
    if (!/^EC-\d+$/.test(clave)) return [];
    const fechaTexto = String(registro[fechaCol] ?? '');
    return [
      evaluarEspacioNom033(
        {
          clave,
          nombre: String(registro[nombreCol] ?? '').trim(),
          area: String(registro[areaCol] ?? '').trim(),
          lel: numeroFlexible(registro[lelCol]),
          o2: numeroFlexible(registro[o2Col]),
          h2s: numeroFlexible(registro[h2sCol]),
          co: numeroFlexible(registro[coCol]),
          fecha: normalizarFechaMedicion(fechaTexto) || fechaTexto.trim(),
          tipoDeclarado: parseTipoEspacio(String(registro[tipoCol] ?? '')),
        },
        limites
      ),
    ];
  });
}

export function compararEspaciosNom033(
  anteriores: EspacioNom033[],
  nuevos: EspacioNom033[],
  limites: LimitesNom033 = LIMITES_NOM033
): ResultadoComparacion {
  const mapaAnterior = indexar(anteriores);
  const mapaNuevo = indexar(nuevos);
  const clavesSet = new Set<string>();
  mapaAnterior.forEach((_espacio, clave) => clavesSet.add(clave));
  mapaNuevo.forEach((_espacio, clave) => clavesSet.add(clave));
  const claves: string[] = [];
  clavesSet.forEach((clave) => claves.push(clave));
  claves.sort(compararClaves);
  const filas = claves.map((clave) => armarFila(mapaAnterior.get(clave) ?? null, mapaNuevo.get(clave) ?? null));

  return {
    filas,
    resumen: {
      total: filas.length,
      sinCambio: filas.filter((fila) => fila.situacion === 'SIN_CAMBIO').length,
      modificados: filas.filter((fila) => fila.situacion === 'MODIFICADO').length,
      nuevos: filas.filter((fila) => fila.situacion === 'NUEVO').length,
      eliminados: filas.filter((fila) => fila.situacion === 'ELIMINADO').length,
      cambiosTipo: filas.filter((fila) => fila.cambioTipoDeclarado || fila.cambioTipoCalculado).length,
      cambiosCumplimiento: filas.filter((fila) => fila.cambioCumplimiento).length,
    },
    limites,
  };
}

function indexar(espacios: EspacioNom033[]): Map<string, EspacioNom033> {
  const mapa = new Map<string, EspacioNom033>();
  for (const espacio of espacios) {
    mapa.set(normalizarClaveEspacio(espacio.clave), espacio);
  }
  return mapa;
}

function armarFila(anterior: EspacioNom033 | null, nuevo: EspacioNom033 | null): FilaComparacion {
  const clave = anterior?.clave || nuevo?.clave || '';
  const deltas = PARAMETROS.map((parametro) => {
    const valorAnterior = anterior ? anterior[parametro] : null;
    const valorNuevo = nuevo ? nuevo[parametro] : null;
    const delta =
      valorAnterior == null || valorNuevo == null ? null : redondear(valorNuevo - valorAnterior);
    return { parametro, anterior: valorAnterior, nuevo: valorNuevo, delta };
  });

  if (!anterior || !nuevo) {
    return {
      clave,
      situacion: anterior ? 'ELIMINADO' : 'NUEVO',
      anterior,
      nuevo,
      deltas,
      cambioTipoDeclarado: false,
      cambioTipoCalculado: false,
      cambioCumplimiento: false,
    };
  }

  const cambioTipoDeclarado = anterior.tipoDeclarado !== nuevo.tipoDeclarado;
  const cambioTipoCalculado = anterior.tipoCalculado !== nuevo.tipoCalculado;
  const cambioCumplimiento = anterior.cumple !== nuevo.cumple;
  const cambioNumeros = deltas.some((item) => item.delta !== 0);
  const cambioTexto = anterior.nombre !== nuevo.nombre || anterior.area !== nuevo.area;
  const huboCambio = cambioNumeros || cambioTexto || cambioTipoDeclarado || cambioTipoCalculado || cambioCumplimiento;

  return {
    clave,
    situacion: huboCambio ? 'MODIFICADO' : 'SIN_CAMBIO',
    anterior,
    nuevo,
    deltas,
    cambioTipoDeclarado,
    cambioTipoCalculado,
    cambioCumplimiento,
  };
}

function compararClaves(a: string, b: string): number {
  const numeroA = Number(a.replace(/\D/g, '')) || 0;
  const numeroB = Number(b.replace(/\D/g, '')) || 0;
  return numeroA - numeroB || a.localeCompare(b);
}

function redondear(valor: number): number {
  return Math.round(valor * 10000) / 10000;
}
