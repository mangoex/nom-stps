import {
  BitacoraEvento,
  CentroTrabajo,
  Elaborador,
  Empresa,
  EnvioCorreo,
  EstadoEstudio,
  EstadoExtraccion,
  Estudio,
  Impresion,
  ReporteReferencia,
  TipoEstudio,
  User,
  UserRole,
} from './types';
import { CATALOGO_NOM_INICIAL } from './nom-catalog-data';
import {
  validarRN01IntegridadReferencial,
  validarRN06AcreditacionElaborador,
  calcularRN04Vigencia,
  validarRN09RetencionLegal,
} from './rules';
import { calcularHashSha256 } from './hash';

// Estado global persistente en memoria para demostración instantánea o desarrollo
class MemoryStore {
  empresas: Empresa[] = [
    {
      id: 1,
      razonSocial: 'Manufacturas del Norte S.A. de C.V.',
      rfc: 'MNO010101AAA',
      domicilio: 'Av. Industrial No. 4500, Parque Industrial El Florido, Tijuana, B.C.',
      representanteLegal: 'Ing. Roberto Garza Sada',
      telefono: '+52 664 555 0192',
      correo: 'contacto@manufacturasnorte.mx',
      logotipoUrl: 'https://images.unsplash.com/photo-1560179707-f14e90ef3623?w=120&auto=format&fit=crop&q=60',
      tipoLogotipo: 'image/jpeg',
      activa: true,
      createdAt: '2026-01-15T08:00:00Z',
    },
    {
      id: 2,
      razonSocial: 'Logística y Almacenaje del Bajío S.A.P.I.',
      rfc: 'LAB180512XYZ',
      domicilio: 'Carretera Silao-León Km 8.5, Silao, Guanajuato.',
      representanteLegal: 'Lic. Martha Elena Delgado',
      telefono: '+52 472 722 9011',
      correo: 'seguridad@logbajio.mx',
      logotipoUrl: 'https://images.unsplash.com/photo-1542744094-3a31f272c490?w=120&auto=format&fit=crop&q=60',
      tipoLogotipo: 'image/jpeg',
      activa: true,
      createdAt: '2026-02-10T10:00:00Z',
    },
  ];

  usuarios: (User & { hashContrasena: string })[] = [
    {
      id: 1,
      empresaId: null, // Super Admin
      nombre: 'Administrador Maestro',
      correo: 'admin@nomstps.gob.mx',
      rol: 'ADMIN',
      activo: true,
      hashContrasena: 'admin123',
    },
    {
      id: 2,
      empresaId: 1,
      nombre: 'Ing. Carlos Mendoza (Revisor)',
      correo: 'revisor@manufacturasnorte.mx',
      rol: 'REVISOR',
      activo: true,
      hashContrasena: 'revisor123',
    },
    {
      id: 3,
      empresaId: 1,
      nombre: 'Lic. Ana Sofía Pérez (Elaboradora)',
      correo: 'elaborador@manufacturasnorte.mx',
      rol: 'ELABORADOR',
      activo: true,
      hashContrasena: 'elaborador123',
    },
    {
      id: 4,
      empresaId: 1,
      nombre: 'Consultor Auditor',
      correo: 'consulta@manufacturasnorte.mx',
      rol: 'CONSULTA',
      activo: true,
      hashContrasena: 'consulta123',
    },
  ];

  centros: CentroTrabajo[] = [
    {
      id: 1,
      empresaId: 1,
      nombre: 'Planta Tijuana - Nave 1 (Estampado y Ensamble)',
      domicilio: 'Av. Industrial No. 4500 Int. Nave 1, Tijuana, B.C.',
      giro: 'Fabricación de Autopartes y Maquinaria Ligera',
      numTrabajadores: 350,
      responsable: 'Ing. Jorge Alberto Ramos',
      areas: ['Prensas y Troqueles', 'Línea de Ensamble A', 'Almacén de Químicos', 'Mantenimiento'],
      activo: true,
    },
    {
      id: 2,
      empresaId: 1,
      nombre: 'Centro Logístico y Distribución Mexicali',
      domicilio: 'Blvd. Lázaro Cárdenas 1890, Mexicali, B.C.',
      giro: 'Almacenamiento y Logística de Materiales',
      numTrabajadores: 85,
      responsable: 'Lic. Mariana Valdez',
      areas: ['Andenes de Carga', 'Patio de Maniobras', 'Oficinas Administrativas'],
      activo: true,
    },
    {
      id: 3,
      empresaId: 2,
      nombre: 'Hub Bajío Silao',
      domicilio: 'Carretera Silao-León Km 8.5, Silao, Gto.',
      giro: 'Distribución y Empaque',
      numTrabajadores: 120,
      responsable: 'Ing. Fernando Castillo',
      areas: ['Área de Racks', 'Zona de Consolidación'],
      activo: true,
    },
  ];

