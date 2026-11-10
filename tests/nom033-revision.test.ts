import { afterEach, describe, expect, it } from 'vitest';
import { POST as confirmarRuta } from '../src/app/api/reportes-referencia/[id]/confirmar/route';
import { getCurrentUser } from '../src/lib/auth';
import { FileStorage, setFileStorage } from '../src/lib/file-storage';
import { compararEspaciosNom033, espaciosDesdeCaptura } from '../src/lib/nom033-comparacion';
import { evaluarEspacioNom033, numeroFlexible } from '../src/lib/nom033-limites';
import { parsearNom033 } from '../src/lib/nom033-parser';
import { agruparItemsPorRenglon } from '../src/lib/pdf-text';
import {
  confirmarReporteReferencia,
  rechazarReporteReferencia,
  subirReporteReferencia,
} from '../src/lib/reportes-referencia';
import { store } from '../src/lib/store';
import { EspacioNom033 } from '../src/lib/types';

function espacio(parcial: Partial<EspacioNom033> & Pick<EspacioNom033, 'clave'>): EspacioNom033 {
  return {
    nombre: 'Cisterna',
    area: 'Servicios',
    lel: null,
    o2: null,
    h2s: null,
    co: null,
    fecha: '2025-03-15',
    tipoDeclarado: 'I',
    tipoCalculado: null,
    cumple: null,
    ...parcial,
  };
}

function tipoNom033() {
  const tipo = store.getTiposEstudio().find((item) => item.claveNOM === 'NOM-033-STPS-2015');
  if (!tipo) throw new Error('Falta NOM-033 en el catálogo');
  return tipo;
}

class AlmacenContador implements FileStorage {
  guardados = 0;

  async guardar(input: { nombre: string; contenido: Buffer }) {
    this.guardados += 1;
    return {
      key: 'abc',
      nombre: input.nombre,
      hashSha256: 'a'.repeat(64),
      tamanoBytes: input.contenido.length,
    };
  }

  async leer(): Promise<Buffer | null> {
    return null;
  }
}

describe('revisión de la comparación y los límites', () => {
  it('no marca MODIFICADO cuando anterior y nuevo son null', () => {
    const fila = compararEspaciosNom033([espacio({ clave: 'EC-01' })], [espacio({ clave: 'EC-01' })]).filas[0];
    expect(fila.deltas.every((delta) => delta.delta === null)).toBe(true);
    expect(fila.situacion).toBe('SIN_CAMBIO');
  });

  it('sí marca MODIFICADO cuando solo uno de los dos valores existe', () => {
    const fila = compararEspaciosNom033(
      [espacio({ clave: 'EC-02', lel: 1, o2: 20.9, h2s: 0, co: 0, tipoCalculado: 'I', cumple: true })],
      [espacio({ clave: 'EC-02', lel: null, o2: 20.9, h2s: 0, co: 0, tipoCalculado: null, cumple: null })]
    ).filas[0];
    expect(fila.situacion).toBe('MODIFICADO');
  });

  it('acepta la clave EC-01A', () => {
    const espacios = espaciosDesdeCaptura([
      {
        Clave: 'EC-1A',
        Nombre: 'Pozo',
        Área: 'Nave',
        'LEL (%)': '0',
        'O2 (%)': '20.9',
        'H2S (ppm)': '0',
        'CO (ppm)': '1',
        Fecha: '2025-03-15',
        'Tipo I/II': 'I',
      },
    ]);
    expect(espacios).toHaveLength(1);
    expect(espacios[0].clave).toBe('EC-01A');
  });

  it('interpreta comas decimales, miles, <LD, N/D y <0.1', () => {
    expect(numeroFlexible('1.234,50')).toBe(1234.5);
    expect(numeroFlexible('1,234.50')).toBe(1234.5);
    expect(numeroFlexible('20,90')).toBe(20.9);
    expect(numeroFlexible('<LD')).toBe(0);
    expect(numeroFlexible('N/D')).toBeNull();
    expect(numeroFlexible('<0,1')).toBe(0.1);
  });

  it('trata un LEL, H2S o CO negativo como dato inválido', () => {
    const base = { clave: 'EC-01', nombre: 'A', area: 'B', lel: 0, o2: 20.9, h2s: 0, co: 0, fecha: '2025-03-15', tipoDeclarado: 'I' as const };
    for (const campo of ['lel', 'h2s', 'co'] as const) {
      const resultado = evaluarEspacioNom033({ ...base, [campo]: -0.1 });
      expect(resultado.cumple).toBeNull();
      expect(resultado.tipoCalculado).toBeNull();
    }
  });
});

