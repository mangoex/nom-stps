import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { afterEach, describe, expect, it } from 'vitest';
import { LocalFileStorage, MemoryFileStorage, setFileStorage } from '../src/lib/file-storage';
import { evaluarEspacioNom033, LIMITES_NOM033 } from '../src/lib/nom033-limites';
import { pathToFileURL } from 'url';
import { extraerTextoPdfEnCliente } from '../src/lib/pdf-cliente';
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

describe('extracción del PDF sintético en el cliente', () => {
  it('conserva el texto del anexo de prueba', async () => {
    const pdf = await fs.readFile(FIXTURE_PDF);
    const workerSrc = pathToFileURL(path.join(process.cwd(), 'node_modules/pdfjs-dist/build/pdf.worker.min.mjs')).href;
    const datos = pdf.buffer.slice(pdf.byteOffset, pdf.byteOffset + pdf.byteLength);
    const texto = await extraerTextoPdfEnCliente(datos, workerSrc);
    expect(texto).toContain('EC-01');
    expect(texto).toContain('Cisterna de agua');
  });
});

describe('comparación y almacén', () => {
  afterEach(() => {
    setFileStorage(new MemoryFileStorage());
  });

  it('solo compara un reporte confirmado y marca altas, bajas y cambios', async () => {
    const tipo = store.getTiposEstudio().find((item) => item.claveNOM === 'NOM-033-STPS-2015');
    expect(tipo).toBeTruthy();
    const texto = await textoFixture();
    const hashSha256 = 'a'.repeat(64);
    const espacios = [
      { clave: 'EC-01', nombre: 'Cisterna de agua tratada', area: 'Área de servicios', lel: 0, o2: 20.9, h2s: 0, co: 2, fecha: '2025-03-15', tipoDeclarado: 'I' as const },
      { clave: 'EC-02', nombre: 'Tanque vertical de solvente inflamable', area: 'Patio de químicos', lel: 8.4, o2: 20.1, h2s: 0.2, co: 6, fecha: '2025-03-15', tipoDeclarado: 'I' as const },
      { clave: 'EC-03', nombre: 'Registro eléctrico subterráneo', area: 'Área de subestación', lel: 3, o2: 17.8, h2s: 6, co: 40, fecha: '2025-03-16', tipoDeclarado: 'II' as const },
      { clave: 'EC-04', nombre: 'Ducto de ventilación', area: 'Área de techos', lel: 14, o2: 20.5, h2s: 0.1, co: 1, fecha: '2025-03-16', tipoDeclarado: 'I' as const },
      { clave: 'EC-05', nombre: 'Fosa de retén de agua pluvial', area: 'Zona norte', lel: 1.5, o2: 20.8, h2s: 0, co: 3, fecha: '2025-03-16', tipoDeclarado: 'I' as const },
    ];
    const extraido = await subirReporteReferencia({
      empresaId: 1,
      centroTrabajoId: 1,
      tipoEstudioId: tipo!.id,
      fecha: '2025-03-15',
      nombreArchivo: 'anexo-sintetico.txt',
      tamanoBytes: Buffer.byteLength(texto),
      hashSha256,
      texto,
      espacios,
    });
    expect(extraido.estadoExtraccion).toBe('EXTRAIDO');
    expect(extraido.archivo.hashSha256).toBe(hashSha256);
    expect(extraido.archivo.tamanoBytes).toBe(Buffer.byteLength(texto));

    const rechazado = await subirReporteReferencia({
      empresaId: 1,
      centroTrabajoId: 1,
      tipoEstudioId: tipo!.id,
      fecha: '2025-01-01',
      nombreArchivo: 'otro.txt',
      tamanoBytes: Buffer.byteLength(texto),
      hashSha256,
      texto,
      espacios,
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