  tiposEstudio: TipoEstudio[] = [...CATALOGO_NOM_INICIAL];

  elaboradores: Elaborador[] = [
    {
      id: 1,
      empresaId: null, // Laboratorio acreditado general
      nombre: 'Laboratorio de Pruebas y Metrología del Pacífico S.C.',
      tipo: 'Laboratorio de Pruebas',
      cedulaProfesional: 'CED-ING-489102',
      numAcreditacion: 'EMA-LP-0144 / STPS-AP-2022-09',
      vigenciaAcreditacion: '2028-12-31',
      correo: 'contacto@laboratoriopacifico.com.mx',
      telefono: '+52 664 684 9900',
      firmaUrl: 'https://images.unsplash.com/photo-1599305445671-ac291c95aaa9?w=150&auto=format&fit=crop&q=60',
      activo: true,
    },
    {
      id: 2,
      empresaId: null,
      nombre: 'Unidad de Inspección y Salud Laboral Integral',
      tipo: 'Unidad de Inspección / Verificación',
      cedulaProfesional: 'CED-MED-849201',
      numAcreditacion: 'EMA-UI-0312 / STPS-VER-2024-01',
      vigenciaAcreditacion: '2027-06-30',
      correo: 'dictamenes@inspeccionsalud.mx',
      telefono: '+52 55 5392 4110',
      firmaUrl: 'https://images.unsplash.com/photo-1599305445671-ac291c95aaa9?w=150&auto=format&fit=crop&q=60',
      activo: true,
    },
    {
      id: 3,
      empresaId: 1,
      nombre: 'Ing. Rodrigo Salinas Treviño',
      tipo: 'Persona Física',
      cedulaProfesional: 'CED-PROF-7391054',
      numAcreditacion: 'STPS-PER-BC-0941',
      vigenciaAcreditacion: '2025-01-01', // Vencida para probar RN-06
      correo: 'rodrigo.salinas@consultores.mx',
      telefono: '+52 664 123 4567',
      activo: true,
    },
  ];

