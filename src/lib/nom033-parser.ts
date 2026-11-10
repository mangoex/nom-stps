import { evaluarEspacioNom033, normalizarClaveEspacio, normalizarFechaMedicion, numeroFlexible } from './nom033-limites';
import { EspacioNom033, TipoEspacioConfinado } from './types';

export interface ResultadoParserNom033 {
  espacios: EspacioNom033[];
  advertencias: string[];
}

const PREFIJO_AREA = /^(area|zona|patio|nave|subestacion|anden)\b/i;

/**
 * Lee el texto de un PDF (pdftotext -layout o el extractor del servidor)
 * y arma las filas del Anexo 1 más el tipo declarado en las fichas.
 * Tolera que una fila venga partida en dos o tres líneas.
 * No usa un modelo de lenguaje: claves, fechas y tokens de medición
 * (número, <LD, N/D o una cota como <0.1). Un entero pegado al nombre,
 * como "Nave 2", no cuenta como columna.
 */
export function parsearNom033(texto: string): ResultadoParserNom033 {
  const tipos = extraerTiposDeFichas(texto);
  const advertencias: string[] = [];
  const espacios: EspacioNom033[] = [];
  const vistos = new Set<string>();

  for (const bloque of bloquesDeAnexo(texto)) {
    const fila = interpretarBloque(bloque);
    if (!fila) continue;
    if (vistos.has(fila.clave)) {
      advertencias.push(`${fila.clave} aparece más de una vez en el anexo; se conserva la primera.`);
      continue;
    }
    vistos.add(fila.clave);

    const tipoDeclarado = tipos.get(fila.clave) ?? null;
    if (!tipoDeclarado) {
      advertencias.push(`${fila.clave} no tiene ficha con Tipo I o Tipo II.`);
    }
    if (fila.incompleto) {
      advertencias.push(`${fila.clave} no trae los cuatro valores (LEL, O2, H2S y CO).`);
    }
    if (fila.fechaCruda && !fila.fecha) {
      advertencias.push(`${fila.clave} trae una fecha que no se pudo leer (${fila.fechaCruda}).`);
    }

    espacios.push(
      evaluarEspacioNom033({
        clave: fila.clave,
        nombre: fila.nombre,
        area: fila.area,
        lel: fila.lel,
        o2: fila.o2,
        h2s: fila.h2s,
        co: fila.co,
        fecha: fila.fecha,
        tipoDeclarado,
      })
    );
  }

  return { espacios, advertencias };
}

function bloquesDeAnexo(texto: string): string[][] {
  const bloques: string[][] = [];
  let actual: string[] | null = null;

  for (const cruda of texto.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n')) {
    const linea = cruda.trim();
    if (!linea) continue;
    if (/^\s*FICHAS?\b/i.test(linea)) {
      if (actual) bloques.push(actual);
      actual = null;
      continue;
    }
    if (/^\s*EC\s*-\s*\d+[A-Z]?\b/i.test(linea)) {
      if (actual) bloques.push(actual);
      actual = [linea];
      continue;
    }
    if (!actual || esEncabezado(linea) || esPieDePagina(linea)) continue;
    actual.push(linea);
  }

  if (actual) bloques.push(actual);
  return bloques;
}

function esEncabezado(linea: string): boolean {
  return /clave/i.test(linea) && /lel/i.test(linea) && /o2/i.test(linea);
}

function esPieDePagina(linea: string): boolean {
  const plano = sinAcentos(linea);
  return /^pagina\s+\d+\s+de\s+\d+$/i.test(plano) || /^pag\.?\s*\d+(\s+de\s+\d+)?$/i.test(plano);
}

function interpretarBloque(bloque: string[]): {
  clave: string;
  nombre: string;
  area: string;
  lel: number | null;
  o2: number | null;
  h2s: number | null;
  co: number | null;
  fecha: string;
  fechaCruda: string;
  incompleto: boolean;
} | null {
  const claveMatch = bloque[0].match(/^\s*(EC\s*-\s*\d+[A-Z]?)\b/i);
  if (!claveMatch) return null;
  const clave = normalizarClaveEspacio(claveMatch[1]);

  let fecha = '';
  let fechaCruda = '';
  const sinClaveNiFecha = bloque.map((linea, indice) => {
    const sinClave = indice === 0 ? linea.replace(/^\s*EC\s*-\s*\d+[A-Z]?\b/i, ' ') : linea;
    const separada = quitarUltimaFecha(sinClave);
    if (separada.fecha) {
      fecha = separada.fecha;
      fechaCruda = separada.cruda;
    } else if (separada.cruda) {
      fechaCruda = separada.cruda;
    }
    return separada.linea;
  });

  const { textos, numeros, incompleto, lineaUltimoValor } = tomarUltimosNumeros(sinClaveNiFecha);
  const nombrePartes: string[] = [];
  const areaPartes: string[] = [];
  const valoresAlFinal = lineaUltimoValor !== 0;

  textos.forEach((textoLinea, indice) => {
    if (!textoLinea) return;
    const esLineaDeValores = valoresAlFinal && indice === lineaUltimoValor;
    const esPrefijoArea = indice !== 0 && PREFIJO_AREA.test(sinAcentos(textoLinea));
    if (esLineaDeValores || esPrefijoArea) areaPartes.push(textoLinea);
    else nombrePartes.push(textoLinea);
  });

  const [lel, o2, h2s, co] = [numeros[0] ?? null, numeros[1] ?? null, numeros[2] ?? null, numeros[3] ?? null];

  return {
    clave,
    nombre: nombrePartes.join(' ').replace(/\s+/g, ' ').trim(),
    area: areaPartes.join(' ').replace(/\s+/g, ' ').trim(),
    lel,
    o2,
    h2s,
    co,
    fecha,
    fechaCruda,
    incompleto,
  };
}

