import {
  CAMPO_ESPACIOS_NOM033,
  EntradaEspacioNom033,
  evaluarEspacioNom033,
  LIMITES_NOM033,
  normalizarClaveEspacio,
  numeroFlexible,
  parseTipoEspacio,
} from './nom033-limites';
import { compararEspaciosNom033, espaciosDesdeCaptura, ResultadoComparacion } from './nom033-comparacion';
import { parsearNom033 } from './nom033-parser';
import { extraerTextoPdf } from './pdf-text';
import { getFileStorage } from './file-storage';
import { store } from './store';
import { EspacioNom033, Estudio, ReporteReferencia } from './types';

export class ReferenciaError extends Error {
  codigo: string;

  constructor(codigo: string, mensaje: string) {
    super(mensaje);
    this.name = 'ReferenciaError';
    this.codigo = codigo;
  }
}

export interface AltaReporteReferencia {
  empresaId: number;
  centroTrabajoId: number;
  tipoEstudioId: number;
  fecha: string;
  nombreArchivo: string;
  contenido: Buffer;
  usuarioId?: number;
}

const MAX_BYTES = 20 * 1024 * 1024;

export async function subirReporteReferencia(input: AltaReporteReferencia): Promise<ReporteReferencia> {
  if (!input.contenido.length) {
    throw new ReferenciaError('REF-ARCHIVO', 'El archivo está vacío.');
  }
  if (input.contenido.length > MAX_BYTES) {
    throw new ReferenciaError('REF-ARCHIVO', 'El archivo supera 20 MB.');
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.fecha)) {
    throw new ReferenciaError('REF-FECHA', 'La fecha del reporte debe ir en formato AAAA-MM-DD.');
  }

  const centro = store.getCentroById(input.centroTrabajoId);
  if (!centro || centro.empresaId !== input.empresaId) {
    throw new ReferenciaError('REF-CENTRO', 'El centro de trabajo no pertenece a la empresa indicada.');
  }
  const tipo = store.getTipoEstudioById(input.tipoEstudioId);
  if (!tipo) {
    throw new ReferenciaError('REF-NORMA', 'El tipo de estudio no está en el catálogo.');
  }

  const archivo = await getFileStorage().guardar({
    nombre: input.nombreArchivo,
    contenido: input.contenido,
  });

  const esNom033 = tipo.claveNOM === 'NOM-033-STPS-2015';
  const texto = await textoDelArchivo(input.nombreArchivo, input.contenido);
  const parseo = esNom033
    ? parsearNom033(texto)
    : {
        espacios: [] as EspacioNom033[],
        advertencias: ['Este extractor solo reconoce el anexo y las fichas de NOM-033-STPS-2015.'],
      };

  return store.insertarReporteReferencia(
    {
      empresaId: input.empresaId,
      centroTrabajoId: input.centroTrabajoId,
      tipoEstudioId: input.tipoEstudioId,
      fecha: input.fecha,
      archivo: {
        nombre: archivo.nombre,
        hashSha256: archivo.hashSha256,
        tamanoBytes: archivo.tamanoBytes,
        storageKey: archivo.key,
      },
      estadoExtraccion: parseo.espacios.length ? 'EXTRAIDO' : 'PENDIENTE',
      espacios: parseo.espacios,
      advertencias: parseo.advertencias,
    },
    input.usuarioId ?? 2
  );
}

export function confirmarReporteReferencia(
  id: number,
  entradas: EntradaEspacioNom033[],
  usuarioId = 2
): ReporteReferencia {
  const reporte = exigirReporte(id);
  const espacios = normalizarEntradas(entradas);
  return store.actualizarReporteReferencia(
    reporte.id,
    {
      estadoExtraccion: 'CONFIRMADO',
      espacios,
      motivoRechazo: undefined,
    },
    usuarioId,
    'CONFIRMAR_REPORTE_REFERENCIA'
  );
}

export function rechazarReporteReferencia(id: number, motivo: string, usuarioId = 2): ReporteReferencia {
  const reporte = exigirReporte(id);
  const limpio = motivo.trim();
  if (!limpio) {
    throw new ReferenciaError('REF-RECHAZO', 'El rechazo necesita un motivo.');
  }
  return store.actualizarReporteReferencia(
    reporte.id,
    { estadoExtraccion: 'RECHAZADO', motivoRechazo: limpio },
    usuarioId,
    'RECHAZAR_REPORTE_REFERENCIA'
  );
}

