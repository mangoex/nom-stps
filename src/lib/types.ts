export type UserRole = 'ADMIN' | 'ELABORADOR' | 'REVISOR' | 'CONSULTA';

export interface User {
  id: number;
  empresaId: number | null; // null for Super Admin
  nombre: string;
  correo: string;
  rol: UserRole;
  activo: boolean;
  ultimoAcceso?: string;
}

export interface Empresa {
  id: number;
  razonSocial: string;
  rfc: string;
  domicilio: string;
  representanteLegal: string;
  telefono: string;
  correo: string;
  logotipoUrl: string; // Base64 data URL or external URL
  tipoLogotipo: string;
  activa: boolean;
  createdAt: string;
}

export interface CentroTrabajo {
  id: number;
  empresaId: number;
  nombre: string;
  domicilio: string;
  giro: string;
  numTrabajadores: number;
  responsable: string;
  areas: string[];
  activo: boolean;
}

export type DynamicFieldType = 'text' | 'number' | 'date' | 'select' | 'table' | 'textarea' | 'boolean';

export interface CampoEstudio {
  id: number;
  tipoEstudioId: number;
  nombreCampo: string;
  etiqueta: string;
  tipoDato: DynamicFieldType;
  opciones?: string[];
  obligatorio: boolean;
  orden: number;
  unidadMedida?: string;
  ayudaNormativa?: string;
  columnasTabla?: string[]; // Para tipo table
}

export interface TipoEstudio {
  id: number;
  claveNOM: string; // ej. NOM-011-STPS-2001
  nombre: string;
  descripcion: string;
  periodicidadMeses: number | null; // null si es variable según resultados (ej. NOM-010)
  categoria: 'Salud' | 'Seguridad' | 'Organización' | 'Específicas';
  activo: boolean;
  campos: CampoEstudio[];
}

export interface Elaborador {
  id: number;
  empresaId?: number | null;
  nombre: string;
  tipo: 'Persona Física' | 'Laboratorio de Pruebas' | 'Unidad de Inspección / Verificación';
  cedulaProfesional?: string;
  numAcreditacion: string; // Acreditación EMA o Aprobación STPS
  vigenciaAcreditacion: string; // YYYY-MM-DD
  correo: string;
  telefono: string;
  firmaUrl?: string; // Base64 or image URL
  activo: boolean;
}

export type EstadoEstudio = 'BORRADOR' | 'EN_REVISION' | 'APROBADO' | 'POR_VENCER' | 'VENCIDO' | 'CANCELADO';

export interface AdjuntoEstudio {
  id: string;
  nombreArchivo: string;
  tipoMime: string;
  tamanoBytes: number;
  url: string;
  descripcion?: string;
}

export interface Estudio {
  id: number;
  folio: string; // EST-2026-0001
  empresaId: number;
  centroTrabajoId: number;
  tipoEstudioId: number;
  elaboradorId: number;
  usuarioRegistroId: number;
  usuarioRevisorId?: number;
  fechaRealizacion: string; // YYYY-MM-DD
  fechaVigencia: string; // YYYY-MM-DD
  estado: EstadoEstudio;
  datos: Record<string, any>; // Campos dinámicos capturados según la NOM
  observaciones?: string;
  adjuntos: AdjuntoEstudio[];
  fechaAprobacion?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Impresion {
  id: number;
  estudioId: number;
  usuarioId: number;
  fecha: string;
  rutaPdf: string;
  hashSha256: string;
  esOficial: boolean;
}

export type EstadoEnvio = 'PENDIENTE' | 'ENVIADO' | 'ERROR';

export interface Destinatario {
  correo: string;
  nombre: string;
}

export interface EnvioCorreo {
  id: number;
  estudioId: number;
  impresionId?: number;
  usuarioId: number;
  asunto: string;
  mensaje: string;
  destinatarios: Destinatario[];
  estado: EstadoEnvio;
  reintentos: number;
  ultimoError?: string;
  fechaSolicitud: string;
  fechaEnvio?: string;
}

export interface BitacoraEvento {
  id: number;
  empresaId?: number | null;
  usuarioId?: number | null;
  usuarioNombre?: string;
  fecha: string;
  ip: string;
  accion: string;
  entidad: string;
  entidadId?: number;
  detalles?: Record<string, any>;
}
