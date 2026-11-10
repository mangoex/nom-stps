import fs from 'fs/promises';
import path from 'path';
import { calcularHashSha256 } from './hash';

export interface ArchivoGuardado {
  key: string;
  nombre: string;
  hashSha256: string;
  tamanoBytes: number;
}

export interface FileStorage {
  guardar(input: { nombre: string; contenido: Buffer }): Promise<ArchivoGuardado>;
  leer(key: string): Promise<Buffer | null>;
}

export class MemoryFileStorage implements FileStorage {
  private readonly archivos = new Map<string, { meta: ArchivoGuardado; contenido: Buffer }>();

  async guardar(input: { nombre: string; contenido: Buffer }): Promise<ArchivoGuardado> {
    const meta = describir(input.nombre, input.contenido);
    this.archivos.set(meta.key, { meta, contenido: Buffer.from(input.contenido) });
    return meta;
  }

  async leer(key: string): Promise<Buffer | null> {
    const archivo = this.archivos.get(key);
    return archivo ? Buffer.from(archivo.contenido) : null;
  }
}

export class LocalFileStorage implements FileStorage {
  constructor(private readonly root: string) {}

  async guardar(input: { nombre: string; contenido: Buffer }): Promise<ArchivoGuardado> {
    const meta = describir(input.nombre, input.contenido);
    await fs.mkdir(this.root, { recursive: true });
    await fs.writeFile(this.rutaSegura(meta.key), input.contenido);
    return meta;
  }

  async leer(key: string): Promise<Buffer | null> {
    try {
      return await fs.readFile(this.rutaSegura(key));
    } catch (error) {
      const codigo = (error as NodeJS.ErrnoException).code;
      if (codigo === 'ENOENT') return null;
      throw error;
    }
  }

  private rutaSegura(key: string): string {
    if (!/^[a-f0-9]{64}-[A-Za-z0-9._-]+$/.test(key)) {
      throw new Error('La llave de almacenamiento no es válida.');
    }
    const raiz = path.resolve(this.root);
    const destino = path.resolve(raiz, key);
    if (destino !== path.join(raiz, key)) {
      throw new Error('La llave de almacenamiento sale del directorio permitido.');
    }
    return destino;
  }
}

function describir(nombre: string, contenido: Buffer): ArchivoGuardado {
  const hashSha256 = calcularHashSha256(contenido);
  const seguro = path.basename(nombre).replace(/[^A-Za-z0-9._-]+/g, '_').slice(0, 80) || 'archivo';
  return {
    key: `${hashSha256}-${seguro}`,
    nombre: path.basename(nombre) || seguro,
    hashSha256,
    tamanoBytes: contenido.length,
  };
}

let actual: FileStorage | null = null;

/**
 * Sin FILE_STORAGE (o con "memory") guarda en memoria. En Vercel el disco es de
 * solo lectura y esos archivos se pierden al reiniciar la función.
 * Disco local solo con FILE_STORAGE=local.
 */
export function getFileStorage(): FileStorage {
  if (!actual) {
    actual = crearFileStorage(process.env.FILE_STORAGE);
  }
  return actual;
}

export function setFileStorage(storage: FileStorage): void {
  actual = storage;
}

export function resetFileStorage(): void {
  actual = null;
}

export function crearFileStorage(modo: string | undefined): FileStorage {
  if (modo === undefined || modo === '' || modo === 'memory') {
    return new MemoryFileStorage();
  }
  if (modo === 'local') {
    return new LocalFileStorage(path.join(process.cwd(), 'data', 'referencias'));
  }
  throw new Error(
    `FILE_STORAGE="${modo}" no es válido. Usa "memory" o "local". En memoria los archivos se pierden al reiniciar el proceso.`
  );
}