export interface ComparacionEstudio {
  estudio: Pick<Estudio, 'id' | 'folio' | 'fechaRealizacion' | 'empresaId' | 'centroTrabajoId' | 'tipoEstudioId'>;
  reporte: ReporteReferencia;
  comparacion: ResultadoComparacion;
}

export function compararEstudioConReferencia(
  estudioId: number,
  reporteId?: number,
  empresaId?: number | null
): ComparacionEstudio {
  const estudio = store.getEstudioById(estudioId, empresaId);
  if (!estudio) {
    throw new ReferenciaError('REF-ESTUDIO', 'Estudio no encontrado para la empresa indicada.');
  }
  const tipo = store.getTipoEstudioById(estudio.tipoEstudioId);
  if (!tipo || tipo.claveNOM !== 'NOM-033-STPS-2015') {
    throw new ReferenciaError('REF-NORMA', 'La comparación de esta fase solo aplica a estudios NOM-033-STPS-2015.');
  }

  const reporte = elegirReporteConfirmado(estudio, reporteId);
  const nuevos = espaciosDesdeCaptura(estudio.datos?.[CAMPO_ESPACIOS_NOM033], LIMITES_NOM033);
  return {
    estudio: {
      id: estudio.id,
      folio: estudio.folio,
      fechaRealizacion: estudio.fechaRealizacion,
      empresaId: estudio.empresaId,
      centroTrabajoId: estudio.centroTrabajoId,
      tipoEstudioId: estudio.tipoEstudioId,
    },
    reporte,
    comparacion: compararEspaciosNom033(reporte.espacios, nuevos, LIMITES_NOM033),
  };
}

function elegirReporteConfirmado(estudio: Estudio, reporteId?: number): ReporteReferencia {
  const confirmados = store
    .listarReportesReferencia({
      empresaId: estudio.empresaId,
      centroTrabajoId: estudio.centroTrabajoId,
      tipoEstudioId: estudio.tipoEstudioId,
      estadoExtraccion: 'CONFIRMADO',
    })
    .sort((a, b) => b.fecha.localeCompare(a.fecha) || b.id - a.id);

  if (reporteId) {
    const elegido = confirmados.find((reporte) => reporte.id === reporteId);
    if (!elegido) {
      throw new ReferenciaError(
        'REF-CONFIRMACION',
        'Solo se compara contra un reporte confirmado del mismo centro, la misma empresa y la misma NOM.'
      );
    }
    return elegido;
  }

  const previos = confirmados.filter((reporte) => reporte.fecha <= estudio.fechaRealizacion);
  const pool = previos.length ? previos : confirmados;
  if (!pool.length) {
    throw new ReferenciaError(
      'REF-CONFIRMACION',
      'No hay un reporte de referencia confirmado para este centro y esta NOM. Los extraídos o rechazados no se comparan.'
    );
  }
  return pool[0];
}

function exigirReporte(id: number): ReporteReferencia {
  const reporte = store.obtenerReporteReferencia(id);
  if (!reporte) throw new ReferenciaError('REF-NO-ENCONTRADO', 'Reporte de referencia no encontrado.');
  return reporte;
}

function normalizarEntradas(entradas: EntradaEspacioNom033[]): EspacioNom033[] {
  const vistos = new Set<string>();
  return entradas.map((entrada) => {
    const clave = normalizarClaveEspacio(entrada.clave || '');
    if (!/^EC-\d+$/.test(clave)) {
      throw new ReferenciaError('REF-CLAVE', 'Cada espacio necesita una clave EC-nn.');
    }
    if (vistos.has(clave)) {
      throw new ReferenciaError('REF-CLAVE', `La clave ${clave} está repetida.`);
    }
    vistos.add(clave);
    return evaluarEspacioNom033({
      clave,
      nombre: (entrada.nombre || '').trim(),
      area: (entrada.area || '').trim(),
      lel: numeroFlexible(entrada.lel),
      o2: numeroFlexible(entrada.o2),
      h2s: numeroFlexible(entrada.h2s),
      co: numeroFlexible(entrada.co),
      fecha: (entrada.fecha || '').trim(),
      tipoDeclarado: parseTipoEspacio(entrada.tipoDeclarado),
    });
  });
}

async function textoDelArchivo(nombre: string, contenido: Buffer): Promise<string> {
  const lower = nombre.toLowerCase();
  if (lower.endsWith('.pdf')) return extraerTextoPdf(contenido);
  if (lower.endsWith('.txt')) return contenido.toString('utf8').replace(/^\uFEFF/, '');
  throw new ReferenciaError('REF-ARCHIVO', 'Solo se aceptan archivos PDF o TXT.');
}
