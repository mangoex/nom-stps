import { describe, expect, it, vi, afterEach } from 'vitest';
import { createHash } from 'crypto';
import {
  BusinessRuleError,
  calcularRN04Vigencia,
  debeIncluirMarcaDeAgua,
  validarRN01IntegridadReferencial,
  validarRN03Logotipo,
  validarRN06AcreditacionElaborador,
  validarRN09RetencionLegal,
} from '../src/lib/rules';
import { calcularHashSha256, generarSelloDigital } from '../src/lib/hash';
import { store } from '../src/lib/store';
import { Elaborador, Estudio, TipoEstudio } from '../src/lib/types';

function tipoNom(clave: string, periodicidadMeses: number | null): TipoEstudio {
  return {
    id: 1,
    claveNOM: clave,
    nombre: clave,
    descripcion: '',
    periodicidadMeses,
    categoria: 'Salud',
    activo: true,
    campos: [],
  };
}

function elaborador(vigenciaAcreditacion: string): Elaborador {
  return {
    id: 1,
    nombre: 'Laboratorio de prueba',
    tipo: 'Laboratorio de Pruebas',
    numAcreditacion: 'EMA-LP-0000',
    vigenciaAcreditacion,
    correo: 'lab@example.com',
    telefono: '000',
    activo: true,
  };
}

function estudio(parcial: Pick<Estudio, 'estado' | 'fechaRealizacion'>): Estudio {
  return {
    id: 1,
    folio: 'EST-TEST-0001',
    empresaId: 1,
    centroTrabajoId: 1,
    tipoEstudioId: 1,
    elaboradorId: 1,
    usuarioRegistroId: 1,
    fechaRealizacion: parcial.fechaRealizacion,
    fechaVigencia: parcial.fechaRealizacion,
    estado: parcial.estado,
    datos: {},
    adjuntos: [],
    createdAt: parcial.fechaRealizacion,
    updatedAt: parcial.fechaRealizacion,
  };
}

function isoFecha(fecha: Date): string {
  return fecha.toISOString().split('T')[0];
}

