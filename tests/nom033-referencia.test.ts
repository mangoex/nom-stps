import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { afterEach, describe, expect, it } from 'vitest';
import { LocalFileStorage, MemoryFileStorage, setFileStorage } from '../src/lib/file-storage';
import { evaluarEspacioNom033, LIMITES_NOM033 } from '../src/lib/nom033-limites';
import { parsearNom033 } from '../src/lib/nom033-parser';
import { extraerTextoPdf } from '../src/lib/pdf-text';
import {
  compararEstudioConReferencia,
  confirmarReporteReferencia,
  rechazarReporteReferencia,
  subirReporteReferencia,
} from '../src/lib/reportes-referencia';
import { store } from '../src/lib/store';

const FIXTURE_TXT = path.join(process.cwd(), 'tests/fixtures/nom033-anexo-sintetico.txt');
const FIXTURE_PDF = path.join(process.cwd(), 'public/fixtures/nom033-anexo-sintetico.pdf');

async function textoFixture(): Promise<string> {
  return fs.readFile(FIXTURE_TXT, 'utf8');
}

describe('cumplimiento NOM-033', () => {
  const base = {
    clave: 'EC-01',
    nombre: 'Espacio',
    area: 'Área',
    lel: 0,
    o2: 20.9,
    h2s: 0,
    co: 0,
    fecha: '2025-03-15',
    tipoDeclarado: 'I' as const,
  };

  it('acepta los bordes inclusivos de oxígeno y el límite estricto de LEL y tóxicos', () => {
    expect(evaluarEspacioNom033({ ...base, o2: 19.5 }).cumple).toBe(true);
    expect(evaluarEspacioNom033({ ...base, o2: 23.5 }).cumple).toBe(true);
    expect(evaluarEspacioNom033({ ...base, o2: 19.49 }).cumple).toBe(false);
    expect(evaluarEspacioNom033({ ...base, o2: 23.51 }).cumple).toBe(false);
    expect(evaluarEspacioNom033({ ...base, lel: 9.999 }).tipoCalculado).toBe('I');
    expect(evaluarEspacioNom033({ ...base, lel: 10 }).tipoCalculado).toBe('II');
    expect(evaluarEspacioNom033({ ...base, h2s: 0.499 }).cumple).toBe(true);
    expect(evaluarEspacioNom033({ ...base, h2s: LIMITES_NOM033.vleH2sPpm * 0.5 }).cumple).toBe(false);
    expect(evaluarEspacioNom033({ ...base, co: 12.499 }).cumple).toBe(true);
    expect(evaluarEspacioNom033({ ...base, co: 12.5 }).cumple).toBe(false);
  });

  it('no inventa cumplimiento si falta un parámetro y respeta límites distintos', () => {
    const incompleto = evaluarEspacioNom033({ ...base, co: null });
    expect(incompleto.cumple).toBeNull();
    expect(incompleto.tipoCalculado).toBeNull();

    const laxo = evaluarEspacioNom033(
      { ...base, h2s: 4, tipoDeclarado: 'II' },
      { ...LIMITES_NOM033, vleH2sPpm: 10 }
    );
    expect(laxo.cumple).toBe(true);
    expect(laxo.tipoDeclarado).toBe('II');
    expect(laxo.tipoCalculado).toBe('I');
  });
});

describe('parser NOM-033 con filas partidas', () => {
  it('arma el anexo sintético y separa el tipo de la ficha', async () => {
    const resultado = parsearNom033(await textoFixture());
    expect(resultado.advertencias).toEqual([]);
    expect(resultado.espacios.map((espacio) => espacio.clave)).toEqual(['EC-01', 'EC-02', 'EC-03', 'EC-04', 'EC-05']);

    const cisterna = resultado.espacios[0];
    expect(cisterna.nombre).toBe('Cisterna de agua tratada');
    expect(cisterna.area).toBe('Área de servicios');
    expect(cisterna).toMatchObject({ lel: 0, o2: 20.9, h2s: 0, co: 2, fecha: '2025-03-15', tipoDeclarado: 'I', tipoCalculado: 'I', cumple: true });

    const tanque = resultado.espacios[1];
    expect(tanque.nombre).toBe('Tanque vertical de solvente inflamable');
    expect(tanque.area).toBe('Patio de químicos');
    expect(tanque.tipoDeclarado).toBe('I');
    expect(tanque.cumple).toBe(true);

    const registro = resultado.espacios[2];
    expect(registro.nombre).toBe('Registro eléctrico subterráneo');
    expect(registro.area).toBe('Área de subestación');
    expect(registro).toMatchObject({ lel: 3, o2: 17.8, h2s: 6, co: 40, fecha: '2025-03-16', tipoDeclarado: 'II', tipoCalculado: 'II', cumple: false });

    const ducto = resultado.espacios[3];
    expect(ducto.tipoDeclarado).toBe('I');
    expect(ducto.tipoCalculado).toBe('II');
    expect(ducto.cumple).toBe(false);

    expect(resultado.espacios[4].nombre).toBe('Fosa de retén de agua pluvial');
    expect(resultado.espacios[4].area).toBe('Zona norte');
  });

  it('no confunde un número del nombre con la medición', () => {
    const texto = [
      'EC-07  Nave 2 de',
      '        compresores',
      '        Área de máquinas   0.4   20.6   0.0   1.5   01/04/2025',
      'FICHA EC-07',
      'Clasificación del reporte: Tipo II',
    ].join('\n');
    const [espacio] = parsearNom033(texto).espacios;
    expect(espacio.nombre).toBe('Nave 2 de compresores');
    expect(espacio.area).toBe('Área de máquinas');
    expect(espacio).toMatchObject({ lel: 0.4, o2: 20.6, h2s: 0, co: 1.5, fecha: '2025-04-01', tipoDeclarado: 'II', tipoCalculado: 'I' });
  });

  it('lee el mismo anexo desde el PDF sintético', async () => {
    const pdf = await fs.readFile(FIXTURE_PDF);
    const desdePdf = parsearNom033(await extraerTextoPdf(pdf));
    const desdeTxt = parsearNom033(await textoFixture());
    expect(desdePdf.espacios).toEqual(desdeTxt.espacios);
  });
});

