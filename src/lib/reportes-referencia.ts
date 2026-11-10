import {
  CAMPO_ESPACIOS_NOM033,
  EntradaEspacioNom033,
  evaluarEspacioNom033,
  LIMITES_NOM033,
  esClaveEspacio,
  normalizarClaveEspacio,
  numeroFlexible,
  parseTipoEspacio,
} from './nom033-limites';
import { compararEspaciosNom033, espaciosDesdeCaptura, ResultadoComparacion } from './nom033-comparacion';
import { getFileStorage } from './file-storage';
import { getCurrentUser } from './auth';
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
  tamanoBytes: number;
  hashSha256: string;
  texto: string;
  espacios?: EntradaEspacioNom033[];
  advertencias?: string[];
  usuarioId?: number;
}

/** El JSON debe caber holgado bajo el tope de ~4.5 MB por petición de las funciones. */
export const MAX_BYTES_TEXTO_REPORTE = 3 * 1024 * 1024;
export const MAX_BYTES_ORIGINAL = 50 * 1024 * 1024;

export function limiteBytesTextoReporte(): number {
  const configurado = Number(process.env.REPORTE_MAX_TEXTO_BYTES);
  if (Number.isFinite(configurado) && configurado > 0) return configurado;
  return MAX_BYTES_TEXTO_REPORTE;
}

export function resolverUsuarioId(request?: Request, usuarioIdBody?: unknown): number {
  if (request) {
    const sesion = getCurrentUser(request);
    if (sesion?.id) return sesion.id;
  }
  const numerico = Number(usuarioIdBody);
  return Number.isFinite(numerico) && numerico > 0 ? numerico : 2;
}

export async function subirReporteReferencia(input: AltaReporteReferencia): Promise<ReporteReferencia> {
  validarTextoAntesDeGuardar(input);
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
    nombre: `${input.nombreArchivo}.txt`,
    contenido: Buffer.from(input.texto, 'utf8'),
  });

  const esNom033 = tipo.claveNOM === 'NOM-033-STPS-2015';
  const entradas = Array.isArray(input.espacios) ? input.espacios : [];
  const espacios = esNom033
    ? entradas
        .map((entrada) =>
          evaluarEspacioNom033({
            clave: normalizarClaveEspacio(entrada.clave || ''),
            nombre: (entrada.nombre || '').trim(),
            area: (entrada.area || '').trim(),
            lel: numeroFlexible(entrada.lel),
            o2: numeroFlexible(entrada.o2),
            h2s: numeroFlexible(entrada.h2s),
            co: numeroFlexible(entrada.co),
            fecha: (entrada.fecha || '').trim(),
            tipoDeclarado: parseTipoEspacio(entrada.tipoDeclarado),
          })
        )
        .filter((espacio) => esClaveEspacio(espacio.clave))
    : [];
  const advertencias = [
    ...(input.advertencias || []),
    ...(esNom033 ? [] : ['Este flujo solo estructura el anexo de NOM-033-STPS-2015.']),
  ];

  return store.insertarReporteReferencia(
    {
      empresaId: input.empresaId,
      centroTrabajoId: input.centroTrabajoId,
      tipoEstudioId: input.tipoEstudioId,
      fecha: input.fecha,
      archivo: {
        nombre: pathBasename(input.nombreArchivo),
        hashSha256: input.hashSha256.toLowerCase(),
        tamanoBytes: input.tamanoBytes,
        storageKey: archivo.key,
      },
      estadoExtraccion: espacios.length ? 'EXTRAIDO' : 'PENDIENTE',
      espacios,
      advertencias,
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
  if (reporte.estadoExtraccion !== 'EXTRAIDO') {
    throw new ReferenciaError(
      'REF-ESTADO',
      `Solo se confirma un reporte en estado EXTRAIDO. Este está ${reporte.estadoExtraccion}.`
    );
  }
  if (!entradas.length) {
    throw new ReferenciaError('REF-VACIO', 'Hace falta al menos un espacio para confirmar.');
  }
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
    if (!esClaveEspacio(clave)) {
      throw new ReferenciaError('REF-CLAVE', 'Cada espacio necesita una clave EC-nn o EC-nnA.');
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

function validarTextoAntesDeGuardar(input: AltaReporteReferencia): void {
  if (!input.nombreArchivo || !input.nombreArchivo.trim()) {
    throw new ReferenciaError('REF-ARCHIVO', 'Falta el nombre del archivo.');
  }
  if (!Number.isInteger(input.tamanoBytes) || input.tamanoBytes < 1 || input.tamanoBytes > MAX_BYTES_ORIGINAL) {
    throw new ReferenciaError('REF-ARCHIVO', 'El tamaño del archivo original debe ser de 1 byte a 50 MB.');
  }
  if (!/^[a-f0-9]{64}$/i.test(input.hashSha256 || '')) {
    throw new ReferenciaError('REF-ARCHIVO', 'Falta el SHA-256 del archivo original.');
  }
  if (typeof input.texto !== 'string') {
    throw new ReferenciaError('REF-TEXTO', 'Falta el texto extraído del reporte.');
  }
  const bytes = Buffer.byteLength(input.texto, 'utf8');
  if (bytes > limiteBytesTextoReporte()) {
    throw new ReferenciaError(
      'REF-TEXTO',
      `El texto extraído supera ${limiteBytesTextoReporte()} bytes y no cabe holgado en una petición de 4 MB.`
    );
  }
}

function pathBasename(nombre: string): string {
  const partes = nombre.split(/[/\\]/);
  return partes[partes.length - 1] || 'reporte';
}