describe('reglas de negocio sobre el TypeScript real', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('RN-01 rechaza un estudio sin centro, tipo o elaborador', () => {
    expect(() => validarRN01IntegridadReferencial(null, 1, 2)).toThrow(BusinessRuleError);
    try {
      validarRN01IntegridadReferencial(0, 1, 2);
    } catch (error) {
      expect(error).toBeInstanceOf(BusinessRuleError);
      expect((error as BusinessRuleError).codigo).toBe('RN-01');
    }
    expect(() => validarRN01IntegridadReferencial(1, 2, 3)).not.toThrow();
  });

  it('RN-02 no entrega un estudio de otra empresa', () => {
    const propio = store.getEstudioById(1, 1);
    expect(propio?.empresaId).toBe(1);
    expect(store.getEstudioById(1, 2)).toBeUndefined();
  });

  it('RN-03 acepta PNG dentro de 2 MB y rechaza tipo o tamaño inválidos', () => {
    expect(() => validarRN03Logotipo({ tamanoBytes: 1024, tipoMime: 'image/png' })).not.toThrow();
    expect(() => validarRN03Logotipo({ tamanoBytes: 100, tipoMime: 'application/pdf' })).toThrow(BusinessRuleError);
    try {
      validarRN03Logotipo({ tamanoBytes: 2 * 1024 * 1024 + 1, tipoMime: 'image/jpeg' });
    } catch (error) {
      expect((error as BusinessRuleError).codigo).toBe('RN-03');
    }
  });

  it('RN-04 suma la periodicidad de la NOM y la escala VLE de NOM-010', () => {
    const ruido = calcularRN04Vigencia(tipoNom('NOM-011-STPS-2001', 24), '2026-01-15', {});
    expect(ruido).toBe('2028-01-15');

    const critica = calcularRN04Vigencia(tipoNom('NOM-010-STPS-2014', null), '2026-01-15', {
      relacion_vle: 'Mayor al VLE (> 1.0) - Requiere muestreo cada 3 meses',
    });
    expect(critica).toBe('2026-04-15');

    const baja = calcularRN04Vigencia(tipoNom('NOM-010-STPS-2014', null), '2026-01-15', {
      relacion_vle: 'Menor o igual a 0.25 del VLE - Requiere muestreo cada 24 meses',
    });
    expect(baja).toBe('2028-01-15');

    expect(() => calcularRN04Vigencia(tipoNom('NOM-011-STPS-2001', 24), 'no-es-fecha', {})).toThrow(BusinessRuleError);
  });

  it('RN-05 pone marca de agua en todo estado distinto de APROBADO', () => {
    expect(debeIncluirMarcaDeAgua('BORRADOR')).toBe(true);
    expect(debeIncluirMarcaDeAgua('EN_REVISION')).toBe(true);
    expect(debeIncluirMarcaDeAgua('APROBADO')).toBe(false);
  });

  it('RN-06 bloquea la aprobación si la acreditación ya estaba vencida', () => {
    expect(() => validarRN06AcreditacionElaborador(elaborador('2026-01-01'), '2026-06-01')).toThrow(BusinessRuleError);
    try {
      validarRN06AcreditacionElaborador(elaborador('2026-01-01'), '2026-06-01');
    } catch (error) {
      expect((error as BusinessRuleError).codigo).toBe('RN-06');
    }
    expect(() => validarRN06AcreditacionElaborador(elaborador('2026-12-31'), '2026-06-01')).not.toThrow();
  });

  it('RN-07 calcula el SHA-256 real y un sello determinista', () => {
    const contenido = 'EST-2026-0001|MNO010101AAA|2026-10-15|DATOS_MUESTREO';
    const esperado = createHash('sha256').update(contenido).digest('hex');
    expect(calcularHashSha256(contenido)).toBe(esperado);
    expect(calcularHashSha256(contenido)).toHaveLength(64);
    expect(calcularHashSha256(Buffer.from(contenido))).toBe(esperado);

    const sello = generarSelloDigital('EST-2026-0001', 'MNO010101AAA', '2026-10-15', 'DATOS_MUESTREO');
    expect(sello).toBe(generarSelloDigital('EST-2026-0001', 'MNO010101AAA', '2026-10-15', 'DATOS_MUESTREO'));
    expect(sello).not.toBe(generarSelloDigital('EST-2026-0002', 'MNO010101AAA', '2026-10-15', 'DATOS_MUESTREO'));
    expect(sello).toHaveLength(64);
  });

  it('RN-08 registra el envío pendiente, sin reintentos, y la simulación lo marca enviado', () => {
    vi.useFakeTimers();
    const envio = store.solicitarEnvio(
      1,
      2,
      [{ correo: 'seguridad@example.com', nombre: 'Seguridad' }],
      'Dictamen de prueba',
      'Mensaje de prueba del arnés'
    );
    expect(envio.estado).toBe('PENDIENTE');
    expect(envio.reintentos).toBe(0);
    vi.advanceTimersByTime(1000);
    expect(envio.estado).toBe('ENVIADO');
    expect(envio.fechaEnvio).toBeTruthy();
  });

  it('RN-09 impide borrar un aprobado con menos de cinco años y deja pasar uno más antiguo', () => {
    const hoy = new Date();
    const reciente = new Date(hoy);
    reciente.setUTCFullYear(hoy.getUTCFullYear() - 2);
    const antiguo = new Date(hoy);
    antiguo.setUTCFullYear(hoy.getUTCFullYear() - 6);

    expect(() => validarRN09RetencionLegal(estudio({ estado: 'APROBADO', fechaRealizacion: isoFecha(reciente) }))).toThrow(
      BusinessRuleError
    );
    try {
      validarRN09RetencionLegal(estudio({ estado: 'APROBADO', fechaRealizacion: isoFecha(reciente) }));
    } catch (error) {
      expect((error as BusinessRuleError).codigo).toBe('RN-09');
    }
    expect(() => validarRN09RetencionLegal(estudio({ estado: 'APROBADO', fechaRealizacion: isoFecha(antiguo) }))).not.toThrow();
    expect(() => validarRN09RetencionLegal(estudio({ estado: 'BORRADOR', fechaRealizacion: isoFecha(reciente) }))).not.toThrow();
  });
});