describe('revisión del parser', () => {
  it('no recorre las columnas con el número del nombre y reconoce <LD, <0.1 y N/D', () => {
    const texto = [
      'EC-01A  Nave 2 de bombas   <LD   20,9   <0,1   N/D   15/03/2025',
      'FICHA EC-01A',
      'Clasificación del reporte: Tipo I',
    ].join('\n');
    const [espacioParseado] = parsearNom033(texto).espacios;
    expect(espacioParseado.clave).toBe('EC-01A');
    expect(espacioParseado.nombre).toContain('Nave 2');
    expect(espacioParseado).toMatchObject({ lel: 0, o2: 20.9, h2s: 0.1, co: null });
  });

  it('toma el prefijo de área en las líneas intermedias de una fila partida', () => {
    const texto = [
      'EC-02 Tanque vertical de',
      '      Área de solventes',
      '      Patio de químicos   8.4  20.1  0.2  6.0  15/03/2025',
      'FICHA EC-02',
      'Clasificación del reporte: Tipo I',
    ].join('\n');
    const [espacioParseado] = parsearNom033(texto).espacios;
    expect(espacioParseado.nombre).toBe('Tanque vertical de');
    expect(espacioParseado.area).toContain('Área de solventes');
    expect(espacioParseado.area).toContain('Patio de químicos');
    expect(espacioParseado.lel).toBe(8.4);
  });

  it('ignora encabezados y pies de página metidos en una fila partida', () => {
    const texto = [
      'EC-05 Fosa de retén de',
      '      Clave Nombre / Área LEL (%) O2 (%) H2S (ppm) CO (ppm) Fecha',
      '      Página 1 de 3',
      '      agua pluvial',
      '      Zona norte  1.5  20.8  0  3  16/03/2025',
      'FICHA EC-05',
      'Clasificación del reporte: Tipo I',
    ].join('\n');
    const [espacioParseado] = parsearNom033(texto).espacios;
    expect(espacioParseado.nombre).toBe('Fosa de retén de agua pluvial');
    expect(espacioParseado.area).toBe('Zona norte');
    expect(espacioParseado).toMatchObject({ lel: 1.5, o2: 20.8, h2s: 0, co: 3 });
  });

  it('quita la cadena de una fecha imposible para que no se vuelva medición', () => {
    const texto = [
      'EC-20 Cisterna de agua  0.0  20.9  0.0  2.0  32/13/2025',
      'FICHA EC-20',
      'Clasificación del reporte: Tipo I',
    ].join('\n');
    const [espacioParseado] = parsearNom033(texto).espacios;
    expect(espacioParseado.fecha).toBe('');
    expect(espacioParseado).toMatchObject({ lel: 0, o2: 20.9, h2s: 0, co: 2 });
    expect(espacioParseado.nombre).not.toContain('32');
  });
});

