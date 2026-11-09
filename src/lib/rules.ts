import { Elaborador, EstadoEstudio, Estudio, TipoEstudio } from './types';

export class BusinessRuleError extends Error {
  codigo: string;
  constructor(codigo: string, mensaje: string) {
    super(mensaje);
    this.name = 'BusinessRuleError';
    this.codigo = codigo;
  }
}

/**
 * RN-01: Integridad Referencial de Estudio
 * Todo estudio debe pertenecer a un centro de trabajo, tipo de estudio y elaborador.
 */
export function validarRN01IntegridadReferencial(
  centroTrabajoId?: number | null,
  tipoEstudioId?: number | null,
  elaboradorId?: number | null
): void {
  if (!centroTrabajoId || !tipoEstudioId || !elaboradorId) {
    throw new BusinessRuleError(
      'RN-01',
      'El centro de trabajo, el tipo de estudio normativo y el elaborador técnico son campos estrictamente obligatorios.'
    );
  }
}

/**
 * RN-03: Validación de Logotipos de Empresa
 * PNG, JPG, WebP o SVG sanitizado, tamaño máximo 2MB.
 */
export function validarRN03Logotipo(archivo: { tamanoBytes: number; tipoMime: string }): void {
  const tiposPermitidos = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/svg+xml'];
  if (!tiposPermitidos.includes(archivo.tipoMime.toLowerCase())) {
    throw new BusinessRuleError('RN-03', 'El formato del logotipo debe ser PNG, JPG, WebP o SVG.');
  }
  const MAX_BYTES = 2 * 1024 * 1024; // 2MB
  if (archivo.tamanoBytes > MAX_BYTES) {
    throw new BusinessRuleError('RN-03', 'El tamaño del logotipo no puede exceder 2 MB.');
  }
}

/**
 * RN-04: Cálculo Automático de Vigencia de Estudio
 * Suma los meses de periodicidad según la NOM o analiza la relación de riesgo (NOM-010 VLE).
 */
export function calcularRN04Vigencia(
  tipoEstudio: TipoEstudio,
  fechaRealizacionStr: string,
  datos: Record<string, any>
): string {
  const fechaRealizacion = new Date(fechaRealizacionStr);
  if (isNaN(fechaRealizacion.getTime())) {
    throw new BusinessRuleError('RN-04', 'Fecha de realización no es válida.');
  }

  let meses = tipoEstudio.periodicidadMeses ?? 24;

  // Caso especial NOM-010-STPS-2014 según relación de concentración frente al VLE
  if (tipoEstudio.claveNOM.startsWith('NOM-010')) {
    const relacionVle = datos['relacion_vle'] || '';
    if (relacionVle.includes('> 1.0') || relacionVle.includes('3 meses')) {
      meses = 3;
    } else if (relacionVle.includes('0.75 y 1.0') || relacionVle.includes('6 meses')) {
      meses = 6;
    } else if (relacionVle.includes('0.50 y 0.75') || relacionVle.includes('12 meses')) {
      meses = 12;
    } else if (relacionVle.includes('0.25 y 0.50') || relacionVle.includes('18 meses')) {
      meses = 18;
    } else {
      meses = 24;
    }
  }

  const fechaVigencia = new Date(fechaRealizacion);
  fechaVigencia.setMonth(fechaVigencia.getMonth() + meses);

  return fechaVigencia.toISOString().split('T')[0];
}

/**
 * RN-06: Validación de Acreditación de Elaborador
 * Si la acreditación del elaborador está vencida a la fecha del estudio, impedir la aprobación.
 */
export function validarRN06AcreditacionElaborador(
  elaborador: Elaborador,
  fechaRealizacionStr: string
): void {
  const fechaEstudio = new Date(fechaRealizacionStr);
  const fechaAcreditacion = new Date(elaborador.vigenciaAcreditacion);

  if (fechaAcreditacion < fechaEstudio) {
    throw new BusinessRuleError(
      'RN-06',
      `La acreditación del elaborador (${elaborador.nombre}, Acreditación: ${elaborador.numAcreditacion}) estaba vencida (${elaborador.vigenciaAcreditacion}) al momento de ejecutar el estudio (${fechaRealizacionStr}). El estudio no puede ser aprobado sin aval vigente.`
    );
  }
}

/**
 * RN-05: Marca de Agua en Salidas PDF
 * Solo estudios aprobados emiten versión oficial limpia; borradores llevan marca de agua.
 */
export function debeIncluirMarcaDeAgua(estado: EstadoEstudio): boolean {
  return estado !== 'APROBADO';
}

/**
 * RN-09: Bloqueo de Retención Legal Obligatoria de 5 Años
 * Se impide borrar estudios de salud y seguridad antes de 5 años.
 */
export function validarRN09RetencionLegal(estudio: Estudio): void {
  if (estudio.estado === 'APROBADO') {
    const fechaEstudio = new Date(estudio.fechaRealizacion);
    const ahora = new Date();
    const diffAnos = (ahora.getTime() - fechaEstudio.getTime()) / (1000 * 60 * 60 * 24 * 365.25);

    if (diffAnos < 5) {
      throw new BusinessRuleError(
        'RN-09',
        `Retención Legal Activa: La legislación de la STPS exige conservar los expedientes y dictámenes aprobados durante al menos 5 años. Este estudio tiene ${diffAnos.toFixed(1)} años y no puede eliminarse físicamente.`
      );
    }
  }
}
