import { describe, expect, it } from 'vitest';
import { parsearNom033 } from '../src/lib/nom033-parser';
import { FragmentoPdf } from '../src/lib/pdf-renglones';

function pieza(x: number, y: number, texto: string): FragmentoPdf {
  return { x, y, texto };
}

function indiceDuplicado(): FragmentoPdf[] {
  return [
    pieza(80, 700, '14.1.- ANEXO 1.- MEDICIONES REALIZADAS PARA MEDIR OXIGENO'),
    pieza(500, 690, 'Explosividad'),
    pieza(200, 680, 'NOM-033-STPS-2015'),
    pieza(400, 680, '2026'),
    pieza(242, 640, 'EC'),
    pieza(247, 640, '-'),
    pieza(249, 640, '99'),
    pieza(297, 636, '2015'),
    pieza(40, 40, 'Página'),
    pieza(90, 40, '1'),
    pieza(110, 40, 'de'),
    pieza(130, 40, '12'),
  ];
}

function anexo(): FragmentoPdf[] {
  return [
    pieza(200, 760, 'NOM-033-STPS-2015'),
    pieza(279, 760, '2015'),
    pieza(352, 706, 'MARZO'),
    pieza(400, 706, '2026'),
    pieza(103, 650, 'Núm'),
    pieza(144, 650, 'Área'),
    pieza(284, 644, 'Explosividad'),
    pieza(107, 500, '1'),
    pieza(124, 500, 'Patio'),
    pieza(186, 500, 'Tanque'),
    pieza(242, 500, 'EC'),
    pieza(247, 500, '-'),
    pieza(249, 500, '01'),
    pieza(297, 497, '0'),
    pieza(343, 497, '20.8'),
    pieza(396, 497, '0'),
    pieza(446, 497, '0'),
    pieza(484, 497, '12'),
    pieza(489, 497, '-'),
    pieza(491, 497, '03'),
    pieza(497, 497, '-'),
    pieza(498, 497, '2026'),
    pieza(142, 493, 'norte'),
    pieza(200, 493, 'agua'),
    pieza(107, 460, '2'),
    pieza(124, 460, 'Bodega'),
    pieza(186, 460, 'Caseta'),
    pieza(242, 460, 'EC'),
    pieza(247, 460, '-'),
    pieza(249, 460, '02'),
    pieza(297, 457, '<LD'),
    pieza(343, 457, '20.8'),
    pieza(396, 457, '<0.1'),
    pieza(446, 457, '1'),
    pieza(484, 457, '17'),
    pieza(489, 457, '-'),
    pieza(491, 457, '03'),
    pieza(497, 457, '-'),
    pieza(498, 457, '2026'),
    pieza(107, 420, '3'),
    pieza(186, 420, 'Registro'),
    pieza(200, 420, '2015'),
    pieza(242, 420, 'EC'),
    pieza(247, 420, '-'),
    pieza(249, 420, '03'),
    pieza(343, 417, '20.8'),
    pieza(107, 380, '4'),
    pieza(124, 380, 'Andén'),
    pieza(186, 380, 'Tolva'),
    pieza(229, 380, 'EC'),
    pieza(235, 380, '-'),
    pieza(238, 380, '04'),
    pieza(279, 377, '0'),
    pieza(328, 377, '20.8'),
    pieza(378, 377, '0'),
    pieza(428, 377, '0'),
    pieza(477, 377, '18'),
    pieza(483, 377, '-'),
    pieza(485, 377, '03'),
    pieza(490, 377, '-'),
    pieza(492, 377, '2026'),
    pieza(40, 40, 'Página'),
    pieza(90, 40, '9'),
    pieza(110, 40, 'de'),
    pieza(314, 40, '438'),
  ];
}

function tabla7(): FragmentoPdf[] {
  return [
    pieza(57, 440, 'Tabla 7.- Clasificacion de los espacios confinados'),
    pieza(63, 400, 'No.'),
    pieza(137, 400, 'Área'),
    pieza(450, 400, 'Tipo'),
    pieza(491, 400, 'Categorización'),
    pieza(68, 370, '1'),
    pieza(379, 370, 'EC'),
    pieza(392, 370, '-'),
    pieza(395, 370, '01'),
    pieza(457, 370, '2'),
    pieza(68, 350, '2'),
    pieza(379, 350, 'EC'),
    pieza(392, 350, '-'),
    pieza(395, 350, '02'),
    pieza(457, 350, '2'),
    pieza(200, 760, 'NOM-033-STPS-2015'),
    pieza(279, 760, '2015'),
  ];
}

describe('anexo NOM-033 por columnas', () => {
  const resultado = parsearNom033([indiceDuplicado(), anexo(), tabla7()]);

  it('ignora el índice, el encabezado repetido y los años', () => {
    expect(resultado.espacios.map((espacio) => espacio.clave)).toEqual(['EC-01', 'EC-02', 'EC-03', 'EC-04']);
    expect(resultado.espacios.some((espacio) => espacio.o2 === 2015 || espacio.h2s === 2026 || espacio.co === 2015)).toBe(false);
    expect(resultado.espacios.some((espacio) => espacio.clave === 'EC-99')).toBe(false);
  });

  it('arma la fila partida y conserva el tipo escrito de la tabla 7', () => {
    const primero = resultado.espacios[0];
    expect(primero.area).toBe('Patio norte');
    expect(primero.nombre).toBe('Tanque agua');
    expect(primero).toMatchObject({
      lel: 0,
      o2: 20.8,
      h2s: 0,
      co: 0,
      fecha: '2026-03-12',
      tipoDeclarado: 'II',
      tipoCalculado: 'I',
    });
  });

  it('acepta <LD y <0.1 en las columnas y no inventa la fila incompleta', () => {
    expect(resultado.espacios[1]).toMatchObject({
      clave: 'EC-02',
      lel: 0,
      o2: 20.8,
      h2s: 0.1,
      co: 1,
      tipoDeclarado: 'II',
      tipoCalculado: 'I',
    });
    expect(resultado.espacios[2]).toMatchObject({
      clave: 'EC-03',
      nombre: 'Registro 2015',
      o2: 20.8,
      lel: null,
      h2s: null,
      co: null,
      fecha: '',
      tipoCalculado: null,
      cumple: null,
    });
    expect(resultado.advertencias.some((aviso) => aviso.includes('EC-03'))).toBe(true);
  });

  it('lee la fila corrida a la izquierda sin tomar el año ni el número de página', () => {
    expect(resultado.espacios[3]).toMatchObject({
      clave: 'EC-04',
      area: 'Andén',
      nombre: 'Tolva',
      lel: 0,
      o2: 20.8,
      h2s: 0,
      co: 0,
      fecha: '2026-03-18',
    });
  });
});
