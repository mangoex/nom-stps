export interface RespuestaInterpretada {
  ok: boolean;
  datos: unknown;
  mensaje: string;
}

const MENSAJE_DEMASIADO_GRANDE =
  'La petición es demasiado grande para el servidor. El PDF se lee en este navegador y solo se envía el texto; si el texto extraído sigue siendo enorme, divide el reporte.';

/**
 * La UI no debe hacer JSON.parse a ciegas: un 413 de Vercel llega como texto plano
 * ("Request Entity Too Large") y rompe con "Unexpected token".
 */
export function interpretarRespuesta(status: number, texto: string): RespuestaInterpretada {
  let datos: unknown = null;
  if (texto) {
    try {
      datos = JSON.parse(texto);
    } catch {
      datos = null;
    }
  }

  const errorJson = leerError(datos);
  const esGrande = status === 413 || /request entity too large/i.test(texto);
  if (esGrande) {
    return { ok: false, datos, mensaje: MENSAJE_DEMASIADO_GRANDE };
  }
  if (status < 200 || status >= 300) {
    return {
      ok: false,
      datos,
      mensaje: errorJson || `No se pudo completar la carga (código ${status}).`,
    };
  }
  if (datos === null) {
    return { ok: false, datos: null, mensaje: 'La respuesta del servidor no trae JSON válido.' };
  }
  return { ok: true, datos, mensaje: '' };
}

function leerError(datos: unknown): string {
  if (!datos || typeof datos !== 'object' || !('error' in datos)) return '';
  const error = (datos as { error?: unknown }).error;
  return typeof error === 'string' ? error : '';
}