describe('comparación y almacén', () => {
  afterEach(() => {
    setFileStorage(new MemoryFileStorage());
  });

  it('solo compara un reporte confirmado y marca altas, bajas y cambios', async () => {
    const tipo = store.getTiposEstudio().find((item) => item.claveNOM === 'NOM-033-STPS-2015');
    expect(tipo).toBeTruthy();
    const contenido = Buffer.from(await textoFixture(), 'utf8');
    const extraido = await subirReporteReferencia({
      empresaId: 1,
      centroTrabajoId: 1,
      tipoEstudioId: tipo!.id,
      fecha: '2025-03-15',
      nombreArchivo: 'anexo-sintetico.txt',
      contenido,
    });
    expect(extraido.estadoExtraccion).toBe('EXTRAIDO');
    expect(extraido.archivo.hashSha256).toHaveLength(64);
    expect(extraido.archivo.tamanoBytes).toBe(contenido.length);

    const rechazado = await subirReporteReferencia({
      empresaId: 1,
      centroTrabajoId: 1,
      tipoEstudioId: tipo!.id,
      fecha: '2025-01-01',
      nombreArchivo: 'otro.txt',
      contenido,
    });
    rechazarReporteReferencia(rechazado.id, 'Cifras ilegibles en la prueba.');

    expect(() => compararEstudioConReferencia(4, extraido.id, 1)).toThrow(/confirmado/i);

    const confirmado = confirmarReporteReferencia(extraido.id, extraido.espacios);
    expect(confirmado.estadoExtraccion).toBe('CONFIRMADO');

    const resultado = compararEstudioConReferencia(4, confirmado.id, 1);
    const porClave = Object.fromEntries(resultado.comparacion.filas.map((fila) => [fila.clave, fila]));
    expect(porClave['EC-01'].situacion).toBe('MODIFICADO');
    expect(porClave['EC-01'].deltas.find((item) => item.parametro === 'o2')?.delta).toBe(0.2);
    expect(porClave['EC-02'].cambioCumplimiento).toBe(true);
    expect(porClave['EC-02'].cambioTipoCalculado).toBe(true);
    expect(porClave['EC-02'].cambioTipoDeclarado).toBe(false);
    expect(porClave['EC-03'].cambioCumplimiento).toBe(true);
    expect(porClave['EC-03'].nuevo?.tipoCalculado).toBe('I');
    expect(porClave['EC-03'].nuevo?.tipoDeclarado).toBe('II');
    expect(porClave['EC-04'].situacion).toBe('ELIMINADO');
    expect(porClave['EC-05'].situacion).toBe('SIN_CAMBIO');
    expect(porClave['EC-06'].situacion).toBe('NUEVO');
    expect(resultado.reporte.id).toBe(confirmado.id);
  });

  it('guarda y lee bytes en disco local sin salir de la carpeta', async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'nom033-'));
    const storage = new LocalFileStorage(dir);
    const guardado = await storage.guardar({ nombre: 'reporte demo.txt', contenido: Buffer.from('sintetico') });
    expect(guardado.hashSha256).toHaveLength(64);
    await expect(storage.leer(guardado.key)).resolves.toEqual(Buffer.from('sintetico'));
    await expect(storage.leer('../secreto.txt')).rejects.toThrow(/no es válida/);
    await fs.rm(dir, { recursive: true, force: true });
  });
});