  estudios: Estudio[] = [
    {
      id: 1,
      folio: 'EST-2026-0001',
      empresaId: 1,
      centroTrabajoId: 1,
      tipoEstudioId: 1, // Ruido NOM-011
      elaboradorId: 1,
      usuarioRegistroId: 3,
      usuarioRevisorId: 2,
      fechaRealizacion: '2026-02-15',
      fechaVigencia: '2028-02-15',
      estado: 'APROBADO',
      datos: {
        criterio_metodo: 'Ponderación A en puestos fijos',
        equipo_sonometro: 'Sonómetro Integrador Clase 1 Cirrus CR-161B',
        no_certificado_calibracion: 'CENAM-LAB-2025-9921',
        puntos_medicion: [
          { 'Área o Puesto': 'Prensas Mecánicas', 'Tiempo Exp. (Horas)': '8.0', 'NSA dB(A)': '88.5', 'NER dB(A)': '88.5', 'Límite Máx Permisible': '90 dB(A)', 'Cumple': 'Sí (Requiere EPP Auditivo)' },
          { 'Área o Puesto': 'Línea de Ensamble A', 'Tiempo Exp. (Horas)': '8.0', 'NSA dB(A)': '78.2', 'NER dB(A)': '78.2', 'Límite Máx Permisible': '90 dB(A)', 'Cumple': 'Sí (Nivel seguro)' },
          { 'Área o Puesto': 'Compresores de Aire', 'Tiempo Exp. (Horas)': '4.0', 'NSA dB(A)': '91.2', 'NER dB(A)': '88.2', 'Límite Máx Permisible': '90 dB(A)', 'Cumple': 'Sí con control' },
        ],
        conclusiones_medidas: 'Los niveles de ruido se encuentran controlados mediante aislamiento acústico en compresores y uso de tapones auditivos NRR 27 dB en prensas.',
      },
      adjuntos: [
        {
          id: 'adj-1',
          nombreArchivo: 'Certificado_Calibracion_Cirrus.pdf',
          tipoMime: 'application/pdf',
          tamanoBytes: 1048576,
          url: '/docs/calibracion.pdf',
          descripcion: 'Certificado de calibración de sonómetro vigente por CENAM',
        },
      ],
      fechaAprobacion: '2026-02-18T14:30:00Z',
      createdAt: '2026-02-15T10:00:00Z',
      updatedAt: '2026-02-18T14:30:00Z',
    },
    {
      id: 2,
      folio: 'EST-2026-0002',
      empresaId: 1,
      centroTrabajoId: 1,
      tipoEstudioId: 2, // Iluminación NOM-025
      elaboradorId: 1,
      usuarioRegistroId: 3,
      fechaRealizacion: '2026-10-20',
      fechaVigencia: '2028-10-20',
      estado: 'EN_REVISION',
      datos: {
        descripcion_sistema: 'Luminarias LED suspendidas tipo High Bay 150W 5000K',
        equipo_luxometro: 'Luxómetro Digital Extech HD450 Calibrado',
        mediciones_lux: [
          { 'Área / Puesto': 'Inspección de Calidad', 'Tarea Visual (Tabla 1)': 'Distinción fina de detalles', 'Nivel Requerido (Lux)': '500', 'Nivel Medido (Lux)': '540', 'Reflexión (%)': '15%', 'Conformidad': 'Cumple' },
          { 'Área / Puesto': 'Almacén de Materia Prima', 'Tarea Visual (Tabla 1)': 'Tránsito y carga general', 'Nivel Requerido (Lux)': '100', 'Nivel Medido (Lux)': '125', 'Reflexión (%)': '12%', 'Conformidad': 'Cumple' },
        ],
      },
      adjuntos: [],
      createdAt: '2026-10-20T11:00:00Z',
      updatedAt: '2026-10-20T11:00:00Z',
    },
    {
      id: 3,
      folio: 'EST-2024-0010',
      empresaId: 1,
      centroTrabajoId: 2,
      tipoEstudioId: 4, // Electricidad Estática NOM-022
      elaboradorId: 2,
      usuarioRegistroId: 3,
      usuarioRevisorId: 2,
      fechaRealizacion: '2025-11-20',
      fechaVigencia: '2026-11-20', // Por vencer pronto (< 60 días)
      estado: 'POR_VENCER',
      datos: {
        equipo_telurometro: 'Telurómetro AEMC Modelo 4630 de 4 Picas',
        humedad_relativa: '45% HR / 24°C',
        puntos_tierra: [
          { 'Electrodo / Zona': 'Tierra Física Edificio A', 'Valor Medido (Ohms)': '8.5', 'Límite Máximo (Ohms)': '25.0', 'Continuidad': 'Excelente', 'Estado Físico': 'Bueno' },
          { 'Electrodo / Zona': 'Pararrayos Torre Principal', 'Valor Medido (Ohms)': '4.2', 'Límite Máximo (Ohms)': '10.0', 'Continuidad': 'Excelente', 'Estado Físico': 'Bueno' },
        ],
      },
      adjuntos: [],
      fechaAprobacion: '2025-11-22T09:00:00Z',
      createdAt: '2025-11-20T08:00:00Z',
      updatedAt: '2025-11-22T09:00:00Z',
    },
    {
      id: 4,
      folio: 'EST-2026-0004',
      empresaId: 1,
      centroTrabajoId: 1,
      tipoEstudioId: 9, // NOM-033-STPS-2015
      elaboradorId: 1,
      usuarioRegistroId: 3,
      fechaRealizacion: '2026-04-02',
      fechaVigencia: '2027-04-02',
      estado: 'BORRADOR',
      datos: {
        alcance_reconocimiento:
          'Inventario sintético para probar la comparación contra un reporte anterior. No corresponde a un centro real.',
        equipo_medicion: 'Detector multigas de demostración, serie DEMO-033',
        espacios_confinados: [
          {
            Clave: 'EC-01',
            Nombre: 'Cisterna de agua tratada',
            Área: 'Área de servicios',
            'LEL (%)': '0',
            'O2 (%)': '21.1',
            'H2S (ppm)': '0',
            'CO (ppm)': '2',
            Fecha: '2026-04-02',
            'Tipo I/II': 'I',
          },
          {
            Clave: 'EC-02',
            Nombre: 'Tanque vertical de solvente inflamable',
            Área: 'Patio de químicos',
            'LEL (%)': '11.2',
            'O2 (%)': '20.1',
            'H2S (ppm)': '0.2',
            'CO (ppm)': '6',
            Fecha: '2026-04-02',
            'Tipo I/II': 'I',
          },
          {
            Clave: 'EC-03',
            Nombre: 'Registro eléctrico subterráneo',
            Área: 'Área de subestación',
            'LEL (%)': '1',
            'O2 (%)': '20.7',
            'H2S (ppm)': '0.1',
            'CO (ppm)': '4',
            Fecha: '2026-04-02',
            'Tipo I/II': 'II',
          },
          {
            Clave: 'EC-05',
            Nombre: 'Fosa de retén de agua pluvial',
            Área: 'Zona norte',
            'LEL (%)': '1.5',
            'O2 (%)': '20.8',
            'H2S (ppm)': '0',
            'CO (ppm)': '3',
            Fecha: '2026-04-02',
            'Tipo I/II': 'I',
          },
          {
            Clave: 'EC-06',
            Nombre: 'Caseta de bombas',
            Área: 'Cuarto de máquinas',
            'LEL (%)': '2',
            'O2 (%)': '20.6',
            'H2S (ppm)': '0',
            'CO (ppm)': '1',
            Fecha: '2026-04-02',
            'Tipo I/II': 'I',
          },
        ],
      },
      adjuntos: [],
      createdAt: '2026-04-02T09:00:00Z',
      updatedAt: '2026-04-02T09:00:00Z',
    },
  ];