describe('revisión del texto PDF y de la carga', () => {
  afterEach(() => {
    setFileStorage(new (class implements FileStorage {
      async guardar() {
        return { key: 'x', nombre: 'x', hashSha256: 'a'.repeat(64), tamanoBytes: 1 };
      }
      async leer() {
        return null;
      }
    })());
    delete process.env.REPORTE_MAX_BYTES;
  });

  it('junta en un renglón los fragmentos que difieren hasta 2 px en Y', () => {
    const texto = agruparItemsPorRenglon([
      { str: 'EC-01', transform: [1, 0, 0, 1, 40, 100] },
      { str: 'Cisterna', transform: [1, 0, 0, 1, 90, 101.5] },
      { str: 'Otra fila', transform: [1, 0, 0, 1, 40, 90] },
    ]);
    expect(texto.split('\n')[0]).toBe('EC-01 Cisterna');
    expect(texto.split('\n')).toHaveLength(2);
  });

  it('rechaza un PDF sin firma antes de guardarlo', async () => {
    const almacen = new AlmacenContador();
    setFileStorage(almacen);
    await expect(
      subirReporteReferencia({
        empresaId: 1,
        centroTrabajoId: 1,
        tipoEstudioId: tipoNom033().id,
        fecha: '2025-03-15',
        nombreArchivo: 'falso.pdf',
        contenido: Buffer.from('esto no es un pdf'),
      })
    ).rejects.toThrow(/PDF/);
    expect(almacen.guardados).toBe(0);
  });

  it('respeta un tamaño máximo configurable antes de guardar', async () => {
    const almacen = new AlmacenContador();
    setFileStorage(almacen);
    process.env.REPORTE_MAX_BYTES = '8';
    await expect(
      subirReporteReferencia({
        empresaId: 1,
        centroTrabajoId: 1,
        tipoEstudioId: tipoNom033().id,
        fecha: '2025-03-15',
        nombreArchivo: 'grande.txt',
        contenido: Buffer.from('123456789'),
      })
    ).rejects.toThrow(/tamaño|MB|bytes/i);
    expect(almacen.guardados).toBe(0);
  });
});

describe('revisión de la confirmación', () => {
  afterEach(() => {
    setFileStorage(new (class implements FileStorage {
      async guardar(input: { nombre: string; contenido: Buffer }) {
        return { key: 'k', nombre: input.nombre, hashSha256: 'b'.repeat(64), tamanoBytes: input.contenido.length };
      }
      async leer() {
        return null;
      }
    })());
  });

  it('solo confirma un EXTRAIDO con al menos un espacio', async () => {
    const tipoId = tipoNom033().id;
    const pendiente = await subirReporteReferencia({
      empresaId: 1,
      centroTrabajoId: 1,
      tipoEstudioId: tipoId,
      fecha: '2025-02-01',
      nombreArchivo: 'vacio.txt',
      contenido: Buffer.from('sin filas de anexo'),
    });
    expect(pendiente.estadoExtraccion).toBe('PENDIENTE');
    expect(() => confirmarReporteReferencia(pendiente.id, pendiente.espacios)).toThrow(/EXTRAIDO/);

    const extraido = await subirReporteReferencia({
      empresaId: 1,
      centroTrabajoId: 1,
      tipoEstudioId: tipoId,
      fecha: '2025-03-15',
      nombreArchivo: 'anexo.txt',
      contenido: Buffer.from('EC-01 Cisterna  0  20.9  0  1  15/03/2025\nFICHA EC-01\nClasificación del reporte: Tipo I\n'),
    });
    expect(() => confirmarReporteReferencia(extraido.id, [])).toThrow(/espacio/);
    rechazarReporteReferencia(extraido.id, 'No corresponde al centro.');
    expect(() => confirmarReporteReferencia(extraido.id, extraido.espacios)).toThrow(/EXTRAIDO|RECHAZADO/);
  });

  it('toma el usuario del helper de sesión y no del body', async () => {
    const extraido = await subirReporteReferencia({
      empresaId: 1,
      centroTrabajoId: 1,
      tipoEstudioId: tipoNom033().id,
      fecha: '2025-03-15',
      nombreArchivo: 'anexo-sesion.txt',
      contenido: Buffer.from('EC-03 Registro  1  20.8  0  1  15/03/2025\nFICHA EC-03\nClasificación del reporte: Tipo II\n'),
    });
    const request = new Request('http://localhost/api/reportes-referencia/1/confirmar', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ accion: 'CONFIRMAR', usuarioId: 99, espacios: extraido.espacios }),
    });
    const respuesta = await confirmarRuta(request, { params: { id: String(extraido.id) } });
    expect(respuesta.status).toBe(200);
    const evento = store
      .getBitacora(1)
      .find((item) => item.accion === 'CONFIRMAR_REPORTE_REFERENCIA' && item.entidadId === extraido.id);
    expect(evento?.usuarioId).toBe(getCurrentUser().id);
    expect(evento?.usuarioId).not.toBe(99);
  });
});