function quitarUltimaFecha(linea: string): { linea: string; fecha: string; cruda: string } {
  const fechaRe = /\d{4}-\d{2}-\d{2}|\d{1,2}[/-]\d{1,2}[/-]\d{2,4}/g;
  const coincidencias: RegExpExecArray[] = [];
  let coincidencia = fechaRe.exec(linea);
  while (coincidencia) {
    coincidencias.push(coincidencia);
    coincidencia = fechaRe.exec(linea);
  }
  if (coincidencias.length === 0) return { linea, fecha: '', cruda: '' };
  const ultima = coincidencias[coincidencias.length - 1];
  const inicio = ultima.index ?? 0;
  const cruda = ultima[0];
  const fecha = normalizarFechaMedicion(cruda);
  return {
    linea: `${linea.slice(0, inicio)} ${linea.slice(inicio + cruda.length)}`,
    fecha,
    cruda,
  };
}

function tomarUltimosNumeros(lineas: string[]): {
  textos: string[];
  numeros: (number | null)[];
  incompleto: boolean;
  lineaUltimoValor: number;
} {
  const tokens: { linea: number; inicio: number; fin: number; valor: number | null }[] = [];
  const re = /<\s*LD\b|N\/D|N\.D\.|\bND\b|<\s*\d+(?:[.,]\d+)?|\d+(?:[.,]\d+)?/gi;
  lineas.forEach((linea, indice) => {
    const busqueda = new RegExp(re.source, 'gi');
    let match = busqueda.exec(linea);
    while (match) {
      const texto = match[0];
      const enteroDeNombre = /^\d+$/.test(texto) && /[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]\s*$/.test(linea.slice(0, match.index));
      if (!enteroDeNombre) {
        tokens.push({
          linea: indice,
          inicio: match.index,
          fin: match.index + texto.length,
          valor: valorDeToken(texto),
        });
      }
      match = busqueda.exec(linea);
    }
  });

  const usados = tokens.length > 4 ? tokens.slice(tokens.length - 4) : tokens;
  const textos = lineas.map((linea, indice) => {
    const deEstaLinea = usados.filter((token) => token.linea === indice).sort((a, b) => b.inicio - a.inicio);
    let salida = linea;
    for (const token of deEstaLinea) {
      salida = `${salida.slice(0, token.inicio)} ${salida.slice(token.fin)}`;
    }
    return salida.replace(/\s+/g, ' ').trim();
  });

  return {
    textos,
    numeros: usados.map((token) => token.valor),
    incompleto: tokens.length < 4,
    lineaUltimoValor: usados.length ? usados[usados.length - 1].linea : 0,
  };
}

function valorDeToken(texto: string): number | null {
  return numeroFlexible(texto);
}

function extraerTiposDeFichas(texto: string): Map<string, TipoEspacioConfinado> {
  const mapa = new Map<string, TipoEspacioConfinado>();
  const re = /FICHA\b([\s\S]*?)(?=FICHA\b|$)/gi;
  let match = re.exec(texto);
  while (match) {
    const cuerpo = match[1] ?? '';
    const clave = cuerpo.match(/EC\s*-\s*\d+[A-Z]?/i);
    const tipo = cuerpo.match(/Tipo\s+(II|I)\b/i);
    if (clave && tipo) {
      mapa.set(normalizarClaveEspacio(clave[0]), tipo[1].toUpperCase() === 'II' ? 'II' : 'I');
    }
    match = re.exec(texto);
  }
  return mapa;
}

function sinAcentos(valor: string): string {
  return valor
    .replace(/[áàäÁÀÄ]/g, 'a')
    .replace(/[éèëÉÈË]/g, 'e')
    .replace(/[íìïÍÌÏ]/g, 'i')
    .replace(/[óòöÓÒÖ]/g, 'o')
    .replace(/[úùüÚÙÜ]/g, 'u')
    .replace(/ñ/g, 'n')
    .replace(/Ñ/g, 'n');
}