  impresiones: Impresion[] = [
    {
      id: 1,
      estudioId: 1,
      usuarioId: 2,
      fecha: '2026-02-18T15:00:00Z',
      rutaPdf: '/storage/estudios/EST-2026-0001.pdf',
      hashSha256: 'a9b2c3d4e5f60718293a4b5c6d7e8f901234567890abcdef1234567890abcdef',
      esOficial: true,
    },
  ];

  envios: EnvioCorreo[] = [
    {
      id: 1,
      estudioId: 1,
      impresionId: 1,
      usuarioId: 2,
      asunto: 'Dictamen Oficial Aprobado NOM-011 Ruido - Planta Tijuana',
      mensaje: 'Estimados coordinadores, adjuntamos el dictamen emitido por el laboratorio acreditado.',
      destinatarios: [
        { correo: 'seguridad@manufacturasnorte.mx', nombre: 'Seguridad e Higiene' },
        { correo: 'planta.tijuana@manufacturasnorte.mx', nombre: 'Gerencia de Planta' },
      ],
      estado: 'ENVIADO',
      reintentos: 0,
      fechaSolicitud: '2026-02-18T15:05:00Z',
      fechaEnvio: '2026-02-18T15:05:30Z',
    },
  ];

  reportesReferencia: ReporteReferencia[] = [];

  bitacora: BitacoraEvento[] = [
    {
      id: 1,
      empresaId: 1,
      usuarioId: 1,
      usuarioNombre: 'Administrador Maestro',
      fecha: '2026-02-15T09:00:00Z',
      ip: '192.168.1.10',
      accion: 'ALTA_CENTRO_TRABAJO',
      entidad: 'CENTRO_TRABAJO',
      entidadId: 1,
      detalles: { nombre: 'Planta Tijuana - Nave 1' },
    },
    {
      id: 2,
      empresaId: 1,
      usuarioId: 3,
      usuarioNombre: 'Lic. Ana Sofía Pérez',
      fecha: '2026-02-15T10:00:00Z',
      ip: '192.168.1.45',
      accion: 'REGISTRO_ESTUDIO',
      entidad: 'ESTUDIO',
      entidadId: 1,
      detalles: { folio: 'EST-2026-0001', norma: 'NOM-011-STPS-2001' },
    },
    {
      id: 3,
      empresaId: 1,
      usuarioId: 2,
      usuarioNombre: 'Ing. Carlos Mendoza',
      fecha: '2026-02-18T14:30:00Z',
      ip: '192.168.1.22',
      accion: 'APROBACION_ESTUDIO',
      entidad: 'ESTUDIO',
      entidadId: 1,
      detalles: { folio: 'EST-2026-0001', vigenciaCalculada: '2028-02-15' },
    },
  ];
}

// Una sola instancia por proceso. En `next dev` cada ruta puede evaluar este
// módulo por su cuenta; sin esto el reporte subido no aparece al confirmarlo.
const registroGlobal = globalThis as typeof globalThis & { __nomStpsMemoryStore?: MemoryStore };
const globalStore = registroGlobal.__nomStpsMemoryStore ?? new MemoryStore();
registroGlobal.__nomStpsMemoryStore = globalStore;

