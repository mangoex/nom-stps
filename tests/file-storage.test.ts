import { afterEach, describe, expect, it } from 'vitest';
import { getFileStorage, LocalFileStorage, MemoryFileStorage, resetFileStorage } from '../src/lib/file-storage';

const fileStorageOriginal = process.env.FILE_STORAGE;
const nodeEnvOriginal = process.env.NODE_ENV;

function fijarNodeEnv(valor: string | undefined): void {
  const entorno = process.env as { NODE_ENV?: string };
  if (valor === undefined) delete entorno.NODE_ENV;
  else entorno.NODE_ENV = valor;
}

describe('getFileStorage', () => {
  afterEach(() => {
    if (fileStorageOriginal === undefined) delete process.env.FILE_STORAGE;
    else process.env.FILE_STORAGE = fileStorageOriginal;
    fijarNodeEnv(nodeEnvOriginal);
    resetFileStorage();
  });

  it('sin FILE_STORAGE y con NODE_ENV distinto de test usa memoria', () => {
    delete process.env.FILE_STORAGE;
    fijarNodeEnv('production');
    resetFileStorage();

    expect(process.env.NODE_ENV).not.toBe('test');
    expect(getFileStorage()).toBeInstanceOf(MemoryFileStorage);
  });

  it('FILE_STORAGE=local usa disco', () => {
    process.env.FILE_STORAGE = 'local';
    fijarNodeEnv('production');
    resetFileStorage();

    expect(getFileStorage()).toBeInstanceOf(LocalFileStorage);
  });

  it('un valor desconocido lanza un error en español y no abre disco', () => {
    process.env.FILE_STORAGE = 'blob';
    fijarNodeEnv('production');
    resetFileStorage();

    expect(() => getFileStorage()).toThrow(/FILE_STORAGE="blob"/);
    expect(() => getFileStorage()).toThrow(/memory/);
    expect(() => getFileStorage()).toThrow(/local/);
  });
});