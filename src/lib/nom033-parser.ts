import { evaluarEspacioNom033, normalizarClaveEspacio, normalizarFechaMedicion, numeroFlexible } from './nom033-limites';
import { FragmentoPdf, agruparEnRenglones, RenglonPdf } from './pdf-renglones';
import { EspacioNom033, TipoEspacioConfinado } from './types';

export interface ResultadoParserNom033 {
  espacios: EspacioNom033[];
  advertencias: string[];
}

const ANCHO_CLAVE_ANEXO = { min: 200, max: 268 };
const ANCHO_CLAVE_TABLA = { min: 350, max: 430 };
const ANCHO_TIPO = { min: 440, max: 490 };
const ANCHO_AREA = { min: 115, max: 180 };
const ANCHO_NOMBRE = { min: 180, max: 230 };
// Algunas filas corren ~18 px a la izquierda. Los cortes quedan entre las dos
// posiciones (la normal y la corrida) para no mezclar LEL con O2 ni CO con la fecha.
const ANCHO_LEL = { min: 262, max: 312 };
const ANCHO_O2 = { min: 312, max: 360 };
const ANCHO_H2S = { min: 360, max: 415 };
const ANCHO_CO = { min: 415, max: 468 };
const ANCHO_FECHA = { min: 468, max: 560 };

/**
 * Arma el Anexo 1 a partir de los fragmentos con coordenada X que entrega pdfjs.
 * Solo lee la tabla (encabezado Núm + Explosividad), no el índice.
 * El tipo escrito sale de la Tabla 7 y no se sustituye por el calculado.
 */
export function parsearNom033(paginas: FragmentoPdf[][]): ResultadoParserNom033 {
  const tipos = new Map<string, TipoEspacioConfinado>();
  const mediciones = new Map<string, MedicionCruda>();
  const advertencias: string[] = [];

  paginas.forEach((fragmentos, indice) => {
    const renglones = agruparEnRenglones(fragmentos).filter((renglon) => !esDescartable(renglon));
    if (esPaginaAnexo(fragmentos)) {
      leerAnexo(renglones, indice + 1, mediciones, advertencias);
      return;
    }
    if (esPaginaTabla7(fragmentos)) {
      leerTabla7(renglones, tipos);
    }
  });

  const espacios = Array.from(mediciones.values())
    .sort((a, b) => numeroClave(a.clave) - numeroClave(b.clave))
    .map((medicion) => {
      const tipoDeclarado = tipos.get(medicion.clave) ?? null;
      if (!tipoDeclarado) {
        advertencias.push(`${medicion.clave} no tiene tipo en la tabla de clasificación.`);
      }
      if (medicion.incompleta) {
        advertencias.push(`${medicion.clave} quedó incompleta y se marca para revisión humana.`);
      }
      return evaluarEspacioNom033({
        clave: medicion.clave,
        nombre: medicion.nombre,
        area: medicion.area,
        lel: medicion.lel,
        o2: medicion.o2,
        h2s: medicion.h2s,
        co: medicion.co,
        fecha: medicion.fecha,
        tipoDeclarado,
      });
    });

  return { espacios, advertencias };
}

interface MedicionCruda {
  clave: string;
  nombre: string;
  area: string;
  lel: number | null;
  o2: number | null;
  h2s: number | null;
  co: number | null;
  fecha: string;
  incompleta: boolean;
}

function leerAnexo(
  renglones: RenglonPdf[],
  pagina: number,
  mediciones: Map<string, MedicionCruda>,
  advertencias: string[]
): void {
  const indices = renglones
    .map((renglon, indice) => (claveEn(renglon, ANCHO_CLAVE_ANEXO) ? indice : -1))
    .filter((indice) => indice >= 0);

  indices.forEach((inicio, orden) => {
    const clave = claveEn(renglones[inicio], ANCHO_CLAVE_ANEXO);
    if (!clave) return;
    const fin = orden + 1 < indices.length ? indices[orden + 1] : renglones.length;
    const partes = renglones.slice(inicio, fin).flatMap((renglon) => renglon.partes);
    if (mediciones.has(clave)) {
      advertencias.push(`${clave} se repite en la página ${pagina}; se conserva la primera fila completa.`);
      return;
    }
    const lel = numeroEnBanda(partes, ANCHO_LEL, (valor) => valor >= 0 && valor <= 100);
    const o2 = numeroEnBanda(partes, ANCHO_O2, (valor) => valor >= 0 && valor <= 100);
    const h2s = numeroEnBanda(partes, ANCHO_H2S, (valor) => valor >= 0 && valor < 1000);
    const co = numeroEnBanda(partes, ANCHO_CO, (valor) => valor >= 0 && valor < 1000);
    const fecha = fechaEnBanda(partes);
    const incompleta = lel == null || o2 == null || h2s == null || co == null || !fecha;
    mediciones.set(clave, {
      clave,
      area: textoEn(partes, ANCHO_AREA),
      nombre: textoEn(partes, ANCHO_NOMBRE),
      lel,
      o2,
      h2s,
      co,
      fecha,
      incompleta,
    });
  });
}