export const store = {
  // --- USUARIOS & AUTENTICACIÓN ---
  autenticar(correo: string, contrasena: string): User | null {
    const user = globalStore.usuarios.find(
      (u) => u.correo.toLowerCase() === correo.toLowerCase() && u.hashContrasena === contrasena && u.activo
    );
    if (!user) return null;
    user.ultimoAcceso = new Date().toISOString();
    return {
      id: user.id,
      empresaId: user.empresaId,
      nombre: user.nombre,
      correo: user.correo,
      rol: user.rol,
      activo: user.activo,
      ultimoAcceso: user.ultimoAcceso,
    };
  },

  getUsuarios(empresaId?: number | null): User[] {
    return globalStore.usuarios
      .filter((u) => empresaId === null || empresaId === undefined || u.empresaId === empresaId || u.empresaId === null)
      .map(({ hashContrasena, ...rest }) => rest);
  },

  guardarUsuario(datos: Partial<User> & { contrasena?: string }): User {
    const id = datos.id || Math.max(0, ...globalStore.usuarios.map((u) => u.id)) + 1;
    const existingIndex = globalStore.usuarios.findIndex((u) => u.id === id);

    const newUser = {
      id,
      empresaId: datos.empresaId ?? null,
      nombre: datos.nombre || 'Nuevo Usuario',
      correo: datos.correo || `usuario_${id}@stps.mx`,
      rol: datos.rol || ('CONSULTA' as UserRole),
      activo: datos.activo ?? true,
      hashContrasena: datos.contrasena || 'temporal123',
    };

    if (existingIndex >= 0) {
      globalStore.usuarios[existingIndex] = { ...globalStore.usuarios[existingIndex], ...newUser };
    } else {
      globalStore.usuarios.push(newUser);
    }
    const { hashContrasena, ...clean } = newUser;
    return clean;
  },

  // --- EMPRESAS (Tenants) ---
  getEmpresas(): Empresa[] {
    return globalStore.empresas.filter((e) => e.activa);
  },

  getEmpresaById(id: number): Empresa | undefined {
    return globalStore.empresas.find((e) => e.id === id);
  },

  guardarEmpresa(datos: Partial<Empresa>): Empresa {
    const id = datos.id || Math.max(0, ...globalStore.empresas.map((e) => e.id)) + 1;
    const existingIndex = globalStore.empresas.findIndex((e) => e.id === id);

    const empresa: Empresa = {
      id,
      razonSocial: datos.razonSocial || 'Empresa Sin Razón Social',
      rfc: datos.rfc?.toUpperCase() || 'XAXX010101000',
      domicilio: datos.domicilio || '',
      representanteLegal: datos.representanteLegal || '',
      telefono: datos.telefono || '',
      correo: datos.correo || '',
      logotipoUrl: datos.logotipoUrl || 'https://images.unsplash.com/photo-1560179707-f14e90ef3623?w=120&auto=format&fit=crop&q=60',
      tipoLogotipo: datos.tipoLogotipo || 'image/jpeg',
      activa: datos.activa ?? true,
      createdAt: datos.createdAt || new Date().toISOString(),
    };

    if (existingIndex >= 0) {
      globalStore.empresas[existingIndex] = { ...globalStore.empresas[existingIndex], ...empresa };
    } else {
      globalStore.empresas.push(empresa);
    }
    return empresa;
  },

  // --- CENTROS DE TRABAJO ---
  getCentros(empresaId?: number | null): CentroTrabajo[] {
    if (!empresaId) return globalStore.centros;
    return globalStore.centros.filter((c) => c.empresaId === empresaId && c.activo);
  },

  getCentroById(id: number): CentroTrabajo | undefined {
    return globalStore.centros.find((c) => c.id === id);
  },

  guardarCentro(datos: Partial<CentroTrabajo>): CentroTrabajo {
    const id = datos.id || Math.max(0, ...globalStore.centros.map((c) => c.id)) + 1;
    const existingIndex = globalStore.centros.findIndex((c) => c.id === id);

    const centro: CentroTrabajo = {
      id,
      empresaId: datos.empresaId || 1,
      nombre: datos.nombre || 'Centro de Trabajo Nuevo',
      domicilio: datos.domicilio || '',
      giro: datos.giro || 'General',
      numTrabajadores: datos.numTrabajadores || 1,
      responsable: datos.responsable || 'Responsable de Seguridad',
      areas: datos.areas || ['Área General'],
      activo: datos.activo ?? true,
    };

    if (existingIndex >= 0) {
      globalStore.centros[existingIndex] = { ...globalStore.centros[existingIndex], ...centro };
    } else {
      globalStore.centros.push(centro);
    }
    return centro;
  },

  // --- CATÁLOGO DE TIPOS DE ESTUDIO ---
  getTiposEstudio(): TipoEstudio[] {
    return globalStore.tiposEstudio.filter((t) => t.activo);
  },

  getTipoEstudioById(id: number): TipoEstudio | undefined {
    return globalStore.tiposEstudio.find((t) => t.id === id);
  },

  guardarTipoEstudio(datos: Partial<TipoEstudio>): TipoEstudio {
    const id = datos.id || Math.max(0, ...globalStore.tiposEstudio.map((t) => t.id)) + 1;
    const existingIndex = globalStore.tiposEstudio.findIndex((t) => t.id === id);

    const tipo: TipoEstudio = {
      id,
      claveNOM: datos.claveNOM || `NOM-EXP-${id}`,
      nombre: datos.nombre || 'Nuevo Estudio Normativo',
      descripcion: datos.descripcion || '',
      periodicidadMeses: datos.periodicidadMeses ?? 12,
      categoria: datos.categoria || 'Seguridad',
      activo: datos.activo ?? true,
      campos: datos.campos || [],
    };

    if (existingIndex >= 0) {
      globalStore.tiposEstudio[existingIndex] = { ...globalStore.tiposEstudio[existingIndex], ...tipo };
    } else {
      globalStore.tiposEstudio.push(tipo);
    }
    return tipo;
  },

  // --- ELABORADORES ---
  getElaboradores(): Elaborador[] {
    return globalStore.elaboradores.filter((e) => e.activo);
  },

  getElaboradorById(id: number): Elaborador | undefined {
    return globalStore.elaboradores.find((e) => e.id === id);
  },

  guardarElaborador(datos: Partial<Elaborador>): Elaborador {
    const id = datos.id || Math.max(0, ...globalStore.elaboradores.map((e) => e.id)) + 1;
    const existingIndex = globalStore.elaboradores.findIndex((e) => e.id === id);

    const elaborador: Elaborador = {
      id,
      empresaId: datos.empresaId ?? null,
      nombre: datos.nombre || 'Elaborador Nuevo',
      tipo: datos.tipo || 'Laboratorio de Pruebas',
      cedulaProfesional: datos.cedulaProfesional,
      numAcreditacion: datos.numAcreditacion || 'SIN-ACREDITACION',
      vigenciaAcreditacion: datos.vigenciaAcreditacion || '2028-12-31',
      correo: datos.correo || 'laboratorio@stps.mx',
      telefono: datos.telefono || '',
      firmaUrl: datos.firmaUrl,
      activo: datos.activo ?? true,
    };

    if (existingIndex >= 0) {
      globalStore.elaboradores[existingIndex] = { ...globalStore.elaboradores[existingIndex], ...elaborador };
    } else {
      globalStore.elaboradores.push(elaborador);
    }
    return elaborador;
  },

  // --- ESTUDIOS Y REGLAS DE NEGOCIO ---
  getEstudios(empresaId?: number | null): Estudio[] {
    if (!empresaId) return globalStore.estudios;
    return globalStore.estudios.filter((e) => e.empresaId === empresaId);
  },

  getEstudioById(id: number, empresaId?: number | null): Estudio | undefined {
    const estudio = globalStore.estudios.find((e) => e.id === id);
    if (!estudio) return undefined;
    if (empresaId && estudio.empresaId !== empresaId) {
      return undefined; // Aislamiento Multiempresa RN-02
    }
    return estudio;
  },

  guardarEstudio(datos: Partial<Estudio>, usuarioId: number): Estudio {
    // RN-01: Validar integridad referencial
    validarRN01IntegridadReferencial(datos.centroTrabajoId, datos.tipoEstudioId, datos.elaboradorId);

    const tipoEstudio = this.getTipoEstudioById(datos.tipoEstudioId!);
    if (!tipoEstudio) throw new Error('Tipo de estudio no encontrado en catálogo.');

    const fechaRealizacion = datos.fechaRealizacion || new Date().toISOString().split('T')[0];
    const fechaVigencia = calcularRN04Vigencia(tipoEstudio, fechaRealizacion, datos.datos || {});

    const id = datos.id || Math.max(0, ...globalStore.estudios.map((e) => e.id)) + 1;
    const anio = new Date().getFullYear();
    const folio = datos.folio || `EST-${anio}-${String(id).padStart(4, '0')}`;

    const existingIndex = globalStore.estudios.findIndex((e) => e.id === id);

    const nuevoEstudio: Estudio = {
      id,
      folio,
      empresaId: datos.empresaId || 1,
      centroTrabajoId: datos.centroTrabajoId!,
      tipoEstudioId: datos.tipoEstudioId!,
      elaboradorId: datos.elaboradorId!,
      usuarioRegistroId: datos.usuarioRegistroId || usuarioId,
      usuarioRevisorId: datos.usuarioRevisorId,
      fechaRealizacion,
      fechaVigencia,
      estado: datos.estado || 'BORRADOR',
      datos: datos.datos || {},
      observaciones: datos.observaciones,
      adjuntos: datos.adjuntos || [],
      fechaAprobacion: datos.fechaAprobacion,
      createdAt: datos.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (existingIndex >= 0) {
      globalStore.estudios[existingIndex] = { ...globalStore.estudios[existingIndex], ...nuevoEstudio };
    } else {
      globalStore.estudios.push(nuevoEstudio);
    }

    this.registrarBitacora({
      empresaId: nuevoEstudio.empresaId,
      usuarioId,
      ip: '127.0.0.1',
      accion: existingIndex >= 0 ? 'MODIFICAR_ESTUDIO' : 'CREAR_ESTUDIO',
      entidad: 'ESTUDIO',
      entidadId: nuevoEstudio.id,
      detalles: { folio: nuevoEstudio.folio, norma: tipoEstudio.claveNOM },
    });

    return nuevoEstudio;
  },

  aprobarEstudio(id: number, usuarioRevisorId: number, observaciones?: string): Estudio {
    const estudio = globalStore.estudios.find((e) => e.id === id);
    if (!estudio) throw new Error('Estudio no encontrado.');

    const elaborador = this.getElaboradorById(estudio.elaboradorId);
    if (!elaborador) throw new Error('Elaborador no encontrado.');

    // RN-06: Validar vigencia de acreditación
    validarRN06AcreditacionElaborador(elaborador, estudio.fechaRealizacion);

    estudio.estado = 'APROBADO';
    estudio.usuarioRevisorId = usuarioRevisorId;
    estudio.fechaAprobacion = new Date().toISOString();
    if (observaciones) estudio.observaciones = observaciones;
    estudio.updatedAt = new Date().toISOString();

    this.registrarBitacora({
      empresaId: estudio.empresaId,
      usuarioId: usuarioRevisorId,
      ip: '127.0.0.1',
      accion: 'APROBACION_ESTUDIO',
      entidad: 'ESTUDIO',
      entidadId: estudio.id,
      detalles: { folio: estudio.folio, vigencia: estudio.fechaVigencia },
    });

    return estudio;
  },

  eliminarEstudio(id: number, empresaId?: number | null): boolean {
    const index = globalStore.estudios.findIndex((e) => e.id === id);
    if (index === -1) return false;

    const estudio = globalStore.estudios[index];
    if (empresaId && estudio.empresaId !== empresaId) {
      throw new Error('Aislamiento Multiempresa: No tiene permisos sobre este estudio.');
    }

    // RN-09: Validar retención legal de 5 años
    validarRN09RetencionLegal(estudio);

    globalStore.estudios.splice(index, 1);
    return true;
  },

  // --- IMPRESIONES & HASH SHA-256 ---
  registrarImpresion(estudioId: number, usuarioId: number, contenidoHtml: string): Impresion {
    const estudio = this.getEstudioById(estudioId);
    if (!estudio) throw new Error('Estudio no encontrado.');

    const hashSha256 = calcularHashSha256(contenidoHtml);
    const id = Math.max(0, ...globalStore.impresiones.map((i) => i.id)) + 1;

    const impresion: Impresion = {
      id,
      estudioId,
      usuarioId,
      fecha: new Date().toISOString(),
      rutaPdf: `/storage/estudios/${estudio.folio}.pdf`,
      hashSha256,
      esOficial: estudio.estado === 'APROBADO',
    };

    globalStore.impresiones.push(impresion);

    this.registrarBitacora({
      empresaId: estudio.empresaId,
      usuarioId,
      ip: '127.0.0.1',
      accion: 'GENERACION_IMPRESION',
      entidad: 'IMPRESION',
      entidadId: impresion.id,
      detalles: { folio: estudio.folio, hashSha256, esOficial: impresion.esOficial },
    });

    return impresion;
  },

  getImpresionesByEstudio(estudioId: number): Impresion[] {
    return globalStore.impresiones.filter((i) => i.estudioId === estudioId);
  },

  // --- ENVÍOS POR CORREO ---
  solicitarEnvio(
    estudioId: number,
    usuarioId: number,
    destinatarios: { correo: string; nombre: string }[],
    asunto: string,
    mensaje: string
  ): EnvioCorreo {
    const estudio = this.getEstudioById(estudioId);
    if (!estudio) throw new Error('Estudio no encontrado.');

    const id = Math.max(0, ...globalStore.envios.map((e) => e.id)) + 1;

    const envio: EnvioCorreo = {
      id,
      estudioId,
      usuarioId,
      asunto,
      mensaje,
      destinatarios,
      estado: 'PENDIENTE',
      reintentos: 0,
      fechaSolicitud: new Date().toISOString(),
    };

    globalStore.envios.push(envio);

    // Simulación de despacho asíncrono con cola y reintentos (RN-08)
    setTimeout(() => {
      envio.estado = 'ENVIADO';
      envio.fechaEnvio = new Date().toISOString();
    }, 1000);

    this.registrarBitacora({
      empresaId: estudio.empresaId,
      usuarioId,
      ip: '127.0.0.1',
      accion: 'SOLICITUD_ENVIO_CORREO',
      entidad: 'ENVIO_CORREO',
      entidadId: envio.id,
      detalles: { folio: estudio.folio, destinatarios: destinatarios.map((d) => d.correo) },
    });

    return envio;
  },

  getEnviosByEstudio(estudioId: number): EnvioCorreo[] {
    return globalStore.envios.filter((e) => e.estudioId === estudioId);
  },

  // --- BITÁCORA DE AUDITORÍA ---
  registrarBitacora(evento: Omit<BitacoraEvento, 'id' | 'fecha'>): BitacoraEvento {
    const id = Math.max(0, ...globalStore.bitacora.map((b) => b.id)) + 1;
    const nuevo: BitacoraEvento = {
      ...evento,
      id,
      fecha: new Date().toISOString(),
    };
    globalStore.bitacora.unshift(nuevo); // Más recientes primero
    return nuevo;
  },

  getBitacora(empresaId?: number | null): BitacoraEvento[] {
    if (!empresaId) return globalStore.bitacora;
    return globalStore.bitacora.filter((b) => !b.empresaId || b.empresaId === empresaId);
  },

  // --- TABLERO & ALERTAS DE VIGENCIA (60 DÍAS) ---
  getEstadisticas(empresaId?: number | null) {
    const estudios = this.getEstudios(empresaId);
    const ahora = new Date();
    const sesentaDias = new Date(ahora.getTime() + 60 * 24 * 60 * 60 * 1000);

    let aprobados = 0;
    let enRevision = 0;
    let borrador = 0;
    let porVencer = 0;
    let vencidos = 0;

    estudios.forEach((e) => {
      const fechaVigencia = new Date(e.fechaVigencia);
      if (fechaVigencia < ahora && e.estado !== 'CANCELADO') {
        vencidos++;
      } else if (fechaVigencia <= sesentaDias && e.estado === 'APROBADO') {
        porVencer++;
      }

      if (e.estado === 'APROBADO') aprobados++;
      else if (e.estado === 'EN_REVISION') enRevision++;
      else if (e.estado === 'BORRADOR') borrador++;
    });

    const total = estudios.length;
    const indiceCumplimiento = total > 0 ? Math.round(((aprobados - vencidos) / total) * 100) : 100;

    return {
      total,
      aprobados,
      enRevision,
      borrador,
      porVencer,
      vencidos,
      indiceCumplimiento: Math.max(0, indiceCumplimiento),
    };
  },

  // --- REPORTES DE REFERENCIA ---
  listarReportesReferencia(filtro?: {
    empresaId?: number | null;
    centroTrabajoId?: number | null;
    tipoEstudioId?: number | null;
    estadoExtraccion?: EstadoExtraccion | null;
  }): ReporteReferencia[] {
    return globalStore.reportesReferencia.filter((reporte) => {
      if (filtro?.empresaId && reporte.empresaId !== filtro.empresaId) return false;
      if (filtro?.centroTrabajoId && reporte.centroTrabajoId !== filtro.centroTrabajoId) return false;
      if (filtro?.tipoEstudioId && reporte.tipoEstudioId !== filtro.tipoEstudioId) return false;
      if (filtro?.estadoExtraccion && reporte.estadoExtraccion !== filtro.estadoExtraccion) return false;
      return true;
    });
  },

  obtenerReporteReferencia(id: number): ReporteReferencia | undefined {
    return globalStore.reportesReferencia.find((reporte) => reporte.id === id);
  },

  insertarReporteReferencia(
    datos: Omit<ReporteReferencia, 'id' | 'createdAt' | 'updatedAt'>,
    usuarioId: number
  ): ReporteReferencia {
    const ahora = new Date().toISOString();
    const reporte: ReporteReferencia = {
      ...datos,
      id: Math.max(0, ...globalStore.reportesReferencia.map((item) => item.id)) + 1,
      createdAt: ahora,
      updatedAt: ahora,
    };
    globalStore.reportesReferencia.push(reporte);
    this.registrarBitacora({
      empresaId: reporte.empresaId,
      usuarioId,
      ip: '127.0.0.1',
      accion: 'CARGAR_REPORTE_REFERENCIA',
      entidad: 'REPORTE_REFERENCIA',
      entidadId: reporte.id,
      detalles: {
        archivo: reporte.archivo.nombre,
        hashSha256: reporte.archivo.hashSha256,
        estado: reporte.estadoExtraccion,
        espacios: reporte.espacios.length,
      },
    });
    return reporte;
  },

  actualizarReporteReferencia(
    id: number,
    parcial: Partial<Omit<ReporteReferencia, 'id' | 'createdAt'>>,
    usuarioId: number,
    accion: string
  ): ReporteReferencia {
    const index = globalStore.reportesReferencia.findIndex((reporte) => reporte.id === id);
    if (index < 0) throw new Error('Reporte de referencia no encontrado.');
    const actualizado: ReporteReferencia = {
      ...globalStore.reportesReferencia[index],
      ...parcial,
      id,
      updatedAt: new Date().toISOString(),
    };
    globalStore.reportesReferencia[index] = actualizado;
    this.registrarBitacora({
      empresaId: actualizado.empresaId,
      usuarioId,
      ip: '127.0.0.1',
      accion,
      entidad: 'REPORTE_REFERENCIA',
      entidadId: id,
      detalles: { estado: actualizado.estadoExtraccion, espacios: actualizado.espacios.length },
    });
    return actualizado;
  },
};
