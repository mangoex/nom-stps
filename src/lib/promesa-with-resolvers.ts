/**
 * pdfjs-dist 4 usa Promise.withResolvers. Node 20 del CI todavía no lo trae.
 * En el navegador moderno la función ya existe y esto no hace nada.
 */
const promesa = Promise as PromiseConstructor & {
  withResolvers?: <T>() => {
    promise: Promise<T>;
    resolve: (valor: T | PromiseLike<T>) => void;
    reject: (motivo?: unknown) => void;
  };
};

if (typeof promesa.withResolvers !== 'function') {
  promesa.withResolvers = function withResolvers<T>() {
    let resolve: (valor: T | PromiseLike<T>) => void = () => undefined;
    let reject: (motivo?: unknown) => void = () => undefined;
    const promise = new Promise<T>((resuelve, rechaza) => {
      resolve = resuelve;
      reject = rechaza;
    });
    return { promise, resolve, reject };
  };
}