function leerTabla7(renglones: RenglonPdf[], tipos: Map<string, TipoEspacioConfinado>): void {
  for (const renglon of renglones) {
    const clave = claveEn(renglon, ANCHO_CLAVE_TABLA);
    const tipo = tipoEn(renglon);
    if (!clave || !tipo || tipos.has(clave)) continue;
    tipos.set(clave, tipo);
  }
}

function esPaginaAnexo(fragmentos: FragmentoPdf[]): boolean {
  const explosividad = fragmentos.some(
    (fragmento) => /explosividad/i.test(fragmento.texto) && fragmento.x > 250 && fragmento.x < 400
  );
  const numero = fragmentos.some((fragmento) => /^n[uú]m\.?$/i.test(fragmento.texto) && fragmento.x < 160);
  return explosividad && numero;
}

function esPaginaTabla7(fragmentos: FragmentoPdf[]): boolean {
  if (esPaginaAnexo(fragmentos)) return false;
  if (fragmentos.some((fragmento) => /categorizaci[oó]n/i.test(fragmento.texto))) return true;
  if (fragmentos.some((fragmento) => /tabla\s*7/i.test(fragmento.texto))) return true;
  const tipo = fragmentos.some((fragmento) => /^tipo$/i.test(fragmento.texto.trim()) && fragmento.x > 420);
  const numero = fragmentos.some((fragmento) => /^no\.?$/i.test(fragmento.texto.trim()) && fragmento.x < 100);
  return tipo && numero;
}

function esDescartable(renglon: RenglonPdf): boolean {
  const texto = renglon.partes.map((parte) => parte.texto).join(' ');
  if (/p[aá]gina\s+\d+\s+de\s+\d+/i.test(texto)) return true;
  if (/nom-033/i.test(texto) && /20\d{2}/.test(texto)) return true;
  if (/^(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)\s+20\d{2}$/i.test(texto.trim())) {
    return true;
  }
  if (renglon.partes.some((parte) => /explosividad|categorizaci[oó]n/i.test(parte.texto))) return true;
  if (
    renglon.partes.some((parte) => /^n[uú]m\.?$/i.test(parte.texto)) &&
    renglon.partes.some((parte) => /^[aá]rea$/i.test(parte.texto))
  ) {
    return true;
  }
  return false;
}

function claveEn(renglon: RenglonPdf, banda: { min: number; max: number }): string | null {
  const tokens = renglon.partes.filter((parte) => parte.x >= banda.min && parte.x < banda.max);
  const junto = tokens.map((parte) => parte.texto).join('');
  const coincidencia = junto.match(/EC-(\d+)/i);
  if (!coincidencia) return null;
  const numero = Number(coincidencia[1]);
  if (!Number.isInteger(numero) || numero < 1 || numero > 999) return null;
  return normalizarClaveEspacio(`EC-${numero}`);
}

function tipoEn(renglon: RenglonPdf): TipoEspacioConfinado | null {
  const token = renglon.partes.find(
    (parte) => parte.x >= ANCHO_TIPO.min && parte.x < ANCHO_TIPO.max && /^[12]$/.test(parte.texto)
  );
  if (!token) return null;
  return token.texto === '1' ? 'I' : 'II';
}

function numeroEnBanda(
  partes: FragmentoPdf[],
  banda: { min: number; max: number },
  acepta: (valor: number) => boolean
): number | null {
  const valores = partes
    .filter((parte) => parte.x >= banda.min && parte.x < banda.max)
    .map((parte) => numeroFlexible(parte.texto))
    .filter((valor): valor is number => valor != null && acepta(valor));
  if (valores.length === 0) return null;
  const primero = valores[0];
  if (valores.some((valor) => valor !== primero)) return null;
  return primero;
}

function fechaEnBanda(partes: FragmentoPdf[]): string {
  const crudo = partes
    .filter((parte) => parte.x >= ANCHO_FECHA.min && parte.x < ANCHO_FECHA.max)
    .map((parte) => parte.texto)
    .join('');
  const coincidencia = crudo.match(/(\d{1,2})-(\d{1,2})-(\d{4})/);
  if (!coincidencia) return '';
  return normalizarFechaMedicion(`${coincidencia[1]}-${coincidencia[2]}-${coincidencia[3]}`);
}

function textoEn(partes: FragmentoPdf[], banda: { min: number; max: number }): string {
  return partes
    .filter((parte) => parte.x >= banda.min && parte.x < banda.max)
    .filter((parte) => !/^EC-?$/i.test(parte.texto) && parte.texto !== '-')
    .sort((a, b) => b.y - a.y || a.x - b.x)
    .map((parte) => parte.texto)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function numeroClave(clave: string): number {
  const coincidencia = clave.match(/(\d+)/);
  return coincidencia ? Number(coincidencia[1]) : 0;
}
